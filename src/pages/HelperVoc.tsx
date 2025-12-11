import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import Topbar from '../app/Topbar'
import Loading from '../components/Loading'

type Env = 'DEV' | 'STG' | 'PRD'
type TabKey = 'gdr' | 'gs' | 'practice' | 'nasmo_gdr' | 'nasmo_gs'

const envBase: Record<Env, string> = {
  DEV: 'https://dev-gvs-api.ggl-spazon.com',
  STG: 'https://dev-gvs-api.ggl-spazon.com',
  PRD: 'https://dev-gvs-api.ggl-spazon.com'
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function extractRows(json: unknown): { rows: Record<string, unknown>[]; total?: number; totalPages?: number } {
  if (!json || typeof json !== 'object') return { rows: [] }
  const j = json as Record<string, unknown>
  const dataUnknown = j.data as unknown
  let rowsUnknown: unknown = undefined
  if (Array.isArray(dataUnknown)) rowsUnknown = dataUnknown
  else if (dataUnknown && typeof dataUnknown === 'object') {
    const obj = dataUnknown as Record<string, unknown>
    if (Array.isArray(obj.items)) rowsUnknown = obj.items
  }
  if (!Array.isArray(rowsUnknown)) {
    if (Array.isArray(j.items)) rowsUnknown = j.items
    else if (Array.isArray(j.list)) rowsUnknown = j.list
  }
  const rows = Array.isArray(rowsUnknown) ? (rowsUnknown as Record<string, unknown>[]) : []
  const total = typeof j.total === 'number' ? j.total as number : (dataUnknown && typeof dataUnknown === 'object' && typeof (dataUnknown as Record<string, unknown>).total === 'number' ? (dataUnknown as Record<string, unknown>).total as number : undefined)
  const totalPages = typeof j.totalPages === 'number' ? j.totalPages as number : (dataUnknown && typeof dataUnknown === 'object' && typeof (dataUnknown as Record<string, unknown>).totalPages === 'number' ? (dataUnknown as Record<string, unknown>).totalPages as number : undefined)
  return { rows, total, totalPages }
}

function toLabel(key: string): string {
  const m: Record<string, string> = {
    tlCode: 'TL Code',
    code: 'Code',
    modeId: 'Mode id',
    modeName: 'Mode Name',
    timeStart: 'Time start',
    timeEnd: 'Time end'
  }
  return m[key] || key
}

function formatCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return v.toISOString()
  return JSON.stringify(v)
}

export default function HelperVoc() {
  const [env, setEnv] = useState<Env>('DEV')
  const [vocId, setVocId] = useState('')
  const [userNo, setUserNo] = useState<number | null>(null)
  const [active, setActive] = useState<TabKey>('gdr')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const base = envBase[env]

  const tabs = useMemo(() => (
    [
      { key: 'gdr', label: 'GDR', path: '/v1/helper/gdr' },
      { key: 'gs', label: 'GS', path: '/v1/helper/gs' },
      { key: 'practice', label: 'My Practice', path: '/v1/helper/my-practice' },
      { key: 'nasmo_gdr', label: 'Nasmo GDR', path: '/v1/helper/gdr-nasmo' },
      { key: 'nasmo_gs', label: 'Nasmo GS', path: '/v1/helper/gdr-nasmo' }
    ] as { key: TabKey; label: string; path: string }[]
  ), [])

  const currentPath = useMemo(() => tabs.find(t => t.key === active)?.path || tabs[0].path, [active, tabs])

  const search = async () => {
    const id = vocId.trim()
    if (!id) return
    setLoading(true)
    setError(null)
    setRows([])
    setPage(1)
    const url = `${base}/v1/helper/voc?vocId=${encodeURIComponent(id)}`
    const json = await fetchJson<{ success?: boolean; data?: { userNo?: number } }>(url)
    const no = json?.data?.userNo
    if (typeof no === 'number') {
      setUserNo(no)
    } else {
      setUserNo(null)
      setError('Không tìm thấy userNo')
    }
    setLoading(false)
  }

  useEffect(() => {
    let canceled = false
    async function load() {
      if (!userNo) return
      setLoading(true)
      setError(null)
      const url = `${base}${currentPath}?usrNo=${encodeURIComponent(String(userNo))}&page=${page}&size=${size}`
      const json = await fetchJson<unknown>(url)
      if (!canceled) {
        const { rows: r, totalPages: tp } = extractRows(json)
        setRows(Array.isArray(r) ? r : [])
        setTotalPages(tp)
        setLoading(false)
      }
    }
    load()
    return () => { canceled = true }
  }, [userNo, active, page, size, base, currentPath])

  const cols = useMemo(() => {
    const preferred = ['tlCode', 'code', 'modeId', 'modeName', 'timeStart', 'timeEnd']
    const keys = rows.length > 0 ? Object.keys(rows[0]) : []
    const reordered = preferred.filter(k => keys.includes(k)).concat(keys.filter(k => !preferred.includes(k)))
    return reordered
  }, [rows])

  const pagesToShow = useMemo(() => {
    const n = totalPages && totalPages > 0 ? totalPages : 5
    return Array.from({ length: n }, (_, i) => i + 1)
  }, [totalPages])

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <Topbar />
      <div className="space-y-4">
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative inline-block">
              <select value={env} onChange={e => setEnv(e.target.value as Env)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <option value="DEV">Environment: DEV</option>
                <option value="STG">Environment: STG</option>
                <option value="PRD">Environment: PRD</option>
              </select>
            </div>
            <input value={vocId} onChange={e => setVocId(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Nhập VOC ID" />
            <button className="rounded-xl bg-indigo-600 text-white text-sm px-3 py-2" onClick={search}>Search</button>
          </div>
          <div className="flex items-center gap-4 border-b border-gray-100">
            {tabs.map(t => (
              <button key={t.key} className={`px-3 py-2 text-sm ${active === t.key ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`} onClick={() => { setActive(t.key); setPage(1) }}>{t.label}</button>
            ))}
          </div>
          <div className="mt-3">
            {loading ? (
              <Loading />
            ) : error ? (
              <div className="text-sm text-rose-600">{error}</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-gray-500">Không có dữ liệu</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-3 py-2">#</th>
                      {cols.map(k => (
                        <th key={k} className="px-3 py-2">{toLabel(k)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2">{(page - 1) * size + idx + 1}</td>
                        {cols.map(k => (
                          <td key={k} className={`px-3 py-2 ${k === 'modeName' ? 'text-indigo-600' : ''}`}>{formatCell((row as Record<string, unknown>)[k])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <select value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1) }} className="rounded-xl border border-gray-200 px-2 py-1 text-sm">
                {[10, 20, 50].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg px-2 py-1 text-sm border border-gray-200" onClick={() => setPage(p => Math.max(1, p - 1))}>«</button>
              {pagesToShow.map(p => (
                <button key={p} className={`rounded-lg px-2 py-1 text-sm border ${page === p ? 'border-indigo-600 text-indigo-700' : 'border-gray-200 text-gray-700'}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="rounded-lg px-2 py-1 text-sm border border-gray-200" onClick={() => setPage(p => p + 1)}>»</button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
