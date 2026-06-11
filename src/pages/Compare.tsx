import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ConfirmPopover from '../components/ui/ConfirmPopover'
import { SkeletonRow } from '../components/ui/Skeleton'
import TickerInput from '../components/ui/TickerInput'
import ComparePriceChart from '../components/compare/ComparePriceChart'
import CompareMultipleChart from '../components/compare/CompareMultipleChart'
import {
  fetchComparison, fetchSavedComparisons, saveComparison, deleteSavedComparison,
} from '../api/compare'
import './Compare.css'

// Keys must match backend services/multiples_service.py MULTIPLE_GROUPS
const MULTIPLE_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: 'Price-Based',
    items: [
      { key: 'pe_ttm',         label: 'P/E TTM'       },
      { key: 'forward_pe',     label: 'Forward P/E'   },
      { key: 'ps_ratio',       label: 'P/S'           },
      { key: 'pb_ratio',       label: 'P/B'           },
      { key: 'p_fcf',          label: 'P/FCF'         },
      { key: 'p_cf',           label: 'P/CF'          },
      { key: 'earnings_yield', label: 'Earnings Yield'},
    ],
  },
  {
    group: 'EV-Based',
    items: [
      { key: 'ev_ebitda',  label: 'EV/EBITDA'      },
      { key: 'ev_ebit',    label: 'EV/EBIT'        },
      { key: 'ev_revenue', label: 'EV/Revenue'     },
      { key: 'ev_fcf',     label: 'EV/FCF'         },
      { key: 'ev_gp',      label: 'EV/Gross Profit'},
    ],
  },
  {
    group: 'Yield-Based',
    items: [
      { key: 'dividend_yield',     label: 'Dividend Yield %' },
      { key: 'fcf_yield',          label: 'FCF Yield %'      },
      { key: 'shareholder_yield',  label: 'Shareholder Yield'},
    ],
  },
  {
    group: 'Growth-Adjusted',
    items: [
      { key: 'peg',        label: 'PEG'        },
      { key: 'psg',        label: 'PSG'        },
      { key: 'rule_of_40', label: 'Rule of 40' },
    ],
  },
]

function formatValue(key: string, val: unknown): string {
  if (val == null) return 'N/A'
  const v = val as number
  const pct = ['revenue_growth','gross_margin','net_margin','roe','dividend_yield','52w_perf']
  const big  = ['market_cap','fcf']
  if (pct.includes(key))  return `${(v*100).toFixed(1)}%`
  if (big.includes(key)) {
    if (Math.abs(v)>=1e9) return `$${(v/1e9).toFixed(2)}B`
    if (Math.abs(v)>=1e6) return `$${(v/1e6).toFixed(1)}M`
    return `$${v.toLocaleString()}`
  }
  if (key==='analyst') return String(val)
  return typeof v==='number' ? v.toFixed(2) : String(val)
}

function parseTickerParam(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
}

