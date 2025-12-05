export type AgentStatus = 'online' | 'warning' | 'offline' | 'working'

export type Agent = {
  id: string
  name: string
  icon: string
  status: AgentStatus
  counters?: number[]
}

export type StatMetrics = {
  name?: string
  successRate: number
  failedCount: number
  flakyCount: number
  totalRuntimeMinutes: number
  timeRange?: string
}

export type SummaryStats = StatMetrics[]

export type TestSuiteStatus = 'passed' | 'partial' | 'failed'

export type TestSuite = {
  id: string
  name: string
  status: TestSuiteStatus
  startTime: string
  duration: string
  passed: number
  failed: number
  flaky: number
  percent: number
  totalTests: number
}

export type FlakyItem = {
  id: string
  title: string
  suite: string
  failures: number
  lastSeen: string
  trendMs: number
}
