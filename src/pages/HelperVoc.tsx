import { useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import Modal from '../components/Modal'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Env, TabKey, VocUser } from '../models/helperVoc'
import { envBase, flagByCode, tabsPreview, tabsReport, flagEtcSrc } from '../data/helperVoc'
import SearchForm from '../features/helpervoc/SearchForm'
import ReportSearchForm from '../features/helpervoc/ReportSearchForm'
import UserSummary from '../features/helpervoc/UserSummary'
import RecordsTable from '../features/helpervoc/RecordsTable'
import Pagination from '../features/helpervoc/Pagination'
import { fetchJson, extractRows } from '../utils/helperVoc'

 
 

export default function HelperVoc() {
  const location = useLocation()
  const navigate = useNavigate()
  const initParams = new URLSearchParams(window.location.search)
  const initEnv = (initParams.get('env') as Env) || 'DEV'
  const initVocId = initParams.get('vocId') || ''
  const initTab = (initParams.get('tab') as TabKey) || 'gdr'
  const initPage = Number(initParams.get('page')) || 1
  const initSize = Number(initParams.get('size')) || 10
  const initViewParam = initParams.get('view') || 'preview'
  const [view, setView] = useState<'preview' | 'report'>(initViewParam === 'report' ? 'report' : 'preview')
  const [env, setEnv] = useState<Env>(initEnv)
  const [vocId, setVocId] = useState(initVocId)
  const [user, setUser] = useState<VocUser | null>(null)
  // removed copied state; use alert for feedback
  const [active, setActive] = useState<TabKey>(initTab)
  const [page, setPage] = useState(initPage)
  const [size, setSize] = useState(initSize)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [swingOpen, setSwingOpen] = useState(false)
  const [swingUrls, setSwingUrls] = useState<string[]>([])
  const [alertOpen, setAlertOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null)
  const [alertMsg, setAlertMsg] = useState<string | null>(null)
  const initFrom = initParams.get('from') || ''
  const [from, setFrom] = useState(initFrom)
  const [submittedFrom, setSubmittedFrom] = useState('')
  const [searchEpoch, setSearchEpoch] = useState(0)
  const [noticeHiding, setNoticeHiding] = useState(false)

  const base = envBase[env]

  const tabsList = view === 'report' ? tabsReport : tabsPreview
  const currentPath = useMemo(() => tabsList.find(t => t.key === active)?.path || tabsList[0].path, [active, tabsList])

  const updateQuery = (patch: Record<string, unknown>) => {
    const params = new URLSearchParams(location.search)
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '') params.delete(k)
      else params.set(k, String(v))
    })
    const s = params.toString()
    navigate({ pathname: location.pathname, search: s ? `?${s}` : '' }, { replace: true })
  }

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (!vocId) return
    const run = async () => {
      const baseParam = envBase[env]
      setLoading(true)
      setError(null)
      setRows([])
      const url = `${baseParam}/v1/helper/voc?vocId=${encodeURIComponent(vocId)}`
      let json: { success?: boolean; data?: VocUser | null; error?: { debugMessage?: string } } | null = null
      try {
        const res = await fetch(url)
        try {
          json = await res.json()
        } catch {
          json = null
        }
        if (!res.ok) {
          const dbg = json?.error?.debugMessage
          if (dbg) {
            setAlertMsg(dbg)
            setAlertOpen(true)
          }
          setLoading(false)
          return
        }
      } catch {
        json = null
      }
      const u = json?.data ?? null
      if (u && typeof u.userNo === 'number') {
        setUser(u)
      } else {
        setUser(null)
        setError('User not found')
      }
      setLoading(false)
    }
    run()
  }, [vocId, env])

  const search = async () => {
    const id = vocId.trim()
    if (!id) return
    updateQuery({ env, vocId: id, tab: active, page: 1, size })
    setLoading(true)
    setError(null)
    setRows([])
    setPage(1)
    const url = `${base}/v1/helper/voc?vocId=${encodeURIComponent(id)}`
    let json: { success?: boolean; data?: VocUser | null; error?: { debugMessage?: string } } | null = null
    try {
      const res = await fetch(url)
      try {
        json = await res.json()
      } catch {
        json = null
      }
      if (!res.ok) {
        const dbg = json?.error?.debugMessage
        if (dbg) {
          setAlertMsg(dbg)
          setAlertOpen(true)
        }
        setLoading(false)
        return
      }
    } catch {
      json = null
    }
    const u = json?.data ?? null
    if (u && typeof u.userNo === 'number') {
      setUser(u)
    } else {
      setUser(null)
      setError('User not found')
    }
    setLoading(false)
  }

  useEffect(() => {
    let canceled = false
    async function load() {
      if (view !== 'report') return
      if (searchEpoch <= 0) return
      setLoading(true)
      setError(null)
      const fmtDate = (input: string): string => {
        if (!input) {
          const d = new Date()
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
        const d = new Date(input)
        if (Number.isNaN(d.getTime())) return input
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      const dateParam = fmtDate(submittedFrom)
      const url = `${base}${currentPath}?date=${encodeURIComponent(dateParam)}&page=${page}&size=${size}`
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
  }, [view, submittedFrom, searchEpoch, page, size, base, currentPath])
  
  useEffect(() => {
    let canceled = false
    async function loadPreview() {
      if (view !== 'preview') return
      const userNo = user?.userNo
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
    loadPreview()
    return () => { canceled = true }
  }, [view, user?.userNo, active, page, size, base, currentPath])

  const cols = useMemo(() => {
    if (view === 'report') {
      if (active === 'monthly') return ['month', 'year', 'numberOfUsers']
      if (active === 'tour') {
        const keys = rows.length > 0 ? Object.keys(rows[0]) : []
        const ordered = ['dt', '2', '4', '5', '6'].filter(k => keys.includes(k))
        return ordered.length ? ordered : keys
      }
      const keys = rows.length > 0 ? Object.keys(rows[0]) : []
      const preferred = ['date', 'time', 'timeStart', 'timeEnd', 'register_dt', 'regdate']
      const reordered = preferred.filter(k => keys.includes(k)).concat(keys.filter(k => !preferred.includes(k)))
      return reordered
    }
    if (active === 'gdr') {
      const preferred = ['tm_tlcode', 'tm_code', 'mode_id', 'modeName', 'tm_time_start', 'tm_time_end']
      return preferred
    } else if (active === 'gs') {
      const preferred = [
        'lockey',
        'pg_software',
        'store_no',
        'store_name',
        'game_no',
        'pg_cicode',
        'cc_name',
        'pg_tscode',
        'pg_timestart',
        'pg_timeend',
        'pg_date',
        'pr_playercnt',
        'total_hit',
        'pr_totplayhole',
        'pr_difficulty',
        'pg_saletype',
        'pg_mode',
        'modeName',
        'pg_unit_cd',
        'pg_isextreme',
        'pr_isend',
        'pg_concede',
        'pg_mulligan',
        'pg_tdcode',
        'round_code'
      ]
      return preferred
    } else if (active === 'nasmo_gdr') {
      const preferred = [
        'video_id',
        'nasmo_id',
        'file_store_code',
        'machine_id',
        'shop_id',
        'file_name',
        'view_type',
        'register_dt',
        'service_code',
        'file_extension',
        'status_code'
      ]
      const keys = rows.length > 0 ? Object.keys(rows[0]) : []
      const reordered = preferred.filter(k => keys.includes(k)).concat(keys.filter(k => !preferred.includes(k)))
      return reordered
    } else if (active === 'nasmo_gs') {
      const preferred = [
        'img_nm',
        'file_nm',
        'regdate',
        'game_no',
        'cc_no',
        'work_no',
        'club_no',
        'mov_no',
        'evt_no',
        'hole_no',
        'shot_no',
        'work_time',
        'ball',
        'distance',
        'gallery_yn',
        'store_yn',
        'is_enc'
      ]
      const keys = rows.length > 0 ? Object.keys(rows[0]) : []
      const reordered = preferred.filter(k => keys.includes(k)).concat(keys.filter(k => !preferred.includes(k)))
      return reordered
    } else if (active === 'practice') {
      const preferred = [
        'ts_micode',
        'td_tscode',
        'ts_code',
        'ts_time_start',
        'ts_time_end',
        'td_regdate',
        'ts_swing_video',
        'ts_sicode',
        'ts_swing_position'
      ]
      return preferred
    } else {
      const preferred = ['tlCode', 'code', 'modeId', 'modeName', 'timeStart', 'timeEnd']
      const keys = rows.length > 0 ? Object.keys(rows[0]) : []
      const reordered = preferred.filter(k => keys.includes(k)).concat(keys.filter(k => !preferred.includes(k)))
      return reordered
    }
  }, [rows, active, view])

  const filteredRows = useMemo(() => rows, [rows])

  const effectiveRows = view === 'report' ? filteredRows.slice((page - 1) * size, (page - 1) * size + size) : rows
  const pageCount = useMemo(() => {
    return Math.max(1, totalPages || 1)
  }, [totalPages])
  const prevDisabled = loading || page <= 1
  const nextDisabled = loading || page >= pageCount

  const flagSrc = useMemo(() => {
    const code = user?.countryCd || ''
    const upper = code ? code.toUpperCase() : ''
    return flagByCode[upper] || flagEtcSrc
  }, [user])

  const copySession = async () => {
    if (!user) return
    const text = `/gzsession ${user.userNo} ${user.userId} ${user.countryCd}`
    try {
      setNoticeMsg(`Copied '${text}' !`)
      setNoticeOpen(true)
      setNoticeHiding(false)
      setTimeout(() => {
        setNoticeHiding(true)
        setTimeout(() => setNoticeOpen(false), 1000)
      }, 3000)
    } catch {
      // ignore
    }
  }

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      {noticeOpen && noticeMsg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none shadow-lg alert alert-success ${noticeHiding ? 'alert-hide' : ''}`} role="alert">
          {noticeMsg}
        </div>
      )}
      <div className="space-y-4">
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="flex items-center gap-4 border-b border-gray-100 mb-3">
            <button className={`px-3 py-2 text-sm ${view === 'preview' ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`} onClick={() => { setView('preview'); setActive('gdr'); updateQuery({ view: 'preview', tab: 'gdr' }) }}>Preview VOC</button>
            <button className={`px-3 py-2 text-sm ${view === 'report' ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`} onClick={() => { setView('report'); setSubmittedFrom(from); setActive('monthly'); updateQuery({ view: 'report', tab: 'monthly', from }) }}>Report</button>
          </div>
          {view === 'preview' ? (
            <>
              <SearchForm
                env={env}
                vocId={vocId}
                onChangeEnv={(v: Env) => { setEnv(v); updateQuery({ env: v }) }}
                onChangeVocId={(v: string) => { setVocId(v); updateQuery({ vocId: v }) }}
                onSearch={search}
              />
              {user && <UserSummary user={user} flagSrc={flagSrc} onCopy={copySession} />}
            </>
          ) : (
            <>
              <ReportSearchForm
                env={env}
                from={from}
                onChangeEnv={(v: Env) => { setEnv(v); updateQuery({ env: v }) }}
                onChangeFrom={(v: string) => { setFrom(v); updateQuery({ from: v }) }}
                onSearch={() => {
                  setSubmittedFrom(from)
                  setPage(1)
                  setSearchEpoch(x => x + 1)
                  updateQuery({ env, from, page: 1, tab: active, size })
                }}
              />
            </>
          )}
          <div className="flex items-center gap-4 border-b border-gray-100">
            {tabsList.map((t) => (
              <button key={t.key} className={`px-3 py-2 text-sm ${active === t.key ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`} onClick={() => { setActive(t.key); setPage(1); updateQuery({ tab: t.key, page: 1 }) }}>{t.label}</button>
            ))}
          </div>
          <div className="mt-3">
            <RecordsTable
              rows={effectiveRows}
              cols={cols}
              env={env}
              page={page}
              size={size}
              loading={loading}
              error={error}
              onOpenSwing={(urls) => { setSwingUrls(urls); setSwingOpen(true) }}
            />
          </div>
          <Pagination
            page={page}
            size={size}
            pageCount={pageCount}
            prevDisabled={prevDisabled}
            nextDisabled={nextDisabled}
            onChangePage={(np) => { setPage(np); updateQuery({ page: np }) }}
            onChangeSize={(n) => { setSize(n); setPage(1); updateQuery({ size: n, page: 1 }) }}
          />
        </div>
      </div>
      <Modal open={swingOpen} onClose={() => setSwingOpen(false)} title="TS Swing Video">
        <div className="space-y-2">
          {swingUrls.length === 0 ? (
            <div className="text-sm text-gray-500">No video</div>
          ) : (
            swingUrls.map((u, i) => (
              <div key={i} className="text-sm">
                <a href={u} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{u}</a>
              </div>
            ))
          )}
        </div>
      </Modal>
      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} title="Notice Alert">
        <div className="rounded-xl bg-amber-50 text-amber-800 p-3 text-sm">
          {alertMsg || 'An error occurred.'}
        </div>
      </Modal>
    </AppLayout>
  )
}
