const { z } = require('zod')

const createHabitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(100, 'Name too long').trim(),
  icon: z.string().optional().default('zap'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex like #6366F1').optional().default('#6366F1')
})

const toggleHabitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
})

module.exports = { createHabitSchema, toggleHabitSchema }
