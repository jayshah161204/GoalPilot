/**
 * Extracts a user-facing message from an Axios error response.
 * Backend routes use either `error` (AppError / validation) or `message` (legacy).
 */
export function getApiErrorMessage (err, fallback = 'Something went wrong') {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data.error === 'string') {
    // Show specific field error if available (e.g. "Password must be at least 6 characters")
    if (Array.isArray(data.details) && data.details.length > 0) {
      return data.details.map(d => d.message).join('. ')
    }
    return data.error
  }
  if (typeof data.message === 'string') return data.message
  return fallback
}
