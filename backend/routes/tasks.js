const express = require('express')
const router = express.Router()
const Task = require('../models/task')
const Goal = require('../models/goal')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const validate = require('../middleware/validate')
const { createTaskSchema, updateTaskSchema } = require('../validators/taskSchemas')

router.use(protect)

/**
 * Recalculates and persists the progress percentage for a goal based on
 * the completion state of all its linked tasks.
 *
 * @param {string|null} goalId - MongoDB ObjectId of the goal
 * @param {string} userId - MongoDB ObjectId of the user (ownership check)
 */
const updateGoalProgress = async (goalId, userId) => {
  if (!goalId) return
  const tasks = await Task.find({ goalId, userId }).select('completed').lean()
  if (tasks.length === 0) return
  const completed = tasks.filter(t => t.completed).length
  const progress = Math.round((completed / tasks.length) * 100)
  await Goal.findByIdAndUpdate(goalId, { progress, completed: progress === 100 })
}

/**
 * @route  GET /api/tasks
 * @desc   Fetch all tasks for the authenticated user
 * @access Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: 1 }).lean()
  res.json(tasks)
}))

/**
 * @route  POST /api/tasks
 * @desc   Create a new task
 * @access Private
 */
router.post('/', validate(createTaskSchema), asyncHandler(async (req, res) => {
  const { title, description, priority, dueDate, goalId } = req.body
  const task = await Task.create({
    userId: req.user._id,
    title,
    description,
    priority,
    dueDate: dueDate || null,
    goalId: goalId || null
  })
  await updateGoalProgress(task.goalId, req.user._id)
  res.status(201).json(task)
}))

/**
 * @route  PATCH /api/tasks/:id
 * @desc   Update a task (supports partial updates and completion toggling)
 * @access Private
 */
router.patch('/:id', validate(updateTaskSchema), asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
  if (!task) throw new AppError('Task not found', 404)

  // Set completedAt timestamp when task is being marked complete
  if (req.body.completed === true && !task.completed) {
    req.body.completedAt = new Date()
  } else if (req.body.completed === false) {
    req.body.completedAt = null
  }

  Object.assign(task, req.body)
  const updated = await task.save()
  await updateGoalProgress(task.goalId, req.user._id)
  res.json(updated)
}))

/**
 * @route  DELETE /api/tasks/:id
 * @desc   Delete a task and update its linked goal's progress
 * @access Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!task) throw new AppError('Task not found', 404)
  await updateGoalProgress(task.goalId, req.user._id)
  res.json({ message: 'Task deleted' })
}))

module.exports = router