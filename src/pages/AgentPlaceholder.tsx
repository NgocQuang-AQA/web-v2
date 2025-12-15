import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import { useParams } from 'react-router-dom'

export default function AgentPlaceholder() {
  const params = useParams()
  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="p-6 text-sm text-gray-500">Page: {params.id}</div>
    </AppLayout>
  )
}
