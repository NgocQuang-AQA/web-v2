import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import { apiJson } from '../../lib/api'

type Notice = { id?: string; _id?: string; content?: string; title?: string; createdAt?: string; time_insert?: string }

type Props = {
  open: boolean
  onClose: () => void
}

export default function NotificationsModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Notice[]>([])

  const fetchNotices = async () => {
    setLoading(true)
    setError(null)
    setItems([])
    const payload = await apiJson<unknown>('/api/notices?page=1&pageSize=5')
    const arr = extractNotices(payload)
    if (!arr) setError('Không thể tải thông báo')
    else setItems(arr)
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    const run = async () => {
      await fetchNotices()
    }
    run()
    return () => {
    }
  }, [open])

  const fmtTime = (s?: string) => {
    const v = String(s || '')
    if (!v) return ''
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${m}/${y} ${hh}:${mm}`
  }

  const hasData = useMemo(() => items.length > 0, [items])

  return (
    <Modal open={open} title="Notifications" onClose={onClose} unmountOnClose={false}>
      {loading ? (
        <div className="py-2">
          <div className="w-full h-full min-h-24 rounded-md border border-blue-300 p-4">
            <div className="flex animate-pulse space-x-4">
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 rounded bg-gray-200"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 h-2 rounded bg-gray-200"></div>
                    <div className="col-span-1 h-2 rounded bg-gray-200"></div>
                  </div>
                  <div className="h-2 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="text-sm text-rose-600">{error}</div>
      ) : hasData ? (
        <div className="space-y-2">
          {items.map((n, idx) => (
            <div key={n.id || n._id || String(idx)} className="flex items-start gap-3 rounded-xl bg-gray-50 px-3 py-2 border border-gray-100">
              <div className="mt-0.5 text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{n.content || ''}</div>
                {fmtTime(n.createdAt || n.time_insert) && (
                  <div className="mt-1 text-xs text-gray-500">{fmtTime(n.createdAt || n.time_insert)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-2 text-sm text-gray-500">Không có thông báo</div>
      )}
    </Modal>
  )
}

function extractNotices(payload: unknown): Notice[] | null {
  const tryArray = (val: unknown): Notice[] | null => {
    if (!Array.isArray(val)) return null
    return val.map((x) => {
      const obj = typeof x === 'object' && x != null ? (x as Record<string, unknown>) : {}
      return {
        id: typeof obj.id === 'string' ? obj.id : undefined,
        _id: typeof obj._id === 'string' ? obj._id : undefined,
        content: typeof obj.content === 'string' ? obj.content : undefined,
        title: typeof obj.title === 'string' ? obj.title : undefined,
        createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : undefined,
        time_insert: typeof obj['time_insert'] === 'string' ? (obj['time_insert'] as string) : undefined,
      }
    })
  }
  if (payload == null) return null
  const direct = tryArray(payload)
  if (direct) return direct
  if (typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  const keys = ['notices', 'items', 'data', 'list', 'rows']
  for (const k of keys) {
    const v = obj[k]
    const arr = tryArray(v)
    if (arr) return arr
  }
  const data = obj['data']
  if (typeof data === 'object' && data != null) {
    const nested = tryArray((data as Record<string, unknown>)['items'] || (data as Record<string, unknown>)['notices'] || (data as Record<string, unknown>)['rows'])
    if (nested) return nested
  }
  return null
}
