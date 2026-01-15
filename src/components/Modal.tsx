 import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  unmountOnClose?: boolean
  contentRef?: React.Ref<HTMLDivElement>
  className?: string
  hideHeader?: boolean
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  unmountOnClose,
  contentRef,
  className,
  hideHeader,
}: Props) {
  if (!open && unmountOnClose) return null
  const overlayCls = open ? 'modal-overlay' : 'modal-overlay closed'
  const panelCls = open ? 'modal-panel' : 'modal-panel closed'
  const sizeClasses = className || 'w-[80vw] max-w-[80vw] h-[70vh] max-h-[70vh]'

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm ${overlayCls}`}
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`${sizeClasses} rounded-2xl bg-white shadow-soft flex flex-col ${panelCls}`}
        >
          {!hideHeader && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="text-sm font-semibold">{title || 'Dialog'}</div>
              <button
                className="text-sm text-gray-700 rounded-xl px-3 py-1 hover:bg-gray-100"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}
          <div ref={contentRef} className="p-4 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}
