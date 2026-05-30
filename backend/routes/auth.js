const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/user')
const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const validate = require('../middleware/validate')
const { authLimiter } = require('../middleware/rateLimiter')
const { registerSchema, loginSchema } = require('../validators/authSchemas')

/**
 * Generates a signed JWT token for a given user ID.
 * @param {string} id - User's MongoDB _id
 * @returns {string} Signed JWT valid for 30 days
 */
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })

/**
 * @route  POST /api/auth/register
 * @desc   Create a new user account
 * @access Public
 */
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  const exists = await User.findOne({ email })
  if (exists) throw new AppError('An account with this email already exists', 400)

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await User.create({ name, email, password: hashedPassword })
  const token = generateToken(user._id)

  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email }
  })
}))

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate user and return JWT
 * @access Public
 */
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email })
  if (!user) throw new AppError('Invalid email or password', 401)

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw new AppError('Invalid email or password', 401)

  const token = generateToken(user._id)
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email }
  })
}))

/**
 * @route  GET /api/auth/me
 * @desc   Get the currently authenticated user's profile
 * @access Private (uses shared auth middleware via token header)
 */
router.get('/me', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) throw new AppError('No token provided', 401)

  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  const user = await User.findById(decoded.id).select('-password')
  if (!user) throw new AppError('User not found', 404)

  res.json(user)
}))

module.exports = router