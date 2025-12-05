import type { Agent } from '../../models/types'

export const agents: Agent[] = [
  { id: 'daily', name: 'Summary Report', icon: '🌿', status: 'online' },
  { id: 'ta', name: 'Test Automation Agent', icon: '✏️', status: 'online' },
  { id: 'bug', name: 'Bug Tracker', icon: '🐞', status: 'online' },
  { id: 'jira', name: 'JIRA Integration', icon: '📄', status: 'warning' },
  { id: 'report', name: 'Report Generator', icon: '📊', status: 'working', counters: [3] },
  { id: 'notes', name: 'Smart Notes Agent', icon: '📝', status: 'online', counters: [2, 3] },
  { id: 'cases', name: 'Test Case Generation', icon: '🧪', status: 'online' },
]
