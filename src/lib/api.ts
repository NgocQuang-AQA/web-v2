export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:4000'
  const p = path.startsWith('http://') || path.startsWith('https://') ? path : (path.startsWith('/') ? path : `/${path}`)
  return `${base}${p}`
}
