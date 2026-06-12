import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readCss(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf-8')
}

function mobileBlock(css: string): string {
  const match = css.match(/@media \(max-width: 767px\) \{[\s\S]*\}\s*$/)
  expect(match, 'expected a @media (max-width: 767px) block').not.toBeNull()
  return match![0]
}

describe('CR-6: mobile chart full-width CSS overrides', () => {
  it('removes horizontal padding from .price-chart-panel on mobile', () => {
    const block = mobileBlock(readCss('research/PriceChart.css'))
    expect(block).toMatch(/\.price-chart-panel\s*\{[^}]*padding:\s*var\(--space-sm\) 0 0/)
  })

  it('removes horizontal padding from .alloc-chart on mobile', () => {
    const block = mobileBlock(readCss('portfolio/AllocationChart.css'))
    expect(block).toMatch(/\.alloc-chart\s*\{[^}]*padding:\s*var\(--space-sm\) 0 0/)
  })

  it('removes horizontal padding from .sector-chart on mobile', () => {
    const block = mobileBlock(readCss('portfolio/SectorChart.css'))
    expect(block).toMatch(/\.sector-chart\s*\{[^}]*padding:\s*var\(--space-sm\) 0 0/)
  })

  it('removes horizontal padding from .compare-chart-section on mobile (covers SectorPerformanceChart)', () => {
    const block = mobileBlock(readCss('compare/ComparePriceChart.css'))
    expect(block).toMatch(/\.compare-chart-section\s*\{[^}]*padding:\s*var\(--space-sm\) 0 0/)
  })
})
