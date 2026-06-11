import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiBase } from '../../api/client'
import {
  fetchAnalysisHistory,
  fetchAnalysisHistoryItem,
  deleteAnalysisHistoryItem,
  type AnalysisHistoryItem,
} from '../../api/aiHistory'
import './AIPanel.css'

async function loadSavedAnalysis(ticker: string) {
  const res = await fetch(`${apiBase}/api/ai/analysis/${ticker}`)
  if (res.status === 404) return null
  if (!res.ok) return null
  return res.json() as Promise<{ ai_analysis: string; ai_generated_at: string | null }>
}

async function persistAnalysis(ticker: string, ai_analysis: string) {
  await fetch(`${apiBase}/api/ai/analysis/${ticker}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ai_analysis }),
  })
}

interface Props { ticker: string }


function checkApiKey() {
  return fetch(`${apiBase}/api/settings/status`).then(r => r.json())
}

export default function AIPanel({ ticker }: Props) {
  const [content, setContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [viewingHistoryId, setViewingHistoryId] = useState<number | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const { data: keyStatus } = useQuery({
    queryKey: ['api-key-status'],
    queryFn: checkApiKey,
  })

  const hasKey = keyStatus?.gemini_api_key_configured === true

  const refreshHistory = useCallback(() => {
    fetchAnalysisHistory(ticker).then(setHistory)
  }, [ticker])

  // Load saved analysis on mount
  useEffect(() => {
    setHistoryOpen(false)
    setViewingHistoryId(null)
    loadSavedAnalysis(ticker).then(saved => {
      if (saved?.ai_analysis) {
        setContent(saved.ai_analysis)
        if (saved.ai_generated_at) setGeneratedAt(new Date(saved.ai_generated_at))
      } else {
        setContent('')
        setGeneratedAt(null)
      }
    })
    refreshHistory()
  }, [ticker, refreshHistory])

  useEffect(() => {
    return () => esRef.current?.close()
  }, [])

  function viewHistoryItem(id: number) {
    fetchAnalysisHistoryItem(ticker, id).then(item => {
      if (!item) return
      setContent(item.content)
      setGeneratedAt(new Date(item.generated_at))
      setViewingHistoryId(item.id)
      setHistoryOpen(false)
    })
  }

  function deleteHistoryItem(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    deleteAnalysisHistoryItem(ticker, id).then(() => {
      if (viewingHistoryId === id) setViewingHistoryId(null)
      refreshHistory()
    })
  }

  function generate() {
    if (streaming) return
    esRef.current?.close()
    setContent('')
    setError('')
    setViewingHistoryId(null)
    setStreaming(true)

    const es = new EventSource(`${apiBase}/api/ai/analysis/${ticker}/stream`)
    esRef.current = es

    es.onmessage = (e: MessageEvent) => {
      const raw = e.data as string
      if (raw === '[DONE]') {
        es.close()
        setStreaming(false)
        const now = new Date()
        setGeneratedAt(now)
        // Persist after stream completes — read current content from ref
        setContent(prev => {
          persistAnalysis(ticker, prev).then(refreshHistory)
          return prev
        })
        return
      }
      if (raw.startsWith('[ERROR:')) {
        es.close()
        setStreaming(false)
        setError('Analysis failed. Check that GEMINI_API_KEY is configured.')
        return
      }
      try {
        const text = JSON.parse(raw) as string
        setContent(prev => prev + text.replace(/\\n/g, '\n'))
      } catch {
        setContent(prev => prev + raw)
      }
    }

    es.onerror = () => {
      es.close()
      setStreaming(false)
      setError('Stream connection failed.')
    }
  }

  function formatContent(raw: string) {
    if (!raw) return null
    const parts = raw.split(/(## [^\n]+)/)
    return parts.map((part, i) => {
      if (part.startsWith('## ')) {
        return <h3 key={i} className="ai-section-header text-label">{part.slice(3)}</h3>
      }
      return part ? <p key={i} className="text-body ai-body">{part.trim()}</p> : null
    })
  }

  return (
    <section className="ai-panel" aria-label="AI investment analysis">
      <div className="ai-panel__header">
        <span className="text-label">AI Analysis</span>
        <div className="ai-panel__header-right">
          {generatedAt && (
            <span className="text-caption color-muted">
              Generated {Math.floor((Date.now() - generatedAt.getTime()) / 60000) < 1
                ? 'just now'
                : `${Math.floor((Date.now() - generatedAt.getTime()) / 60000)} min ago`}
            </span>
          )}
          {history.length > 0 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setHistoryOpen(o => !o)}
              aria-expanded={historyOpen}
              aria-label="Toggle analysis history"
            >
              History ({history.length})
            </button>
          )}
        </div>
      </div>

      {historyOpen && (
        <ul className="ai-history-list">
          {history.map(item => (
            <li
              key={item.id}
              className={`ai-history-item${viewingHistoryId === item.id ? ' ai-history-item--active' : ''}`}
              onClick={() => viewHistoryItem(item.id)}
            >
              <div className="ai-history-item__main">
                <span className="text-caption ai-history-item__date">
                  {new Date(item.generated_at).toLocaleString()}
                </span>
                <span className="text-caption color-muted ai-history-item__preview">
                  {item.preview}
                </span>
              </div>
              <button
                className="link-btn text-caption ai-history-item__delete"
                onClick={(e) => deleteHistoryItem(item.id, e)}
                aria-label="Delete this report"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewingHistoryId && (
        <p className="text-caption color-muted ai-panel__history-banner">
          Viewing a saved report from history.{' '}
          <button className="link-btn text-caption" onClick={() => viewHistoryItem(history[0]?.id)} disabled={history.length === 0}>
            Back to latest
          </button>
        </p>
      )}

      {!hasKey && (
        <p className="text-caption color-muted ai-panel__no-key">
          AI analysis requires an Anthropic API key.
          Add <code>GEMINI_API_KEY</code> to your <code>.env</code> file and restart the backend.
        </p>
      )}

      <button
        className="btn btn--primary ai-generate-btn"
        onClick={generate}
        disabled={!hasKey || streaming}
        title={!hasKey ? 'Requires GEMINI_API_KEY in .env' : undefined}
        aria-label={content ? 'Regenerate AI analysis' : 'Generate AI analysis'}
      >
        {streaming ? '⏳ Generating…' : content ? 'Regenerate' : 'Generate AI Analysis'}
      </button>

      {error && (
        <p className="text-caption color-bear ai-panel__error">
          {error}{' '}
          <button className="link-btn text-caption" onClick={generate}>Retry</button>
        </p>
      )}

      {content && (
        <div className="ai-content">
          {formatContent(content)}
          {streaming && <span className="ai-cursor">▌</span>}
        </div>
      )}
    </section>
  )
}
