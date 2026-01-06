import { Navigate, useLocation } from 'react-router-dom'
import { getAuthRole, getAuthToken } from '../lib/api'

export default function Protected({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const token = getAuthToken()
  const role = getAuthRole()

  if (!token) return <Navigate to="/login" replace />

  const r = role.toUpperCase()
  const p = location.pathname

  if (p.startsWith('/admin/') && r !== 'ADMIN') {
    return <Navigate to="/404" replace />
  }

  if (r === 'BA') {
    // Allow: /agents/notes, /agents/report, and report details /reports/...
    const allowed =
      p.startsWith('/agents/notes') ||
      p.startsWith('/agents/report') ||
      p.startsWith('/reports/')

    if (!allowed) {
      return <Navigate to="/404" replace />
    }
  }

  return <>{children}</>
}
