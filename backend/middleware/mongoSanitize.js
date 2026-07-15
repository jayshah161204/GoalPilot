const { sanitize } = require('express-mongo-sanitize')

/**
 * NoSQL injection sanitizer compatible with Express 5.
 *
 * express-mongo-sanitize's default middleware reassigns req.query, which is
 * read-only in Express 5 and crashes every request. We sanitize mutable inputs
 * in place instead: req.body (JSON payloads) and req.params (route IDs).
 */
function mongoSanitize (req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitize(req.body)
  }

  if (req.params && typeof req.params === 'object') {
    sanitize(req.params)
  }

  next()
}

module.exports = mongoSanitize
