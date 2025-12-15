import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import GlobalQaTable from '../features/reports/GlobalQaTable'

export default function ReportGenerator() {
  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="space-y-4">
        <GlobalQaTable />
      </div>
    </AppLayout>
  )
}
