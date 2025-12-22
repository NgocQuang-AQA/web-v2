import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import GlobalQaTable from '../features/reports/GlobalQaTable'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'

export default function ReportGenerator() {
  const navigate = useNavigate()
  const location = useLocation()
  const initParams = new URLSearchParams(window.location.search)
  const initTab = (initParams.get('tab') as 'global' | 'globalcn' | 'globallive' | 'globalcnlive' | null)
  const initViewParam = (initParams.get('view') as 'global' | 'globalcn' | null)
  const initSubParam = (initParams.get('sub') as 'qa' | 'live' | 'cn' | null)

  const deducedFromTab = (() => {
    if (initTab === 'global') return { view: 'global' as const, sub: 'qa' as const }
    if (initTab === 'globallive') return { view: 'global' as const, sub: 'live' as const }
    if (initTab === 'globalcn') return { view: 'globalcn' as const, sub: 'qa' as const }
    if (initTab === 'globalcnlive') return { view: 'globalcn' as const, sub: 'cn' as const }
    return { view: 'global' as const, sub: 'qa' as const }
  })()

  const [view, setView] = useState<'global' | 'globalcn'>(initViewParam || deducedFromTab.view)
  const [sub, setSub] = useState<'qa' | 'live' | 'cn'>(initSubParam ? (initViewParam === 'globalcn' && initSubParam === 'live' ? 'cn' : initSubParam) : deducedFromTab.sub)

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
      if (sub === 'cn') return { collection: 'global-cn-live', detailPathPrefix: '/reports/global-cn-live' }
      return { collection: 'global-cn', detailPathPrefix: '/reports/global-cn' }
    }
  }, [view, sub])

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
          <div className="flex items-center gap-4 border-b border-gray-100 mb-3">
            {(view === 'global'
              ? [
                  { key: 'qa' as const, label: 'QA' },
                  { key: 'live' as const, label: 'Live' },
                ]
              : [
                  { key: 'qa' as const, label: 'QA' },
                  { key: 'cn' as const, label: 'CN' },
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
          <GlobalQaTable title={null} embedded showSearch={false} nameOverride={name} collection={current.collection} detailPathPrefix={current.detailPathPrefix} />
        </div>
      </div>
    </AppLayout>
  )
}
