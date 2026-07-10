const express = require('express')
const router = express.Router()
const Task = require('../models/task')
const Goal = require('../models/goal')
const Habit = require('../models/habit')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const { aiLimiter } = require('../middleware/rateLimiter')
const { getGroqClient } = require('../utils/groqClient')

router.use(protect)

/**
 * Parses a JSON array from an LLM response, stripping markdown fences.
 * @param {string} text
 * @returns {Array|null}
 */
const parsePlanArray = (text) => {
  if (!text || typeof text !== 'string') return null
  const clean = text.replace(/```json|```/g, '').trim()
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : null
  } catch (_) { return null }
}

/** Returns today's date string YYYY-MM-DD in local time */
const todayStr = () => new Date().toISOString().slice(0, 10)

/**
 * @route  GET /api/planner
 * @desc   Generate a rich AI daily plan using tasks, goals, habits and overdue context
 * @access Private
 */
router.get('/', aiLimiter, asyncHandler(async (req, res) => {
  const today = todayStr()

  const [tasks, goals, habits] = await Promise.all([
    Task.find({ userId: req.user._id, completed: false })
      .select('title priority dueDate description')
      .sort({ priority: -1, dueDate: 1 })
      .limit(15)
      .lean(),
    Goal.find({ userId: req.user._id, completed: false })
      .select('title progress deadline')
      .limit(6)
      .lean(),
    Habit.find({ userId: req.user._id })
      .select('name completedDates')
      .limit(8)
      .lean()
  ])

  const now = new Date()
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now)
  const dueToday = tasks.filter(t => t.dueDate && t.dueDate.toString().slice(0, 10) === today)
  const highPriority = tasks.filter(t => t.priority === 'high')

  // Build habit context — show which habits are not yet done today
  const pendingHabits = habits.filter(h => !h.completedDates?.includes(today))

  const prompt = `You are a smart daily planner for an Indian student/professional.
Create a realistic, focused daily plan for TODAY only.

USER CONTEXT:
Pending tasks (${tasks.length}): ${tasks.map(t => `"${t.title}"[${t.priority}]${t.dueDate ? ' due:' + t.dueDate.toString().slice(0,10) : ''}`).join(', ') || 'none'}
OVERDUE (urgent!): ${overdue.map(t => `"${t.title}"`).join(', ') || 'none'}
Due TODAY: ${dueToday.map(t => `"${t.title}"`).join(', ') || 'none'}
High priority: ${highPriority.map(t => `"${t.title}"`).join(', ') || 'none'}
Active goals: ${goals.map(g => `"${g.title}"(${g.progress}% done${g.deadline ? ', deadline:'+g.deadline.toString().slice(0,10) : ''})`).join(', ') || 'none'}
Habits not done today: ${pendingHabits.map(h => h.name).join(', ') || 'all done!'}

RULES:
- Return ONLY a valid JSON array, no markdown, no explanation
- Max 6 items, ordered by importance (most important first)
- Overdue tasks and today's due tasks MUST be included if any
- Each item must have a realistic time estimate
- Include 1-2 habit/break items if pending habits exist
- Reason must be motivating and personal (mention deadlines, goals, streaks)

FORMAT (strict):
[{"task":"exact task name","duration":"X min","timeSlot":"9:00 AM","reason":"motivating reason mentioning context","priority":"high|medium|low","type":"task|habit|break"}]`

  const groq = getGroqClient()
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 600,
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = completion.choices[0]?.message?.content?.trim() || '[]'
  const rawPlan = parsePlanArray(text)
  if (!rawPlan) throw new AppError('Could not generate daily plan. Please try again.', 502)

  // Sanitize and normalize each plan item
  const rawItems = rawPlan.slice(0, 6).map((item, i) => ({
    task: String(item.task || item.name || `Task ${i + 1}`).trim().slice(0, 120),
    duration: String(item.duration || '30 min').trim(),
    timeSlot: String(item.timeSlot || item.time || '').trim(),
    reason: String(item.reason || '').trim().slice(0, 200),
    priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
    type: ['task', 'habit', 'break'].includes(item.type) ? item.type : 'task'
  }))

  /**
   * Fuzzy-match a plan item title against real DB records.
   * Returns the matching record's _id as a string, or null.
   * Uses: exact match → includes match → first-word match (in that order).
   *
   * @param {string} planTitle - AI-generated task title from the plan
   * @param {Array<{_id, title|name}>} records - real DB records to match against
   * @param {string} field - 'title' or 'name' (field name on the record)
   * @returns {string|null}
   */
  const fuzzyMatch = (planTitle, records, field) => {
    const needle = planTitle.toLowerCase().trim()
    // 1. Exact match
    let match = records.find(r => (r[field] || '').toLowerCase().trim() === needle)
    if (match) return String(match._id)
    // 2. Plan title contains the record title OR record contains plan title
    match = records.find(r => {
      const hay = (r[field] || '').toLowerCase().trim()
      return needle.includes(hay) || hay.includes(needle)
    })
    if (match) return String(match._id)
    // 3. First significant word match (≥4 chars)
    const firstWord = needle.split(/\s+/).find(w => w.length >= 4)
    if (firstWord) {
      match = records.find(r => (r[field] || '').toLowerCase().includes(firstWord))
      if (match) return String(match._id)
    }
    return null
  }

  // Attach real IDs to each plan item for frontend to act on
  const plan = rawItems.map(item => {
    const enriched = { ...item }
    if (item.type === 'habit') {
      enriched.habitId = fuzzyMatch(item.task, habits, 'name')
    } else if (item.type !== 'break') {
      enriched.taskId = fuzzyMatch(item.task, tasks, 'title')
    }
    return enriched
  })

  // Stats for the summary banner
  const totalMinutes = plan.reduce((acc, item) => {
    const m = item.duration.match(/(\d+)\s*(hr|hour|h)/i)
    const mins = item.duration.match(/(\d+)\s*(min|m)/i)
    return acc + (m ? parseInt(m[1]) * 60 : 0) + (mins ? parseInt(mins[1]) : 0)
  }, 0)

  res.json({
    plan,
    meta: {
      date: today,
      totalMinutes,
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      pendingTaskCount: tasks.length
    }
  })
}))

module.exports = router
