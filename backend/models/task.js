const mongoose = require('mongoose')

/**
 * Task Schema
 *
 * Each task belongs to one user (userId) and optionally links to a Goal (goalId).
 * Indexes are critical because virtually every query filters by userId.
 */
const TaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Task must belong to a user']
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  completed: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: { values: ['low', 'medium', 'high'], message: 'Priority must be low, medium, or high' },
    default: 'medium'
  },
  dueDate: { type: Date, default: null },
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true })

// Index for the most common query: all tasks for a user, newest first
TaskSchema.index({ userId: 1, createdAt: -1 })
// Index for filtering completed/pending tasks for a user
TaskSchema.index({ userId: 1, completed: 1 })
// Index for tasks linked to a specific goal
TaskSchema.index({ goalId: 1 })

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema)