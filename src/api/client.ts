// Strips trailing slash so callers can always write apiBase + '/api/...'
export const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
