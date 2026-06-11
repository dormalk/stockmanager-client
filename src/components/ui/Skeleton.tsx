import './Skeleton.css'

interface SkeletonProps {
  width?: string
  height?: string
  className?: string
}

export default function Skeleton({ width = '100%', height = '16px', className = '' }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, height, display: 'inline-block' }}
      aria-hidden="true"
    />
  )
}

export function SkeletonRow({ cols = 10 }: { cols?: number }) {
  return (
    <tr className="skeleton-row" aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '8px 12px' }}>
          <Skeleton width={i === 0 ? '60px' : i === 1 ? '120px' : '80px'} height="14px" />
        </td>
      ))}
    </tr>
  )
}
