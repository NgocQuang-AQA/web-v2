import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NoData from '../assets/no-data-found_585024-42.avif'
import { apiFetch } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [name, setName] = useState(() => localStorage.getItem('remember_me_username') || '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => !!localStorage.getItem('remember_me_username'))
  const [error, setError] = useState<string | null>(null)
  const [imgSrc, setImgSrc] = useState<string>('/signin-image.jpg')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name || !password) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }
    const run = async () => {
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data?.message || 'Đăng nhập thất bại')
          return
        }
        const token: string = String(data?.token || '')
        const role: string = String(data?.role || '')
        const username: string = String(data?.username || '')
        const menus: string[] = Array.isArray(data?.menus) ? data.menus : []

        if (token) {
          if (remember) {
            localStorage.setItem('auth_token', token)
            localStorage.setItem('remember_me_username', username)
          } else {
            sessionStorage.setItem('auth_token', token)
            localStorage.removeItem('remember_me_username')
          }
          localStorage.setItem('auth_role', role)
          localStorage.setItem('auth_username', username)
          localStorage.setItem('auth_menus', JSON.stringify(menus))
        }
        const go = (() => {
          const r = role.toUpperCase()
          if (r === 'OTHER' || r === 'USER') return '/agents/notes'
          if (r === 'BA') return '/agents/notes'
          return '/agents/daily'
        })()
        navigate(go)
      } catch {
        setError('Đăng nhập thất bại')
      }
    }
    run()
  }

  return (
    <div className="min-h-screen w-full bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 rounded-2xl bg-white shadow-soft p-6 md:min-h-[420px]">
        <div className="flex items-center justify-center">
          <img src={imgSrc} alt="Illustration" className="max-h-72 w-auto object-contain rounded-xl" onError={() => setImgSrc(NoData)} />
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Log in</div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="border-b border-gray-200 pb-1 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 1 1 16.5 0v.75H4.5v-.75Z" />
              </svg>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full outline-none text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="border-b border-gray-200 pb-1 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-.75 11.25h10.5A2.25 2.25 0 0 0 19.5 19.5v-6.75A2.25 2.25 0 0 0 17.25 10.5H6.75A2.25 2.25 0 0 0 4.5 12.75V19.5a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full outline-none text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            {error && <div className="text-xs text-rose-600">{error}</div>}
            <div className="pt-2">
              <button type="submit" className="rounded-xl bg-indigo-600 text-white text-sm px-4 py-2 hover:bg-indigo-700 active:scale-[0.98] transition">
                Log in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
