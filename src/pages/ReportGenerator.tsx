import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import GlobalQaTable from '../features/reports/GlobalQaTable'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'

export default function ReportGenerator() {
  const navigate = useNavigate()
  const location = useLocation()
  const initParams = new URLSearchParams(window.location.search)
  const initTab = (initParams.get('tab') as 'global' | 'globalcn' | 'globallive' | 'globalcnlive') || 'global'
  const [active, setActive] = useState<'global' | 'globalcn' | 'globallive' | 'globalcnlive'>(initTab)

  const tabs = useMemo(() => {
    return [
      { key: 'global' as const, label: 'Global - QA' },
      { key: 'globalcn' as const, label: 'GlobalCN - QA' },
      { key: 'globallive' as const, label: 'Global - Live' },
      { key: 'globalcnlive' as const, label: 'GlobalCN - Live' },
    ]
  }, [])

  const current = useMemo(() => {
    const map = {
      global: { collection: 'global-qa', detailPathPrefix: '/reports/global' },
      globalcn: { collection: 'global-cn', detailPathPrefix: '/reports/global-cn' },
      globallive: { collection: 'global-live', detailPathPrefix: '/reports/global-live' },
      globalcnlive: { collection: 'global-cn-live', detailPathPrefix: '/reports/global-cn-live' },
    }
    return map[active]
  }, [active])

  const updateQuery = (patch: Record<string, unknown>) => {
    const params = new URLSearchParams(location.search)
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '') params.delete(k)
      else params.set(k, String(v))
    })
    const s = params.toString()
    navigate({ pathname: location.pathname, search: s ? `?${s}` : '' }, { replace: true })
  }

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white shadow-soft p-4">
          <div className="flex items-center gap-4 border-b border-gray-100 mb-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`px-3 py-2 text-sm ${active === t.key ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`}
                onClick={() => {
                  setActive(t.key)
                  updateQuery({ tab: t.key, page: 1 })
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <GlobalQaTable title={null} embedded collection={current.collection} detailPathPrefix={current.detailPathPrefix} />
        </div>
      </div>
    </AppLayout>
  )
}
