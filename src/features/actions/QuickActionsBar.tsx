const actions = ['Team Report','Report Bug','Bug Templates','Trigger Tests','Test Reports','Generate Test Cases']

export default function QuickActionsBar() {
  return (
    <div className="rounded-2xl bg-white shadow-soft p-3">
      <div className="text-xs text-gray-500 mb-2">Quick Actions</div>
      <div className="flex flex-wrap gap-2">
        {actions.map(a => (
          <button key={a} className="px-3 py-1.5 rounded-full text-sm bg-gray-100 hover:bg-gray-200">{a}</button>
        ))}
      </div>
    </div>
  )}
