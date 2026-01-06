import Modal from './Modal'
import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  icon?: ReactNode
}

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description = "This action can't be undone. Please confirm if you want to proceed.",
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  icon,
}: Props) {
  const ico = icon ?? (
    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 9v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
      </svg>
    </div>
  )
  return (
    <Modal open={open} title="" onClose={onCancel} unmountOnClose={false}>
      <div className="flex flex-col items-center text-center gap-4">
        {ico}
        <div className="text-lg font-semibold text-gray-800">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
