import axios from 'axios'

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (import.meta.env.PROD) return '/api'
  return 'http://localhost:5000/api'
}

const API = axios.create({ baseURL: getBaseURL() })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only auto-logout for protected routes, NOT for login/register failures
    const url = error.config?.url || ''
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register')
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// Simple in-memory cache for fast navigation
const cache = new Map()

const getCached = async (key, fetcher) => {
  if (cache.has(key)) {
    // Return cached immediately, but fetch in background to stay fresh (stale-while-revalidate)
    fetcher().then(res => cache.set(key, res)).catch(() => {})
    return cache.get(key)
  }
  const res = await fetcher()
  cache.set(key, res)
  return res
}

const clearCache = (key) => cache.delete(key)

export const register = (data) => API.post('/auth/register', data)
export const login = (data) => API.post('/auth/login', data)
export const googleLogin = (data) => API.post('/auth/google', data)
export const getMe = () => API.get('/auth/me')

export const getTasks = () => getCached('tasks', () => API.get('/tasks'))
export const createTask = (task) => { clearCache('tasks'); return API.post('/tasks', task) }
export const updateTask = (id, data) => { clearCache('tasks'); return API.patch(`/tasks/${id}`, data) }
export const deleteTask = (id) => { clearCache('tasks'); return API.delete(`/tasks/${id}`) }

export const getNotes = () => getCached('notes', () => API.get('/notes'))
export const createNote = (note) => { clearCache('notes'); return API.post('/notes', note) }
export const updateNote = (id, data) => { clearCache('notes'); return API.patch(`/notes/${id}`, data) }
export const summarizeNote = (id) => { clearCache('notes'); return API.post(`/notes/${id}/summarize`) }
export const deleteNote = (id) => { clearCache('notes'); return API.delete(`/notes/${id}`) }

export const getGoals = () => getCached('goals', () => API.get('/goals'))
export const createGoal = (goal) => { clearCache('goals'); return API.post('/goals', goal) }
export const updateGoal = (id, data) => { clearCache('goals'); return API.patch(`/goals/${id}`, data) }
export const deleteGoal = (id) => { clearCache('goals'); return API.delete(`/goals/${id}`) }

export const sendMessage = (message) => API.post('/chat', { message })
export const getChatHistory = () => API.get('/chat/history')
export const clearChatHistory = () => API.delete('/chat/history')

export const getSessions = () => API.get('/sessions')
export const getSession = (id) => API.get(`/sessions/${id}`)
export const createSession = () => API.post('/sessions')
export const sendSessionMessage = (id, message) => {
  clearCache('tasks'); clearCache('goals'); clearCache('notes'); clearCache('habits')
  return API.post(`/sessions/${id}/message`, { content: message, message })
}
export const deleteSession = (id) => API.delete(`/sessions/${id}`)

export const getHabits = () => getCached('habits', () => API.get('/habits'))
export const createHabit = (data) => { clearCache('habits'); return API.post('/habits', data) }
export const toggleHabit = (id, date) => { clearCache('habits'); return API.patch(`/habits/${id}/toggle`, { date }) }
export const deleteHabit = (id) => { clearCache('habits'); return API.delete(`/habits/${id}`) }

export const getInsights = () => API.get('/insights')
export const getDailyPlan = () => API.get('/planner')
