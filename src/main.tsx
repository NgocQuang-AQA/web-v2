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
import Login from './pages/Login.tsx'
import NotFound from './pages/NotFound.tsx'
import AccountManagement from './pages/admin/AccountManagement.tsx'
import Protected from './app/Protected'

const router = createBrowserRouter([
  { path: '/', element: <Protected><DailyAssistant /></Protected> },
  { path: '/login', element: <Login /> },
  { path: '/404', element: <NotFound /> },
  { path: '/agents/daily', element: <Protected><DailyAssistant /></Protected> },
  { path: '/agents/ta', element: <Protected><TestAutomationAgent /></Protected> },
  { path: '/agents/bug', element: <Protected><BugTracker /></Protected> },
  { path: '/agents/report', element: <Protected><ReportGenerator /></Protected> },
  { path: '/agents/notes', element: <Protected><HelperVoc /></Protected> },
  { path: '/admin/accounts', element: <Protected><AccountManagement /></Protected> },
  { path: '/reports/global/:id', element: <Protected><GlobalReportDetail /></Protected> },
  { path: '/reports/global-cn/:id', element: <Protected><GlobalReportDetail /></Protected> },
  { path: '/reports/global-live/:id', element: <Protected><GlobalReportDetail /></Protected> },
  { path: '/reports/global-cn-live/:id', element: <Protected><GlobalReportDetail /></Protected> },
  { path: '/agents/:id', element: <Protected><AgentPlaceholder /></Protected> }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
