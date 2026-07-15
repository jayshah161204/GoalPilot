const { z } = require('zod')

/**
 * Auth validation schemas.
 * These enforce input quality before any DB or hashing work is done.
 */

/** Register: name, valid email, password with minimum strength */
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  email: z.string().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

/** Login: just email + password */
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
})

module.exports = { registerSchema, loginSchema }
