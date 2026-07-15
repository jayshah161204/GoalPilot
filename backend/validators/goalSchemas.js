const { z } = require('zod')

const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  description: z.string().max(1000).optional().default(''),
  deadline: z.string().nullable().optional()
})

const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  deadline: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional()
})

const addGoalTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200).trim()
})

module.exports = { createGoalSchema, updateGoalSchema, addGoalTaskSchema }
