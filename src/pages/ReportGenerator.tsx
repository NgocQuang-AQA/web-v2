import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import Topbar from '../app/Topbar'
import GlobalQaTable from '../features/reports/GlobalQaTable'

export default function ReportGenerator() {
  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <Topbar />
      <div className="space-y-4">
        <GlobalQaTable />
      </div>
    </AppLayout>
  )
}

