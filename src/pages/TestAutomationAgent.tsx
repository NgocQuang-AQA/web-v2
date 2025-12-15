import { useEffect, useState } from 'react'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import StatCard from '../features/stats/StatCard'
import SuiteList from '../features/suites/SuiteList'
import FlakyAnalysisList from '../features/flaky/FlakyAnalysisList'
import QuickActionsBar from '../features/actions/QuickActionsBar'
import ChatDock from '../features/chat/ChatDock'
import { apiUrl } from '../lib/api'
import type { StatMetrics } from '../models/types'

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function TestAutomationAgent() {
  const [stats, setStats] = useState<StatMetrics | null>(null)
  useEffect(() => {
    let canceled = false
    async function load() {
      const data = await fetchJson<StatMetrics>(apiUrl('/api/reports/stats'))
      if (!canceled) setStats(data)
    }
    load()
    return () => { canceled = true }
  }, [])
  const sr = stats?.successRate ?? 0
  const fc = stats?.failedCount ?? 0
  const fl = stats?.flakyCount ?? 0
  const rt = stats?.timeRange ?? 0
  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="font-semibold mb-2">Test Automation Report</div>
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Success Rate" value={`${Math.round(sr)}%`} tone="success" />
            <StatCard label="Failed Tests" value={`${fc}`} tone="danger" />
            <StatCard label="Flaky Tests" value={`${fl}`} tone="warning" />
            <StatCard label="Range time" value={`${rt}`} />
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="font-semibold mb-3">Test Suite Results</div>
          <SuiteList />
        </div>

        <FlakyAnalysisList />
        <QuickActionsBar />
        <ChatDock />
      </div>
    </AppLayout>
  )
}
