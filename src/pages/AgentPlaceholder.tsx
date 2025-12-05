import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import Topbar from '../app/Topbar'
import { useParams } from 'react-router-dom'

export default function AgentPlaceholder() {
  const params = useParams()
  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <Topbar />
      <div className="p-6 text-sm text-gray-500">Page: {params.id}</div>
    </AppLayout>
  )
}

