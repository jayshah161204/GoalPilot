const rateLimit = require('express-rate-limit')

/**
 * aiLimiter - Rate limiter for AI-powered endpoints.
 *
 * AI endpoints (chat, sessions/message, summarize, insights, planner) call
 * external APIs which cost money and can be slow.  This prevents abuse.
 *
 * Limit: 20 requests per user per minute.
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: 'Too many AI requests. Please wait a moment before sending another message.'
  }
})

/**
 * authLimiter - Rate limiter for authentication endpoints.
 *
 * Prevents brute-force attacks on login and register endpoints.
 *
 * Limit: 30 requests per IP per 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: 'Too many authentication attempts. Please try again in 15 minutes.'
  }
})

module.exports = { aiLimiter, authLimiter }
