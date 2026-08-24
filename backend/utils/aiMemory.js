const UserMemory = require('../models/userMemory')

function normalizeList (value, limit = 8) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const out = []

  for (const item of value) {
    if (typeof item !== 'string') continue
    const text = item.trim().replace(/\s+/g, ' ')
    if (text.length < 3 || text.length > 180) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }

  return out
}

function formatMemoryForPrompt (memory) {
  if (!memory) return 'No persistent memory saved yet.'

  const lines = []
  if (memory.summary) lines.push(`SUMMARY: ${memory.summary}`)
  if (memory.focusAreas?.length) lines.push(`FOCUS AREAS: ${memory.focusAreas.join('; ')}`)
  if (memory.preferences?.length) lines.push(`PREFERENCES: ${memory.preferences.join('; ')}`)
  if (memory.constraints?.length) lines.push(`CONSTRAINTS: ${memory.constraints.join('; ')}`)

  return lines.length ? lines.join('\n') : 'No persistent memory saved yet.'
}

async function getUserMemory (userId) {
  return UserMemory.findOne({ userId }).lean()
}

async function updateUserMemoryFromConversation ({ userId, userMessage, assistantReply, currentMemory, groq }) {
  if (!groq || !userMessage || typeof userMessage !== 'string') return null

  const current = currentMemory || await getUserMemory(userId)
  const memoryText = formatMemoryForPrompt(current)

  const system = `You maintain long-term memory for a productivity coaching app.
Extract only stable, useful facts that should help future coaching.
Do not store secrets, passwords, temporary moods, one-off tasks, or medical claims.
Return ONLY valid JSON with this shape:
{"summary":"one short paragraph or empty string","focusAreas":["string"],"preferences":["string"],"constraints":["string"]}

Rules:
- Keep existing useful memory unless the new message clearly updates it.
- Focus areas are domains/goals like DSA, college, fitness, business, job search.
- Preferences are coaching style, language, schedule, motivation style, or output style.
- Constraints are recurring limitations like exams, limited time, night study, weak topic areas.
- Use English only.
- Maximum 8 items per array.`

  const payload = JSON.stringify({
    existingMemory: memoryText,
    userMessage,
    assistantReply
  })

  const { getChatCompletion } = require('./groqClient')
  const raw = await getChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: payload }
    ],
    max_tokens: 450,
    temperature: 0.1
  }).catch(() => '{}')
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return current

  let parsed
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch (_) {
    return current
  }

  const update = {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 900) : current?.summary || '',
    focusAreas: normalizeList(parsed.focusAreas),
    preferences: normalizeList(parsed.preferences),
    constraints: normalizeList(parsed.constraints),
    updatedAt: new Date()
  }

  return UserMemory.findOneAndUpdate(
    { userId },
    { $set: update },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  ).lean()
}

module.exports = {
  formatMemoryForPrompt,
  getUserMemory,
  updateUserMemoryFromConversation
}
