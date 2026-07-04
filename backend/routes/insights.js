const express = require('express')
const router = express.Router()
const Task = require('../models/task')
const Goal = require('../models/goal')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const { aiLimiter } = require('../middleware/rateLimiter')
const { getGroqClient } = require('../utils/groqClient')

router.use(protect)

/**
 * Safely parses a JSON array from an LLM response string.
 * Strips markdown fences before parsing.
 *
 * @param {string} text - Raw LLM output
 * @returns {Array|null} Parsed array or null on failure
 */
const parseJsonArray = (text) => {
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const arrStart = clean.indexOf('[')
    const arrEnd = clean.lastIndexOf(']')
    if (arrStart < 0 || arrEnd <= arrStart) return null
    const parsed = JSON.parse(clean.slice(arrStart, arrEnd + 1))
    return Array.isArray(parsed) ? parsed : null
  } catch (_) {
    return null
  }
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

  const prompt = `Analyze this user's productivity data and return ONLY a JSON array of exactly 4 short, specific insight strings (under 15 words each). No markdown, no explanation — just the JSON array.
Data: completed_tasks=${completedCount}, pending_tasks=${pendingCount}, overdue_tasks=${overdueCount}, avg_goal_progress=${avgGoalProgress}%, high_priority_pending=${highPriorityPending}
Format: ["insight1","insight2","insight3","insight4"]`

  const groq = getGroqClient()
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 200,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = completion.choices[0].message.content.trim()
  const insights = parseJsonArray(text) || [
    `${completedCount} tasks completed so far`,
    `${pendingCount} tasks still pending`,
    overdueCount > 0 ? `${overdueCount} overdue tasks need attention` : 'No overdue tasks — great!',
    `Average goal progress: ${avgGoalProgress}%`
  ]

  res.json({ insights: insights.slice(0, 4) })
}))

module.exports = router