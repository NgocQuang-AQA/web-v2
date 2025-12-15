import { useEffect, useState } from 'react'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import StatCard from '../features/stats/StatCard'
// import FlakyAnalysisList from '../features/flaky/FlakyAnalysisList'
// import QuickActionsBar from '../features/actions/QuickActionsBar'
// import ChatDock from '../features/chat/ChatDock'
type StatsItem = { name?: string; successRate?: number; failedCount?: number; flakyCount?: number; totalRuntimeMinutes?: number; timeRange?: string[] }
import LatestGlobalReport from '../features/reports/LatestGlobalReport'
import { apiUrl } from '../lib/api'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function DailyAssistant() {
  const [statsList, setStatsList] = useState<StatsItem[]>([])
  const [reloadKey] = useState(0)
  
  useEffect(() => {
    let canceled = false
    async function load() {
      const data = await fetchJson<unknown>(apiUrl('/api/reports/stats'))
      if (!canceled) {
        if (Array.isArray(data)) setStatsList(data as unknown as StatsItem[])
        else if (data && typeof data === 'object') setStatsList([data as unknown as StatsItem])
        else setStatsList([])
      }
    }
    load()
    return () => { canceled = true }
  }, [reloadKey])


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
              {Array.isArray(s.timeRange) && s.timeRange.length === 2 && (
                <div className="mt-2 text-xs text-gray-500">Time: {s.timeRange[0]} → {s.timeRange[1]}</div>
              )}
              {/* <div className="mt-3 flex items-center gap-2">
                <button className="rounded-xl bg-indigo-600 text-white text-sm px-3 py-2" onClick={() => {}} disabled={statsList.length === 0}>Sync Serenity</button>
                {statsList.length === 0 && <span className="text-sm text-gray-500">Loading metrics...</span>}
              </div> */}
            </div>
          )
        })}

        {/* <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="font-semibold mb-3">Test Suite Results</div>
          <SuiteList key={reloadKey} />
        </div> */}

        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="font-semibold mb-3">Report Latest</div>
          <LatestGlobalReport key={reloadKey} />
        </div>

        {/* <FlakyAnalysisList key={reloadKey} />
        <QuickActionsBar />
        <ChatDock /> */}
      </div>
    </AppLayout>
  )
}
