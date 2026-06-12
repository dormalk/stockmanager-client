import { describe, it, expect } from 'vitest'
import priceChartCss from './research/PriceChart.css?raw'
import allocationChartCss from './portfolio/AllocationChart.css?raw'
import sectorChartCss from './portfolio/SectorChart.css?raw'
import comparePriceChartCss from './compare/ComparePriceChart.css?raw'

function mobileBlock(css: string): string {
  const match = css.match(/@media \(max-width: 767px\) \{[\s\S]*\}\s*$/)
  expect(match, 'expected a @media (max-width: 767px) block').not.toBeNull()
  return match![0]
}

describe('CR-6: mobile chart full-width CSS overrides', () => {
  it('removes horizontal padding from .price-chart-panel on mobile', () => {
    const block = mobileBlock(priceChartCss)
    expect(block).toMatch(/\.price-chart-panel\s*\{[^}]*padding:\s*var\(--space-sm\) 0 0/)
  })

  it('removes horizontal padding from .alloc-chart on mobile', () => {
    const block = mobileBlock(allocationChartCss)
    expect(block).toMatch(/\.alloc-chart\s*\{[^}]*padding:\s*var\(--space-sm\) 0 0/)
  })

  it('removes horizontal padding from .sector-chart on mobile', () => {
    const block = mobileBlock(sectorChartCss)
    expect(block).toMatch(/\.sector-chart\s*\{[^}]*padding:\s*var\(--space-sm\) 0 0/)
  })

  it('removes horizontal padding from .compare-chart-section on mobile (covers SectorPerformanceChart)', () => {
    const block = mobileBlock(comparePriceChartCss)
    expect(block).toMatch(/\.compare-chart-section\s*\{[^}]*padding:\s*var\(--space-sm\) 0 0/)
  })
})
