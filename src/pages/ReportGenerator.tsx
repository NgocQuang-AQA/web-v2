import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { apiJson } from '../lib/api'
import { sendLog } from '../lib/logger'
import Loading from '../components/Loading'
import NoData from '../assets/no-data-found_585024-42.avif'
import ConfirmDialog from '../components/ConfirmDialog'
type RunResponse = {
  status?: string
  exitCode?: number
  notice?: { content?: string } | null
}
type TestRunDoc = {
  runId?: string
  project?: string
  env?: string
  startTime?: string
  summary?: {
    total?: number
    passed?: number
    failed?: number
    broken?: number
    skipped?: number
  }
}

export default function ReportGenerator() {
  const navigate = useNavigate()
  const location = useLocation()
  const initParams = new URLSearchParams(window.location.search)
  const initTab = initParams.get('tab') as
    | 'global'
    | 'globalcn'
    | 'globallive'
    | 'globalcnlive'
    | null
  const initViewParam = initParams.get('view') as 'global' | 'globalcn' | null
  const initSubParam = initParams.get('sub') as 'qa' | 'live' | 'cn' | null
  const initRunId = initParams.get('runId') || null
  const initStatusParam = initParams.get('status') as
    | 'SUCCESS'
    | 'FAILURE'
    | 'ERROR'
    | null

  const deducedFromTab = (() => {
    if (initTab === 'global')
      return { view: 'global' as const, sub: 'qa' as const }
    if (initTab === 'globallive')
      return { view: 'global' as const, sub: 'live' as const }
    if (initTab === 'globalcn')
      return { view: 'globalcn' as const, sub: 'qa' as const }
    if (initTab === 'globalcnlive')
      return { view: 'globalcn' as const, sub: 'cn' as const }
    return { view: 'global' as const, sub: 'qa' as const }
  })()

  const [view, setView] = useState<'global' | 'globalcn'>(
    initViewParam || deducedFromTab.view
  )
  const [sub, setSub] = useState<'qa' | 'live' | 'cn'>(
    initSubParam
      ? initViewParam === 'globalcn' && initSubParam === 'live'
        ? 'cn'
        : initSubParam
      : deducedFromTab.sub
  )
  const [running, setRunning] = useState(false)
  const [runConfirmOpen, setRunConfirmOpen] = useState(false)
  const [reloadEpoch, setReloadEpoch] = useState(0)
  const [runsItems, setRunsItems] = useState<TestRunDoc[]>([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initRunId)
  const [casesTree, setCasesTree] = useState<Record<string, unknown> | null>(
    null
  )
  const [casesLoading, setCasesLoading] = useState(false)
  const [casesError, setCasesError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [stepsOpen, setStepsOpen] = useState(false)
  const [stepsLoading, setStepsLoading] = useState(false)
  const [stepsError, setStepsError] = useState<string | null>(null)
  const [stepsItems, setStepsItems] = useState<Record<string, unknown>[]>([])
  const [stepExpanded, setStepExpanded] = useState<
    Record<string, string | null>
  >({})
  const [selectedCaseName, setSelectedCaseName] = useState<string>('')
  const [copiedAlertOpen, setCopiedAlertOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<
    '' | 'SUCCESS' | 'FAILURE' | 'ERROR'
  >(initStatusParam || '')
  const initPage = Number(initParams.get('page') || '1') || 1
  const initPageSize = Number(initParams.get('pageSize') || '5') || 5
  const initSortBy = (initParams.get('sortBy') ||
    'startTime') as 'startTime' | 'total' | 'passed' | 'failed' | 'broken'
  const initSortDir = (initParams.get('sortDir') ||
    'desc') as 'asc' | 'desc'
  const [page, setPage] = useState(initPage)
  const [pageSize, setPageSize] = useState(initPageSize)
  const [sortBy, setSortBy] = useState<
    'startTime' | 'total' | 'passed' | 'failed' | 'broken'
  >(initSortBy)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initSortDir)
  const [runsTotal, setRunsTotal] = useState(0)
  const initName = initParams.get('name') || ''
  const [name, setName] = useState(initName)
  const statusIcon = (
    s: 'passed' | 'failed' | 'broken' | 'partial' | 'unknown' | 'error'
  ) => {
    if (s === 'passed')
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4 text-green-600"
        >
          <path
            fill="currentColor"
            d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"
          />
        </svg>
      )
    if (s === 'failed')
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4 text-rose-600"
        >
          <path
            d="M6 6l12 12M6 18L18 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    if (s === 'error')
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4 text-amber-600"
        >
          <path
            fill="currentColor"
            d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z"
          />
        </svg>
      )
    if (s === 'broken')
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4 text-amber-600"
        >
          <path
            fill="currentColor"
            d="M12 2 1 21h22L12 2zm0 3 7.53 13H4.47L12 5zm-1 6h2v5h-2v-5z"
          />
        </svg>
      )
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-4 h-4 text-gray-500"
      >
        <circle cx="12" cy="12" r="6" fill="currentColor" />
      </svg>
    )
  }
  const toggleIcon = (open: boolean) =>
    open ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-4 h-4 text-gray-600"
      >
        <path fill="currentColor" d="M6 14h12v-2H6v2z" />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-4 h-4 text-gray-600"
      >
        <path fill="currentColor" d="M11 6h2v12h-2V6zm-5 5h12v2H6v-2z" />
      </svg>
    )
  const collectCases = (val: unknown): Record<string, unknown>[] => {
    if (Array.isArray(val))
      return (val as unknown[]).filter(
        (x) => x && typeof x === 'object'
      ) as Record<string, unknown>[]
    if (val && typeof val === 'object') {
      const out: Record<string, unknown>[] = []
      Object.values(val as Record<string, unknown>).forEach((v) => {
        out.push(...collectCases(v))
      })
      return out
    }
    return []
  }
  const overallStatus = (val: unknown) => {
    const items = collectCases(val)
    let failed = 0
    let broken = 0
    let error = 0
    let passed = 0
    for (const it of items) {
      const st = String(
        (it as Record<string, unknown>)?.status || ''
      ).toLowerCase()
      if (st === 'failed' || st === 'failure') failed++
      else if (st === 'broken') broken++
      else if (st === 'error') error++
      else if (st === 'success' || st === 'passed' || st === 'pass') passed++
    }
    if (error > 0) return 'error' as const
    if (failed > 0) return 'failed' as const
    if (broken > 0) return 'broken' as const
    if (passed > 0 && passed === items.length) return 'passed' as const
    if (items.length > 0) return 'partial' as const
    return 'unknown' as const
  }
  const scenarioAndCaseText = (arr: unknown[]) => {
    const items = Array.isArray(arr) ? arr : []
    const stories = new Set<string>()
    for (const it of items) {
      const r = it as Record<string, unknown>
      const s = String(r.story || '').trim()
      if (s) stories.add(s)
    }
    const sc = stories.size
    const tc = items.length
    return `${sc} scenarios ${tc} test cases`
  }
  const fmtMs = (ms: number | string | undefined) => {
    const n = Number(ms) || 0
    if (n < 1000) return `${String(n).padStart(3, '0')}ms`
    const s = n / 1000
    return `${s.toFixed(2)}s`
  }
  const parseStartTime = (raw: string | undefined) => {
    const s = String(raw || '').trim()
    // dd-MM-YYYY HH:mm[:ss]
    {
      const m = s.match(
        /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
      )
      if (m) {
        const d = Number(m[1])
        const mo = Number(m[2])
        const y = Number(m[3])
        const hh = Number(m[4])
        const mm = Number(m[5])
        const ss = m[6] ? Number(m[6]) : 0
        const ts = Date.UTC(y, mo - 1, d, hh, mm, ss)
        return { d, mo, y, hh, mm, ss, ts }
      }
    }
    // YYYY-MM-DD HH-mm
    {
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2})-(\d{2})$/)
      if (m) {
        const y = Number(m[1])
        const mo = Number(m[2])
        const d = Number(m[3])
        const hh = Number(m[4])
        const mm = Number(m[5])
        const ss = 0
        const ts = Date.UTC(y, mo - 1, d, hh, mm, ss)
        return { d, mo, y, hh, mm, ss, ts }
      }
    }
    return null
  }
  const statusTextClass = (s: string | undefined) => {
    const v = String(s || '').toUpperCase()
    if (v === 'SUCCESS' || v === 'PASSED' || v === 'PASS')
      return 'text-green-700'
    if (v === 'FAILURE' || v === 'FAILED') return 'text-rose-700'
    if (v === 'ERROR' || v === 'BROKEN') return 'text-amber-700'
    return 'text-gray-700'
  }
  const openStepsForCase = async (testCase: Record<string, unknown>) => {
    const rid = String(selectedRunId || initRunId || '')
    const tcId = String(
      (testCase as Record<string, unknown>)?.testCaseId ||
        (testCase as Record<string, unknown>)?.id ||
        (testCase as Record<string, unknown>)?._id ||
        ''
    )
    if (!rid || !tcId) return
    sendLog({
      level: 'info',
      message: 'Open steps for case',
      source: 'ReportGenerator',
      meta: { runId: rid, testCaseId: tcId },
    })
    setSelectedCaseName(String(testCase.name || ''))
    setStepsOpen(true)
    setStepsLoading(true)
    setStepsError(null)
    setStepExpanded({})
    const qs = new URLSearchParams({ runId: rid, testCaseId: tcId })
    const data = await apiJson<{ items?: Record<string, unknown>[] }>(
      `/api/tests/steps?${qs.toString()}`
    )
    setStepsItems(Array.isArray(data?.items) ? data!.items! : [])
    setStepsLoading(false)
  }
  const mapUiStatusToApi = (
    s: '' | 'SUCCESS' | 'FAILURE' | 'ERROR'
  ): '' | 'SUCCESS' | 'FAILURE' | 'ERROR' => {
    if (s === '') return ''
    return s
  }

  const storageKey = 'sdet-run-flags'
  const setFlag = (env: string, running: boolean) => {
    try {
      const s = localStorage.getItem(storageKey)
      const obj = s ? (JSON.parse(s) as Record<string, boolean>) : {}
      const next = { ...obj, [env]: running }
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      void 0
    }
  }

  const mainTabs = useMemo(() => {
    return [
      { key: 'global' as const, label: 'Global' },
      { key: 'globalcn' as const, label: 'Global CN' },
    ]
  }, [])

  const current = useMemo(() => {
    if (view === 'global') {
      if (sub === 'live')
        return {
          collection: 'global-live',
          detailPathPrefix: '/reports/global-live',
        }
      return { collection: 'global-qa', detailPathPrefix: '/reports/global' }
    } else {
      if (sub === 'cn')
        return {
          collection: 'cn-live',
          detailPathPrefix: '/reports/global-cn-live',
        }
      return { collection: 'cn-qa', detailPathPrefix: '/reports/global-cn' }
    }
  }, [view, sub])
  const envParam = useMemo(() => {
    if (view === 'global') return sub === 'live' ? 'live' : 'qa'
    return sub === 'cn' ? 'cnlive' : 'cnqa'
  }, [view, sub])
  const projectParam = useMemo(() => current.collection, [current])
  const [lastRunsKey, setLastRunsKey] = useState<string>('')
  const [lastCasesKey, setLastCasesKey] = useState<string>('')
  useEffect(() => {
    let canceled = false
    async function loadRuns() {
      const reqKey = JSON.stringify({
        projectParam,
        page,
        pageSize,
        name: String(name || '').trim(),
        sortBy,
        sortDir,
      })
      if (lastRunsKey === reqKey) return
      setLastRunsKey(reqKey)
      setRunsLoading(true)
      setRunsError(null)
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        project: projectParam,
      })
      if (name && String(name).trim()) qs.set('name', String(name).trim())
      if (sortBy) qs.set('sortBy', sortBy)
      if (sortDir) qs.set('order', sortDir)
      const data = await apiJson<{ total?: number; items?: TestRunDoc[] }>(
        `/api/tests/runs?${qs.toString()}`
      )
      if (!canceled) {
        const arr = Array.isArray(data?.items)
          ? (data?.items as TestRunDoc[])
          : []
        setRunsTotal(Number(data?.total || 0))
        const getVal = (it: TestRunDoc) => {
          if (sortBy === 'startTime') {
            const p = parseStartTime(String(it.startTime || ''))
            return Number(p?.ts || 0)
          }
          const sum = it.summary || {}
          if (sortBy === 'total') return Number(sum.total || 0)
          if (sortBy === 'passed') return Number(sum.passed || 0)
          if (sortBy === 'failed') return Number(sum.failed || 0)
          if (sortBy === 'broken') return Number(sum.broken || 0)
          return 0
        }
        const sorted = [...arr].sort((a, b) => {
          const va = getVal(a)
          const vb = getVal(b)
          return sortDir === 'asc' ? va - vb : vb - va
        })
        setRunsItems(sorted)
      }
      if (!canceled) setRunsLoading(false)
    }
    loadRuns()
    return () => {
      canceled = true
    }
  }, [projectParam, reloadEpoch, page, pageSize, name, sortBy, sortDir, lastRunsKey])
  useEffect(() => {
    if (!initRunId) return
    let canceled = false
    async function initLoad() {
      const reqKey = JSON.stringify({
        initRunId,
        statusFilter,
      })
      if (lastCasesKey === reqKey) return
      setLastCasesKey(reqKey)
      setSelectedRunId(initRunId)
      setCasesLoading(true)
      setCasesError(null)
      setExpanded({})

      sendLog({
        level: 'info',
        message: 'Loading cases tree',
        source: 'ReportGenerator',
        meta: { runId: initRunId },
      })

      const qs = new URLSearchParams({ runId: String(initRunId) })
      {
        const st = mapUiStatusToApi(statusFilter)
        if (st) qs.set('status', st)
      }
      const data = await apiJson<{
        total?: number
        items?: Record<string, unknown>
      }>(`/api/tests/cases?${qs.toString()}`)
      if (!canceled) {
        if (data && data.items) setCasesTree(data.items)
        else setCasesTree({})
        setCasesLoading(false)
      }
    }
    initLoad()
    return () => {
      canceled = true
    }
  }, [initRunId, statusFilter])
  useEffect(() => {
    const onReload = async () => {
      setReloadEpoch((x) => x + 1)
      const rid = String(selectedRunId || initRunId || '')
      if (!rid) return
      setCasesLoading(true)
      setCasesError(null)
      setExpanded({})
      const qs = new URLSearchParams({ runId: rid })
      {
        const st = mapUiStatusToApi(statusFilter)
        if (st) qs.set('status', st)
      }
      const data = await apiJson<{
        total?: number
        items?: Record<string, unknown>
      }>(`/api/tests/cases?${qs.toString()}`)
      if (data && data.items) setCasesTree(data.items)
      else setCasesTree({})
      setCasesLoading(false)
    }
    window.addEventListener('global:reload', onReload as EventListener)
    return () => {
      window.removeEventListener('global:reload', onReload as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRunId, initRunId, statusFilter])

  const updateQuery = (patch: Record<string, unknown>) => {
    const params = new URLSearchParams(location.search)
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '') params.delete(k)
      else params.set(k, String(v))
    })
    const s = params.toString()
    navigate(
      { pathname: location.pathname, search: s ? `?${s}` : '' },
      { replace: true }
    )
  }


  const parseHeaderString = (s: unknown) => {
    const raw = String(s == null ? '' : s)
    const lines = raw
      .split(/\r?\n/)
      .map((ln) => String(ln || '').trim())
      .filter(Boolean)
    const pairs: [string, string][] = []
    for (const ln of lines) {
      const cleaned = ln.replace(/\t+/g, '').trim()
      if (!cleaned) continue
      const idx = cleaned.indexOf('=')
      if (idx <= 0) continue
      const key = cleaned.slice(0, idx).trim()
      const value = cleaned.slice(idx + 1).trim()
      if (key) pairs.push([key, value])
    }
    return pairs
  }
  const safeQuote = (s: unknown) => {
    const raw = String(s == null ? '' : s)
    const esc = raw.replace(/'/g, `'"'"'`)
    return `'${esc}'`
  }
  const coerceTypes = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(coerceTypes)
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      Object.entries(v as Record<string, unknown>).forEach(([k, val]) => {
        out[k] = coerceTypes(val)
      })
      return out
    }
    if (typeof v === 'string') {
      const s = v.trim()
      if (/^-?\d+(\.\d+)?$/.test(s)) {
        const num = Number(s)
        if (!Number.isNaN(num)) return num
      }
      return v
    }
    return v
  }
  const buildCurl = (reqObj: Record<string, unknown> | null | undefined) => {
    if (!reqObj || typeof reqObj !== 'object') return ''
    const method = String(reqObj.method || '').toUpperCase() || 'GET'
    const url = String(reqObj.url || '').trim()
    const content = String(reqObj.content || '').trim()
    const contentType = String(reqObj.contentType || '').trim()
    const headerStr = String(reqObj.requestHeaders || '')
    const headers = parseHeaderString(headerStr)
    const headerMap = new Map<string, string>(headers)
    if (contentType && !headerMap.has('Content-Type'))
      headerMap.set('Content-Type', contentType)
    let normalizedCompact = content
    try {
      const parsed = JSON.parse(content)
      const coerced = coerceTypes(parsed)
      normalizedCompact = JSON.stringify(coerced)
    } catch {
      void 0
    }
    const parts: string[] = []
    parts.push(`curl --location ${safeQuote(url)}`)
    if (method && method !== 'GET') parts.push(`--request ${safeQuote(method)}`)
    for (const [k, v] of headerMap.entries()) {
      parts.push(`--header ${safeQuote(`${k}: ${v}`)}`)
    }
    if (normalizedCompact) {
      parts.push(`--data ${safeQuote(normalizedCompact)}`)
    }
    return parts.join(' ')
  }
  const copyCurl = async (text: string) => {
    const val = String(text || '')
    if (!val) return
    try {
      await navigator.clipboard.writeText(val)
      setCopiedAlertOpen(true)
      setTimeout(() => setCopiedAlertOpen(false), 1500)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = val
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopiedAlertOpen(true)
        setTimeout(() => setCopiedAlertOpen(false), 1500)
      } catch {
        void 0
      }
    }
  }

  const triggerRun = async () => {
    setRunning(true)
    setFlag(envParam, true)
    const res = await apiJson<RunResponse>(
      `/api/run?env=${encodeURIComponent(envParam)}`
    )
    if (!(res && res.status === 'ok')) {
      window.dispatchEvent(
        new CustomEvent('global:alert', {
          detail: { message: 'Failed to trigger test run.' },
        })
      )
      setFlag(envParam, false)
    }
    const stats = await apiJson<unknown>('/api/reports/stats')
    if (stats != null) {
      window.dispatchEvent(
        new CustomEvent('global:stats', { detail: { data: stats } })
      )
    }
    setReloadEpoch((x) => x + 1)
    window.dispatchEvent(
      new CustomEvent('global:reload', { detail: { source: 'run', env: envParam } })
    )
    setRunning(false)
  }

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="flex items-center gap-4 border-b border-gray-100 mb-3">
            {mainTabs.map((t) => (
              <button
                key={t.key}
                className={`px-3 py-2 text-sm ${view === t.key ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`}
                onClick={() => {
                  setView(t.key)
                  const nextSub = 'qa'
                  setSub(nextSub)
                  const nextTab = t.key === 'global' ? 'global' : 'globalcn'
                  updateQuery({
                    view: t.key,
                    sub: nextSub,
                    tab: nextTab,
                    page: 1,
                  })
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-3 mb-3"
            onSubmit={(e) => {
              e.preventDefault()
              updateQuery({ name, page: 1 })
              setPage(1)
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 input"
              placeholder="Search by Name"
            />
            <button className="btn btn-primary" type="submit">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <span className="font-medium">Search</span>
            </button>
          </form>
          <div className="flex items-center justify-between border-b border-gray-100 mb-3">
            <div className="flex items-center gap-4">
              {(view === 'global'
                ? [
                    { key: 'qa' as const, label: 'QA' },
                    { key: 'live' as const, label: 'Live' },
                  ]
                : [
                    { key: 'qa' as const, label: 'QA' },
                    { key: 'cn' as const, label: 'Live' },
                  ]
              ).map((t) => (
                <button
                  key={t.key}
                  className={`px-3 py-2 text-sm ${sub === t.key ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`}
                  onClick={() => {
                    setSub(t.key)
                    const nextTab =
                      view === 'global'
                        ? t.key === 'live'
                          ? 'globallive'
                          : 'global'
                        : t.key === 'cn'
                          ? 'globalcnlive'
                          : 'globalcn'
                    updateQuery({ view, sub: t.key, tab: nextTab, page: 1 })
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`btn btn-primary ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={running}
              onClick={() => {
                if (envParam === 'live' || envParam === 'cnlive')
                  setRunConfirmOpen(true)
                else triggerRun()
              }}
            >
              {running ? (
                <>
                  <svg
                    className="mr-3 size-5 w-5 h-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span className="font-medium">Processing…</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="mr-1 w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                    />
                  </svg>
                  <span className="font-medium">Run Test</span>
                </>
              )}
            </button>
          </div>
          <ConfirmDialog
            open={runConfirmOpen}
            title="Confirm Action"
            description="This may affect the live environment. Are you sure you want to proceed?"
            confirmText="Run Test"
            cancelText="Cancel"
            onConfirm={() => {
              setRunConfirmOpen(false)
              triggerRun()
            }}
            onCancel={() => setRunConfirmOpen(false)}
          />
          {runsLoading ? (
            <Loading />
          ) : runsError ? (
            <div className="text-sm text-rose-600">Error: {runsError}</div>
          ) : runsItems.length === 0 ? (
            <div className="relative w-full flex items-center justify-center py-6">
              <img
                src={NoData}
                alt="No data"
                className="max-h-64 w-auto object-contain opacity-80 rounded-xl"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Name</th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => {
                          const nextDir = sortBy === 'startTime' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
                          setSortBy('startTime')
                          setSortDir(nextDir)
                          updateQuery({ sortBy: 'startTime', sortDir: nextDir, page: 1 })
                          setPage(1)
                        }}
                      >
                        <span>Start Time</span>
                        {sortBy === 'startTime' ? (
                          sortDir === 'asc' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 14l5-5 5 5H7z"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 10l5 5 5-5H7z"/></svg>
                          )
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-400"><path fill="currentColor" d="M7 10h10v2H7zm0 4h10v2H7zM7 6h10v2H7z"/></svg>
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => {
                          const nextDir = sortBy === 'total' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
                          setSortBy('total')
                          setSortDir(nextDir)
                          updateQuery({ sortBy: 'total', sortDir: nextDir, page: 1 })
                          setPage(1)
                        }}
                      >
                        <span>Total Test</span>
                        {sortBy === 'total' ? (
                          sortDir === 'asc' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 14l5-5 5 5H7z"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 10l5 5 5-5H7z"/></svg>
                          )
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-400"><path fill="currentColor" d="M7 10h10v2H7zm0 4h10v2H7zM7 6h10v2H7z"/></svg>
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => {
                          const nextDir = sortBy === 'passed' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
                          setSortBy('passed')
                          setSortDir(nextDir)
                          updateQuery({ sortBy: 'passed', sortDir: nextDir, page: 1 })
                          setPage(1)
                        }}
                      >
                        <span>Passed</span>
                        {sortBy === 'passed' ? (
                          sortDir === 'asc' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 14l5-5 5 5H7z"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 10l5 5 5-5H7z"/></svg>
                          )
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-400"><path fill="currentColor" d="M7 10h10v2H7zm0 4h10v2H7zM7 6h10v2H7z"/></svg>
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => {
                          const nextDir = sortBy === 'failed' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
                          setSortBy('failed')
                          setSortDir(nextDir)
                          updateQuery({ sortBy: 'failed', sortDir: nextDir, page: 1 })
                          setPage(1)
                        }}
                      >
                        <span>Failed</span>
                        {sortBy === 'failed' ? (
                          sortDir === 'asc' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 14l5-5 5 5H7z"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 10l5 5 5-5H7z"/></svg>
                          )
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-400"><path fill="currentColor" d="M7 10h10v2H7zm0 4h10v2H7zM7 6h10v2H7z"/></svg>
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="flex items-center gap-1"
                        onClick={() => {
                          const nextDir = sortBy === 'broken' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
                          setSortBy('broken')
                          setSortDir(nextDir)
                          updateQuery({ sortBy: 'broken', sortDir: nextDir, page: 1 })
                          setPage(1)
                        }}
                      >
                        <span>Broken/Error</span>
                        {sortBy === 'broken' ? (
                          sortDir === 'asc' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 14l5-5 5 5H7z"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M7 10l5 5 5-5H7z"/></svg>
                          )
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-400"><path fill="currentColor" d="M7 10h10v2H7zm0 4h10v2H7zM7 6h10v2H7z"/></svg>
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runsItems.map((it, idx) => {
                    return (
                      <tr
                        key={idx}
                        className="cursor-pointer"
                        onClick={async () => {
                          const rid = String(it.runId || '')
                          if (!rid) return
                          setSelectedRunId(rid)
                          setCasesLoading(true)
                          setCasesError(null)
                          setExpanded({})
                          updateQuery({
                            runId: rid,
                            status: statusFilter || undefined,
                          })
                          const qs = new URLSearchParams({ runId: rid })
                          {
                            const st = mapUiStatusToApi(statusFilter)
                            if (st) qs.set('status', st)
                          }
                          const data = await apiJson<{
                            total?: number
                            items?: Record<string, unknown>
                          }>(`/api/tests/cases?${qs.toString()}`)
                          if (data && data.items) setCasesTree(data.items)
                          else setCasesTree({})
                          setCasesLoading(false)
                        }}
                      >
                        <td className="text-gray-500">{idx + 1}</td>
                        <td>{String(it.runId ?? '')}</td>
                        <td>{String(it.startTime ?? '')}</td>
                        <td>{String(it.summary?.total ?? 0)}</td>
                        <td>{String(it.summary?.passed ?? 0)}</td>
                        <td>{String(it.summary?.failed ?? 0)}</td>
                        <td>{String(it.summary?.broken ?? 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rows per page</span>
                  <select
                    className="select px-2 py-1 text-sm"
                    value={pageSize}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 5
                      setPageSize(val)
                      setPage(1)
                      updateQuery({ pageSize: val, page: 1 })
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={page <= 1}
                    onClick={() => {
                      const next = Math.max(1, page - 1)
                      setPage(next)
                      updateQuery({ page: next })
                    }}
                  >
                    Prev
                  </button>
                  <div className="text-sm text-gray-600">
                    Trang {page} / {Math.max(1, Math.ceil((runsTotal || 0) / Math.max(1, pageSize)))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={
                      page >= Math.max(1, Math.ceil((runsTotal || 0) / Math.max(1, pageSize)))
                    }
                    onClick={() => {
                      const totalPages = Math.max(
                        1,
                        Math.ceil((runsTotal || 0) / Math.max(1, pageSize))
                      )
                      const next = Math.min(totalPages, page + 1)
                      setPage(next)
                      updateQuery({ page: next })
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Run Test Cases Tree</div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-600">Filter Status</label>
              <select
                value={statusFilter}
                onChange={async (e) => {
                  const next = e.target.value as
                    | ''
                    | 'SUCCESS'
                    | 'FAILURE'
                    | 'ERROR'
                  setStatusFilter(next)
                  updateQuery({ status: next || undefined })
                  if (!selectedRunId && !initRunId) return
                  const rid = String(selectedRunId || initRunId || '')
                  setCasesLoading(true)
                  setCasesError(null)
                  setExpanded({})
                  const qs = new URLSearchParams({ runId: rid })
                  {
                    const st = mapUiStatusToApi(next)
                    if (st) qs.set('status', st)
                  }
                  const data = await apiJson<{
                    total?: number
                    items?: Record<string, unknown>
                  }>(`/api/tests/cases?${qs.toString()}`)
                  if (data && data.items) setCasesTree(data.items)
                  else setCasesTree({})
                  setCasesLoading(false)
                }}
                className="select px-2 py-1 text-xs"
              >
                <option value="">All</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILURE">FAILURE</option>
                <option value="ERROR">ERROR</option>
              </select>
              <div className="text-xs text-gray-500">
                {selectedRunId ? `Run: ${selectedRunId}` : ''}
              </div>
            </div>
          </div>
          {casesLoading ? (
            <Loading />
          ) : casesError ? (
            <div className="text-sm text-rose-600">Error: {casesError}</div>
          ) : !casesTree || Object.keys(casesTree || {}).length === 0 ? (
            <div className="relative w-full flex items-center justify-center py-6">
              <img
                src={NoData}
                alt="No data"
                className="max-h-64 w-auto object-contain opacity-80 rounded-xl"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(casesTree || {}).map(([topKey, topVal]) => {
                const isOpen = !!expanded[topKey]
                const toggle = () =>
                  setExpanded({ ...expanded, [topKey]: !isOpen })
                return (
                  <div
                    key={topKey}
                    className="rounded-xl border border-gray-200 bg-white"
                  >
                    <button
                      className="w-full flex items-center justify-between px-3 py-2"
                      onClick={toggle}
                    >
                      <div className="flex items-center gap-2">
                        {toggleIcon(isOpen)}
                        <div className="text-sm font-medium text-gray-800 capitalize">
                          {topKey}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {statusIcon(overallStatus(topVal))}
                        </div>
                        {Array.isArray(topVal) ? (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                            {scenarioAndCaseText(topVal as unknown[])}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                            {
                              Object.keys(topVal as Record<string, unknown>)
                                .length
                            }{' '}
                            features
                          </span>
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        {Array.isArray(topVal) ? (
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-600">
                                <th className="px-2 py-1">Name</th>
                                <th className="px-2 py-1">Story</th>
                                <th className="px-2 py-1">Status</th>
                                <th className="px-2 py-1">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(topVal as unknown[]).map((it, idx) => {
                                const r = it as Record<string, unknown>
                                return (
                                  <tr
                                    key={idx}
                                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => openStepsForCase(r)}
                                  >
                                    <td className="px-2 py-1">
                                      {String(r.name ?? '')}
                                    </td>
                                    <td className="px-2 py-1">
                                      {String(r.story ?? '')}
                                    </td>
                                    <td
                                      className={`px-2 py-1 ${statusTextClass(String(r.status ?? ''))}`}
                                    >
                                      {String(r.status ?? '')}
                                    </td>
                                    <td className="px-2 py-1">
                                      {String(r._dur ?? r.duration ?? '')}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        ) : (
                          Object.entries(topVal as Record<string, unknown>).map(
                            ([subKey, subVal]) => {
                              const path = `${topKey}/${subKey}`
                              const subOpen = !!expanded[path]
                              const subToggle = () =>
                                setExpanded({ ...expanded, [path]: !subOpen })
                              return (
                                <div
                                  key={subKey}
                                  className="rounded-lg border border-gray-200 bg-white"
                                >
                                  <button
                                    className="w-full flex items-center justify-between px-3 py-2"
                                    onClick={subToggle}
                                  >
                                    <div className="flex items-center gap-2">
                                      {toggleIcon(subOpen)}
                                      <div className="text-sm font-medium text-gray-800">
                                        {subKey}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1">
                                        {statusIcon(overallStatus(subVal))}
                                      </div>
                                      {Array.isArray(subVal) ? (
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                                          {scenarioAndCaseText(
                                            subVal as unknown[]
                                          )}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                                          {
                                            Object.keys(
                                              subVal as Record<string, unknown>
                                            ).length
                                          }{' '}
                                          features
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                  {subOpen && Array.isArray(subVal) && (
                                    <div className="px-3 pb-3">
                                      <table className="min-w-full text-sm">
                                        <thead>
                                          <tr className="text-left text-gray-600">
                                            <th className="px-2 py-1">Name</th>
                                            <th className="px-2 py-1">Story</th>
                                            <th className="px-2 py-1">
                                              Status
                                            </th>
                                            <th className="px-2 py-1">
                                              Duration
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(subVal as unknown[]).map(
                                            (it, idx) => {
                                              const r = it as Record<
                                                string,
                                                unknown
                                              >
                                              return (
                                                <tr
                                                  key={idx}
                                                  className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                                                  onClick={() =>
                                                    openStepsForCase(r)
                                                  }
                                                >
                                                  <td className="px-2 py-1">
                                                    {String(r.name ?? '')}
                                                  </td>
                                                  <td className="px-2 py-1">
                                                    {String(r.story ?? '')}
                                                  </td>
                                                  <td
                                                    className={`px-2 py-1 ${statusTextClass(String(r.status ?? ''))}`}
                                                  >
                                                    {String(r.status ?? '')}
                                                  </td>
                                                  <td className="px-2 py-1">
                                                    {String(
                                                      r._dur ?? r.duration ?? ''
                                                    )}
                                                  </td>
                                                </tr>
                                              )
                                            }
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )
                            }
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {stepsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            {copiedAlertOpen && (
              <div className="fixed top-6 right-6 z-[60] rounded-xl bg-green-50 text-green-800 px-3 py-2 text-sm shadow-soft border border-green-100">
                Copied curl successfully!!!
              </div>
            )}
            <div className="w-[900px] max-w-[95vw] rounded-2xl bg-white shadow-soft">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="font-semibold">Steps</div>
                <div className="text-xs text-gray-500">{selectedCaseName}</div>
              </div>
              <div className="p-4">
                {stepsLoading ? (
                  <Loading />
                ) : stepsError ? (
                  <div className="text-sm text-rose-600">{stepsError}</div>
                ) : stepsItems.length === 0 ? (
                  <div className="text-sm text-gray-500">No data</div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="px-2 py-1">Step</th>
                        <th className="px-2 py-1">Outcome</th>
                        <th className="px-2 py-1">Duration</th>
                        <th className="px-2 py-1">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stepsItems.map((it, idx) => {
                        const r = it as Record<string, unknown>
                        const id = String(r.id || r._id || `${idx}`)
                        const expandedType = stepExpanded[id]
                        const toggleReq = () =>
                          setStepExpanded({
                            ...stepExpanded,
                            [id]: expandedType === 'request' ? null : 'request',
                          })
                        const toggleErr = () =>
                          setStepExpanded({
                            ...stepExpanded,
                            [id]:
                              expandedType === 'exception' ? null : 'exception',
                          })

                        const req = r.request as Record<string, unknown> | null
                        const hasReq = !!(
                          req &&
                          (req.cUrl || req.url || req.method)
                        )

                        const exc = r.exception as Record<
                          string,
                          unknown
                        > | null
                        const st = String(r.status ?? '').toLowerCase()
                        const isFail =
                          st === 'failed' ||
                          st === 'failure' ||
                          st === 'broken' ||
                          st === 'error'
                        const hasErr = isFail && !!exc

                        return (
                          <>
                            <tr key={id} className="border-t border-gray-100">
                              <td className="px-2 py-1">
                                {String(r.name ?? '')}
                              </td>
                              <td
                                className={`px-2 py-1 ${statusTextClass(String(r.status ?? ''))}`}
                              >
                                {String(r.status ?? '')}
                              </td>
                              <td className="px-2 py-1">
                                {fmtMs(r.duration as number)}
                              </td>
                              <td className="px-2 py-1 flex items-center gap-2">
                                {hasReq && (
                                  <button
                                    type="button"
                                    className="rounded-md bg-green-600 text-white text-xs px-2 py-1 shadow-soft hover:bg-green-700"
                                    onClick={toggleReq}
                                  >
                                    REST Query
                                  </button>
                                )}
                                {hasErr && (
                                  <button
                                    type="button"
                                    className="rounded-md bg-rose-600 text-white text-xs px-2 py-1 shadow-soft hover:bg-rose-700"
                                    onClick={toggleErr}
                                  >
                                    Show Details
                                  </button>
                                )}
                                {!hasReq && !hasErr && (
                                  <span className="text-xs text-gray-400">
                                    N/A
                                  </span>
                                )}
                              </td>
                            </tr>
                            {expandedType === 'request' && hasReq && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-2 py-2 bg-gray-50"
                                >
                                  {(() => {
                                    const curlText = buildCurl(
                                      req as Record<string, unknown>
                                    )
                                    return (
                                      <textarea
                                        readOnly
                                        rows={4}
                                        wrap="soft"
                                        value={curlText}
                                        onClick={() => copyCurl(curlText)}
                                        title="Click to copy cURL"
                                        className="w-full max-w-full rounded-md border border-gray-300 bg-gray-100 font-mono text-xs p-2 resize-none cursor-pointer"
                                      />
                                    )
                                  })()}
                                </td>
                              </tr>
                            )}
                            {expandedType === 'exception' && hasErr && exc && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-2 py-2 bg-rose-50 border border-rose-100 rounded-md"
                                >
                                  <div className="space-y-2">
                                    <div>
                                      <div className="font-semibold text-rose-700 text-xs mb-1">
                                        Error Message
                                      </div>
                                      <textarea
                                        readOnly
                                        rows={3}
                                        wrap="soft"
                                        value={`${String(exc.errorType || 'Error')}\n${String(exc.message || '')}`}
                                        className="w-full max-w-full rounded-md border border-rose-200 bg-white font-mono text-xs p-2 resize-none text-rose-800 focus:outline-none"
                                      />
                                    </div>
                                    {Array.isArray(exc.stackTrace) &&
                                      exc.stackTrace.length > 0 && (
                                        <div>
                                          <div className="font-semibold text-gray-600 text-xs mb-1">
                                            Stack Trace
                                          </div>
                                          <textarea
                                            readOnly
                                            rows={8}
                                            wrap="off"
                                            value={exc.stackTrace
                                              .map(
                                                (t: Record<string, unknown>) =>
                                                  `at ${t.declaringClass}.${t.methodName}(${t.fileName}:${t.lineNumber})`
                                              )
                                              .join('\n')}
                                            className="w-full max-w-full rounded-md border border-gray-300 bg-gray-50 font-mono text-[10px] p-2 resize-none text-gray-600 focus:outline-none"
                                          />
                                        </div>
                                      )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
                <button
                  type="button"
                  className="rounded-md bg-gray-200 text-gray-700 text-sm px-3 py-2 hover:bg-gray-300"
                  onClick={() => setStepsOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
