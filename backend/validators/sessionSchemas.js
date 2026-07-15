const { z } = require('zod')

const sendMessageSchema = z.object({
  content: z.string().max(4000).trim().optional(),
  // Legacy alias — some older callers use 'message' key
  message: z.string().max(4000).trim().optional()
}).superRefine((data, ctx) => {
  const text = (data.content || data.message || '').trim()
  if (text.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Message cannot be empty',
      path: ['content']
    })
  }
}).transform((data) => ({
  content: (data.content || data.message || '').trim(),
  message: data.message
}))

module.exports = { sendMessageSchema }
