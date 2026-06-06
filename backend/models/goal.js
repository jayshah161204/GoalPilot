const mongoose = require('mongoose')

/**
 * Goal Schema
 *
 * Goals track high-level objectives. Progress (0-100) is automatically
 * recalculated whenever a linked Task is created, updated, or deleted.
 */
const GoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Goal must belong to a user']
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  deadline: { type: Date, default: null },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100']
  },
  completed: { type: Boolean, default: false }
}, { timestamps: true })

// Index for listing a user's active/completed goals
GoalSchema.index({ userId: 1, completed: 1 })
GoalSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.models.Goal || mongoose.model('Goal', GoalSchema)