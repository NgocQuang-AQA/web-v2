import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import Topbar from '../app/Topbar'
import StatCard from '../features/stats/StatCard'
import Loading from '../components/Loading'
import { apiUrl } from '../lib/api'

type Breakdown = { qaError: number; cnError: number; qaFail: number; cnFail: number }
type RootCauseBySource = { qa: string[]; cn: string[] }
type ExBySource = { qa: Record<string, unknown> | null; cn: Record<string, unknown> | null }
type ApiResponse = { totalError: number; totalFail: number; breakdown: Breakdown; rootCause: RootCauseBySource; ex: ExBySource }

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (v && typeof v === 'object') return Object.keys(v as Record<string, unknown>)
  return []
}

export default function BugTracker() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedQa, setExpandedQa] = useState<Record<string, boolean>>({})
  const [expandedCn, setExpandedCn] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let canceled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiUrl('/api/reports/errors-fails'))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: ApiResponse = await res.json()
        if (!canceled) setData(json)
      } catch (e) {
        if (!canceled) setError(String(e))
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    load()
    return () => { canceled = true }
  }, [])

  const qaRoot = useMemo(() => data?.rootCause.qa || [], [data])
  const cnRoot = useMemo(() => data?.rootCause.cn || [], [data])

  const exQa = useMemo(() => (data?.ex.qa ? data.ex.qa : {}), [data])
  const exCn = useMemo(() => (data?.ex.cn ? data.ex.cn : {}), [data])

  const renderRootList = (roots: string[], exMap: Record<string, unknown>, expanded: Record<string, boolean>, setExpanded: (f: Record<string, boolean>) => void) => {
    if (!roots.length) return <div className="text-sm text-gray-500">Không có dữ liệu</div>
    return (
      <div className="space-y-2">
        {roots.map((r) => {
          const isOpen = expanded[r]
          const exVal = exMap[r]
          const items = toList(exVal)
          return (
            <div key={r} className="rounded-xl border border-gray-200 bg-white">
              <button className="w-full flex items-center justify-between px-3 py-2" onClick={() => setExpanded({ ...expanded, [r]: !isOpen })}>
                <div className="text-sm font-medium text-gray-800">{r}</div>
                <div className="text-xs text-gray-500">{isOpen ? 'Ẩn' : 'Xem ví dụ'}</div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  {items.length ? (
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {items.slice(0, 10).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                      {items.length > 10 && <li>+{items.length - 10} nữa</li>}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-500">Không có ví dụ</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <Topbar />
      <div className="space-y-4">
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="font-semibold mb-2">Bug Tracker</div>
          {loading ? (
            <Loading />
          ) : error ? (
            <div className="text-sm text-rose-600">{error}</div>
          ) : data ? (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Error" value={String(data.totalError)} tone="danger" />
              <StatCard label="Total Fail" value={String(data.totalFail)} tone="warning" />
            </div>
          ) : (
            <div className="text-sm text-gray-500">Không có dữ liệu</div>
          )}
          {data && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
              <span className="rounded-full bg-rose-50 text-rose-700 px-2 py-0.5">QA Error: {data.breakdown.qaError}</span>
              <span className="rounded-full bg-rose-50 text-rose-700 px-2 py-0.5">CN Error: {data.breakdown.cnError}</span>
              <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">QA Fail: {data.breakdown.qaFail}</span>
              <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">CN Fail: {data.breakdown.cnFail}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white shadow-soft p-4">
            <div className="font-semibold mb-2">Top Root Causes • QA</div>
            {renderRootList(qaRoot, exQa as Record<string, unknown>, expandedQa, setExpandedQa)}
          </div>
          <div className="rounded-2xl bg-white shadow-soft p-4">
            <div className="font-semibold mb-2">Top Root Causes • CN</div>
            {renderRootList(cnRoot, exCn as Record<string, unknown>, expandedCn, setExpandedCn)}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
