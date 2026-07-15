/**
 * asyncHandler - Wraps async Express route handlers to eliminate repetitive try/catch blocks.
 *
 * Any error thrown inside the wrapped function is automatically forwarded to
 * Express's next() error pipeline, which is handled by the global errorHandler
 * middleware in middleware/errorHandler.js.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => {
 *     const tasks = await Task.find({ userId: req.user._id })
 *     res.json(tasks)
 *   }))
 *
 * @param {Function} fn - Async route handler function (req, res, next) => Promise
 * @returns {Function} Express middleware that catches and forwards any rejection
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
