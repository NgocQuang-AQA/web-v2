import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import StatCard from '../features/stats/StatCard'
// import FlakyAnalysisList from '../features/flaky/FlakyAnalysisList'
// import QuickActionsBar from '../features/actions/QuickActionsBar'
// import ChatDock from '../features/chat/ChatDock'
type StatsItem = { name?: string; successRate?: number; failedCount?: number; flakyCount?: number; totalRuntimeMinutes?: number; timeRange?: string[] }
// import LatestGlobalReport from '../features/reports/LatestGlobalReport'
import { apiJson } from '../lib/api'
type RunResponse = { status?: string; exitCode?: number; notice?: { content?: string } | null }

export default function DailyAssistant() {
  const [statsList, setStatsList] = useState<StatsItem[]>([])
  const [reloadKey] = useState(0)
  const storageKey = 'sdet-run-flags'
  const getFlags = () => {
    try {
      const s = localStorage.getItem(storageKey)
      const obj = s ? JSON.parse(s) as Record<string, boolean> : {}
      return obj && typeof obj === 'object' ? obj : {}
    } catch {
      return {}
    }
  }
  const [runningMap, setRunningMap] = useState<Record<string, boolean>>(() => getFlags())
  const nameToEnv = useMemo(() => {
    return (raw?: string) => {
      const v = String(raw || '').trim().toUpperCase()
      if (v === 'GLOBAL-QA') return 'qa'
      if (v === 'GLOBAL-LIVE') return 'live'
      if (v === 'CN-QA') return 'cnqa'
      if (v === 'CN-LIVE') return 'cnlive'
      return ''
    }
  }, [])
  const setFlag = (env: string, running: boolean) => {
    try {
      const cur = getFlags()
      const next = { ...cur, [env]: running }
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch { void 0 }
  }
  
  useEffect(() => {
    let canceled = false
    async function load() {
      const data = await apiJson<unknown>('/api/reports/stats')
      if (!canceled) {
        if (Array.isArray(data)) setStatsList(data as unknown as StatsItem[])
        else if (data && typeof data === 'object') setStatsList([data as unknown as StatsItem])
        else setStatsList([])
      }
    }
    load()
    return () => { canceled = true }
  }, [reloadKey])

  useEffect(() => {
    const onStats = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data?: unknown }
      const data = detail?.data
      if (Array.isArray(data)) setStatsList(data as unknown as StatsItem[])
      else if (data && typeof data === 'object') setStatsList([data as unknown as StatsItem])
    }
    window.addEventListener('global:stats', onStats as EventListener)
    return () => { window.removeEventListener('global:stats', onStats as EventListener) }
  }, [])

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="space-y-4">
        {statsList.map((s, idx) => {
          const sr = s.successRate ?? 0
          const fc = s.failedCount ?? 0
          const fl = s.flakyCount ?? 0
          return (
            <div key={idx} className="rounded-2xl bg-white shadow-soft p-4">
              <div className="font-semibold mb-2">{s.name || 'Test Automation Report'}</div>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Success Rate" value={`${Math.round(sr)}%`} tone="success" />
                <StatCard label="Failed Tests" value={`${fc}`} tone="danger" />
                <StatCard label="Flaky Tests" value={`${fl}`} tone="warning" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {(() => {
                  const env = nameToEnv(s.name)
                  const isRunning = !!runningMap[env]
                  return (
                    <button
                      className={`inline-flex items-center gap-2 rounded-xl ${isRunning ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'} text-white text-sm px-3 py-2 shadow-soft transition`}
                      disabled={!env || isRunning}
                      onClick={async () => {
                        if (!env) return
                        setRunningMap((m) => ({ ...m, [env]: true }))
                        setFlag(env, true)
                        const res = await apiJson<RunResponse>(`/api/run?env=${encodeURIComponent(env)}`)
                        if (res && res.status === 'ok' && res.notice) {
                          const msg = String(res.notice.content || '').trim()
                          window.dispatchEvent(new CustomEvent('global:alert', { detail: { message: msg || 'Successfully triggered test run.' } }))
                        } else {
                          window.dispatchEvent(new CustomEvent('global:alert', { detail: { message: 'Failed to trigger test run.' } }))
                        }
                        setRunningMap((m) => ({ ...m, [env]: false }))
                        setFlag(env, false)
                      }}
                    >
                      {isRunning ? (
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
                  )
                })()}
              </div>
            </div>
          )
        })}

        

        {/* <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="font-semibold mb-3">Test Suite Results</div>
          <SuiteList key={reloadKey} />
        </div> */}

        {/* <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="font-semibold mb-3">Report Latest</div>
          <LatestGlobalReport key={reloadKey} />
        </div> */}

        {/* <FlakyAnalysisList key={reloadKey} />
        <QuickActionsBar />
        <ChatDock /> */}
      </div>
    </AppLayout>
  )
}
