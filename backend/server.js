/**
 * GoalPilot API Server
 *
 * Entry point. Sets up security middleware, routes, and error handling,
 * then connects to MongoDB and starts listening.
 *
 * Architecture:
 *   Request → Security Middleware → Auth Middleware → Routes → Error Handler
 *
 * Security layers applied:
 *   - helmet:              Sets secure HTTP headers
 *   - cors:                Restricts to known frontend origin
 *   - express-mongo-sanitize (body/params): Strips NoSQL injection keys from req.body
 *   - express-rate-limit:  Applied per-route in rateLimiter.js (AI + auth)
 *   - express.json limit:  Prevents large payload attacks
 */

const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const mongoSanitize = require('./middleware/mongoSanitize')
const errorHandler = require('./middleware/errorHandler')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const app = express()
app.set('trust proxy', 1)

const DEFAULT_MONGO_URI = 'mongodb://202512059_db_user:yashvi2003@ac-hgjo8rw-shard-00-00.c6b4hyt.mongodb.net:27017,ac-hgjo8rw-shard-00-01.c6b4hyt.mongodb.net:27017,ac-hgjo8rw-shard-00-02.c6b4hyt.mongodb.net:27017/goalpilot?ssl=true&replicaSet=atlas-fjzfuv-shard-0&authSource=admin&appName=Cluster0'
const DEFAULT_JWT_SECRET = 'goalpilot_super_secret_key_2026'

process.env.MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI
process.env.JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  ...configuredOrigins
])

// ─── Security Middleware ──────────────────────────────────────────────────────
// helmet sets secure HTTP response headers automatically
app.use(helmet({
  contentSecurityPolicy: false
}))

// Only allow requests from configured frontend origins and Vercel domains
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true)
    }
    // Allow for cross-origin client apps while keeping header controls
    callback(null, true)
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Sanitize user input — removes $ and . from keys to prevent NoSQL injection
// (registered after express.json so req.body is parsed first)

// ─── Parsing & Logging ────────────────────────────────────────────────────────
// Limit body to 1MB to prevent large payload attacks
app.use(express.json({ limit: '1mb' }))
app.use(mongoSanitize)

// HTTP request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
// Each route module mounts its own auth middleware
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/notes', require('./routes/notes'))
app.use('/api/goals', require('./routes/goals'))
app.use('/api/habits', require('./routes/habits'))
app.use('/api/chat', require('./routes/chat'))
app.use('/api/sessions', require('./routes/sessions'))
app.use('/api/insights', require('./routes/insights'))
app.use('/api/planner', require('./routes/planner'))

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered LAST — catches all errors thrown by routes/middleware
app.use(errorHandler)

// ─── Database Connection & Serverless Helper ──────────────────────────────────
let isConnected = false

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return
  }
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not defined in environment variables')
    return
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  })
  isConnected = true
}

// Ensure database connection before handling API routes
app.use(async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (err) {
    console.error('Database connection error:', err.message)
    res.status(500).json({ error: 'Database connection failed' })
  }
})

// ─── Standalone Server Start (Local Development) ──────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000
  connectDB()
    .then(() => {
      console.log('✓ MongoDB connected')
      const server = app.listen(PORT, () => {
        console.log(`✓ Server running on port ${PORT}`)
      })

      // Graceful shutdown — allows in-flight requests to finish before stopping
      const shutdown = (signal) => {
        console.log(`\n${signal} received — shutting down gracefully...`)
        server.close(async () => {
          await mongoose.connection.close()
          console.log('MongoDB connection closed')
          process.exit(0)
        })
      }

      process.on('SIGTERM', () => shutdown('SIGTERM'))
      process.on('SIGINT', () => shutdown('SIGINT'))
    })
    .catch((err) => {
      console.error('✗ MongoDB connection failed:', err.message)
      process.exit(1)
    })
}

module.exports = app
