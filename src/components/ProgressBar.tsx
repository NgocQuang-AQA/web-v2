type Props = { percent: number; tone: 'success' | 'warning' | 'danger' }

export default function ProgressBar({ percent, tone }: Props) {
  const color = tone === 'success' ? 'bg-green-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="w-full h-2 rounded-full bg-gray-100">
      <div className={`${color} h-2 rounded-full`} style={{ width: `${percent}%` }} />
    </div>
  )
}
