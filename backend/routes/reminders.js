const express = require('express')
const router = express.Router()
const User = require('../models/user')
const Task = require('../models/task')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const { sendDailyBriefEmail } = require('../services/emailService')

/**
 * Computes start and end of "today" in IST (Asia/Kolkata).
 */
const getTodayRangeIST = () => {
  const now = new Date()
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = istFormatter.formatToParts(now)
  const y = parts.find(p => p.type === 'year').value
  const m = parts.find(p => p.type === 'month').value
  const d = parts.find(p => p.type === 'day').value

  // Start of day in IST (00:00:00 IST = previous day 18:30:00 UTC)
  const startOfToday = new Date(`${y}-${m}-${d}T00:00:00+05:30`)
  // End of day in IST (23:59:59.999 IST)
  const endOfToday = new Date(`${y}-${m}-${d}T23:59:59.999+05:30`)

  return { startOfToday, endOfToday }
}

/**
 * Core function to send daily briefs to users.
 */
async function processDailyBriefs (targetUserId = null) {
  const { startOfToday, endOfToday } = getTodayRangeIST()
  const userQuery = targetUserId ? { _id: targetUserId } : {}
  const users = await User.find(userQuery).select('_id name email').lean()

  let sentCount = 0
  const results = []

  for (const user of users) {
    // Overdue uncompleted tasks
    const overdueTasks = await Task.find({
      userId: user._id,
      completed: false,
      dueDate: { $ne: null, $lt: startOfToday }
    }).sort({ dueDate: 1 }).lean()

    // Tasks due today
    const todayTasks = await Task.find({
      userId: user._id,
      completed: false,
      dueDate: { $gte: startOfToday, $lte: endOfToday }
    }).sort({ priority: -1, createdAt: 1 }).lean()

    if (overdueTasks.length > 0 || todayTasks.length > 0) {
      const sent = await sendDailyBriefEmail({
        name: user.name,
        email: user.email,
        todayTasks,
        overdueTasks
      })

      if (sent) sentCount++
      results.push({
        email: user.email,
        name: user.name,
        todayCount: todayTasks.length,
        overdueCount: overdueTasks.length,
        status: sent ? 'sent' : 'failed'
      })
    }
  }

  return { totalUsers: users.length, sentCount, results }
}

/**
 * @route  GET /api/reminders/daily-brief
 * @desc   Triggered automatically by Vercel Cron at 10:00 AM IST (04:30 UTC)
 * @access Public / Protected with optional CRON_SECRET
 */
router.get('/daily-brief', asyncHandler(async (req, res) => {
  // Optional security check for Vercel Cron
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized cron invocation' })
    }
  }

  const result = await processDailyBriefs()
  res.json({
    success: true,
    message: `Processed daily briefs for ${result.totalUsers} users. ${result.sentCount} emails sent.`,
    ...result
  })
}))

/**
 * @route  POST /api/reminders/test-brief
 * @desc   Send a test 10:00 AM brief email to the authenticated user's email
 * @access Private
 */
router.post('/test-brief', protect, asyncHandler(async (req, res) => {
  const result = await processDailyBriefs(req.user._id)
  res.json({
    success: true,
    message: `Test brief sent to ${req.user.email}`,
    ...result
  })
}))

module.exports = router
