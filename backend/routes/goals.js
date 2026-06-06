const express = require('express')
const router = express.Router()
const Goal = require('../models/goal')
const Task = require('../models/task')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const validate = require('../middleware/validate')
const { createGoalSchema, updateGoalSchema } = require('../validators/goalSchemas')

router.use(protect)

/**
 * @route  GET /api/goals
 * @desc   Get all goals for the authenticated user
 * @access Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: 1 })
  res.json(goals)
}))

/**
 * @route  POST /api/goals
 * @desc   Create a new goal
 * @access Private
 */
router.post('/', validate(createGoalSchema), asyncHandler(async (req, res) => {
  const { title, description, deadline } = req.body
  const goal = await Goal.create({
    userId: req.user._id,
    title,
    description,
    deadline: deadline || null
  })
  res.status(201).json(goal)
}))

/**
 * @route  PATCH /api/goals/:id
 * @desc   Update a goal's progress or other fields
 * @access Private
 */
router.patch('/:id', validate(updateGoalSchema), asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id })
  if (!goal) throw new AppError('Goal not found', 404)

  const allowedFields = ['title', 'description', 'deadline', 'progress', 'completed']
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) goal[key] = req.body[key]
  }

  // Auto-complete when progress reaches 100
  if (goal.progress === 100) goal.completed = true

  const updated = await goal.save()
  res.json(updated)
}))

/**
 * @route  DELETE /api/goals/:id
 * @desc   Delete a goal
 * @access Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!goal) throw new AppError('Goal not found', 404)
  res.json({ message: 'Goal deleted' })
}))

module.exports = router