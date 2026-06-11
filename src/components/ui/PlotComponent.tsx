import { useEffect, useRef } from 'react'
import type * as PlotlyTypes from 'plotly.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlotlyInstance = any

declare global {
  interface Window { Plotly?: PlotlyInstance }
}

let PlotlyLib: PlotlyInstance = null

async function getPlotly(): Promise<PlotlyInstance> {
  if (PlotlyLib) return PlotlyLib
  const mod = await import('plotly.js-dist-min')
  PlotlyLib = (mod as unknown as { default?: PlotlyInstance }).default ?? mod
  return PlotlyLib
}

export interface PlotClickPoint {
  x: string
  y: number
  seriesName: string
}

interface Props {
  data: PlotlyTypes.Data[]
  layout?: Partial<PlotlyTypes.Layout>
  config?: Partial<PlotlyTypes.Config>
  style?: React.CSSProperties
  onPlotClick?: (points: PlotClickPoint[]) => void
  /** Called after every Plotly render (initial + relayout/zoom/pan). Receives the chart div. */
  onAfterPlot?: (el: HTMLDivElement) => void
}

export default function Plot({ data, layout, config, style, onPlotClick, onAfterPlot }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Keep latest callbacks in refs so listeners attached once always call the current version
  const onPlotClickRef   = useRef(onPlotClick)
  const onAfterPlotRef   = useRef(onAfterPlot)
  useEffect(() => { onPlotClickRef.current  = onPlotClick  }, [onPlotClick])
  useEffect(() => { onAfterPlotRef.current  = onAfterPlot  }, [onAfterPlot])
  // Track whether event listeners have been attached to avoid re-registering every render
  const listenerAttached     = useRef(false)
  const afterPlotAttached    = useRef(false)

  // Re-render chart on every prop change; attach click listener after the first render
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    getPlotly().then(Plotly => {
      Plotly.react(el, data, layout ?? {}, { displayModeBar: false, responsive: true, ...config })

      if (!listenerAttached.current) {
        // Plotly adds event-emitter methods (.on/.removeAllListeners) directly to the div
        ;(el as any).on('plotly_click', (eventData: any) => {
          if (!onPlotClickRef.current || !eventData?.points?.length) return
          const points: PlotClickPoint[] = eventData.points.map((p: any) => ({
            x: String(p.x),
            y: typeof p.y === 'number' ? p.y : (p.close ?? 0),
            seriesName: p.data?.name ?? '',
          }))
          onPlotClickRef.current(points)
        })
        listenerAttached.current = true
      }

      if (!afterPlotAttached.current) {
        ;(el as any).on('plotly_afterplot', () => {
          onAfterPlotRef.current?.(el)
        })
        afterPlotAttached.current = true
        // Fire once for this first render — plotly_afterplot already fired during react()
        // above before the listener existed, so we call it manually here only this once.
        onAfterPlotRef.current?.(el)
      }
    })
  })

  // ResizeObserver: reflow on container width changes
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(() => {
      getPlotly().then(Plotly => {
        if (el.offsetWidth > 0) Plotly.Plots?.resize(el)
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Purge on unmount
  useEffect(() => {
    return () => {
      if (ref.current) getPlotly().then(Plotly => Plotly.purge(ref.current!))
    }
  }, [])

  return <div ref={ref} style={{ width: '100%', ...style }} />
}
