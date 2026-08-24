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

export const register = (data) => API.post('/auth/register', data)
export const login = (data) => API.post('/auth/login', data)
export const getMe = () => API.get('/auth/me')

export const getTasks = () => API.get('/tasks')
export const createTask = (task) => API.post('/tasks', task)
export const updateTask = (id, data) => API.patch(`/tasks/${id}`, data)
export const deleteTask = (id) => API.delete(`/tasks/${id}`)

export const getNotes = () => API.get('/notes')
export const createNote = (note) => API.post('/notes', note)
export const updateNote = (id, data) => API.patch(`/notes/${id}`, data)
export const summarizeNote = (id) => API.post(`/notes/${id}/summarize`)
export const deleteNote = (id) => API.delete(`/notes/${id}`)

export const getGoals = () => API.get('/goals')
export const createGoal = (goal) => API.post('/goals', goal)
export const updateGoal = (id, data) => API.patch(`/goals/${id}`, data)
export const deleteGoal = (id) => API.delete(`/goals/${id}`)

export const sendMessage = (message) => API.post('/chat', { message })
export const getChatHistory = () => API.get('/chat/history')
export const clearChatHistory = () => API.delete('/chat/history')

export const getSessions = () => API.get('/sessions')
export const getSession = (id) => API.get(`/sessions/${id}`)
export const createSession = () => API.post('/sessions')
export const sendSessionMessage = (id, message) => API.post(`/sessions/${id}/message`, { content: message, message })
export const deleteSession = (id) => API.delete(`/sessions/${id}`)

export const getHabits = () => API.get('/habits')
export const createHabit = (data) => API.post('/habits', data)
export const toggleHabit = (id, date) => API.patch(`/habits/${id}/toggle`, { date })
export const deleteHabit = (id) => API.delete(`/habits/${id}`)

export const getInsights = () => API.get('/insights')
export const getDailyPlan = () => API.get('/planner')
