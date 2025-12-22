import { useEffect, useState } from 'react'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import QuickActionsBar from '../features/actions/QuickActionsBar'
import ChatDock from '../features/chat/ChatDock'
import { apiFetch } from '../lib/api'

type HistoryMessage = {
  id?: string
  time?: string | null
  from?: string
  content?: string
  modelVersion?: string
}

type HistorySession = {
  session?: string
  startedAt?: string | null
  finishedAt?: string | null
  messages?: HistoryMessage[]
}

function TestHistoryPanel() {
  const [items, setItems] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    let canceled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/reports/history?page=${page}&pageSize=${page === 1 ? 4 : 5}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!canceled) {
          const next = Array.isArray(json?.items) ? (json.items as HistorySession[]) : []
          setItems(page === 1 ? next : [...items, ...next])
          setHasMore(next.length > 0)
        }
      } catch (e) {
        if (!canceled) setError(String(e))
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    load()
    return () => { canceled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const fmtTime = (s?: string | null) => {
    if (!s) return ''
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const preview = (s?: string) => {
    const v = String(s || '').trim()
    if (!v) return ''
    return v
  }

  const sortMessages = (msgs: HistoryMessage[] | undefined) => {
    if (!Array.isArray(msgs)) return []
    const fromRank = (f?: string) => {
      const v = String(f || '').toLowerCase()
      if (v === 'user') return 0
      if (v === 'gemini') return 1
      return 2
    }
    const toMs = (s?: string | null) => {
      if (!s) return null
      const d = new Date(s)
      const ms = d.getTime()
      return Number.isNaN(ms) ? null : ms
    }
    return msgs.slice().sort((a, b) => {
      const ams = toMs(a.time)
      const bms = toMs(b.time)
      if (ams != null && bms != null && ams !== bms) return ams - bms
      if (ams != null && bms == null) return -1
      if (ams == null && bms != null) return 1
      const ar = fromRank(a.from)
      const br = fromRank(b.from)
      if (ar !== br) return ar - br
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
  }

  const firstUser = (msgs: HistoryMessage[] | undefined) => {
    if (!Array.isArray(msgs)) return null
    return msgs.find(m => String(m.from || '').toLowerCase() === 'user') || null
  }

  const firstGemini = (msgs: HistoryMessage[] | undefined) => {
    if (!Array.isArray(msgs)) return null
    return msgs.find(m => String(m.from || '').toLowerCase() === 'gemini') || null
  }

  const onClickSession = (it: HistorySession) => {
    const msgs = sortMessages(it.messages)
    const rows = msgs.map(m => ({ ...m, session: it.session }))
    window.dispatchEvent(new CustomEvent('chat:load-session', { detail: { rows } }))
  }

  const sentinelRef = (el: HTMLDivElement | null) => {
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.disconnect()
          if (!loading && hasMore) setPage((p) => p + 1)
          break
        }
      }
    }, { root: null, threshold: 0.1 })
    io.observe(el)
  }

  return (
    <div className="rounded-2xl bg-white shadow-soft p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Chat History</div>
        {loading && <div className="text-xs text-gray-500">Loading…</div>}
      </div>

      {!loading && items.length === 0 && !error && (
        <div className="mt-2 text-sm text-gray-500">No history</div>
      )}

      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((it, idx) => {
            const t0 = fmtTime(it.startedAt)
            const t1 = fmtTime(it.finishedAt)
            const range = t0 && t1 ? `${t0} → ${t1}` : t0 || t1 || ''
            const msgs = sortMessages(it.messages)
            const user = firstUser(msgs)
            const gemini = firstGemini(msgs)
            const title = String(user?.content || '').split('\n')[0]
            return (
              <button key={it.session || String(idx)} className="w-full text-left rounded-xl border border-gray-100 p-3 hover:bg-gray-50" onClick={() => onClickSession(it)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900">{title || 'New chat'}</div>
                  {range && <div className="text-xs text-gray-500">{range}</div>}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {user?.content ? preview(user.content) : (gemini?.content ? preview(gemini.content) : 'Empty session')}
                </div>
              </button>
            )
          })}
          <div ref={sentinelRef} />
        </div>
      )}

      {error && <div className="mt-2 text-xs text-rose-600">{error}</div>}
    </div>
  )
}

export default function TestAutomationAgent() {
  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="space-y-4">
        <QuickActionsBar />
        <ChatDock />
        <TestHistoryPanel />
      </div>
    </AppLayout>
  )
}
