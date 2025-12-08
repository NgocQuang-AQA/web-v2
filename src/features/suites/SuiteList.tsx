import { useEffect, useState } from 'react'
import SuiteRow from './SuiteRow'
import type { TestSuite } from '../../models/types'
import Loading from '../../components/Loading'
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

export default function SuiteList() {
  const [items, setItems] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    async function load() {
      setLoading(true)
      setError(null)
      const data = await fetchJson<{ items: TestSuite[] }>(apiUrl('/api/reports/suites'))
      if (!canceled) {
        setItems(data?.items || [])
        setLoading(false)
        if (!data) setError('Không thể tải dữ liệu')
      }
    }
    load()
    return () => { canceled = true }
  }, [])

  if (loading) return <Loading />
  if (error) return <div className="text-sm text-rose-600">{error}</div>

  return (
    <div className="space-y-3">
      {items.map(s => <SuiteRow key={s.id} suite={s} />)}
      {items.length === 0 && <div className="text-sm text-gray-500">Không có dữ liệu</div>}
    </div>
  )
}
