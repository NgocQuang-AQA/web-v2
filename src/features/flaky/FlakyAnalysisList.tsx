import { useEffect, useState } from 'react'
import type { FlakyItem } from '../../models/types'
import Loading from '../../components/Loading'
import NoData from '../../assets/no-data-found_585024-42.avif'
import { apiUrl } from '../../lib/api'

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function FlakyAnalysisList() {
  const [items, setItems] = useState<FlakyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    async function load() {
      setLoading(true)
      setError(null)
      const data = await fetchJson<{ items: FlakyItem[] }>(apiUrl('/api/reports/flaky'))
      if (!canceled) {
        setItems(data?.items || [])
        setLoading(false)
        if (!data) setError('Failed to load data')
      }
    }
    load()
    return () => { canceled = true }
  }, [])

  return (
    <div className="rounded-2xl bg-white shadow-soft p-4">
      <div className="font-semibold mb-3">Flaky Tests Analysis</div>
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="text-sm text-rose-600">{error}</div>
      ) : (
        <div className="space-y-2">
          {items.map(f => (
            <div key={f.id} className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{f.title}</div>
                <div className="text-gray-500">{f.suite} • {f.failures} failures • Last: {f.lastSeen}</div>
              </div>
              <div className="text-gray-700">{(f.trendMs/1000).toFixed(1)}s</div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="relative w-full flex items-center justify-center py-6">
              <img src={NoData} alt="No data" className="max-h-64 w-auto object-contain opacity-80 rounded-xl" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
