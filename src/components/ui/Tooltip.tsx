import { useState, useRef, useCallback, type ReactNode } from 'react'
import './Tooltip.css'

interface Props {
  content: string
  children: ReactNode
  delay?: number
}

export default function Tooltip({ content, children, delay = 150 }: Props) {
  const [visible, setVisible] = useState(false)
  const [above, setAbove] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setAbove(rect.top > 80)
      }
      setVisible(true)
    }, delay)
  }, [delay])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  return (
    <span
      ref={triggerRef}
      className="tooltip-wrap"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && content && (
        <span className={`tooltip ${above ? 'tooltip--above' : 'tooltip--below'}`} role="tooltip">
          {content}
        </span>
      )}
    </span>
  )
}
