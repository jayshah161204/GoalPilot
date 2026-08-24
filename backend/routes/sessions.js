const express = require('express')
const router = express.Router()
const Session = require('../models/session')
const Task = require('../models/task')
const Note = require('../models/note')
const Goal = require('../models/goal')
const Habit = require('../models/habit')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const validate = require('../middleware/validate')
const { aiLimiter } = require('../middleware/rateLimiter')
const { getGroqClient, getChatCompletion } = require('../utils/groqClient')
const { sendMessageSchema } = require('../validators/sessionSchemas')
const { formatMemoryForPrompt, getUserMemory, updateUserMemoryFromConversation } = require('../utils/aiMemory')

router.use(protect)

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_SUGGEST_GOALS = 5
const MAX_SUGGEST_TASKS = 10
const MAX_SUGGEST_NOTES = 3
const MAX_SUGGEST_HABITS = 5
const MAX_SUGGEST_PLAN_TASKS = 6
const MAX_RECENT_MESSAGES = 8

const VALID_HABIT_ICONS = new Set([
  'activity', 'book', 'droplet', 'music', 'sun', 'moon', 'heart',
  'code', 'pen', 'coffee', 'briefcase', 'smile', 'zap'
])

// ─── JSON Parsing Utilities ───────────────────────────────────────────────────

/**
 * Extracts a balanced JSON object from a string that may contain extra text.
 * Handles escaped strings and nested braces correctly.
 *
 * @param {string} text - String potentially containing a JSON object
 * @returns {string|null} Extracted JSON object string, or null if not found
 */
function extractJsonObject (text) {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') { inString = true; continue }
    if (c === '{') depth++
    if (c === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

/**
 * Robustly parses JSON from LLM output.
 * Handles markdown fences (```json) and partial JSON within longer text.
 *
 * @param {string} text - Raw LLM output text
 * @returns {object|null} Parsed object or null on failure
 */
function parseJsonFromModel (text) {
  if (!text || typeof text !== 'string') return null
  let t = text.trim()
  // Strip markdown code fences
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  }
  const attempts = [t, extractJsonObject(t)].filter(Boolean)
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') return parsed
    } catch (_) {}
  }
  return null
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/** @param {string} s @returns {string} */
const normalizeTitle = (s) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : '')

/** @returns {string} Today as 'YYYY-MM-DD' */
const todayIso = () => new Date().toISOString().slice(0, 10)

/** @param {{goals,tasks,notes,habits,planTasks,actions}} s @returns {boolean} */
const hasAnySuggestions = (s) =>
  s.goals.length > 0 ||
  s.tasks.length > 0 ||
  s.notes.length > 0 ||
  s.habits.length > 0 ||
  s.planTasks.length > 0 ||
  (s.actions && s.actions.length > 0)

/**
 * Keeps only actions whose IDs match the user's real data (prevents hallucinated IDs).
 *
 * @param {Array} rawActions
 * @param {{ tasks, goals, notes, habits }} ctx
 * @returns {Array}
 */
function validateActions (rawActions, ctx) {
  const { tasks, goals, notes, habits } = ctx
  const taskIds = new Set(tasks.map(t => String(t._id)))
  const goalIds = new Set(goals.map(g => String(g._id)))
  const noteIds = new Set(notes.map(n => String(n._id)))
  const habitIds = new Set(habits.map(h => String(h._id)))
  const validTypes = new Set(['delete_task', 'complete_task', 'delete_goal', 'delete_note', 'delete_habit'])

  return (Array.isArray(rawActions) ? rawActions : [])
    .filter(a => a && validTypes.has(a.type))
    .filter(a => {
      switch (a.type) {
        case 'delete_task':
        case 'complete_task':
          return a.taskId && taskIds.has(String(a.taskId))
        case 'delete_goal':
          return a.goalId && goalIds.has(String(a.goalId))
        case 'delete_note':
          return a.noteId && noteIds.has(String(a.noteId))
        case 'delete_habit':
          return a.habitId && habitIds.has(String(a.habitId))
        default:
          return false
      }
    })
    .slice(0, 5)
}

