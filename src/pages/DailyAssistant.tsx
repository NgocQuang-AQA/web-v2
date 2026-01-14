import { useEffect, useState } from 'react'
import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import { apiJson, getAuthUsername } from '../lib/api'
import { sendLog } from '../lib/logger'
import ConfirmDialog from '../components/ConfirmDialog'

type DashboardStats = {
  visits: number
  topUser: string
  vocUsage: { day: number; week: number; month: number }
  testRuns: { day: number; week: number; month: number }
  latestRun: Record<string, unknown> | null
  latestRunStats: Record<string, unknown> | null
  projectStats: Array<{
    name: string
    key: string
    env: string
    lastRun: Record<string, unknown> | null
  }>
}

function RunCard({ item }: { item: DashboardStats['projectStats'][0] }) {
  const [running, setRunning] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'run' | 'sync' | null>(
    null
  )
  const storageKey = 'sdet-run-flags'
  const setFlag = (env: string, isRunning: boolean) => {
    try {
      const s = localStorage.getItem(storageKey)
      const obj = s ? (JSON.parse(s) as Record<string, boolean>) : {}
      const next = { ...obj, [env]: isRunning }
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      void 0
    }
  }

  const runObj = (item.lastRun || {}) as Record<string, unknown>
  const sum = (runObj.summary || {}) as Record<string, unknown>
  const passed = Number(sum.passed || 0)
  const failed = Number(sum.failed || 0)
  const broken = Number(sum.broken || 0)
  const total = Number(sum.total || 0)
  const rate = total ? Math.round((passed / total) * 100) : 0

  async function triggerRun() {
    setRunning(true)
    try {
      setFlag(item.env, true)
      const res = await apiJson<{
        status?: string
        message?: string
        notice?: { content?: string } | null
      }>(`/api/run?env=${item.env}`)
      if (res?.status !== 'ok') {
        const msgErr =
          res?.message && String(res.message).trim()
            ? String(res.message).trim()
            : 'Failed to trigger test run.'
        window.dispatchEvent(
          new CustomEvent('global:alert', {
            detail: { message: msgErr },
          })
        )
        setFlag(item.env, false)
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent('global:alert', { detail: { message: 'Error triggering run' } })
      )
      setFlag(item.env, false)
    } finally {
      window.dispatchEvent(new CustomEvent('global:reload', { detail: { source: 'run', env: item.env } }))
      setRunning(false)
    }
  }

  async function triggerSync() {
    setSyncing(true)
    try {
      const envKey =
        item.env === 'cnlive' ? 'synccnlive' : item.env === 'live' ? 'synclive' : 'synclive'
      setFlag(envKey, true)
      const qs = new URLSearchParams({ env: envKey, key: item.key })
      const res = await apiJson<{ status?: string; message?: string; notice?: { content?: string } | null }>(
        `/api/run?${qs.toString()}`
      )
      if (res?.status !== 'ok') {
        const msgErr =
          res?.message && String(res.message).trim()
            ? String(res.message).trim()
            : 'Sync failed.'
        window.dispatchEvent(
          new CustomEvent('global:alert', {
            detail: { message: msgErr },
          })
        )
        setFlag(envKey, false)
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent('global:alert', { detail: { message: 'Error syncing data' } })
      )
      const envKey =
        item.env === 'cnlive' ? 'synccnlive' : item.env === 'live' ? 'synclive' : 'synclive'
      setFlag(envKey, false)
    } finally {
      window.dispatchEvent(new CustomEvent('global:reload', { detail: { source: 'sync', env: item.env } }))
      setSyncing(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="font-bold text-gray-700">{item.name}</div>
          <div
            className={`px-2 py-1 rounded text-xs font-bold ${rate >= 90 ? 'bg-emerald-100 text-emerald-700' : rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}
          >
            {rate}% Pass
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Passed</span>
            <span className="font-medium text-emerald-600">{passed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Failed</span>
            <span className="font-medium text-rose-600">{failed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Broken</span>
            <span className="font-medium text-amber-600">{broken}</span>
          </div>
          <div className="pt-2 border-t border-gray-50 flex justify-between text-xs text-gray-400">
            <span>Last run:</span>
            <span>{String(runObj.startTime || 'N/A')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (['live', 'cnlive'].includes(item.env)) {
              setConfirmAction('run')
              setConfirmOpen(true)
            } else {
              triggerRun()
            }
          }}
          disabled={running}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl ${running ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'} text-white text-sm px-3 py-2 shadow-soft transition`}
        >
          {running ? (
            <>
              <svg
                className="mr-1 w-5 h-5 animate-spin"
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

        {['live', 'cnlive'].includes(item.env) && (
          <button
            type="button"
            onClick={() => {
              setConfirmAction('sync')
              setConfirmOpen(true)
            }}
            disabled={syncing}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl ${syncing ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700 active:scale-[0.98]'} text-white text-sm px-3 py-2 shadow-soft transition`}
            title="Sync data"
          >
            {syncing ? (
              <>
                <svg
                  className="mr-1 w-5 h-5 animate-spin"
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
                <span className="font-medium">Syncing…</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="mr-1 w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 .34-.03.67-.1.99l1.53 1.53C18.81 14.79 19 13.92 19 13c0-3.87-3.13-7-7-7zm-7.41.41L3.17 7.83C2.39 9.07 2 10.49 2 12c0 3.87 3.13 7 7 7v3l4-4-4-4v3c-2.76 0-5-2.24-5-5 0-1.1.3-2.13.82-3.02L4.59 6.41z" />
                </svg>
                <span className="font-medium">Sync</span>
              </>
            )}
          </button>
        )}
        <ConfirmDialog
          open={confirmOpen}
          title="Confirm Action"
          description="This may affect the live environment. Are you sure you want to proceed?"
          confirmText={confirmAction === 'sync' ? 'Sync Data' : 'Run Test'}
          cancelText="Cancel"
          onConfirm={() => {
            setConfirmOpen(false)
            if (confirmAction === 'sync') triggerSync()
            else triggerRun()
            setConfirmAction(null)
          }}
          onCancel={() => {
            setConfirmOpen(false)
            setConfirmAction(null)
          }}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: string | number
  sub?: string
  icon: string
  tone: string
}) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  const c = colors[tone] || colors.blue
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-gray-500 text-sm font-medium mb-1">{label}</div>
          <div className="text-3xl font-bold text-gray-800">{value}</div>
        </div>
        <div className={`p-2 rounded-xl ${c} text-xl`}>{icon}</div>
      </div>
      {sub && <div className="text-xs text-gray-400 font-medium">{sub}</div>}
    </div>
  )
}

function BarGroup({
  label,
  data,
  type = 'bar',
  tone = 'indigo',
}: {
  label: string
  data: { day: number; week: number; month: number }
  type?: 'bar' | 'line'
  tone?: 'indigo' | 'rose' | 'emerald' | 'blue' | 'amber'
}) {
  const items = [
    { k: 'Day', v: data.day },
    { k: 'Week', v: data.week },
    { k: 'Month', v: data.month },
  ]
  const max = Math.max(...items.map((i) => i.v), 1)
  const width = 480
  const height = 200
  const ml = 32
  const mr = 24
  const mt = 16
  const mb = 36
  const cw = width - ml - mr
  const ch = height - mt - mb
  const bw = Math.floor((cw / items.length) * 0.6)
  const gap = Math.floor((cw - bw * items.length) / (items.length - 1 || 1))
  const xPos = (i: number) => ml + i * (bw + gap)
  const yScale = (v: number) => Math.max(2, Math.round((v / max) * ch))
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const palette: Record<string, { primary: string; light: string }> = {
    indigo: { primary: '#6366f1', light: '#eef2ff' },
    rose: { primary: '#f43f5e', light: '#ffe4e6' },
    emerald: { primary: '#10b981', light: '#d1fae5' },
    blue: { primary: '#3b82f6', light: '#dbeafe' },
    amber: { primary: '#f59e0b', light: '#fef3c7' },
  }
  const color = palette[tone]
  const chartType: 'bar' | 'line' = type

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="font-semibold text-gray-800 mb-6">{label}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
        {ticks.map((t, idx) => {
          const y = mt + ch - Math.round(t * ch)
          return (
            <g key={idx}>
              <line
                x1={ml}
                y1={y}
                x2={width - mr}
                y2={y}
                stroke={palette.indigo.light}
                strokeWidth={1}
              />
              <text
                x={ml - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {Math.round(t * max)}
              </text>
            </g>
          )
        })}
        <line
          x1={ml}
          y1={mt + ch}
          x2={width - mr}
          y2={mt + ch}
          stroke="#e5e7eb"
          strokeWidth={1.5}
        />
        {chartType === 'bar' ? (
          items.map((it, i) => {
            const h = yScale(it.v)
            const x = xPos(i)
            const y = mt + ch - h
            return (
              <g key={it.k}>
                <rect x={x} y={y} width={bw} height={h} rx={8} fill={color.primary} />
                <text
                  x={x + bw / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                  fontWeight="700"
                >
                  {it.v}
                </text>
                <text
                  x={x + bw / 2}
                  y={mt + ch + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {it.k}
                </text>
              </g>
            )
          })
        ) : (
          (() => {
            const points = items.map((it, i) => {
              const x = xPos(i) + bw / 2
              const y = mt + ch - yScale(it.v)
              return { x, y, v: it.v, k: it.k }
            })
            const d = points
              .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
              .join(' ')
            const area = `M ${points[0].x} ${mt + ch} L ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[2].x} ${mt + ch} Z`
            return (
              <g>
                <path d={area} fill={color.light} />
                <path d={d} stroke={color.primary} strokeWidth={2.5} fill="none" />
                {points.map((p) => (
                  <g key={p.k}>
                    <circle cx={p.x} cy={p.y} r={5} fill={color.primary} />
                    <text
                      x={p.x}
                      y={p.y - 10}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#374151"
                      fontWeight="700"
                    >
                      {p.v}
                    </text>
                    <text
                      x={p.x}
                      y={mt + ch + 20}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#6b7280"
                    >
                      {p.k}
                    </text>
                  </g>
                ))}
              </g>
            )
          })()
        )}
      </svg>
    </div>
  )
}

export default function DailyAssistant() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return
    const username = getAuthUsername()
    sendLog({
      level: 'info',
      message: 'Page View',
      source: 'Dashboard',
      meta: { username: username || 'anonymous' },
    })

    async function load() {
      try {
        const data = await apiJson<DashboardStats>('/api/dashboard/stats')
        if (data) setStats(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    setInitialized(true)
  }, [initialized])
  useEffect(() => {
    const onReload = async () => {
      setLoading(true)
      try {
        const data = await apiJson<DashboardStats>('/api/dashboard/stats')
        if (data) setStats(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    window.addEventListener('global:reload', onReload as EventListener)
    return () => {
      window.removeEventListener('global:reload', onReload as EventListener)
    }
  }, [])

  if (loading) {
    return (
      <AppLayout sidebar={<AgentSidebar />}>
        <div className="p-8 flex items-center justify-center h-full text-gray-400">
          Loading dashboard...
        </div>
      </AppLayout>
    )
  }

  if (!stats) return null

  const latestRunObj = (stats.latestRun || {}) as Record<string, unknown>
  const latestStats = (latestRunObj.summary || {}) as Record<string, unknown>
  const passed = Number(latestStats.passed || 0)
  const failed = Number(latestStats.failed || 0)
  const broken = Number(latestStats.broken || 0)
  const total = Number(latestStats.total || 0)
  const passRate = total ? Math.round((passed / total) * 100) : 0

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">
            Overview of system activities and test reports.
          </p>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Visits"
            value={stats.visits}
            icon="👀"
            tone="blue"
            sub="All time page views"
          />
          <StatCard
            label="Most Active User"
            value={stats.topUser || 'N/A'}
            icon="👤"
            tone="green"
            sub="Based on activity logs"
          />
          <StatCard
            label="VOC Usage (Today)"
            value={stats.vocUsage.day}
            icon="📝"
            tone="amber"
            sub={`${stats.vocUsage.week} this week`}
          />
          <StatCard
            label="Test Runs (Today)"
            value={stats.testRuns.day}
            icon="🚀"
            tone="rose"
            sub={`${stats.testRuns.week} this week`}
          />
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarGroup label="VOC Usage Analytics" data={stats.vocUsage} type="bar" tone="indigo" />
          <BarGroup label="Test Runs Analytics" data={stats.testRuns} type="line" tone="rose" />
        </div>

        {/* Latest Test Run */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="font-semibold text-gray-800 text-lg">
              {`Latest Test Run - ${String(latestRunObj.project || '')}`}
            </div>
            {stats.latestRun && (
              <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">
                {String(latestRunObj.startTime)}
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg
                viewBox="0 0 36 36"
                className="w-full h-full transform -rotate-90"
              >
                <path
                  className="text-gray-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.8"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${passRate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.8"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">
                  {passRate}%
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Success
                </span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <div className="text-emerald-600 text-xs font-bold uppercase mb-1">
                  Passed
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {passed}
                </div>
              </div>
              <div className="p-4 bg-rose-50 rounded-xl">
                <div className="text-rose-600 text-xs font-bold uppercase mb-1">
                  Failed
                </div>
                <div className="text-2xl font-bold text-rose-700">{failed}</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <div className="text-amber-600 text-xs font-bold uppercase mb-1">
                  Flaky/Broken
                </div>
                <div className="text-2xl font-bold text-amber-700">
                  {broken}
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="text-blue-600 text-xs font-bold uppercase mb-1">
                  Total
                </div>
                <div className="text-2xl font-bold text-blue-700">{total}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Specific Stats */}
        <div>
          <div className="font-semibold text-gray-800 text-lg mb-4">
            Project Status & Actions
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(stats.projectStats || []).map((p) => (
              <RunCard key={p.key} item={p} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
