import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './SlideOver.css'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function SlideOver({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <>
      <div className="slide-over-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="slide-over" role="dialog" aria-label={title}>
        <div className="slide-over__header">
          <span className="text-label">{title}</span>
          <button className="modal__close" onClick={onClose} aria-label="Close panel">×</button>
        </div>
        <div className="slide-over__body">{children}</div>
      </div>
    </>,
    document.body
  )
}
