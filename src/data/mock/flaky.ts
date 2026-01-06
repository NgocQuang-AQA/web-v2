import type { FlakyItem } from '../../models/types'

export const flakies: FlakyItem[] = [
  {
    id: 'login-timeout',
    title: 'User Login with Timeout',
    suite: 'UI Smoke Tests',
    failures: 7,
    lastSeen: '2 hours ago',
    trendMs: 2300,
  },
]
