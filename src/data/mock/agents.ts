import type { Agent } from '../../models/types'

export const agents: Agent[] = [
  { id: 'daily', name: 'Executive Summary', icon: '🌿', status: 'online' },
  // { id: 'bug', name: 'Bug Tracker', icon: '🐞', status: 'online' },
  // { id: 'jira', name: 'JIRA Integration', icon: '📄', status: 'warning' },
  { id: 'report', name: 'Report Generator', icon: '📊', status: 'working' },
  { id: 'performance', name: 'Performance Test', icon: '🚀', status: 'online' },
  { id: 'notes', name: 'Helper VOC', icon: '📝', status: 'online' },
  { id: 'ta', name: 'Test Automation Agent', icon: '✏️', status: 'online' },
  // { id: 'cases', name: 'Test Case Generation', icon: '🧪', status: 'online' },
]
