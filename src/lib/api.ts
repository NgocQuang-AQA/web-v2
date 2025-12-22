export function apiUrl(path: string): string {
  const rawPath = String(path || '').trim()
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath

  const p = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

  const baseRaw = import.meta.env.VITE_API_URL
  const baseTrimmed = (baseRaw == null ? '' : String(baseRaw)).trim()

  if (!baseTrimmed) {
    if (import.meta.env.DEV) return `http://localhost:4000${p}`
    return p
  }

  const baseNoTrailingSlash = baseTrimmed.endsWith('/') ? baseTrimmed.slice(0, -1) : baseTrimmed
  return `${baseNoTrailingSlash}${p}`
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path)
  const token =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null) ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('auth_token') : null) ||
    ''
  const headers = new Headers(init?.headers || {})
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...init, headers })
}
