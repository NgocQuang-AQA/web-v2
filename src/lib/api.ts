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
