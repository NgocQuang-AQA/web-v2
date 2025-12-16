import { useEffect, useState } from 'react'
import { apiUrl } from '../../lib/api'

type Row = { id?: string; time?: string; from?: string; content?: string; session?: string; modelVersion?: string }

export default function ChatDock() {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadHistory = async () => {
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/chat/history'))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRows(Array.isArray(json?.items) ? json.items : [])
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>
      const anyDetail = (ce as unknown as { detail?: unknown }).detail
      const q = typeof anyDetail === 'string' ? anyDetail : ''
      if (q) setInput(q)
    }
    window.addEventListener('chat:fill', handler as EventListener)
    return () => {
      window.removeEventListener('chat:fill', handler as EventListener)
    }
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    setInput('')
    try {
      const res = await fetch(apiUrl('/api/chat/gemini'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadHistory()
    } catch (e) {
      setError(String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white shadow-soft p-3 flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Type message or use quick actions..."
        />
        <button
          className="rounded-xl bg-indigo-600 text-white text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          onClick={send}
          disabled={sending || input.trim().length === 0}
        >
          Send
        </button>
      </div>
      <div className="rounded-2xl bg-white shadow-soft p-3 space-y-3">
        {rows.length === 0 && <div className="text-sm text-gray-500">No messages</div>}
        {(() => {
          const latestSession = rows[0]?.session || ''
          const lastUser = rows.find(r => r.session === latestSession && r.from === 'user') || rows.find(r => r.from === 'user')
          const lastGemini = rows.find(r => r.session === latestSession && r.from === 'gemini') || rows.find(r => r.from === 'gemini')
          const fmtTime = (s?: string) => {
            if (!s) return ''
            const d = new Date(s)
            const pad = (n: number) => String(n).padStart(2, '0')
            return `${pad(d.getHours())}:${pad(d.getMinutes())}`
          }
          return (
            <>
              {lastUser && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 text-right">Admin • {fmtTime(lastUser.time)}</div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-3 py-2 rounded-xl text-sm bg-indigo-600 text-white">
                      {lastUser.content || ''}
                    </div>
                  </div>
                </div>
              )}
              {lastGemini && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">{lastGemini.modelVersion || 'Gemini'} • {fmtTime(lastGemini.time)}</div>
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-800">
                      {lastGemini.content || ''}
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        })()}
        {error && <div className="text-xs text-rose-600">{error}</div>}
      </div>
    </div>
  )
}
