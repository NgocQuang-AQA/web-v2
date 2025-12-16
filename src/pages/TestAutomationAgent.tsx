import AppLayout from '../app/AppLayout'
import AgentSidebar from '../app/AgentSidebar'
import QuickActionsBar from '../features/actions/QuickActionsBar'
import ChatDock from '../features/chat/ChatDock'

export default function TestAutomationAgent() {
  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="space-y-4">
        <QuickActionsBar />
        <ChatDock />
      </div>
    </AppLayout>
  )
}
