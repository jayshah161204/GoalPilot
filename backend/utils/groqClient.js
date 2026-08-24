const Groq = require('groq-sdk')
const AppError = require('./AppError')

/** @type {Groq | null} */
let client = null

const PRIMARY_MODEL = 'groq/compound-mini'
const FALLBACK_MODELS = ['groq/compound', 'openai/gpt-oss-20b']

/**
 * Returns a shared Groq SDK client, created on first use.
 *
 * @returns {Groq}
 */
function getGroqClient () {
  const apiKey = (process.env.GROQ_API_KEY || '').trim()
  if (!apiKey) {
    throw new AppError(
      'AI service is not configured. Add GROQ_API_KEY to your environment variables.',
      503
    )
  }

  if (!client) {
    client = new Groq({ apiKey })
  }

  return client
}

/**
 * Robust chat completion helper with automatic model fallback.
 *
 * @param {object} params
 * @param {Array<{role: string, content: string}>} params.messages
 * @param {number} [params.max_tokens=400]
 * @param {number} [params.temperature=0.4]
 * @param {string} [params.model]
 * @returns {Promise<string>}
 */
async function getChatCompletion ({ messages, max_tokens = 400, temperature = 0.4, model }) {
  const groq = getGroqClient()
  const candidateModels = model ? [model, PRIMARY_MODEL, ...FALLBACK_MODELS] : [PRIMARY_MODEL, ...FALLBACK_MODELS]

  let lastError = null
  for (const m of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        model: m,
        messages,
        max_tokens,
        temperature
      })
      const content = completion.choices?.[0]?.message?.content
      if (typeof content === 'string') {
        return content.trim()
      }
    } catch (err) {
      lastError = err
      console.warn(`[Groq] Model "${m}" failed: ${err.message}. Trying next candidate...`)
    }
  }

  throw lastError || new Error('Failed to get completion from Groq models')
}

module.exports = { getGroqClient, getChatCompletion, PRIMARY_MODEL }
