import { statsToday } from '../../data/mock/stats'

export type StatMetrics = {
  successRate: number
  failedCount: number
  flakyCount: number
  totalRuntimeMinutes: number
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

export async function fetchStats(params?: { from?: string; to?: string }): Promise<StatMetrics> {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  const base = 'http://localhost:4000/api/reports/stats'
  const url = qs.toString() ? `${base}?${qs.toString()}` : base
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
  return `${m} phút`
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
  if (hasAny(lower, ['tỉ lệ', 'ty le', 'tỷ lệ', 'pass', 'thành công'])) {
    const stats = await fetchStats()
    return `Tỉ lệ pass hiện tại: ${fmtPercent(stats.successRate)}.`
  }
  if (hasAny(lower, ['fail', 'thất bại', 'failed'])) {
    const stats = await fetchStats()
    return `Số lượng test thất bại: ${stats.failedCount}.`
  }
  if (hasAny(lower, ['flaky'])) {
    const stats = await fetchStats()
    return `Số lượng flaky tests: ${stats.flakyCount}.`
  }
  if (hasAny(lower, ['thời gian', 'runtime', 'chạy mất'])) {
    const stats = await fetchStats()
    return `Tổng thời gian chạy: ${fmtMinutes(stats.totalRuntimeMinutes)}.`
  }
  if (hasAny(lower, ['tuần này', 'trong tuần', 'cải thiện', 'so với tuần trước'])) {
    const now = new Date()
    const startThisWeek = startOfWeekISO(now)
    const startLastWeek = new Date(startThisWeek)
    startLastWeek.setDate(startLastWeek.getDate() - 7)
    const endLastWeek = new Date(startThisWeek)
    endLastWeek.setMilliseconds(-1)
    const thisWeek = await fetchStats({ from: toIso(startThisWeek), to: toIso(now) })
    const lastWeek = await fetchStats({ from: toIso(startLastWeek), to: toIso(endLastWeek) })
    const diff = Math.round((thisWeek.successRate - lastWeek.successRate) * 100) / 100
    const trend = diff > 0 ? 'tăng' : diff < 0 ? 'giảm' : 'không đổi'
    const abs = Math.abs(diff)
    return `Tỉ lệ pass tuần này: ${fmtPercent(thisWeek.successRate)}; tuần trước: ${fmtPercent(lastWeek.successRate)}. Xu hướng: ${trend} ${abs}%.`
  }
  return 'Hiện tại chatbot hỗ trợ các câu hỏi về số liệu test: tỉ lệ pass, số test fail, số flaky, thời gian chạy, xu hướng theo tuần. Vui lòng thử lại với câu hỏi liên quan.'
}
