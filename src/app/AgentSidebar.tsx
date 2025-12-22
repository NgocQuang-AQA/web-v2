import StatusDot from '../components/StatusDot'
import { agents } from '../data/mock/agents'
import { Link, useLocation } from 'react-router-dom'

export default function AgentSidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const role = (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_role') : '') || 'Guest'
  const storedMenus = (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_menus') : null)
  let menus: string[] = []
  try {
    menus = storedMenus ? JSON.parse(storedMenus) : []
  } catch {
    menus = []
  }

  const visibleAgents = agents.filter(a => {
    if (menus && menus.length > 0) {
      return menus.includes(a.id)
    }
    const r = role.toUpperCase()
    if (r === 'BA') {
      return ['report', 'notes'].includes(a.id)
    }
    if (r === 'BE') {
      // BE: hide JIRA, Test Case
      return !['jira', 'cases'].includes(a.id)
    }
    if (r === 'OTHER' || r === 'USER') {
      // User: only Helper VOC
      return ['notes'].includes(a.id)
    }
    return true // Admin or others see all
  })

  const activeId = (() => {
    if (pathname === '/' || pathname.startsWith('/agents/daily')) return 'daily'
    if (pathname.startsWith('/agents/ta')) return 'ta'
    if (pathname.startsWith('/agents/report')) return 'report'
    if (pathname.startsWith('/reports/global/')) return 'report'
    if (pathname.startsWith('/reports/global-cn/')) return 'report'
    if (pathname.startsWith('/reports/global-live/')) return 'report'
    if (pathname.startsWith('/reports/global-cn-live/')) return 'report'
    const m = pathname.match(/^\/agents\/(\w+)/)
    if (m) return m[1]
    return ''
  })()
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">Report Preview</div>
        {/* <div className="text-sm bg-indigo-50 text-indigo-600 rounded-lg px-2 py-1">7</div> */}
      </div>
      <div className="space-y-3">
        {visibleAgents.map(a => {
          const active = a.id === activeId
          const base = 'w-full flex items-center justify-between rounded-xl px-4 py-3 bg-gray-50 hover:bg-gray-100'
          const tone = active ? 'bg-indigo-50 hover:bg-indigo-100 ring-1 ring-indigo-200' : ''
          const cls = `${base} ${tone}`
          return (
          <Link to={`/agents/${a.id}`} key={a.id} className={cls} aria-current={active ? 'page' : undefined}>
            <div className="flex items-center gap-3">
              <div className="text-xl">{a.icon}</div>
              <div className={`text-sm font-medium ${active ? 'text-indigo-700' : ''}`}>{a.name}</div>
            </div>
            <div className="flex items-center gap-2">
              {a.counters?.map((c, i) => (
                <span key={i} className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">{c}</span>
              ))}
              <StatusDot status={a.status} />
            </div>
          </Link>
          )
        })}

        {role.toUpperCase() === 'ADMIN' && (
          <Link
            to="/admin/accounts"
            className={`w-full flex items-center justify-between rounded-xl px-4 py-3 bg-gray-50 hover:bg-gray-100 ${
              pathname.startsWith('/admin/accounts') ? 'bg-indigo-50 hover:bg-indigo-100 ring-1 ring-indigo-200' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-xl">👥</div>
              <div className={`text-sm font-medium ${pathname.startsWith('/admin/accounts') ? 'text-indigo-700' : ''}`}>
                Account Management
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
