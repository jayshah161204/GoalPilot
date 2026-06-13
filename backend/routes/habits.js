const express = require('express')
const router = express.Router()
const Habit = require('../models/habit')
const protect = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const validate = require('../middleware/validate')
const { createHabitSchema, toggleHabitSchema } = require('../validators/habitSchemas')

// All habit routes require authentication — uses the SHARED auth middleware
// (Previously habits.js had its own duplicate inline auth — that caused the
// inconsistency bug where req.user.id vs req.user._id was mixed up)
router.use(protect)

/**
 * @route  GET /api/habits
 * @desc   Get all habits for the authenticated user
 * @access Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const habits = await Habit.find({ userId: req.user._id }).sort({ createdAt: 1 })
  res.json(habits)
}))

/**
 * @route  POST /api/habits
 * @desc   Create a new habit
 * @access Private
 */
router.post('/', validate(createHabitSchema), asyncHandler(async (req, res) => {
  const { name, icon, color } = req.body
  const habit = await Habit.create({ userId: req.user._id, name, icon, color })
  res.status(201).json(habit)
}))

/**
 * @route  PATCH /api/habits/:id/toggle
 * @desc   Toggle a habit's completion for a specific date (add or remove date)
 * @access Private
 */
router.patch('/:id/toggle', validate(toggleHabitSchema), asyncHandler(async (req, res) => {
  const { date } = req.body
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id })
  if (!habit) throw new AppError('Habit not found', 404)

  const idx = habit.completedDates.indexOf(date)
  if (idx > -1) {
    habit.completedDates.splice(idx, 1) // Un-complete
  } else {
    habit.completedDates.push(date) // Mark complete
  }

  await habit.save()
  res.json(habit)
}))

/**
 * @route  DELETE /api/habits/:id
 * @desc   Delete a habit
 * @access Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!habit) throw new AppError('Habit not found', 404)
  res.json({ message: 'Habit deleted' })
}))

module.exports = router