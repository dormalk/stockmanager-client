import { useState, useEffect, useRef } from 'react'
import './AlertPopover.css'

interface Props {
  ticker?: string
  currentPrice: number | null
  currentTarget: number | null
  currentDirection: string | null
  onSave: (price: number | null, direction: string | null) => void
  onClose: () => void
}

export default function AlertPopover({
  currentPrice, currentTarget, currentDirection, onSave, onClose,
}: Props) {
  const [price, setPrice]     = useState(currentTarget?.toString() ?? '')
  const [direction, setDir]   = useState<'Above' | 'Below'>(
    (currentDirection as 'Above' | 'Below') ?? 'Above'
  )
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="alert-popover" ref={ref} role="dialog" aria-label="Set price alert">
      <div className="alert-popover__row">
        <span className="segmented">
          {(['Above', 'Below'] as const).map(d => (
            <button key={d}
              type="button"
              className={`segmented__btn${direction === d ? ' segmented__btn--active' : ''}`}
              onClick={() => setDir(d)}>{d}</button>
          ))}
        </span>
        <input
          className="field__input alert-price-input"
          type="number"
          placeholder={currentPrice?.toFixed(2) ?? '0.00'}
          value={price}
          onChange={e => setPrice(e.target.value)}
          min="0" step="any"
          aria-label="Alert target price"
          autoFocus
        />
      </div>
      <div className="alert-popover__actions">
        <button className="btn btn--ghost btn--sm" onClick={() => onSave(null, null)}
          aria-label="Clear alert">Clear</button>
        <button className="btn btn--primary btn--sm"
          onClick={() => onSave(price ? parseFloat(price) : null, direction)}
          aria-label="Set alert">Set</button>
      </div>
    </div>
  )
}
