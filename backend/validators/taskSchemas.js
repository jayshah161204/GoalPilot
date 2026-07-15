const { z } = require('zod')

/**
 * Task validation schemas.
 * Whitelists only known fields so req.body spread cannot inject arbitrary data.
 */

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  description: z.string().max(1000, 'Description too long').optional().default(''),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  dueDate: z.string().nullable().optional(),
  goalId: z.string().nullable().optional()
})

/**
 * Update schema: all fields optional so partial updates work.
 * Also allows toggling the completed status.
 */
const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  goalId: z.string().nullable().optional()
})

module.exports = { createTaskSchema, updateTaskSchema }
