import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiBase } from '../../api/client'
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
  const esRef = useRef<EventSource | null>(null)

  const { data: keyStatus } = useQuery({
    queryKey: ['api-key-status'],
    queryFn: checkApiKey,
  })

  const hasKey = keyStatus?.gemini_api_key_configured === true

  // Load saved analysis on mount
  useEffect(() => {
    loadSavedAnalysis(ticker).then(saved => {
      if (saved?.ai_analysis) {
        setContent(saved.ai_analysis)
        if (saved.ai_generated_at) setGeneratedAt(new Date(saved.ai_generated_at))
      }
    })
  }, [ticker])

  useEffect(() => {
    return () => esRef.current?.close()
  }, [])

  function generate() {
    if (streaming) return
    esRef.current?.close()
    setContent('')
    setError('')
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
          persistAnalysis(ticker, prev)
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
        {generatedAt && (
          <span className="text-caption color-muted">
            Generated {Math.floor((Date.now() - generatedAt.getTime()) / 60000) < 1
              ? 'just now'
              : `${Math.floor((Date.now() - generatedAt.getTime()) / 60000)} min ago`}
          </span>
        )}
      </div>

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
