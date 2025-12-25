import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  unmountOnClose?: boolean
}

export default function Modal({ open, title, onClose, children, unmountOnClose }: Props) {
  if (!open && unmountOnClose) return null
  const overlayCls = open ? 'modal-overlay' : 'modal-overlay closed'
  const panelCls = open ? 'modal-panel' : 'modal-panel closed'
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 backdrop-blur-sm ${overlayCls}`} onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full max-w-2xl rounded-2xl bg-white shadow-soft ${panelCls}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-semibold">{title || 'Dialog'}</div>
            <button className="text-sm text-gray-700 rounded-xl px-3 py-1 hover:bg-gray-100" onClick={onClose}>Close</button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
