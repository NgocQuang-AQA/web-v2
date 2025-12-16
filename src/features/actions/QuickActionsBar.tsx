const actions: { label: string; question: string }[] = [
  { label: 'Latest QA/CN Summary', question: 'Summarize the latest QA and CN reports: pass rate, failed, flaky, and time range.' },
  { label: 'Pass Rate & Failed', question: 'What is the current pass rate and number of failed tests for QA/CN?' },
  { label: 'Recent Test Suites', question: 'List recent test suites and their status.' },
  { label: 'Flaky Tests', question: 'Show recent flaky test cases and their frequency.' },
  { label: 'Errors/Failures Analysis', question: 'Analyze root causes for latest errors and failures in QA/CN.' },
  { label: 'Global Report', question: 'Explain the latest Global Report and key metrics.' },
  { label: 'Generate Test Cases', question: 'Generate test cases for the module [Module Name] based on current reports.' },
  { label: 'Trigger Tests', question: 'Suggest which test suites to trigger now based on current status.' },
]

export default function QuickActionsBar() {
  return (
    <div className="rounded-2xl bg-white shadow-soft p-3">
      <div className="text-xs text-gray-500 mb-2">Quick Actions</div>
      <div className="flex flex-wrap gap-2">
        {actions.map(a => (
          <button
            key={a.label}
            className="px-3 py-1.5 rounded-full text-sm bg-gray-100 hover:bg-gray-200"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('chat:fill', { detail: a.question }))
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )}
