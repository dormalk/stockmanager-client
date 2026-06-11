import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { fetchNote, saveNote } from '../../api/notes'
import './NotesPanel.css'

const BULL_BEAR_TEMPLATE = `## Bull Case\n-\n\n## Bear Case\n-`

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  return `${Math.floor(mins / 60)}h ago`
}

interface Props { ticker: string }

export default function NotesPanel({ ticker }: Props) {
  const [content, setContent] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fadeRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['note', ticker],
    queryFn: () => fetchNote(ticker),
  })

  useEffect(() => {
    if (data) setContent(data.user_notes ?? '')
  }, [data])

  const saveMut = useMutation({
    mutationFn: (text: string) => saveNote(ticker, text),
    onMutate:   () => setSaveState('saving'),
    onSuccess:  (saved) => {
      qc.setQueryData(['note', ticker], saved)
      qc.invalidateQueries({ queryKey: ['notes-tickers'] })
      setSaveState('saved')
      clearTimeout(fadeRef.current)
      fadeRef.current = setTimeout(() => setSaveState('idle'), 2000)
    },
    onError: () => setSaveState('idle'),
  })

  function handleChange(val: string) {
    setContent(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveMut.mutate(val), 1000)
  }

  function insertTemplate() {
    const ta = textareaRef.current
    if (!ta) {
      handleChange(content ? content + '\n\n' + BULL_BEAR_TEMPLATE : BULL_BEAR_TEMPLATE)
      return
    }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const before = content.slice(0, start)
    const after  = content.slice(end)
    const insert = before ? '\n\n' + BULL_BEAR_TEMPLATE : BULL_BEAR_TEMPLATE
    const next = before + insert + after
    handleChange(next)
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + insert.length
      ta.focus()
    }, 0)
  }

  const [preview, setPreview] = useState(false)

  function applyFormat(prefix: string, suffix = '') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const sel   = content.slice(start, end)
    const next  = content.slice(0, start) + prefix + (sel || 'text') + suffix + content.slice(end)
    handleChange(next)
    setTimeout(() => {
      ta.selectionStart = start + prefix.length
      ta.selectionEnd   = start + prefix.length + (sel || 'text').length
      ta.focus()
    }, 0)
  }

  return (
    <section className="notes-panel" aria-label="Investment thesis notes">
      <div className="notes-panel__header">
        <span className="text-label">Notes</span>
        <div className="notes-panel__actions">
          <button className="link-btn text-caption" onClick={insertTemplate}
            aria-label="Insert Bull/Bear template">
            Insert Bull/Bear Template
          </button>
          <span className={`save-indicator text-caption${saveState !== 'idle' ? ` save-indicator--${saveState}` : ''}`}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : ''}
          </span>
        </div>
      </div>

      {/* Markdown toolbar */}
      <div className="md-toolbar">
        <button className="md-btn" onClick={() => applyFormat('**','**')} title="Bold" aria-label="Bold">B</button>
        <button className="md-btn md-italic" onClick={() => applyFormat('_','_')} title="Italic" aria-label="Italic">I</button>
        <button className="md-btn" onClick={() => applyFormat('\n- ')} title="Bullet list" aria-label="Bullet list">• List</button>
        <button className="md-btn" onClick={() => applyFormat('\n1. ')} title="Numbered list" aria-label="Numbered list">1. List</button>
        <button className="md-btn" onClick={() => applyFormat('\n## ')} title="Heading" aria-label="Heading">H2</button>
        <button className={`md-btn${preview ? ' md-btn--active' : ''}`}
          onClick={() => setPreview(p => !p)} aria-label="Toggle preview">
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="notes-preview text-body">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <span className="text-caption color-muted">Nothing to preview yet.</span>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className="notes-textarea text-body"
          value={content}
          onChange={e => handleChange(e.target.value)}
          placeholder="No thesis written yet. Start typing or insert a Bull/Bear template."
          aria-label={`Investment notes for ${ticker}`}
          rows={10}
        />
      )}

      {data?.updated_at && (
        <span className="text-caption color-muted">
          Last updated {relativeTime(data.updated_at)}
        </span>
      )}
    </section>
  )
}
