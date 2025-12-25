import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatBotModal from '../features/chat/ChatBotModal'
import NotificationsModal from '../features/notices/NotificationsModal'
import { clearAuth, getAuthUsername } from '../lib/api'

export default function Topbar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const username = getAuthUsername()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1" />
      {/* Search input & Ask button hidden per request */}

      <div className="ml-2 pl-2 border-l border-gray-200">
        <div className="hs-dropdown relative inline-flex" ref={dropdownRef}>
          <button 
            id="hs-dropdown-with-icons" 
            type="button" 
            className="hs-dropdown-toggle py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:pointer-events-none" 
            aria-haspopup="menu" 
            aria-expanded={isDropdownOpen} 
            aria-label="Dropdown"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {username}
            <svg className={`size-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <div className={`hs-dropdown-menu transition-[opacity,margin] duration ${isDropdownOpen ? 'opacity-100 block' : 'opacity-0 hidden'} min-w-60 bg-white shadow-md rounded-lg mt-2 divide-y divide-gray-200 absolute right-0 top-full z-50`} role="menu" aria-orientation="vertical" aria-labelledby="hs-dropdown-with-icons">
            <div className="py-3 px-4">
              <p className="text-sm text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-800">{username}</p>
            </div>
            <div className="p-1 space-y-0.5">
              <button className="w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100" onClick={() => { setNotifOpen(true); setIsDropdownOpen(false) }}>
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                Notifications
              </button>
              <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100" href="#">
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Profile
              </a>
              <button onClick={handleLogout} className="w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100">
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>

      <ChatBotModal open={open} onClose={() => setOpen(false)} />
      <NotificationsModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