/** @param {string} msg @returns {boolean} */
const wantsDailyPlan = (msg) =>
  /\b(daily plan|plan my day|schedule my day|generate.{0,12}plan|what should i do today)\b/i.test(msg)

// ─── Suggestion Sanitizer ─────────────────────────────────────────────────────

/**
 * Validates, deduplicates, and enforces limits on AI-suggested items.
 * Prevents the AI from suggesting items that already exist or are malformed.
 *
 * @param {object} raw - Raw suggestions object from LLM
 * @param {object} ctx - Context with existing item titles for deduplication
 * @returns {{ goals, tasks, notes, habits, planTasks, actions }}
 */
function sanitizeSuggestions (raw, ctx) {
  const { existingGoalTitles, existingTaskTitles, existingNoteTitles, existingHabitNames } = ctx
  const eg = new Set(existingGoalTitles.map(t => t.toLowerCase()))
  const et = new Set(existingTaskTitles.map(t => t.toLowerCase()))
  const en = new Set(existingNoteTitles.map(t => t.toLowerCase()))
  const eh = new Set(existingHabitNames.map(t => t.toLowerCase()))
  const out = { goals: [], tasks: [], notes: [], habits: [], planTasks: [] }
  if (!raw || typeof raw !== 'object') return out

  // Goals
  const seenG = new Set()
  for (const g of (Array.isArray(raw.goals) ? raw.goals : [])) {
    if (out.goals.length >= MAX_SUGGEST_GOALS) break
    const title = normalizeTitle(g?.title || '')
    if (title.length < 1 || title.length > 200) continue
    const key = title.toLowerCase()
    if (seenG.has(key) || eg.has(key)) continue
    seenG.add(key)
    let deadline = null
    if (g.deadline && typeof g.deadline === 'string') {
      const d = new Date(g.deadline)
      if (!Number.isNaN(d.getTime())) deadline = g.deadline.slice(0, 10)
    }
    out.goals.push({ title, deadline })
  }

  // Tasks
  const seenT = new Set()
  for (const t of (Array.isArray(raw.tasks) ? raw.tasks : [])) {
    if (out.tasks.length >= MAX_SUGGEST_TASKS) break
    const title = normalizeTitle(t?.title || '')
    if (title.length < 1 || title.length > 200) continue
    const key = title.toLowerCase()
    if (seenT.has(key) || et.has(key)) continue
    seenT.add(key)
    let priority = t.priority
    if (!['low', 'medium', 'high'].includes(priority)) priority = 'medium'
    let dueDate = null
    if (t.dueDate && typeof t.dueDate === 'string') {
      const d = new Date(t.dueDate)
      if (!Number.isNaN(d.getTime())) dueDate = t.dueDate.slice(0, 10)
    }
    const goalTitle = normalizeTitle(t.goalTitle || '') || null
    out.tasks.push({ title, priority, dueDate, goalTitle: goalTitle?.length ? goalTitle : null })
  }

  // Notes
  const seenN = new Set()
  for (const n of (Array.isArray(raw.notes) ? raw.notes : [])) {
    if (out.notes.length >= MAX_SUGGEST_NOTES) break
    const title = normalizeTitle(n?.title || '')
    const content = typeof n?.content === 'string' ? n.content.trim() : ''
    if (title.length < 1 || title.length > 200 || content.length < 1) continue
    const key = title.toLowerCase()
    if (seenN.has(key) || en.has(key)) continue
    seenN.add(key)
    out.notes.push({ title, content: content.slice(0, 8000) })
  }

  // Habits
  const seenH = new Set()
  for (const h of (Array.isArray(raw.habits) ? raw.habits : [])) {
    if (out.habits.length >= MAX_SUGGEST_HABITS) break
    const name = normalizeTitle(h?.name || h?.title || '')
    if (name.length < 1 || name.length > 120) continue
    const key = name.toLowerCase()
    if (seenH.has(key) || eh.has(key)) continue
    seenH.add(key)
    let icon = typeof h.icon === 'string' ? h.icon.trim().toLowerCase() : 'zap'
    if (!VALID_HABIT_ICONS.has(icon)) icon = 'zap'
    let color = typeof h.color === 'string' ? h.color.trim() : '#6366F1'
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) color = '#6366F1'
    out.habits.push({ name, icon, color })
  }

  // Plan tasks
  const seenP = new Set()
  for (const p of (Array.isArray(raw.planTasks) ? raw.planTasks : [])) {
    if (out.planTasks.length >= MAX_SUGGEST_PLAN_TASKS) break
    const title = normalizeTitle(p?.title || p?.task || '')
    if (title.length < 1 || title.length > 200) continue
    const key = title.toLowerCase()
    if (seenP.has(key) || et.has(key)) continue
    seenP.add(key)
    let priority = p.priority
    if (!['low', 'medium', 'high'].includes(priority)) priority = 'medium'
    const descParts = [p.duration, p.reason, p.description].filter(Boolean)
    out.planTasks.push({
      title,
      priority,
      dueDate: todayIso(),
      description: descParts.join(' — ').slice(0, 500) || 'From daily plan'
    })
  }

  return out
}

