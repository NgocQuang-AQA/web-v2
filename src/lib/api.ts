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

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_ROLE_KEY = 'auth_role'
const AUTH_USERNAME_KEY = 'auth_username'
const AUTH_MENUS_KEY = 'auth_menus'
const REMEMBER_USERNAME_KEY = 'remember_me_username'

export function getAuthToken(): string {
  return (
    (typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null) ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(AUTH_TOKEN_KEY) : null) ||
    ''
  )
}

export function getAuthRole(): string {
  return (typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_ROLE_KEY) : '') || 'Guest'
}

export function getAuthUsername(): string {
  return (typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_USERNAME_KEY) : '') || 'User'
}

export function getAuthMenus(): string[] {
  const raw = (typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_MENUS_KEY) : null) || ''
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function setAuthSession(input: {
  token: string
  role: string
  username: string
  menus: string[]
  remember: boolean
}): void {
  const token = String(input?.token || '')
  const role = String(input?.role || '')
  const username = String(input?.username || '')
  const menus = Array.isArray(input?.menus) ? input.menus : []
  const remember = Boolean(input?.remember)

  if (!token) return

  if (remember) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(REMEMBER_USERNAME_KEY, username)
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.removeItem(REMEMBER_USERNAME_KEY)
  }

  localStorage.setItem(AUTH_ROLE_KEY, role)
  localStorage.setItem(AUTH_USERNAME_KEY, username)
  localStorage.setItem(AUTH_MENUS_KEY, JSON.stringify(menus))
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_ROLE_KEY)
  localStorage.removeItem(AUTH_USERNAME_KEY)
  localStorage.removeItem(AUTH_MENUS_KEY)
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path)
  const token = getAuthToken()
  const headers = new Headers(init?.headers || {})
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...init, headers })
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await apiFetch(path, init)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
