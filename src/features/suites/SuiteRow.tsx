import ProgressBar from '../../components/ProgressBar'
import type { TestSuite } from '../../models/types'

type Props = { suite: TestSuite }

export default function SuiteRow({ suite }: Props) {
  const tone: 'success' | 'warning' | 'danger' = suite.status === 'passed' ? 'success' : suite.status === 'partial' ? 'warning' : 'danger'
  return (
    <div className="rounded-2xl bg-white shadow-soft p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${tone === 'success' ? 'bg-green-100 text-green-700' : tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{suite.status}</span>
          <div className="font-medium">{suite.name}</div>
        </div>
        <div className="text-xs text-gray-500">{suite.startTime} • {suite.duration}</div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-green-700">{suite.passed} passed</div>
        <div className="text-rose-700">{suite.failed} failed</div>
        <div className="text-amber-700">{suite.flaky} flaky</div>
        <div className="text-gray-500">{suite.percent}%</div>
        <div className="text-gray-500">{suite.totalTests} tests</div>
      </div>
      <div className="mt-3">
        <ProgressBar percent={suite.percent} tone={tone} />
      </div>
    </div>
  )
}
