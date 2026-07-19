/**
 * dateUtils.js — Shared date/time helper functions.
 *
 * Extracted from Dashboard.jsx, Habits.jsx, and Tasks.jsx to eliminate
 * code duplication. Import these instead of redefining locally.
 */

/**
 * Converts a Date object or date string to a 'YYYY-MM-DD' key.
 * Used for grouping tasks by day on the Dashboard.
 *
 * @param {Date|string} value
 * @returns {string} Date in 'YYYY-MM-DD' format
 */
export const dateKey = (value) => {
  const d = value instanceof Date ? value : new Date(value)
  return d.toISOString().split('T')[0]
}

/**
 * Converts a 'YYYY-MM-DD' key to a human-readable label like "Today", "Yesterday", or "Mon, Jul 7".
 *
 * @param {string} key - Date in 'YYYY-MM-DD' format
 * @returns {string} Human-readable label
 */
export const formatDateKey = (key) => {
  const today = dateKey(new Date())
  const yesterday = dateKey(new Date(Date.now() - 86400000))
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  return new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * Converts a Date object to a 'YYYY-MM-DD' string for habit completion tracking.
 *
 * @param {Date} date
 * @returns {string} Date in 'YYYY-MM-DD' format
 */
export const toDateStr = (date) => date.toISOString().split('T')[0]

/**
 * Calculates the current consecutive-day streak for a habit.
 * Counts backwards from today, stopping at the first missing day.
 *
 * @param {string[]} completedDates - Array of 'YYYY-MM-DD' strings
 * @returns {number} Current streak in days
 */
export const getStreak = (completedDates) => {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (completedDates.includes(toDateStr(d))) streak++
    else break
  }
  return streak
}

/**
 * Calculates the longest consecutive-day streak ever achieved for a habit.
 *
 * @param {string[]} completedDates - Array of 'YYYY-MM-DD' strings
 * @returns {number} Longest streak in days
 */
export const getLongestStreak = (completedDates) => {
  if (!completedDates.length) return 0
  const sorted = [...completedDates].sort()
  let longest = 1
  let current = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr - prev) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

/**
 * Returns an array of the last 365 days as 'YYYY-MM-DD' strings.
 * Used to render the habit heatmap grid.
 *
 * @returns {string[]} Array of 365 date strings
 */
export const getLast365Days = () => {
  const days = []
  const today = new Date()
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(toDateStr(d))
  }
  return days
}

/**
 * Determines if a task is overdue (has a due date that has passed and is not completed).
 *
 * @param {{ completed: boolean, dueDate: string|null }} task
 * @returns {boolean}
 */
export const isOverdue = (task) => {
  if (task.completed || !task.dueDate) return false
  return new Date(task.dueDate) < new Date()
}
