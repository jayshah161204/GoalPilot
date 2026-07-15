/**
 * validate - Express middleware factory for Zod request body validation.
 *
 * Supports both Zod v3 (err.errors) and Zod v4 (err.issues).
 * Parses and coerces req.body against the provided Zod schema.
 * On success, req.body is replaced with the parsed (and type-safe) value.
 * On failure, returns 400 with field-level error details.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body)
    next()
  } catch (err) {
    // Zod v3 uses err.errors; Zod v4 uses err.issues
    const issues = err.issues || err.errors
    if (issues && Array.isArray(issues)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: issues.map(e => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
          message: e.message
        }))
      })
    }
    next(err)
  }
}

module.exports = validate
