declare module 'plotly.js-dist-min' {
  import * as Plotly from 'plotly.js'
  export = Plotly
}

declare module 'react-plotly.js/factory' {
  import type React from 'react'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createPlotlyComponent(plotly: unknown): React.FC<any>
  export default createPlotlyComponent
}

declare module 'react-plotly.js' {
  import * as Plotly from 'plotly.js'
  import { Component } from 'react'

  interface PlotParams {
    data: Plotly.Data[]
    layout?: Partial<Plotly.Layout>
    config?: Partial<Plotly.Config>
    style?: React.CSSProperties
    className?: string
    useResizeHandler?: boolean
    onInitialized?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onUpdate?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onPurge?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void
    onError?: (err: Error) => void
    [key: string]: unknown
  }

  export default class Plot extends Component<PlotParams> {}
}
