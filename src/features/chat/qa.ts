import { statsToday } from '../../data/mock/stats'
import { apiJson } from '../../lib/api'

export type StatMetrics = {
  successRate: number
  failedCount: number
  flakyCount: number
  totalRuntimeMinutes: number
}

async function fetchJson<T>(url: string): Promise<T | null> {
  return apiJson<T>(url)
}

export async function fetchStats(params?: { from?: string; to?: string }): Promise<StatMetrics> {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  const url = qs.toString() ? `/api/reports/stats?${qs.toString()}` : '/api/reports/stats'
  const data = await fetchJson<StatMetrics>(url)
  if (data && typeof data.successRate === 'number') return data
  return statsToday
}

function fmtPercent(n: number) {
  const v = Math.round(n)
  return `${v}%`
}

function fmtMinutes(n: number) {
  const m = Math.max(0, Math.floor(n))
  return `${m} minutes`
}

function startOfWeekISO(d: Date) {
  const dt = new Date(d)
  const day = dt.getDay() || 7
  if (day !== 1) dt.setHours(-24 * (day - 1))
  dt.setHours(0, 0, 0, 0)
  return dt
}

function toIso(d: Date) {
  return d.toISOString()
}

function hasAny(str: string, kws: string[]) {
  const s = str.toLowerCase()
  return kws.some(k => s.includes(k))
}

export async function answerQuestion(q: string): Promise<string> {
  const lower = q.toLowerCase()
  if (hasAny(lower, ['tỉ lệ', 'ty le', 'tỷ lệ', 'pass', 'thành công', 'success rate'])) {
    const stats = await fetchStats()
    return `Current pass rate: ${fmtPercent(stats.successRate)}.`
  }
  if (hasAny(lower, ['fail', 'thất bại', 'failed'])) {
    const stats = await fetchStats()
    return `Failed tests: ${stats.failedCount}.`
  }
  if (hasAny(lower, ['flaky'])) {
    const stats = await fetchStats()
    return `Flaky tests: ${stats.flakyCount}.`
  }
  if (hasAny(lower, ['thời gian', 'runtime', 'chạy mất', 'duration'])) {
    const stats = await fetchStats()
    return `Total runtime: ${fmtMinutes(stats.totalRuntimeMinutes)}.`
  }
  if (hasAny(lower, ['tuần này', 'trong tuần', 'cải thiện', 'so với tuần trước', 'this week', 'last week'])) {
    const now = new Date()
    const startThisWeek = startOfWeekISO(now)
    const startLastWeek = new Date(startThisWeek)
    startLastWeek.setDate(startLastWeek.getDate() - 7)
    const endLastWeek = new Date(startThisWeek)
    endLastWeek.setMilliseconds(-1)
    const thisWeek = await fetchStats({ from: toIso(startThisWeek), to: toIso(now) })
    const lastWeek = await fetchStats({ from: toIso(startLastWeek), to: toIso(endLastWeek) })
    const diff = Math.round((thisWeek.successRate - lastWeek.successRate) * 100) / 100
    const trend = diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'no change'
    const abs = Math.abs(diff)
    return `Pass rate this week: ${fmtPercent(thisWeek.successRate)}; last week: ${fmtPercent(lastWeek.successRate)}. Trend: ${trend} ${abs}%.`
  }
  return 'The chatbot supports questions about test metrics: pass rate, failed tests, flaky tests, total runtime, and weekly trends. Please try asking a related question.'
}
