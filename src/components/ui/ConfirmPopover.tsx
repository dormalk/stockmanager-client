import { useEffect, useRef } from 'react'
import './ConfirmPopover.css'

interface Props {
  message?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmPopover({
  message = 'Are you sure?',
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onCancel])

  return (
    <div className="confirm-popover" ref={ref} role="dialog" aria-label="Confirm action">
      <span className="text-caption confirm-popover__msg">{message}</span>
      <div className="confirm-popover__actions">
        <button
          className="btn btn--ghost btn--sm"
          onClick={onCancel}
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          className="btn btn--danger btn--sm"
          onClick={onConfirm}
          aria-label="Confirm delete"
          autoFocus
        >
          Delete
        </button>
      </div>
    </div>
  )
}
