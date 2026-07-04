const mongoose = require('mongoose')

/**
 * Session Schema
 *
 * A session is a named conversation thread between the user and the AI coach.
 * Messages are stored as embedded sub-documents.  Sessions are listed most-
 * recently-updated first.
 */
const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  }
}, { timestamps: true, _id: true })

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Session must belong to a user']
  },
  title: {
    type: String,
    default: 'New Chat',
    maxlength: [200, 'Title too long'],
    trim: true
  },
  messages: [MessageSchema]
}, { timestamps: true })

// Sessions are listed most recently active first
SessionSchema.index({ userId: 1, updatedAt: -1 })

module.exports = mongoose.models.Session || mongoose.model('Session', SessionSchema)