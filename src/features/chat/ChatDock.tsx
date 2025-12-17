import { useEffect, useState } from 'react'
import { apiUrl } from '../../lib/api'
import Loading from '../../components/Loading'
import NoData from '../../assets/no-data-found_585024-42.avif'

type Row = { id?: string; time?: string; from?: string; content?: string; session?: string; modelVersion?: string }

export default function ChatDock() {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadHistory = async (session?: string) => {
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/chat/history'))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const items = Array.isArray(json?.items) ? (json.items as Row[]) : []
      setRows(session ? items.filter(r => String(r.session || '') === session) : items)
    } catch (e) {
      setError(String(e))
    }
  }

  // do not auto-load history on mount; show no-data until user sends or selects a session

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

  useEffect(() => {
    const handler = (e: Event) => {
      const anyDetail = (e as unknown as { detail?: unknown }).detail
      const payload = anyDetail as { rows?: Row[] }
      const arr = Array.isArray(payload?.rows) ? payload.rows : []
      if (arr.length > 0) setRows(arr)
    }
    window.addEventListener('chat:load-session', handler as EventListener)
    return () => {
      window.removeEventListener('chat:load-session', handler as EventListener)
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
      const json = await res.json()
      const responseId = String(json?.responseId || '')
      await loadHistory(responseId || undefined)
    } catch (e) {
      setError(String(e))
    } finally {
      setSending(false)
    }
  }

  const renderBoldMarkdown = (content: string) => {
    const lines = content.split('\n')
    return (
      <>
        {lines.map((line, lineIndex) => {
          const parts: Array<string | { bold: string }> = []
          const re = /\*\*(.+?)\*\*/g
          let lastIndex = 0
          for (const match of line.matchAll(re)) {
            const start = match.index ?? 0
            if (start > lastIndex) parts.push(line.slice(lastIndex, start))
            parts.push({ bold: match[1] ?? '' })
            lastIndex = start + match[0].length
          }
          if (lastIndex < line.length) parts.push(line.slice(lastIndex))

          return (
            <span key={lineIndex}>
              {parts.map((p, partIndex) =>
                typeof p === 'string' ? (
                  <span key={partIndex}>{p}</span>
                ) : (
                  <strong key={partIndex} className="font-semibold">
                    {p.bold}
                  </strong>
                )
              )}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </span>
          )
        })}
      </>
    )
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
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white text-sm px-3 py-2 shadow-soft hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"

          onClick={send}
          disabled={sending || input.trim().length === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
          <span className="font-medium">Send</span>

        </button>
      </div>
      <div className="rounded-2xl bg-white shadow-soft p-3 space-y-3">
        {sending && (
          <div className="py-6">
            <Loading />
          </div>
        )}
        {!sending && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <img src={NoData} alt="No data" className="w-32 h-32 object-contain opacity-80" />
            <div className="mt-2 text-sm text-gray-500">No chat yet. Send a message or select a session below.</div>
          </div>
        )}
        {(() => {
          const toMs = (s?: string) => {
            if (!s) return null
            const d = new Date(s)
            const ms = d.getTime()
            return Number.isNaN(ms) ? null : ms
          }
          const fmtTime = (s?: string) => {
            if (!s) return ''
            const d = new Date(s)
            const pad = (n: number) => String(n).padStart(2, '0')
            return `${pad(d.getHours())}:${pad(d.getMinutes())}`
          }
          const fromRank = (f?: string) => {
            const v = String(f || '').toLowerCase()
            if (v === 'user') return 0
            if (v === 'gemini') return 1
            return 2
          }
          const msgs = (!sending ? rows : []).slice().sort((a, b) => {
            const ams = toMs(a.time) || 0
            const bms = toMs(b.time) || 0
            if (ams !== bms) return ams - bms
            const ar = fromRank(a.from)
            const br = fromRank(b.from)
            if (ar !== br) return ar - br
            const aid = String(a.id || '')
            const bid = String(b.id || '')
            return aid.localeCompare(bid)
          })
          return (
            <>
              {msgs.map((m, idx) => {
                const isUser = String(m.from || '').toLowerCase() === 'user'
                const label = isUser ? 'Admin' : (m.modelVersion || 'Gemini')
                return (
                  <div key={m.id || String(idx)} className="space-y-1">
                    <div className={`text-xs text-gray-500 ${isUser ? 'text-right' : ''}`}>{label} • {fmtTime(m.time)}</div>
                    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words ${isUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {renderBoldMarkdown(m.content || '')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )
        })()}
        {error && <div className="text-xs text-rose-600">{error}</div>}
      </div>
    </div>
  )
}
