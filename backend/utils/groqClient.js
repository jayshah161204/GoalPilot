const Groq = require('groq-sdk')
const AppError = require('./AppError')

/** @type {Groq | null} */
let client = null

/**
 * Returns a shared Groq SDK client, created on first use.
 *
 * Lazy initialization keeps the server bootable when GROQ_API_KEY is absent —
 * only AI routes that actually call the API will fail with a clear 503.
 *
 * @returns {Groq}
 */
function getGroqClient () {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || !apiKey.trim()) {
    throw new AppError(
      'AI service is not configured. Add GROQ_API_KEY to your backend .env file.',
      503
    )
  }

  if (!client) {
    client = new Groq({ apiKey })
  }

  return client
}

module.exports = { getGroqClient }
