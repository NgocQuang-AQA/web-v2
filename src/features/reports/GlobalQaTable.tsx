import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Loading from '../../components/Loading'
import NoData from '../../assets/no-data-found_585024-42.avif'
import { apiFetch } from '../../lib/api'

type AnyRecord = Record<string, unknown>
type FilesResponse = { total: number; items: AnyRecord[] }

type Props = {
  title?: string | null
  collection?: string
  detailPathPrefix?: string
  embedded?: boolean
  showSearch?: boolean
  nameOverride?: string
  reloadEpoch?: number
}

const StopIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
  </svg>
)
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
)
const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
  </svg>
)

export default function GlobalQaTable({ title = 'Report Generator', collection = 'global-qa', detailPathPrefix = '/reports/global', embedded = false, showSearch = true, nameOverride, reloadEpoch = 0 }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState<AnyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initParams = new URLSearchParams(window.location.search)
  const initPage = Number(initParams.get('page')) || 1
  const initPageSize = Number(initParams.get('pageSize')) || 10
  const initSortBy = (initParams.get('sortBy') as 'name' | 'time_insert') || 'time_insert'
  const initOrder = (initParams.get('order') as 'asc' | 'desc') || 'desc'
  const initName = initParams.get('name') || ''
  const [page, setPage] = useState(initPage)
  const [pageSize, setPageSize] = useState(initPageSize)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'time_insert'>(initSortBy)
  const [order, setOrder] = useState<'asc' | 'desc'>(initOrder)
  const [name, setName] = useState(initName)
  const effectiveName = nameOverride ?? name

  const updateQuery = (patch: Record<string, unknown>) => {
    const params = new URLSearchParams(location.search)
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '') params.delete(k)
      else params.set(k, String(v))
    })
    const s = params.toString()
    navigate({ pathname: location.pathname, search: s ? `?${s}` : '' }, { replace: true })
  }


  useEffect(() => {
    let canceled = false
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sortBy, order })
    if (effectiveName) params.set('name', effectiveName)
    apiFetch(`/api/files/${collection}?${params.toString()}`)
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
  }, [collection, page, pageSize, sortBy, order, effectiveName, reloadEpoch])

  const displayKeys = (() => {
    const first = items[0] || {}
    const keys = Object.keys(first).filter((k) => {
      if (k === '_id' || k === 'id' || k === '__v') return false
      const lower = k.toLowerCase()
      if (lower === 'size') return false
      if (lower === 'path') return false
      if (lower === 'tidate') return false
      if (k === '_tiDate') return false
      return true
    })
    const preferred = ['name', 'status', 'suite', 'time_insert', 'createdAt']
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
    <div className={embedded ? '' : 'rounded-2xl bg-white shadow-soft p-4'}>
      {title ? <div className="font-semibold mb-3">{title}</div> : null}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="text-sm text-rose-600">Error: {error}</div>
      ) : items.length === 0 ? (
        <div className="relative w-full flex items-center justify-center py-6">
          <img src={NoData} alt="No data" className="max-h-64 w-auto object-contain opacity-80 rounded-xl" />
        </div>
      ) : (
        <>
          {showSearch && (
            <form
              className="flex items-center gap-3 mb-3"
              onSubmit={(e) => {
                e.preventDefault()
                setLoading(true)
                setPage(1)
                updateQuery({ name, page: 1 })
              }}
            >
              <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Search by Name" />
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white text-sm px-3 py-2 shadow-soft hover:bg-indigo-700 active:scale-[0.98] transition" type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <span className="font-medium">Search</span>
              </button>
            </form>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2">#</th>
                  {displayKeys.map((k) => {
                    const sortable = k === 'time_insert' || k === 'name'
                    const active = sortable && sortBy === k
                    const IconEl = active ? (order === 'asc' ? ChevronUpIcon : ChevronDownIcon) : StopIcon
                    return (
                      <th
                        key={k}
                        className={`px-3 py-2 capitalize ${sortable ? 'cursor-pointer select-none' : ''}`}
                        onClick={() => {
                          if (!sortable) return
                          setLoading(true)
                          setPage(1)
                          if (sortBy === k) {
                            setOrder((o) => {
                              const no = o === 'asc' ? 'desc' : 'asc'
                              updateQuery({ sortBy, order: no, page: 1 })
                              return no as 'asc' | 'desc'
                            })
                          } else {
                            const nb = k as 'name' | 'time_insert'
                            setSortBy(nb)
                            setOrder('asc')
                            updateQuery({ sortBy: nb, order: 'asc', page: 1 })
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{k.replace('_', ' ')}</span>
                          {sortable && <IconEl className={`size-4 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const id = getId(it)
                  return (
                  <tr key={id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { if (id) navigate(`${detailPathPrefix}/${id}`) }}>
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
                  updateQuery({ pageSize: sz, page: 1 })
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
                    const np = page - 1
                    setPage(np)
                    updateQuery({ page: np })
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
                    const np = page + 1
                    setPage(np)
                    updateQuery({ page: np })
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