export default function Compare() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()

  const [inputs, setInputs] = useState(() => {
    const list = parseTickerParam(searchParams.get('tickers'))
    return list.length >= 2 ? list : ['', '']
  })
  const [submitted, setSubmitted] = useState<string[]>(() => {
    const list = parseTickerParam(searchParams.get('tickers'))
    return list.length >= 2 ? list : []
  })
  const [saveLabel, setSaveLabel] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Chart tab state
  const [activeTab, setActiveTab] = useState<string>('price')
  const [multipleTabs, setMultipleTabs] = useState<{ key: string; label: string }[]>([])
  const [showPicker, setShowPicker] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['compare', submitted.join(',')],
    queryFn: () => fetchComparison(submitted),
    enabled: submitted.length >= 2,
  })

  const { data: saved = [] } = useQuery({
    queryKey: ['saved-comparisons'],
    queryFn: fetchSavedComparisons,
  })

  const saveMut = useMutation({
    mutationFn: () => saveComparison(saveLabel || submitted.join(' vs '), submitted),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saved-comparisons'] }); setShowSave(false) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSavedComparison(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saved-comparisons'] }); setDeleteId(null) },
  })

  function handleCompare() {
    const valid = inputs.map(s => s.trim().toUpperCase()).filter(Boolean)
    if (valid.length >= 2) setSubmitted(valid)
  }

  function loadSaved(s: { tickers: string[] }) {
    setInputs(s.tickers)
    setSubmitted(s.tickers)
  }

  function toggleMultiple(key: string, label: string) {
    const alreadyAdded = multipleTabs.find(t => t.key === key)
    if (alreadyAdded) {
      // Remove it
      setMultipleTabs(prev => prev.filter(t => t.key !== key))
      if (activeTab === key) setActiveTab('price')
    } else {
      // Add and switch to it
      setMultipleTabs(prev => [...prev, { key, label }])
      setActiveTab(key)
    }
  }

  function removeTab(key: string) {
    setMultipleTabs(prev => prev.filter(t => t.key !== key))
    if (activeTab === key) setActiveTab('price')
  }

  const tickers = data?.tickers ?? []
  const addedKeys = new Set(multipleTabs.map(t => t.key))

  return (
    <main className="page compare-page">
      <h1 className="text-label">Compare</h1>

      {/* Ticker inputs */}
      <div className="compare-inputs">
        {inputs.map((val, i) => (
          <TickerInput
            key={i}
            value={val}
            onChange={v => {
              const next = [...inputs]
              next[i] = v
              setInputs(next)
            }}
            onEnter={handleCompare}
            onSelect={sym => {
              const next = [...inputs]
              next[i] = sym
              setInputs(next)
            }}
            placeholder={`Ticker ${i + 1}`}
            ariaLabel={`Ticker ${i + 1}`}
            className="compare-ticker-input"
          />
        ))}
        {inputs.length < 3 && (
          <button className="btn btn--ghost btn--sm"
            onClick={() => setInputs(prev => [...prev, ''])}>+ Add Ticker</button>
        )}
        <button className="btn btn--primary" onClick={handleCompare}>Compare</button>
      </div>

      {submitted.length < 2 && (
        <p className="text-body color-muted" style={{ marginTop: 'var(--space-xl)' }}>
          Enter 2–3 tickers above and click Compare.
        </p>
      )}

      {isError && <p className="text-caption color-muted">Failed to load comparison data.</p>}

      {/* Chart area */}
      {submitted.length >= 2 && (
        <div className="compare-charts">
          {/* Tab bar */}
          <div className="compare-chart-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'price'}
              className={`compare-chart-tab${activeTab === 'price' ? ' compare-chart-tab--active' : ''}`}
              onClick={() => setActiveTab('price')}
            >
              Price %
            </button>

            {multipleTabs.map(tab => (
              <span key={tab.key} className="compare-chart-tab-wrap">
                <button
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`compare-chart-tab${activeTab === tab.key ? ' compare-chart-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
                <button
                  className="compare-chart-tab-close"
                  onClick={() => removeTab(tab.key)}
                  aria-label={`Remove ${tab.label} chart`}
                >×</button>
              </span>
            ))}

            <button
              className={`compare-chart-add-btn${showPicker ? ' compare-chart-add-btn--open' : ''}`}
              onClick={() => setShowPicker(p => !p)}
              aria-expanded={showPicker}
              aria-label="Add multiple chart"
            >
              + Multiple {showPicker ? '▲' : '▼'}
            </button>
          </div>

          {/* Inline multiple picker — full-width chip grid */}
          {showPicker && (
            <div className="compare-picker" role="group" aria-label="Valuation multiples">
              {MULTIPLE_GROUPS.map(({ group, items }) => (
                <div key={group} className="compare-picker-group">
                  <span className="compare-picker-group-label text-caption">{group}</span>
                  <div className="compare-picker-chips">
                    {items.map(m => {
                      const active = addedKeys.has(m.key)
                      return (
                        <button
                          key={m.key}
                          className={`compare-picker-chip text-caption${active ? ' compare-picker-chip--active' : ''}`}
                          onClick={() => toggleMultiple(m.key, m.label)}
                          aria-pressed={active}
                        >
                          {m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active chart */}
          <div className="compare-chart-panel">
            {activeTab === 'price' && <ComparePriceChart tickers={submitted} />}
            {multipleTabs.map(tab =>
              activeTab === tab.key
                ? <CompareMultipleChart key={tab.key} tickers={submitted} metric={tab.key} metricLabel={tab.label} />
                : null
            )}
          </div>
        </div>
      )}

      {/* Comparison table */}
      {(isLoading && submitted.length >= 2) || data ? (
        <div className="compare-table-wrap">
          <div className="compare-actions">
            {data && !showSave && (
              <button className="btn btn--ghost btn--sm" onClick={() => setShowSave(true)}>
                Save Comparison
              </button>
            )}
            {showSave && (
              <div className="save-inline">
                <input className="field__input" placeholder="Label…"
                  value={saveLabel} onChange={e => setSaveLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveMut.mutate()}
                  autoFocus aria-label="Comparison label" />
                <button className="btn btn--primary btn--sm" onClick={() => saveMut.mutate()}>Save</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setShowSave(false)}>Cancel</button>
              </div>
            )}
          </div>

          <div className="table-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col" className="metric-col">Metric</th>
                  {isLoading
                    ? Array.from({length: submitted.length}).map((_, i) => <th key={i}>{submitted[i]}</th>)
                    : tickers.map(t => <th key={t} scope="col">{t}</th>)
                  }
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({length: 8}).map((_, i) => <SkeletonRow key={i} cols={submitted.length + 1} />)
                  : data!.rows.map(row => (
                    <tr key={row.key}>
                      <td className="metric-label text-caption color-muted">{row.label}</td>
                      {tickers.map(t => {
                        const val  = data!.data[t]?.[row.key]
                        const best = data!.best[row.key]
                        return (
                          <td key={t}
                            className={`align-right${best === t && val != null ? ' best-cell' : ''}`}>
                            {formatValue(row.key, val)}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Saved comparisons */}
      {saved.length > 0 && (
        <div className="saved-section">
          <span className="text-label">Saved Comparisons</span>
          <div className="saved-list">
            {saved.map(s => (
              <div key={s.id} className="saved-item">
                <span className="text-body">{s.label}</span>
                <div className="saved-chips">
                  {s.tickers.map(t => (
                    <span key={t} className="saved-chip text-caption">{t}</span>
                  ))}
                </div>
                <div className="saved-actions" style={{ position: 'relative' }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => loadSaved(s)}>Load</button>
                  <button className="trash-btn" onClick={() => setDeleteId(s.id)}
                    aria-label={`Delete ${s.label}`}>🗑</button>
                  {deleteId === s.id && (
                    <ConfirmPopover message={`Delete "${s.label}"?`}
                      onConfirm={() => deleteMut.mutate(s.id)}
                      onCancel={() => setDeleteId(null)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
