const express = require('express')
const router = express.Router()
const Note = require('../models/note')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const validate = require('../middleware/validate')
const { aiLimiter } = require('../middleware/rateLimiter')
const { getChatCompletion } = require('../utils/groqClient')
const { createNoteSchema, updateNoteSchema } = require('../validators/noteSchemas')

router.use(protect)

/**
 * @route  GET /api/notes
 * @desc   Get all notes, pinned first then by most recently updated
 * @access Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const notes = await Note.find({ userId: req.user._id })
    .sort({ pinned: -1, createdAt: 1 })
    .lean()
  res.json(notes)
}))

/**
 * @route  POST /api/notes
 * @desc   Create a new note
 * @access Private
 */
router.post('/', validate(createNoteSchema), asyncHandler(async (req, res) => {
  const { title, content, pinned } = req.body
  const note = await Note.create({ title, content, pinned, userId: req.user._id })
  res.status(201).json(note)
}))

/**
 * @route  PATCH /api/notes/:id
 * @desc   Update a note (partial update, field-whitelisted)
 * @access Private
 */
router.patch('/:id', validate(updateNoteSchema), asyncHandler(async (req, res) => {
  const allowedFields = ['title', 'content', 'pinned']
  const updates = {}
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }

  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    updates,
    { returnDocument: 'after', runValidators: true }
  )
  if (!note) throw new AppError('Note not found', 404)
  res.json(note)
}))

/**
 * @route  POST /api/notes/:id/summarize
 * @desc   Generate a 2-sentence AI summary and save it to the note
 * @access Private
 */
router.post('/:id/summarize', aiLimiter, asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.user._id })
  if (!note) throw new AppError('Note not found', 404)
  if (!note.content || note.content.trim().length < 20) {
    throw new AppError('Note content is too short to summarize', 400)
  }

  const summary = await getChatCompletion({
    messages: [{
      role: 'user',
      content: `Summarize this in exactly 2 short, clear sentences:\n\n${note.content}`
    }],
    max_tokens: 120,
    temperature: 0.3
  })

  note.summary = summary
  await note.save()
  res.json(note)
}))

/**
 * @route  DELETE /api/notes/:id
 * @desc   Delete a note
 * @access Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!note) throw new AppError('Note not found', 404)
  res.json({ message: 'Note deleted' })
}))

module.exports = router
