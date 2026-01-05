import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAuthUsername } from '../lib/api'
import { sendLog } from '../lib/logger'
import Topbar from './Topbar'
import GlobalAlert from './GlobalAlert'
import { agents } from '../data/mock/agents'
import { getAuthMenus, getAuthRole } from '../lib/api'

type Props = { sidebar: ReactNode; children: ReactNode }

export default function AppLayout({ sidebar, children }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = getAuthRole()
  const menus = getAuthMenus()

  const visibleAgents = agents.filter(a => {
    if (menus && menus.length > 0) {
      return menus.includes(a.id)
    }
    const r = role.toUpperCase()
    if (r === 'BA') {
      return ['report', 'notes'].includes(a.id)
    }
    if (r === 'BE') {
      return !['jira', 'cases'].includes(a.id)
    }
    if (r === 'OTHER' || r === 'USER') {
      return ['notes'].includes(a.id)
    }
    return true
  })

  const activeId = (() => {
    const pathname = location.pathname
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

  useEffect(() => {
    const username = getAuthUsername()
    const meta = { pathname: location.pathname, username }
    void sendLog({ level: 'info', message: 'Route Change', source: 'Router', meta })
  }, [location.pathname])

  const handleNav = (path: string) => {
    setMobileOpen(false)
    navigate(path)
  }

  return (
    <div className="min-h-screen w-full bg-base">
      <div className="w-full grid grid-cols-1 lg:grid-cols-[280px,minmax(0,1fr)] gap-3 md:gap-4 lg:gap-6 p-2 md:p-4 lg:p-6">
        <aside className="h-full hidden lg:block">{sidebar}</aside>
        <main className="h-full">
          <Topbar onOpenMenu={() => setMobileOpen(true)} />
          <GlobalAlert />
          {children}
        </main>
      </div>

      <div className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`absolute left-0 top-0 h-full w-4/5 max-w-[320px] z-20 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full bg-white shadow-soft relative flex flex-col">
            <button 
              aria-label="Close menu" 
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full z-30" 
              onClick={() => setMobileOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>

            <div className="flex-1 overflow-y-auto px-4 pt-16 pb-6">
              <nav className="space-y-2">
                {visibleAgents.map(a => {
                  const active = a.id === activeId
                  const base = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left'
                  const tone = active ? 'ring-1 ring-indigo-200 bg-indigo-50 text-indigo-700' : 'text-gray-800'
                  return (
                    <button 
                      key={a.id} 
                      onClick={() => handleNav(`/agents/${a.id}`)} 
                      className={`${base} ${tone}`}
                    >
                      <span className="text-xl">{a.icon}</span>
                      <span className="text-sm font-medium">{a.name}</span>
                    </button>
                  )
                })}

                {role.toUpperCase() === 'ADMIN' && (
                  <button
                    onClick={() => handleNav('/admin/accounts')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left ${
                      location.pathname.startsWith('/admin/accounts') ? 'ring-1 ring-indigo-200 bg-indigo-50 text-indigo-700' : 'text-gray-800'
                    }`}
                  >
                    <span className="text-xl">👥</span>
                    <span className="text-sm font-medium">Account Management</span>
                  </button>
                )}
              </nav>
            </div>
          </div>
        </div>
        <div className={`absolute inset-0 bg-black/30 transition-opacity duration-300 z-10 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMobileOpen(false)} />
      </div>
    </div>
  )
}
