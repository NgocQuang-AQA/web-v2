import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { apiJson } from '../lib/api'
import Loading from '../components/Loading'
import NoData from '../assets/no-data-found_585024-42.avif'
type RunResponse = { status?: string; exitCode?: number; notice?: { content?: string } | null }
type TestRunDoc = { runId?: string; project?: string; env?: string; startTime?: string; summary?: { total?: number; passed?: number; failed?: number; broken?: number; skipped?: number } }

export default function ReportGenerator() {
  const navigate = useNavigate()
  const location = useLocation()
  const initParams = new URLSearchParams(window.location.search)
  const initTab = (initParams.get('tab') as 'global' | 'globalcn' | 'globallive' | 'globalcnlive' | null)
  const initViewParam = (initParams.get('view') as 'global' | 'globalcn' | null)
  const initSubParam = (initParams.get('sub') as 'qa' | 'live' | 'cn' | null)
  const initRunId = initParams.get('runId') || null

  const deducedFromTab = (() => {
    if (initTab === 'global') return { view: 'global' as const, sub: 'qa' as const }
    if (initTab === 'globallive') return { view: 'global' as const, sub: 'live' as const }
    if (initTab === 'globalcn') return { view: 'globalcn' as const, sub: 'qa' as const }
    if (initTab === 'globalcnlive') return { view: 'globalcn' as const, sub: 'cn' as const }
    return { view: 'global' as const, sub: 'qa' as const }
  })()

  const [view, setView] = useState<'global' | 'globalcn'>(initViewParam || deducedFromTab.view)
  const [sub, setSub] = useState<'qa' | 'live' | 'cn'>(initSubParam ? (initViewParam === 'globalcn' && initSubParam === 'live' ? 'cn' : initSubParam) : deducedFromTab.sub)
  const [running, setRunning] = useState(false)
  const [reloadEpoch, setReloadEpoch] = useState(0)
  const [runsItems, setRunsItems] = useState<TestRunDoc[]>([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initRunId)
  const [casesTree, setCasesTree] = useState<Record<string, unknown> | null>(null)
  const [casesLoading, setCasesLoading] = useState(false)
  const [casesError, setCasesError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [stepsOpen, setStepsOpen] = useState(false)
  const [stepsLoading, setStepsLoading] = useState(false)
  const [stepsError, setStepsError] = useState<string | null>(null)
  const [stepsItems, setStepsItems] = useState<Record<string, unknown>[]>([])
  const [stepExpanded, setStepExpanded] = useState<Record<string, boolean>>({})
  const [selectedCaseName, setSelectedCaseName] = useState<string>('')
  const statusIcon = (s: 'passed' | 'failed' | 'broken' | 'partial' | 'unknown' | 'error') => {
    if (s === 'passed') return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-green-600">
        <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
      </svg>
    )
    if (s === 'failed') return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-rose-600">
        <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
    if (s === 'error') return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-amber-600">
        <path fill="currentColor" d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z"/>
      </svg>
    )
    if (s === 'broken') return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-amber-600">
        <path fill="currentColor" d="M12 2 1 21h22L12 2zm0 3 7.53 13H4.47L12 5zm-1 6h2v5h-2v-5z"/>
      </svg>
    )
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-500">
        <circle cx="12" cy="12" r="6" fill="currentColor"/>
      </svg>
    )
  }
  const toggleIcon = (open: boolean) => open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-600">
      <path fill="currentColor" d="M6 14h12v-2H6v2z"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-600">
      <path fill="currentColor" d="M11 6h2v12h-2V6zm-5 5h12v2H6v-2z"/>
    </svg>
  )
  const collectCases = (val: unknown): Record<string, unknown>[] => {
    if (Array.isArray(val)) return (val as unknown[]).filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
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
      const st = String((it as Record<string, unknown>)?.status || '').toLowerCase()
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
    const s = (n / 1000)
    return `${s.toFixed(2)}s`
  }
  const statusTextClass = (s: string | undefined) => {
    const v = String(s || '').toUpperCase()
    if (v === 'SUCCESS' || v === 'PASSED' || v === 'PASS') return 'text-green-700'
    if (v === 'FAILURE' || v === 'FAILED') return 'text-rose-700'
    if (v === 'ERROR' || v === 'BROKEN') return 'text-amber-700'
    return 'text-gray-700'
  }
  const openStepsForCase = async (testCase: Record<string, unknown>) => {
    const rid = String(selectedRunId || initRunId || '')
    const tcId = String((testCase as Record<string, unknown>)?.testCaseId || (testCase as Record<string, unknown>)?.id || (testCase as Record<string, unknown>)?._id || '')
    if (!rid || !tcId) return
    setSelectedCaseName(String(testCase.name || ''))
    setStepsOpen(true)
    setStepsLoading(true)
    setStepsError(null)
    setStepExpanded({})
    const qs = new URLSearchParams({ runId: rid, testCaseId: tcId })
    const data = await apiJson<{ items?: Record<string, unknown>[] }>(`/api/tests/steps?${qs.toString()}`)
    setStepsItems(Array.isArray(data?.items) ? data!.items! : [])
    setStepsLoading(false)
  }

  const storageKey = 'sdet-run-flags'
  const setFlag = (env: string, running: boolean) => {
    try {
      const s = localStorage.getItem(storageKey)
      const obj = s ? JSON.parse(s) as Record<string, boolean> : {}
      const next = { ...obj, [env]: running }
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch { void 0 }
  }

  const mainTabs = useMemo(() => {
    return [
      { key: 'global' as const, label: 'Global' },
      { key: 'globalcn' as const, label: 'Global CN' },
    ]
  }, [])

  const current = useMemo(() => {
    if (view === 'global') {
      if (sub === 'live') return { collection: 'global-live', detailPathPrefix: '/reports/global-live' }
      return { collection: 'global-qa', detailPathPrefix: '/reports/global' }
    } else {
      if (sub === 'cn') return { collection: 'cn-live', detailPathPrefix: '/reports/global-cn-live' }
      return { collection: 'cn-qa', detailPathPrefix: '/reports/global-cn' }
    }
  }, [view, sub])
  const envParam = useMemo(() => {
    if (view === 'global') return sub === 'live' ? 'live' : 'qa'
    return sub === 'cn' ? 'cnlive' : 'cnqa'
  }, [view, sub])
  const projectParam = useMemo(() => current.collection, [current])
  useEffect(() => {
    let canceled = false
    async function loadRuns() {
      setRunsLoading(true)
      setRunsError(null)
      const qs = new URLSearchParams({ page: '1', pageSize: '5', project: projectParam })
      const data = await apiJson<{ total?: number; items?: TestRunDoc[] }>(`/api/tests/runs?${qs.toString()}`)
      if (!canceled) {
        const arr = Array.isArray(data?.items) ? (data?.items as TestRunDoc[]) : []
        setRunsItems(arr)
      }
      if (!canceled) setRunsLoading(false)
    }
    loadRuns()
    return () => { canceled = true }
  }, [projectParam, reloadEpoch])
  useEffect(() => {
    if (!initRunId) return
    let canceled = false
    async function initLoad() {
      setSelectedRunId(initRunId)
      setCasesLoading(true)
      setCasesError(null)
      setExpanded({})
      const qs = new URLSearchParams({ runId: String(initRunId) })
      const data = await apiJson<{ total?: number; items?: Record<string, unknown> }>(`/api/tests/cases?${qs.toString()}`)
      if (!canceled) {
        if (data && data.items) setCasesTree(data.items)
        else setCasesTree({})
        setCasesLoading(false)
      }
    }
    initLoad()
    return () => { canceled = true }
  }, [])

  const updateQuery = (patch: Record<string, unknown>) => {
    const params = new URLSearchParams(location.search)
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '') params.delete(k)
      else params.set(k, String(v))
    })
    const s = params.toString()
    navigate({ pathname: location.pathname, search: s ? `?${s}` : '' }, { replace: true })
  }

  const initName = initParams.get('name') || ''
  const [name, setName] = useState(initName)

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
                  updateQuery({ view: t.key, sub: nextSub, tab: nextTab, page: 1 })
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
                        ? t.key === 'live' ? 'globallive' : 'global'
                        : t.key === 'cn' ? 'globalcnlive' : 'globalcn'
                    updateQuery({ view, sub: t.key, tab: nextTab, page: 1 })
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-xl ${running ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'} text-white text-sm px-3 py-2 shadow-soft transition`}
              disabled={running}
              onClick={async () => {
                setRunning(true)
                setFlag(envParam, true)
                const res = await apiJson<RunResponse>(`/api/run?env=${encodeURIComponent(envParam)}`)
                if (res && res.status === 'ok' && res.notice) {
                  const msg = String(res.notice.content || '').trim()
                  window.dispatchEvent(new CustomEvent('global:alert', { detail: { message: msg || 'Successfully triggered test run.' } }))
                } else {
                  window.dispatchEvent(new CustomEvent('global:alert', { detail: { message: 'Failed to trigger test run.' } }))
                }
                const stats = await apiJson<unknown>('/api/reports/stats')
                if (stats != null) {
                  window.dispatchEvent(new CustomEvent('global:stats', { detail: { data: stats } }))
                }
                setReloadEpoch((x) => x + 1)
                setRunning(false)
                setFlag(envParam, false)
              }}
            >
              {running ? (
                <>
                  <svg className="mr-3 size-5 w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span className="font-medium">Processing…</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-1 w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                  <span className="font-medium">Run Test</span>
                </>
              )}
            </button>
          </div>
          {runsLoading ? (
            <Loading />
          ) : runsError ? (
            <div className="text-sm text-rose-600">Error: {runsError}</div>
          ) : runsItems.length === 0 ? (
            <div className="relative w-full flex items-center justify-center py-6">
              <img src={NoData} alt="No data" className="max-h-64 w-auto object-contain opacity-80 rounded-xl" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">STT</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Start Time</th>
                    <th className="px-3 py-2">Total Test</th>
                    <th className="px-3 py-2">Passed</th>
                    <th className="px-3 py-2">Failed</th>
                    <th className="px-3 py-2">Broken/Error</th>
                  </tr>
                </thead>
                <tbody>
                  {runsItems.map((it, idx) => {
                    const fmt = (v: string | undefined) => {
                      if (!v) return ''
                      const d = new Date(v)
                      if (Number.isNaN(d.getTime())) return v
                      const pad = (x: number) => String(x).padStart(2, '0')
                      return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
                    }
                    return (
                      <tr
                        key={idx}
                        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={async () => {
                          const rid = String(it.runId || '')
                          if (!rid) return
                          setSelectedRunId(rid)
                          setCasesLoading(true)
                          setCasesError(null)
                          setExpanded({})
                          updateQuery({ runId: rid })
                          const qs = new URLSearchParams({ runId: rid })
                          const data = await apiJson<{ total?: number; items?: Record<string, unknown> }>(`/api/tests/cases?${qs.toString()}`)
                          if (data && data.items) setCasesTree(data.items)
                          else setCasesTree({})
                          setCasesLoading(false)
                        }}
                      >
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2">{String(it.runId ?? '')}</td>
                        <td className="px-3 py-2">{fmt(it.startTime)}</td>
                        <td className="px-3 py-2">{String(it.summary?.total ?? 0)}</td>
                        <td className="px-3 py-2">{String(it.summary?.passed ?? 0)}</td>
                        <td className="px-3 py-2">{String(it.summary?.failed ?? 0)}</td>
                        <td className="px-3 py-2">{String(it.summary?.broken ?? 0)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Run Test Cases Tree</div>
            <div className="text-xs text-gray-500">{selectedRunId ? `Run: ${selectedRunId}` : ''}</div>
          </div>
          {casesLoading ? (
            <Loading />
          ) : casesError ? (
            <div className="text-sm text-rose-600">Error: {casesError}</div>
          ) : !casesTree || Object.keys(casesTree || {}).length === 0 ? (
            <div className="relative w-full flex items-center justify-center py-6">
              <img src={NoData} alt="No data" className="max-h-64 w-auto object-contain opacity-80 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(casesTree || {}).map(([topKey, topVal]) => {
                const isOpen = !!expanded[topKey]
                const toggle = () => setExpanded({ ...expanded, [topKey]: !isOpen })
                return (
                  <div key={topKey} className="rounded-xl border border-gray-200 bg-white">
                    <button className="w-full flex items-center justify-between px-3 py-2" onClick={toggle}>
                      <div className="flex items-center gap-2">
                        {toggleIcon(isOpen)}
                        <div className="text-sm font-medium text-gray-800 capitalize">{topKey}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">{statusIcon(overallStatus(topVal))}</div>
                        {Array.isArray(topVal) ? (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{scenarioAndCaseText(topVal as unknown[])}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{Object.keys(topVal as Record<string, unknown>).length} features</span>
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
                                  <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openStepsForCase(r)}>
                                    <td className="px-2 py-1">{String(r.name ?? '')}</td>
                                    <td className="px-2 py-1">{String(r.story ?? '')}</td>
                                    <td className={`px-2 py-1 ${statusTextClass(String(r.status ?? ''))}`}>{String(r.status ?? '')}</td>
                                    <td className="px-2 py-1">{String(r._dur ?? r.duration ?? '')}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        ) : (
                          Object.entries(topVal as Record<string, unknown>).map(([subKey, subVal]) => {
                            const path = `${topKey}/${subKey}`
                            const subOpen = !!expanded[path]
                            const subToggle = () => setExpanded({ ...expanded, [path]: !subOpen })
                            return (
                              <div key={subKey} className="rounded-lg border border-gray-200 bg-white">
                                <button className="w-full flex items-center justify-between px-3 py-2" onClick={subToggle}>
                                  <div className="flex items-center gap-2">
                                    {toggleIcon(subOpen)}
                                    <div className="text-sm font-medium text-gray-800">{subKey}</div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">{statusIcon(overallStatus(subVal))}</div>
                                    {Array.isArray(subVal) ? (
                                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{scenarioAndCaseText(subVal as unknown[])}</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{Object.keys(subVal as Record<string, unknown>).length} features</span>
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
                                          <th className="px-2 py-1">Status</th>
                                          <th className="px-2 py-1">Duration</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(subVal as unknown[]).map((it, idx) => {
                                          const r = it as Record<string, unknown>
                                          return (
                                            <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openStepsForCase(r)}>
                                              <td className="px-2 py-1">{String(r.name ?? '')}</td>
                                              <td className="px-2 py-1">{String(r.story ?? '')}</td>
                                              <td className={`px-2 py-1 ${statusTextClass(String(r.status ?? ''))}`}>{String(r.status ?? '')}</td>
                                              <td className="px-2 py-1">{String(r._dur ?? r.duration ?? '')}</td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                
                              </div>
                            )
                          })
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
                        const isOpen = !!stepExpanded[id]
                        const toggle = () => setStepExpanded({ ...stepExpanded, [id]: !isOpen })
                        const req = r.request as Record<string, unknown> | null
                        const hasReq = !!req && (req.cUrl || req.url || req.method)
                        return (
                          <>
                            <tr key={id} className="border-t border-gray-100">
                              <td className="px-2 py-1">{String(r.name ?? '')}</td>
                              <td className={`px-2 py-1 ${statusTextClass(String(r.status ?? ''))}`}>{String(r.status ?? '')}</td>
                              <td className="px-2 py-1">{fmtMs(r.duration as number)}</td>
                              <td className="px-2 py-1">
                                {hasReq ? (
                                  <button type="button" className="rounded-md bg-green-600 text-white text-xs px-2 py-1 shadow-soft hover:bg-green-700" onClick={toggle}>
                                    REST Query
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">N/A</span>
                                )}
                              </td>
                            </tr>
                            {isOpen && hasReq && (
                              <tr>
                                <td colSpan={4} className="px-2 py-2 bg-gray-50">
                                  <textarea
                                    readOnly
                                    rows={4}
                                    wrap="soft"
                                    value={String((req as Record<string, unknown>)?.cUrl || '')}
                                    className="w-full max-w-full rounded-md border border-gray-300 bg-gray-100 font-mono text-xs p-2 resize-none"
                                  />
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
                <button type="button" className="rounded-md bg-gray-200 text-gray-700 text-sm px-3 py-2 hover:bg-gray-300" onClick={() => setStepsOpen(false)}>
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
