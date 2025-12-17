import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import DailyAssistant from './pages/DailyAssistant.tsx'
import TestAutomationAgent from './pages/TestAutomationAgent.tsx'
import ReportGenerator from './pages/ReportGenerator.tsx'
import AgentPlaceholder from './pages/AgentPlaceholder.tsx'
import GlobalReportDetail from './pages/GlobalReportDetail.tsx'
import BugTracker from './pages/BugTracker.tsx'
import HelperVoc from './pages/HelperVoc.tsx'

const router = createBrowserRouter([
  { path: '/', element: <DailyAssistant /> },
  { path: '/agents/daily', element: <DailyAssistant /> },
  { path: '/agents/ta', element: <TestAutomationAgent /> },
  { path: '/agents/bug', element: <BugTracker /> },
  { path: '/agents/report', element: <ReportGenerator /> },
  { path: '/agents/notes', element: <HelperVoc /> },
  { path: '/reports/global/:id', element: <GlobalReportDetail /> },
  { path: '/reports/global-cn/:id', element: <GlobalReportDetail /> },
  { path: '/reports/global-live/:id', element: <GlobalReportDetail /> },
  { path: '/reports/global-cn-live/:id', element: <GlobalReportDetail /> },
  { path: '/agents/:id', element: <AgentPlaceholder /> }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
