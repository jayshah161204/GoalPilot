const mongoose = require('mongoose')

/**
 * Habit Schema
 *
 * Habits track daily recurring activities via an array of completion date
 * strings in 'YYYY-MM-DD' format.  The field is named `userId` (consistent
 * with all other models — previously was `user` which caused bugs).
 */
const HabitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Habit must belong to a user']
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    trim: true
  },
  icon: { type: String, default: 'zap' },
  color: {
    type: String,
    default: '#6366F1',
    validate: {
      validator: (v) => /^#[0-9A-Fa-f]{6}$/.test(v),
      message: 'Color must be a valid hex color like #6366F1'
    }
  },
  /** Array of 'YYYY-MM-DD' strings representing completed days */
  completedDates: [{ type: String }]
}, { timestamps: true })

HabitSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.models.Habit || mongoose.model('Habit', HabitSchema)