const mongoose = require('mongoose')

const UserMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  summary: { type: String, default: '' },
  focusAreas: [{ type: String }],
  preferences: [{ type: String }],
  constraints: [{ type: String }],
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.models.UserMemory || mongoose.model('UserMemory', UserMemorySchema)
