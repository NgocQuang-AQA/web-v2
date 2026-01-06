import clsx from 'clsx'

type Props = { status: 'online' | 'warning' | 'offline' | 'working' }

export default function StatusDot({ status }: Props) {
  const color =
    status === 'online'
      ? 'bg-green-500'
      : status === 'warning'
        ? 'bg-amber-500'
        : status === 'working'
          ? 'bg-violet-500'
          : 'bg-gray-400'
  return (
    <span className={clsx('inline-block w-2.5 h-2.5 rounded-full', color)} />
  )
}
