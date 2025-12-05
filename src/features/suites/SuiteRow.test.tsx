import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import SuiteRow from './SuiteRow'
import type { TestSuite } from '../../models/types'

const suite: TestSuite = {
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
}

test('renders suite name and stats', () => {
  render(<SuiteRow suite={suite} />)
  expect(screen.getByText('API Regression Suite')).toBeTruthy()
  expect(screen.getByText('234 passed')).toBeTruthy()
  expect(screen.getByText('2 failed')).toBeTruthy()
  expect(screen.getByText('9 flaky')).toBeTruthy()
})
