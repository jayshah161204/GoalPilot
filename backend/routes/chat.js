const express = require('express')
const router = express.Router()
const Chat = require('../models/chat')
const Task = require('../models/task')
const Note = require('../models/note')
const Goal = require('../models/goal')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const { aiLimiter } = require('../middleware/rateLimiter')
const { getGroqClient, getChatCompletion } = require('../utils/groqClient')
const { formatMemoryForPrompt, getUserMemory, updateUserMemoryFromConversation } = require('../utils/aiMemory')

router.use(protect)

/**
 * @route  POST /api/chat
 * @desc   Send a message to the single-thread AI coach (simpler, non-session chat)
 * @access Private
 */
router.post('/', aiLimiter, asyncHandler(async (req, res) => {
  const message = req.body.message || req.body.content
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }

  const [tasks, notes, goals, memory] = await Promise.all([
    Task.find({ userId: req.user._id }).select('title completed priority dueDate').lean(),
    Note.find({ userId: req.user._id }).select('title').lean(),
    Goal.find({ userId: req.user._id }).select('title progress completed').lean(),
    getUserMemory(req.user._id)
  ])

  const now = new Date()
  const pendingTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)
  const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < now)

  const contextLines = []
  if (goals.length > 0) {
    contextLines.push('GOALS: ' + goals.map(g => `"${g.title}" (${g.progress}%${g.completed ? ', done' : ''})`).join('; '))
  } else {
    contextLines.push('GOALS: none')
  }
  if (pendingTasks.length > 0) {
    contextLines.push('PENDING TASKS: ' + pendingTasks.map(t => `"${t.title}" [${t.priority || 'no'} priority]`).join('; '))
  } else {
    contextLines.push('PENDING TASKS: none')
  }
  if (overdueTasks.length > 0) {
    contextLines.push('OVERDUE: ' + overdueTasks.map(t => `"${t.title}"`).join(', '))
  }
  if (completedTasks.length > 0) {
    contextLines.push('COMPLETED: ' + completedTasks.map(t => `"${t.title}"`).join(', '))
  }
  if (notes.length > 0) {
    contextLines.push('NOTES: ' + notes.map(n => `"${n.title}"`).join(', '))
  }

  const userContext = contextLines.join('\n')
  const userMemory = formatMemoryForPrompt(memory)

  const history = await Chat.find({ userId: req.user._id })
    .sort({ createdAt: -1 }).limit(6).lean()
  const historyMessages = history.reverse().map(m => ({ role: m.role, content: m.content }))

  const systemPrompt = `You are GoalPilot, a direct AI productivity coach. You have the user's real data:

=== USER DATA ===
${userContext}
================

=== PERSISTENT USER MEMORY ===
${userMemory}
==============================

Always reference actual task and goal names from this data. Never give generic advice when you have specifics. Be concise (3-4 sentences). Suggest specific items to work on when asked.`

  const reply = await getChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message }
    ],
    max_tokens: 350,
    temperature: 0.5
  })

  // Update persistent memory — fire and forget
  updateUserMemoryFromConversation({
    userId: req.user._id,
    userMessage: message,
    assistantReply: reply,
    currentMemory: memory
  }).catch(e => console.error('[chat] Memory update failed:', e))

  await Promise.all([
    Chat.create({ userId: req.user._id, role: 'user', content: message }),
    Chat.create({ userId: req.user._id, role: 'assistant', content: reply })
  ])

  res.json({ reply })
}))

/**
 * @route  GET /api/chat/history
 * @desc   Get chat message history for the authenticated user
 * @access Private
 */
router.get('/history', asyncHandler(async (req, res) => {
  const history = await Chat.find({ userId: req.user._id }).sort({ createdAt: 1 })
  res.json(history)
}))

/**
 * @route  DELETE /api/chat/history
 * @desc   Clear all chat history for the authenticated user
 * @access Private
 */
router.delete('/history', asyncHandler(async (req, res) => {
  await Chat.deleteMany({ userId: req.user._id })
  res.json({ message: 'Chat history cleared' })
}))

module.exports = router
