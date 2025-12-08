import './App.css'
import AppLayout from './app/AppLayout'
import AgentSidebar from './app/AgentSidebar'
import Topbar from './app/Topbar'
import SuiteList from './features/suites/SuiteList'
import FlakyAnalysisList from './features/flaky/FlakyAnalysisList'
import QuickActionsBar from './features/actions/QuickActionsBar'
import ChatDock from './features/chat/ChatDock'
import GlobalQaTable from './features/reports/GlobalQaTable'
import { apiUrl } from './lib/api'
import { useEffect, useState } from 'react'
import type { SummaryStats } from './models/types'

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function App() {
  const [stats, setStats] = useState<SummaryStats>([])

  useEffect(() => {
    let canceled = false
    async function load() {
      const data = await fetchJson<SummaryStats>(apiUrl('/api/reports/stats'))
      if (!canceled && data) setStats(data)
    }
    load()
    return () => { canceled = true }
  }, [])

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <Topbar />
      <div className="space-y-4">
        {stats.map((s, idx) => (
          <div key={idx} className="rounded-2xl bg-white shadow-soft p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Summary Test Automation Report - {s.name}</div>
              <div className="text-xs text-gray-500">{s.timeRange || 'N/A'}</div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="text-green-700">Success Rate: {s.successRate}%</div>
              <div className="text-rose-700">Failed Tests: {s.failedCount}</div>
              <div className="text-amber-700">Flaky Tests: {s.flakyCount}</div>
            </div>
          </div>
        ))}

        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="font-semibold mb-3">Test Suite Results</div>
          <SuiteList />
        </div>

        <FlakyAnalysisList />
        <QuickActionsBar />
        <GlobalQaTable />
        <ChatDock />
      </div>
    </AppLayout>
  )
}

export default App
