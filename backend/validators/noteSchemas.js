const { z } = require('zod')

const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  content: z.string().max(10000, 'Content too long').optional().default(''),
  pinned: z.boolean().optional().default(false)
})

const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  content: z.string().max(10000).optional(),
  pinned: z.boolean().optional()
})

module.exports = { createNoteSchema, updateNoteSchema }
