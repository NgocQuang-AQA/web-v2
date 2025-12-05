import type { TestSuite } from '../../models/types'

export const suites: TestSuite[] = [
  {
    id: 'api',
    name: 'API Regression Suite',
    status: 'passed',
    startTime: '09:15 AM',
    duration: '14m 32s',
    passed: 234,
    failed: 2,
    flaky: 9,
    percent: 96,
    totalTests: 245
  },
  {
    id: 'ui',
    name: 'UI Smoke Tests',
    status: 'partial',
    startTime: '10:30 AM',
    duration: '23m 45s',
    passed: 76,
    failed: 8,
    flaky: 3,
    percent: 85,
    totalTests: 89
  },
  {
    id: 'e2e',
    name: 'Critical E2E Flows',
    status: 'failed',
    startTime: '11:45 AM',
    duration: '31m 18s',
    passed: 28,
    failed: 4,
    flaky: 2,
    percent: 82,
    totalTests: 34
  }
]
