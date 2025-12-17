import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import { apiUrl } from '../lib/api'
import Loading from '../components/Loading'

type Doc = { id?: string; _id?: string; name?: string; time_insert?: string }

export default function GlobalReportDetail() {
  const { id } = useParams()
  const location = useLocation()
  const collection = (() => {
    const p = location.pathname
    if (p.startsWith('/reports/global-cn-live/')) return 'global-cn-live'
    if (p.startsWith('/reports/global-live/')) return 'global-live'
    if (p.startsWith('/reports/global-cn/')) return 'global-cn'
    return 'global-qa'
  })()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    async function load() {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiUrl(`/api/files/${collection}/${id}`))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: Doc = await res.json()
        if (!canceled) setDoc(data)
      } catch (e) {
        if (!canceled) setError(String(e))
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    load()
    return () => { canceled = true }
  }, [collection, id])

  const fmtTime = (v?: string) => {
    if (!v) return ''
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  }

  const src = id ? apiUrl(`/api/files/${collection}/${id}/static/index.html`) : ''
  const fallbackTitle = (() => {
    if (collection === 'global-cn') return 'GlobalCN QA Report'
    if (collection === 'global-cn-live') return 'GlobalCN Live Report'
    if (collection === 'global-live') return 'Global Live Report'
    return 'Global QA Report'
  })()

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{doc?.name || fallbackTitle}</div>
            <div className="text-xs text-gray-500">{fmtTime(doc?.time_insert)}</div>
          </div>
          {loading && <Loading />}
          {error && <div className="text-sm text-rose-600 mt-2">{error}</div>}
        </div>
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <iframe title="Serenity Report" src={src} className="w-full h-[75vh] rounded-xl border" />
        </div>
      </div>
    </AppLayout>
  )
}