// ─── Daily Plan Builder ───────────────────────────────────────────────────────

/**
 * Generates a structured daily plan by calling the AI with the user's pending
 * tasks and goals as context.
 *
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {Promise<Array<{title, priority, duration, reason}>>}
 */
async function buildDailyPlanTasks (userId) {
  const [tasks, goals] = await Promise.all([
    Task.find({ userId, completed: false }).select('title priority dueDate').limit(10).lean(),
    Goal.find({ userId, completed: false }).select('title progress deadline').limit(5).lean()
  ])

  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date())
  const prompt = `Generate a focused daily plan. Return ONLY a JSON array, no markdown.
Format: [{"task":"name","duration":"30 min","reason":"short reason","priority":"high/medium/low"}]
Max 5 items. Focus on what matters most today.
pending=${tasks.map(t => `${t.title}(${t.priority})`).join(', ')}
overdue=${overdue.map(t => t.title).join(', ')}
goals=${goals.map(g => `${g.title} ${g.progress}%`).join(', ')}`

  const text = await getChatCompletion({
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 450,
    temperature: 0.3
  }).catch(() => '[]')
  const clean = text.replace(/```json|```/g, '').trim()
  let plan
  try {
    plan = JSON.parse(clean)
  } catch (_) {
    const s = clean.indexOf('[')
    const e = clean.lastIndexOf(']')
    if (s >= 0 && e > s) {
      try { plan = JSON.parse(clean.slice(s, e + 1)) } catch (_) { return [] }
    } else return []
  }

  if (!Array.isArray(plan)) return []
  return plan
    .map(p => ({
      title: normalizeTitle(p.task || p.title || ''),
      priority: ['low', 'medium', 'high'].includes(p.priority) ? p.priority : 'medium',
      duration: p.duration || '',
      reason: p.reason || ''
    }))
    .filter(p => p.title.length > 0)
}

// ─── AI Agent: Action Extraction ─────────────────────────────────────────────

/**
 * Extracts BOTH additive suggestions (new items to create) AND destructive
 * actions (delete, complete, update existing items) from a conversation turn.
 *
 * This is what enables the full AI agent loop:
 *   - User: "add a task called review notes"     → creates task
 *   - User: "remove the task review notes"        → deletes task (with confirmation)
 *   - User: "mark review notes as done"           → completes task (with confirmation)
 *
 * The user always sees a confirmation UI before destructive actions are applied.
 *
 * @param {string} userMessage - The user's message
 * @param {string} assistantReply - The AI's response to the message
 * @param {object} ctx - Context object with user's current data
 * @returns {Promise<{goals,tasks,notes,habits,planTasks,actions}>}
 */
