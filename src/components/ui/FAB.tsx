import './FAB.css'

interface FABProps {
  onClick: () => void
}

export default function FAB({ onClick }: FABProps) {
  return (
    <button className="fab" onClick={onClick} aria-label="Add trade">
      +
    </button>
  )
}
