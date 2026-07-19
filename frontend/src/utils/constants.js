/** Custom events for cross-page data refresh after AI agent changes */
export const APP_EVENTS = {
  TASKS_UPDATED: 'goalpilot:tasks-updated',
  GOALS_UPDATED: 'goalpilot:goals-updated',
  NOTES_UPDATED: 'goalpilot:notes-updated',
  HABITS_UPDATED: 'goalpilot:habits-updated'
}

/**
 * constants.js — App-wide constants and configuration data.
 *
 * Extracted from Dashboard.jsx, Habits.jsx, Goals.jsx, and Planner.jsx.
 * Centralizing these here makes them easy to update without hunting through
 * multiple page files.
 */

// ─── Habits ───────────────────────────────────────────────────────────────────

/** Available habit colors */
export const HABIT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#10B981', '#06B6D4'
]

/** Available habit icons with their react-icons component IDs */
export const HABIT_ICON_IDS = [
  'activity', 'book', 'droplet', 'music', 'sun', 'moon',
  'heart', 'code', 'pen', 'coffee', 'briefcase', 'smile', 'zap'
]

/** Month abbreviations for habit heatmap labels */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Goals ────────────────────────────────────────────────────────────────────

/** Celebration messages shown when a goal reaches 100% */
export const GOAL_COMPLETION_MESSAGES = [
  "🎉 You crushed it! This goal is complete — now chase the next one.",
  "🏆 Goal achieved. That's what consistency looks like.",
  "🚀 100%! Time to set your sights even higher.",
  "✨ Done and dusted. You should be proud of this one.",
  "💪 Goal complete! Your discipline is showing.",
  "🎯 Bullseye! You hit your target. On to the next mission.",
  "⚡ Another goal falls. You're on a roll — keep it going.",
  "🌟 100% complete. This is what growth looks like.",
  "🔥 Goal demolished. You're built different.",
  "🙌 Done! Every completed goal is a brick in your foundation."
]

// ─── Planner / Priority ───────────────────────────────────────────────────────

/** Text colors for priority badges */
export const PRIORITY_COLOR = { high: 'var(--danger)', medium: 'var(--orange)', low: 'var(--success)' }
/** Background colors for priority badges */
export const PRIORITY_BG = { high: 'var(--danger-soft)', medium: 'var(--orange-soft)', low: 'var(--success-soft)' }
/** Border colors for priority badges */
export const PRIORITY_BORDER = { high: 'var(--danger-border)', medium: 'var(--orange-border)', low: 'var(--success-border)' }

// ─── Dashboard ────────────────────────────────────────────────────────────────

