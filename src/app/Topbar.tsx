import { useState } from 'react'
import ChatBotModal from '../features/chat/ChatBotModal'

export default function Topbar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const onSubmit = () => {
    const q = query.trim()
    if (!q) return
    setOpen(true)
  }
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-500">General Chat</div>
        <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">2</span>
      </div>
      <div className="flex-1" />
      <input
        className="w-full lg:w-1/2 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
      />
      <button className="rounded-xl bg-indigo-600 text-white text-sm px-3 py-2" onClick={onSubmit}>Ask</button>
      <ChatBotModal open={open} initialQuestion={query} onClose={() => setOpen(false)} />
    </div>
  )
}