async function extractActionSuggestions (userMessage, assistantReply, ctx) {
  const { goals, tasks, notes, habits } = ctx
  const existingGoalTitles = goals.map(g => g.title).filter(Boolean)
  const existingTaskTitles = tasks.map(t => t.title).filter(Boolean)
  const existingNoteTitles = notes.map(n => n.title).filter(Boolean)
  const existingHabitNames = habits.map(h => h.name).filter(Boolean)

  // Build task list with IDs for action matching
  const taskList = tasks.map(t => ({ id: t._id, title: t.title, completed: t.completed }))
  const goalList = goals.map(g => ({ id: g._id, title: g.title }))
  const noteList = notes.map(n => ({ id: n._id, title: n.title }))
  const habitList = habits.map(h => ({ id: h._id, name: h.name }))

  const extractorSystem = `You are an intent extractor for a productivity app. Extract what the user wants to ADD or MODIFY.

Return ONLY valid JSON. Shape:
{
  "goals": [{"title":"string","deadline":null}],
  "tasks": [{"title":"string","priority":"low"|"medium"|"high","dueDate":null,"goalTitle":null}],
  "notes": [{"title":"string","content":"string"}],
  "habits": [{"name":"string","icon":null,"color":null}],
  "planTasks": [{"title":"string","priority":"medium","description":""}],
  "actions": [
    {"type":"delete_task","taskId":"ID","taskTitle":"string"},
    {"type":"complete_task","taskId":"ID","taskTitle":"string"},
    {"type":"delete_goal","goalId":"ID","goalTitle":"string"},
    {"type":"delete_note","noteId":"ID","noteTitle":"string"},
    {"type":"delete_habit","habitId":"ID","habitName":"string"}
  ]
}

RULES:
- Add to arrays ONLY when user clearly asked to CREATE/ADD/SAVE/TRACK a new item this turn.
- For "actions": populate when user asks to DELETE/REMOVE/MARK DONE an existing item.
  - Match against existing items by title similarity (case-insensitive, partial match is okay).
  - Use the actual ID from the lists provided below.
  - ALWAYS require user confirmation before actions execute — just extract the intent here.
- For notes: include title AND content in "content" field.
- If nothing to add or modify, return empty arrays for all keys.
- Do NOT duplicate existing items.

Existing tasks (id, title, completed): ${JSON.stringify(taskList)}
Existing goals (id, title): ${JSON.stringify(goalList)}
Existing notes (id, title): ${JSON.stringify(noteList)}
Existing habits (id, name): ${JSON.stringify(habitList)}
Limits: ${MAX_SUGGEST_GOALS} goals, ${MAX_SUGGEST_TASKS} tasks, ${MAX_SUGGEST_NOTES} notes, ${MAX_SUGGEST_HABITS} habits.
Do not duplicate: goals=${JSON.stringify(existingGoalTitles)}, tasks=${JSON.stringify(existingTaskTitles)}`

  const text = await getChatCompletion({
    messages: [
      { role: 'system', content: extractorSystem },
      { role: 'user', content: JSON.stringify({ userMessage, assistantReply }) }
    ],
    max_tokens: 800,
    temperature: 0.1
  }).catch(() => '{}')
  const parsed = parseJsonFromModel(text) || {}

  // Sanitize additive suggestions
  const sanitized = sanitizeSuggestions(parsed, {
    existingGoalTitles,
    existingTaskTitles,
    existingNoteTitles,
    existingHabitNames
  })

  // Validate and attach actions (destructive intents) — IDs must belong to this user
  sanitized.actions = validateActions(parsed.actions, { tasks, goals, notes, habits })

  // Auto-generate daily plan if requested and no plan tasks extracted
  if (wantsDailyPlan(userMessage) && sanitized.planTasks.length === 0) {
    try {
      const plan = await buildDailyPlanTasks(ctx.userId)
      const fromPlanner = sanitizeSuggestions(
        { planTasks: plan.map(p => ({ title: p.title, priority: p.priority, duration: p.duration, reason: p.reason })) },
        { existingGoalTitles, existingTaskTitles, existingNoteTitles, existingHabitNames }
      )
      sanitized.planTasks = fromPlanner.planTasks
    } catch (e) {
      console.error('[sessions] Daily plan generation failed:', e)
    }
  }

  return sanitized
}

