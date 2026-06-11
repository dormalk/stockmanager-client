import Plot from '../ui/PlotComponent'
import type { EnrichedPosition } from '../../api/portfolio'
import './AllocationChart.css'

interface Props {
  positions: EnrichedPosition[]
}

export default function AllocationChart({ positions }: Props) {
  const open = positions.filter(p => !p.is_closed && p.current_value != null && p.current_value > 0)
  if (open.length === 0) return null

  const total = open.reduce((s, p) => s + (p.current_value ?? 0), 0)
  const labels = open.map(p => p.ticker)
  const values = open.map(p => p.current_value ?? 0)

  return (
    <div className="alloc-chart" aria-label="Portfolio allocation donut chart">
      <h2 className="text-label" style={{ marginBottom: 'var(--space-sm)' }}>Allocation</h2>
      <Plot
          data={[{
            type: 'pie',
            hole: 0.5,
            labels,
            values,
            hovertemplate: '%{label}: %{percent}<br>%{value:$,.2f}<extra></extra>',
            textinfo: 'label+percent',
            textfont: { family: "'JetBrains Mono', monospace", size: 11, color: '#E6EDF3' },
            marker: { line: { color: '#161B22', width: 2 } },
          }]}
          layout={{
            paper_bgcolor: '#161B22',
            plot_bgcolor: '#161B22',
            margin: { t: 8, b: 8, l: 8, r: 8 },
            showlegend: false,
            font: { family: "'JetBrains Mono', monospace", color: '#8B949E', size: 11 },
            height: 260,
            annotations: [{
              text: `$${(total / 1_000_000 >= 1 ? `${(total / 1_000_000).toFixed(2)}M` : total.toLocaleString('en-US', { maximumFractionDigits: 0 }))}`,
              showarrow: false,
              font: { size: 14, color: '#E6EDF3', family: "'JetBrains Mono', monospace" },
            }],
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
        />
    </div>
  )
}