/** Motivational quotes shown on the Dashboard — curated for Indian students & youth */
export const DASHBOARD_MOTIVATION = [
  // Focus & consistency
  { quote: "Ek kadam ek waqt. Consistency beats talent every single time.", author: "GoalPilot" },
  { quote: "Don't count the days — make the days count.", author: "Muhammad Ali" },
  { quote: "Khud pe yakeen rakho. Self-belief is the first chapter of every success story.", author: "GoalPilot" },
  { quote: "Small steps daily. Bada sapna slowly.", author: "GoalPilot" },
  { quote: "Your only competition is who you were yesterday.", author: "GoalPilot" },
  { quote: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { quote: "Jo log practice chhod dete hain, unhe doosra le jaata hai unki jagah.", author: "GoalPilot" },
  { quote: "The grind is silent. The results are loud.", author: "GoalPilot" },
  { quote: "Kal ka kaam aaj karo, aaj ka kaam abhi.", author: "Kabir Das" },
  { quote: "Hard work works when nothing else does. Keep pushing.", author: "GoalPilot" },
  // Hustle & ambition
  { quote: "Sapne bade rakhna. Mehnat aur badi rakhna.", author: "GoalPilot" },
  { quote: "Your 20s are your golden decade — don't sleep through them.", author: "GoalPilot" },
  { quote: "Beta, coding ka ek bug fix karna bhi progress hai. Celebrate it.", author: "GoalPilot" },
  { quote: "IIT, IIM, startup — rasta jo bhi ho, kaam karna padega. No shortcut.", author: "GoalPilot" },
  { quote: "India's next big story is being written by someone your age. Make it yours.", author: "GoalPilot" },
  { quote: "Exam pressure real hai — but so is your ability to handle it.", author: "GoalPilot" },
  { quote: "Log kya kahenge? Vo log wahan honge jahan tum 3 saal baad honge? Soch ke dekho.", author: "GoalPilot" },
  { quote: "First generation learners build first generation empires.", author: "GoalPilot" },
  { quote: "A rejection from college doesn't define your ceiling. Your effort does.", author: "GoalPilot" },
  { quote: "Failure sirf ek data point hai — next experiment plan karo.", author: "GoalPilot" },
  // Deep work & productivity
  { quote: "Close the tab. Focus for 25 minutes. The world won't end.", author: "GoalPilot" },
  { quote: "Deep work is a superpower in a world full of distracted people.", author: "Cal Newport" },
  { quote: "Phone rakh. Kaam shuru kar. Bas itna hi hai.", author: "GoalPilot" },
  { quote: "Your attention is your most valuable resource — spend it wisely.", author: "GoalPilot" },
  { quote: "One hour of focused work beats four hours of distracted scrolling.", author: "GoalPilot" },
  { quote: "Pomodoro technique try karo. 25 min focus, 5 min break. Repeat.", author: "GoalPilot" },
  { quote: "The uncomfortable chair of hard work is always better than the comfortable bed of regret.", author: "GoalPilot" },
  { quote: "Aaj ka todo list complete karna kal ke self ke liye gift hai.", author: "GoalPilot" },
  { quote: "Study smarter, not just harder. Strategy matters as much as effort.", author: "GoalPilot" },
  // Mindset & resilience
  { quote: "Haar mat. Ruk mat. Bas thak lena — phir uthna.", author: "GoalPilot" },
  { quote: "Comparison is the thief of joy and the enemy of progress.", author: "Theodore Roosevelt" },
  { quote: "Dosto ki CGPA mat dekho. Apna GPA improve karo.", author: "GoalPilot" },
  { quote: "A year from now, you'll wish you had started today.", author: "Karen Lamb" },
  { quote: "Uski success se jealous mat hona — usse inspired hona.", author: "GoalPilot" },
  { quote: "When you feel like quitting, remember why you started.", author: "GoalPilot" },
  { quote: "Zindagi mein shortcuts nahi hote — sirf smarter paths hote hain.", author: "GoalPilot" },
  { quote: "Rona allowed hai. Quit karna nahi.", author: "GoalPilot" },
  { quote: "Growth happens at the edge of your comfort zone. Stretch.", author: "GoalPilot" },
  { quote: "Every master was once a disaster. Stay patient.", author: "GoalPilot" },
  // Building skills & future
  { quote: "DSA, projects, communication — teen skills jo placement mein magic karte hain.", author: "GoalPilot" },
  { quote: "Build something real. Certificates are fine but code speaks louder.", author: "GoalPilot" },
  { quote: "Internship na mila? Side project banao. Portfolio khud banata hai.", author: "GoalPilot" },
  { quote: "Skills compound over time — start investing in them today.", author: "GoalPilot" },
  { quote: "GitHub green karo. LinkedIn update karo. Opportunities ayengi.", author: "GoalPilot" },
  { quote: "The best time to plant a tree was 20 years ago. The next best time is now.", author: "Chinese Proverb" },
  { quote: "Learning is earning — invest in your brain every single day.", author: "GoalPilot" },
  { quote: "Jo aaj seekhoge, woh 10 saal baad kaam aayega. Plant the seeds.", author: "GoalPilot" },
  // Health & balance
  { quote: "Neend poori lena productivity hack hai, laziness nahi.", author: "GoalPilot" },
  { quote: "Paani piyo. Stretch karo. 5 min walk karo. Dimag fresh hoga.", author: "GoalPilot" },
  { quote: "Hustle culture is real, but burnout is realer. Take breaks.", author: "GoalPilot" },
  { quote: "A healthy body powers a productive mind. Don't skip self-care.", author: "GoalPilot" }
]

/** Productivity window time ranges shown on the Dashboard */
export const PRODUCTIVE_WINDOWS = [
  { label: 'Early Bird', range: '5 AM – 9 AM', emoji: '🌅' },
  { label: 'Morning Flow', range: '9 AM – 12 PM', emoji: '☀️' },
  { label: 'Post-Lunch', range: '2 PM – 5 PM', emoji: '🌤️' },
  { label: 'Evening Focus', range: '7 PM – 10 PM', emoji: '🌙' }
]

/** LocalStorage keys for productivity window reminder feature */
export const FOCUS_REMINDER_ENABLED_KEY = 'focusReminderEnabled'
export const FOCUS_REMINDER_LAST_SENT_KEY = 'focusReminderLastSent'
export const MIN_COMPLETIONS_FOR_PROFILE = 5
export const RECENT_COMPLETION_DAYS = 14

/**
 * Determines the user's productivity profile based on task completion timestamps.
 * Returns a profile name + description if enough data exists.
 *
 * @param {{ completedAt: string }[]} tasks - Array of completed task objects
 * @returns {{ profile: string, desc: string }|null}
 */
export const getProductivityProfile = (tasks) => {
  const completedWithTime = tasks.filter(t => t.completedAt)
  if (completedWithTime.length < MIN_COMPLETIONS_FOR_PROFILE) return null

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RECENT_COMPLETION_DAYS)
  const recent = completedWithTime.filter(t => new Date(t.completedAt) > cutoff)
  if (recent.length < MIN_COMPLETIONS_FOR_PROFILE) return null

  const hours = recent.map(t => new Date(t.completedAt).getHours())
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length

  if (avg < 9) return { profile: '🌅 Early Bird', desc: 'You do your best work before 9 AM' }
  if (avg < 12) return { profile: '☀️ Morning Peak', desc: 'Mornings are your most productive hours' }
  if (avg < 15) return { profile: '🌤️ Midday Grinder', desc: 'You hit your stride around midday' }
  if (avg < 19) return { profile: '🌆 Afternoon Warrior', desc: 'Afternoons are when you get things done' }
  return { profile: '🦉 Night Owl', desc: 'You come alive after dark' }
}