// ─── User Context Builder ─────────────────────────────────────────────────────

/**
 * Fetches all user data needed for the AI prompt and builds a structured
 * context string. Runs all DB queries in parallel for performance.
 *
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {Promise<{tasks,notes,goals,habits,memory,userContext,userMemory}>}
 */
async function buildUserContext (userId) {
  const [tasks, notes, goals, habits, memory] = await Promise.all([
    Task.find({ userId }).select('title completed priority dueDate goalId').lean(),
    Note.find({ userId }).select('title').lean(),
    Goal.find({ userId }).select('title progress completed deadline').lean(),
    Habit.find({ userId }).select('name').lean(),
    getUserMemory(userId)
  ])

  const now = new Date()
  const pendingTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)
  const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < now)

  const lines = []

  if (goals.length > 0) {
    lines.push('GOALS:')
    goals.forEach(g => {
      const status = g.completed ? 'completed' : `${g.progress}% done`
      const deadline = g.deadline ? `, due ${new Date(g.deadline).toDateString()}` : ''
      lines.push(`  - "${g.title}" [${status}${deadline}]`)
    })
  } else {
    lines.push('GOALS: none set yet')
  }

  if (pendingTasks.length > 0) {
    lines.push('PENDING TASKS:')
    pendingTasks.forEach(t => {
      const due = t.dueDate ? `, due ${new Date(t.dueDate).toDateString()}` : ''
      const pri = t.priority ? ` [${t.priority} priority]` : ''
      lines.push(`  - "${t.title}"${pri}${due}`)
    })
  } else {
    lines.push('PENDING TASKS: none')
  }

  if (overdueTasks.length > 0) {
    lines.push('OVERDUE TASKS:')
    overdueTasks.forEach(t => lines.push(`  - "${t.title}"`))
  }

  if (completedTasks.length > 0) {
    lines.push(`COMPLETED TASKS: ${completedTasks.map(t => `"${t.title}"`).join(', ')}`)
  }

  lines.push(notes.length > 0
    ? `NOTES: ${notes.map(n => `"${n.title}"`).join(', ')}`
    : 'NOTES: none'
  )

  lines.push(habits.length > 0
    ? `HABITS: ${habits.map(h => `"${h.name}"`).join(', ')}`
    : 'HABITS: none'
  )

  return {
    tasks, notes, goals, habits, memory,
    userContext: lines.join('\n'),
    userMemory: formatMemoryForPrompt(memory)
  }
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

/**
 * Constructs the system prompt for the AI coach.
 * Injects user's live data and persistent memory so responses are specific.
 *
 * @param {string} userContext - Formatted string of user's current data
 * @param {string} userMemory - Formatted persistent memory text
 * @returns {string} Complete system prompt
 */
function buildSystemPrompt (userContext, userMemory) {
  return `You are GoalPilot, a sharp and direct AI productivity coach. You have full access to this user's actual data shown below.

=== USER'S CURRENT DATA ===
${userContext}
===========================

=== PERSISTENT USER MEMORY ===
${userMemory}
==============================

STRICT RULES — follow every one:
1. ALWAYS reference the user's actual task names, goal names, or note titles from the data above when relevant.
2. If the user asks what they should work on, pick specific tasks from their PENDING TASKS list and explain why.
3. If the user asks about their goals, mention their actual goal names and progress percentages.
4. If there are OVERDUE TASKS, proactively mention them when relevant.
5. Keep responses concise — 3 to 5 sentences max unless the user asks for detail.
6. Do NOT say vague things like "you might have tasks".
7. If the data shows nothing, clearly suggest adding tasks or goals.
8. Never invent task or goal names.
9. Be encouraging but specific.
10. If the user asks unrelated things, answer briefly.
11. When the user asks to add goals, tasks, notes, habits, or a daily plan, be helpful in your reply — the app will show items they can confirm below. NEVER say something was saved until they confirm.
12. When the user asks to REMOVE, DELETE, or MARK DONE an existing item, say you'll show a confirmation and the app will handle it — do NOT say it's already done.
13. For daily plans, outline the plan; the app can add plan items as today's tasks when they confirm.
14. Use persistent memory for stable preferences, focus areas, and constraints only.`
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/sessions
 * @desc   List all sessions for the authenticated user (title + timestamps only)
 * @access Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id })
    .select('title createdAt updatedAt')
    .sort({ updatedAt: -1 })
  res.json(sessions)
}))

