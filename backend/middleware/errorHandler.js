const AppError = require('../utils/AppError')

/**
 * Global Express error-handling middleware.
 *
 * Must be registered LAST in server.js (after all routes) so that errors
 * thrown by route handlers reach here via next(err).
 *
 * Handles:
 *  - Mongoose ValidationError  → 400 with per-field details
 *  - Mongoose CastError        → 400 (invalid ObjectId, etc.)
 *  - Duplicate key (11000)     → 409 Conflict
 *  - AppError (operational)    → Whatever statusCode was set
 *  - Unknown / programming bugs → 500 (message hidden from client)
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // --- Mongoose schema validation error ---
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }))
    return res.status(400).json({ error: 'Validation failed', details })
  }

  // --- Mongoose bad ObjectId (e.g. /api/tasks/notanid) ---
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid value for field "${err.path}": ${err.value}`
    })
  }

  // --- MongoDB duplicate key (e.g. duplicate email) ---
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field'
    return res.status(409).json({ error: `${field} already exists` })
  }

  // --- Known operational errors thrown via: throw new AppError('...', 4xx) ---
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  // --- Unknown / programming error ---
  console.error('[UNHANDLED ERROR]', err)
  res.status(500).json({
    error: err.message || 'Something went wrong on our end. Please try again.'
  })
}

module.exports = errorHandler
