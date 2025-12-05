import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Loading from '../../components/Loading'

type AnyRecord = Record<string, unknown>
type FilesResponse = { total: number; items: AnyRecord[] }

export default function GlobalQaTable() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AnyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'time_insert' | 'size'>('time_insert')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    let canceled = false
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sortBy, order })
    if (from) {
      const d = new Date(from)
      if (!Number.isNaN(d.getTime())) params.set('from', d.toISOString())
    }
    if (to) {
      const d = new Date(to)
      if (!Number.isNaN(d.getTime())) params.set('to', d.toISOString())
    }
    fetch(`http://localhost:4000/api/files/global-qa?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: FilesResponse = await res.json()
        if (!canceled) {
          setItems(Array.isArray(data.items) ? data.items : [])
          setTotal(Number(data.total) || 0)
        }
      })
      .catch((e) => {
        if (!canceled) setError(String(e))
      })
      .finally(() => {
        if (!canceled) setLoading(false)
      })
    return () => {
      canceled = true
    }
  }, [page, pageSize, sortBy, order, from, to])

  const displayKeys = (() => {
    const first = items[0] || {}
    const keys = Object.keys(first).filter((k) => k !== '_id' && k !== 'id' && k !== '__v')
    const preferred = ['name', 'size', 'status', 'suite', 'time_insert', 'createdAt']
    const uniq = preferred.filter((k) => keys.includes(k))
    const rest = keys.filter((k) => !uniq.includes(k))
    return [...uniq, ...rest].slice(0, 5)
  })()

  const getId = (it: AnyRecord) => String((it as AnyRecord).id ?? (it as AnyRecord)._id ?? '')
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1)
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = Math.min(total, page * pageSize)
  const prevDisabled = loading || page <= 1
  const nextDisabled = loading || page >= pageCount

  const formatTimeInsert = (v: unknown) => {
    let d: Date | null = null
    if (typeof v === 'number') {
      d = new Date(v)
    } else if (typeof v === 'string') {
      const num = Number(v)
      if (!Number.isNaN(num)) {
        d = new Date(num)
      } else {
        const parsed = Date.parse(v)
        if (!Number.isNaN(parsed)) d = new Date(parsed)
      }
    }
    if (!d || Number.isNaN(d.getTime())) return String(v ?? '')
    const pad = (x: number) => String(x).padStart(2, '0')
    // Use UTC methods to display the exact time from DB without timezone conversion
    return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  }

  return (
    <div className="rounded-2xl bg-white shadow-soft p-4">
      <div className="font-semibold mb-3">Report Generator</div>
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="text-sm text-rose-600">Error: {error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">No data</div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="text-sm text-gray-600">From</div>
            <input
              type="datetime-local"
              className="rounded-xl border border-gray-200 px-2 py-1 text-sm"
              value={from}
              onChange={(e) => { setLoading(true); setPage(1); setFrom(e.target.value) }}
            />
            <div className="text-sm text-gray-600">To</div>
            <input
              type="datetime-local"
              className="rounded-xl border border-gray-200 px-2 py-1 text-sm"
              value={to}
              onChange={(e) => { setLoading(true); setPage(1); setTo(e.target.value) }}
            />
            <div className="text-sm text-gray-600">Sort</div>
            <select
              className="rounded-xl border border-gray-200 px-2 py-1 text-sm"
              value={sortBy}
              onChange={(e) => { setLoading(true); setPage(1); setSortBy(e.target.value as 'name' | 'time_insert' | 'size') }}
            >
              <option value="time_insert">time insert</option>
              <option value="name">name</option>
              <option value="size">size</option>
            </select>
            <select
              className="rounded-xl border border-gray-200 px-2 py-1 text-sm"
              value={order}
              onChange={(e) => { setLoading(true); setPage(1); setOrder(e.target.value as 'asc' | 'desc') }}
            >
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2">#</th>
                  {displayKeys.map((k) => (
                    <th key={k} className="px-3 py-2 capitalize">{k.replace('_', ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const id = getId(it)
                  return (
                  <tr key={id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { if (id) navigate(`/reports/global/${id}`) }}>
                    <td className="px-3 py-2 text-gray-500">{(page - 1) * pageSize + idx + 1}</td>
                    {displayKeys.map((k) => {
                      let v = (it as AnyRecord)[k]
                      if (k === 'time_insert') v = formatTimeInsert(v)
                      if (k === '_tiDate') v = formatTimeInsert(v)
                      if (v == null) v = ''
                      if (typeof v === 'object') v = JSON.stringify(v)
                      return (
                        <td key={k} className="px-3 py-2">{String(v)}</td>
                      )
                    })}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">Showing {startIdx}-{endIdx} of {total}</div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">Rows</div>
              <select
                className="rounded-xl border border-gray-200 px-2 py-1 text-sm"
                value={pageSize}
                onChange={(e) => {
                  const sz = Number(e.target.value)
                  setLoading(true)
                  setPage(1)
                  setPageSize(sz)
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <div className="text-sm text-gray-600">Page {page} / {pageCount}</div>
              <button
                className={`rounded-xl bg-gray-200 text-gray-700 text-sm px-3 py-1.5 ${prevDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                disabled={prevDisabled}
                onClick={() => {
                  if (page > 1) {
                    setLoading(true)
                    setPage(page - 1)
                  }
                }}
              >
                Previous
              </button>
              <button
                className={`rounded-xl bg-indigo-600 text-white text-sm px-3 py-1.5 ${nextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                disabled={nextDisabled}
                onClick={() => {
                  if (page < pageCount) {
                    setLoading(true)
                    setPage(page + 1)
                  }
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