/**
 * @route  GET /api/sessions/:id
 * @desc   Get a single session with all messages
 * @access Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, userId: req.user._id })
  if (!session) throw new AppError('Session not found', 404)
  res.json(session)
}))

/**
 * @route  POST /api/sessions
 * @desc   Create a new conversation session
 * @access Private
 */
router.post('/', asyncHandler(async (req, res) => {
  const session = await Session.create({
    userId: req.user._id,
    title: 'New Chat',
    messages: []
  })
  res.status(201).json(session)
}))

/**
 * @route  POST /api/sessions/:id/message
 * @desc   Send a message to a session and get an AI response.
 *         Also extracts additive suggestions (items to create) AND
 *         destructive actions (items to delete/complete) from the conversation.
 *         All suggestions/actions are returned for user confirmation in the UI.
 * @access Private
 */
router.post('/:id/message', aiLimiter, validate(sendMessageSchema), asyncHandler(async (req, res) => {
  const content = req.body.content || req.body.message

  const session = await Session.findOne({ _id: req.params.id, userId: req.user._id })
  if (!session) throw new AppError('Session not found', 404)

  // Fetch all user context in parallel
  const ctx = await buildUserContext(req.user._id)
  const { tasks, notes, goals, habits, memory, userContext, userMemory } = ctx

  const systemPrompt = buildSystemPrompt(userContext, userMemory)

  // Add user message and auto-title on first message
  session.messages.push({ role: 'user', content })
  if (session.messages.length === 1) {
    session.title = content.length > 40 ? content.substring(0, 40) + '...' : content
  }

  // Only send recent messages to keep token count manageable
  const recentMessages = session.messages
    .slice(-MAX_RECENT_MESSAGES)
    .map(m => ({ role: m.role, content: m.content }))

  // Primary LLM call — generates the coaching response
  const reply = await getChatCompletion({
    messages: [{ role: 'system', content: systemPrompt }, ...recentMessages],
    max_tokens: 400,
    temperature: 0.5
  })

  // Update persistent memory asynchronously — fire and forget, don't block response
  updateUserMemoryFromConversation({
    userId: req.user._id,
    userMessage: content,
    assistantReply: reply,
    currentMemory: memory,
    groq
  }).catch(e => console.error('[sessions] Memory update failed:', e))

  // Secondary LLM call — extract actions/suggestions from conversation
  let suggestions = { goals: [], tasks: [], notes: [], habits: [], planTasks: [], actions: [] }
  try {
    suggestions = await extractActionSuggestions(content, reply, {
      userId: req.user._id,
      goals,
      tasks,
      notes,
      habits
    })
  } catch (e) {
    console.error('[sessions] Suggestion extraction failed:', e)
  }

  // Save assistant reply to session
  session.messages.push({ role: 'assistant', content: reply })
  session.updatedAt = new Date()
  await session.save()

  res.json({
    reply,
    session,
    ...(hasAnySuggestions(suggestions) ? { suggestions } : {})
  })
}))

/**
 * @route  DELETE /api/sessions/:id
 * @desc   Delete a session and all its messages
 * @access Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const session = await Session.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!session) throw new AppError('Session not found', 404)
  res.json({ message: 'Session deleted' })
}))

module.exports = router
