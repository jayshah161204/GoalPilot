const express = require('express')
const router = express.Router()
const Task = require('../models/task')
const Goal = require('../models/goal')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const { aiLimiter } = require('../middleware/rateLimiter')
const { getChatCompletion } = require('../utils/groqClient')

router.use(protect)

/**
 * Safely parses 4 insight strings from an LLM response.
 *
 * @param {string} text - Raw LLM output
 * @param {string[]} fallback - Default insights
 * @returns {string[]} Parsed insights
 */
const parseInsights = (text, fallback) => {
  if (!text) return fallback

  // Try parsing JSON array directly
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const arrStart = clean.indexOf('[')
    const arrEnd = clean.lastIndexOf(']')
    if (arrStart >= 0 && arrEnd > arrStart) {
      const parsed = JSON.parse(clean.slice(arrStart, arrEnd + 1))
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => String(s).trim()).filter(Boolean).slice(0, 4)
      }
    }
  } catch (_) {}

  // Parse lines or bullet points
  const lines = text
    .split('\n')
    .map(l => l.replace(/^[-*•\d.)\s]+/, '').replace(/\*\*/g, '').trim())
    .filter(l => l.length > 5 && !l.startsWith('Data:') && !l.startsWith('Format:') && !l.startsWith('Analyze'))

  if (lines.length >= 2) {
    return lines.slice(0, 4)
  }

  return fallback
}

/**
 * @route  GET /api/insights
 * @desc   Generate AI-powered productivity insights from user's task/goal data
 * @access Private
 */
router.get('/', aiLimiter, asyncHandler(async (req, res) => {
  const [tasks, goals] = await Promise.all([
    Task.find({ userId: req.user._id }).select('title completed priority completedAt dueDate').lean(),
    Goal.find({ userId: req.user._id }).select('title progress completed').lean()
  ])

  const completedCount = tasks.filter(t => t.completed).length
  const pendingCount = tasks.filter(t => !t.completed).length
  const overdueCount = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length
  const highPriorityPending = tasks.filter(t => t.priority === 'high' && !t.completed).length
  const avgGoalProgress = goals.length
    ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)
    : 0

  const fallback = [
    `${completedCount} tasks completed so far`,
    `${pendingCount} tasks still pending`,
    overdueCount > 0 ? `${overdueCount} overdue tasks need attention` : 'No overdue tasks — great pace!',
    `Average goal progress: ${avgGoalProgress}%`
  ]

  const prompt = `Analyze this user's productivity data and provide 4 brief, motivating insight bullet points (under 15 words each).
Data: completed_tasks=${completedCount}, pending_tasks=${pendingCount}, overdue_tasks=${overdueCount}, avg_goal_progress=${avgGoalProgress}%, high_priority_pending=${highPriorityPending}
Return ONLY a JSON array format like: ["insight 1", "insight 2", "insight 3", "insight 4"]`

  try {
    const text = await getChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.3
    })
    const insights = parseInsights(text, fallback)
    res.json({ insights })
  } catch (err) {
    console.error('[insights] Groq failed, using fallback:', err.message)
    res.json({ insights: fallback })
  }
}))

module.exports = router