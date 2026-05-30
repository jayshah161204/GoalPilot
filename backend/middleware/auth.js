const jwt = require('jsonwebtoken')
const User = require('../models/user') // lowercase — case-sensitive on Linux/Mac

/**
 * protect - JWT authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and attaches the authenticated user document to req.user.
 *
 * All protected routes mount this middleware before their handlers so that
 * controllers can safely access req.user._id without null checks.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized — no token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-password').lean()
    if (!user) {
      return res.status(401).json({ message: 'Not authorized — user no longer exists' })
    }

    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ message: 'Not authorized — invalid token' })
  }
}

module.exports = protect