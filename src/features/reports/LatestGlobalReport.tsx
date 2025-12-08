import { useEffect, useState } from 'react'
import ProgressBar from '../../components/ProgressBar'
import Loading from '../../components/Loading'
import { apiUrl } from '../../lib/api'

type Summary = {
  counts: { passed: number; failed: number; broken: number; skipped: number; unknown: number }
  total: number
  percent: number
}

type Latest = { id?: string; _id?: string; name?: string; path?: string; time_insert?: string }

export default function LatestGlobalReport() {
  const [qa, setQa] = useState<{ latest: Latest | null; summary: Summary | null } | null>(null)
  const [cn, setCn] = useState<{ latest: Latest | null; summary: Summary | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiUrl('/api/files/latest-summary'))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: { qa?: { latest: Latest | null; summary: Summary | null }; cn?: { latest: Latest | null; summary: Summary | null } } = await res.json()
        if (!canceled) {
          setQa(data.qa || null)
          setCn(data.cn || null)
        }
      } catch (e) {
        if (!canceled) setError(String(e))
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    load()
    return () => { canceled = true }
  }, [])

  const formatTime = (v?: string) => {
    if (!v) return ''
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  }

  if (loading) return <Loading />
  if (error) return <div className="text-sm text-rose-600">{error}</div>
  if (!qa && !cn) return <div className="text-sm text-gray-500">Không có dữ liệu</div>

  const renderCard = (pair: { latest: Latest | null; summary: Summary | null } | null, fallbackTitle: string) => {
    if (!pair || !pair.latest || !pair.summary) return <div className="text-sm text-gray-500">Không có dữ liệu</div>
    const t: 'success' | 'warning' | 'danger' = pair.summary.percent >= 95 ? 'success' : pair.summary.percent >= 80 ? 'warning' : 'danger'
    return (
      <div className="rounded-2xl bg-white shadow-soft p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${t === 'success' ? 'bg-green-100 text-green-700' : t === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{t}</span>
            <div className="font-medium">{pair.latest.name || fallbackTitle}</div>
          </div>
          <div className="text-xs text-gray-500">{formatTime(pair.latest.time_insert)}</div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-green-700">{pair.summary.counts.passed} Passing</div>
          <div className="text-rose-700">{pair.summary.counts.failed} Failed</div>
          <div className="text-amber-700">{pair.summary.counts.broken} Broken/Flaky</div>
          <div className="text-gray-500">{pair.summary.percent}%</div>
          <div className="text-gray-500">{pair.summary.total} tests</div>
        </div>
        <div className="mt-3">
          <ProgressBar percent={pair.summary.percent} tone={t} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {renderCard(qa, 'Global QA Latest')}
      {renderCard(cn, 'Global CN Latest')}
    </div>
  )
}
