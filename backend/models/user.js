const mongoose = require('mongoose')

/**
 * User Schema
 *
 * Core user account.  Email is unique and indexed automatically by MongoDB's
 * unique constraint.  Passwords are stored hashed (bcrypt) — never plain text.
 */
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  }
}, { timestamps: true })

module.exports = mongoose.models.User || mongoose.model('User', UserSchema)