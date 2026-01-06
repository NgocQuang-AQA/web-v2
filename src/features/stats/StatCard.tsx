type Props = {
  label: string
  value: string
  tone?: 'default' | 'success' | 'danger' | 'warning'
}

export default function StatCard({ label, value, tone = 'default' }: Props) {
  const tones: Record<string, string> = {
    default: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    danger: 'bg-rose-50 text-rose-700',
    warning: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className="flex-1 rounded-2xl bg-white shadow-soft p-4">
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`mt-3 inline-flex rounded-lg px-2 py-1 text-xs ${tones[tone]}`}
      >
        {label}
      </div>
    </div>
  )
}
