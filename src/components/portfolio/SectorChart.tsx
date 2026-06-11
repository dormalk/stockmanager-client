import Plot from '../ui/PlotComponent'
import type { EnrichedPosition } from '../../api/portfolio'
import './SectorChart.css'

interface Props { positions: EnrichedPosition[] }

export default function SectorChart({ positions }: Props) {
  const open = positions.filter(p => !p.is_closed && p.current_value != null && p.current_value > 0)
  if (open.length === 0) return null

  const sectorMap: Record<string, number> = {}
  for (const pos of open) {
    const sector = pos.sector || 'Unknown'
    sectorMap[sector] = (sectorMap[sector] ?? 0) + (pos.current_value ?? 0)
  }
  const labels = Object.keys(sectorMap)
  const values = labels.map(l => sectorMap[l])

  return (
    <div className="sector-chart" aria-label="Portfolio sector allocation chart">
      <h2 className="text-label" style={{ marginBottom: 'var(--space-sm)' }}>Sector Allocation</h2>
      <Plot
        data={[{
          type: 'pie',
          hole: 0.5,
          labels,
          values,
          hovertemplate: '%{label}: %{percent} (%{value:$,.0f})<extra></extra>',
          textinfo: 'label+percent',
          textfont: { family: "'JetBrains Mono', monospace", size: 11, color: '#E6EDF3' },
          marker: { line: { color: '#161B22', width: 2 } },
        }]}
        layout={{
          paper_bgcolor: '#161B22',
          plot_bgcolor:  '#161B22',
          margin: { t: 8, b: 8, l: 8, r: 8 },
          showlegend: false,
          font: { family: "'JetBrains Mono', monospace", color: '#8B949E', size: 11 },
          height: 240,
          annotations: [{
            text: `${Object.keys(sectorMap).length} sectors`,
            showarrow: false,
            font: { size: 12, color: '#E6EDF3', family: "'JetBrains Mono', monospace" },
          }],
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
