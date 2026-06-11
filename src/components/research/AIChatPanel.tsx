import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { streamChat, type ChatMessage } from '../../api/chat'
import { apiBase } from '../../api/client'
import './AIChatPanel.css'

const CHIPS = [
  'Is this stock overvalued?',
  'What are the key risks?',
  'Summarize the bull case',
  'What do the technicals say?',
  'How does it compare to its sector?',
]

interface UIMessage extends ChatMessage {
  streaming?: boolean
  error?: boolean
}

interface Props { ticker: string }

function checkApiKey() {
  return fetch(`${apiBase}/api/settings/status`).then(r => r.json())
}

export default function AIChatPanel({ ticker }: Props) {
  const [messages, setMessages]     = useState<UIMessage[]>([])
  const [input, setInput]           = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef  = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const { data: keyStatus } = useQuery({
    queryKey: ['api-key-status'],
    queryFn: checkApiKey,
    staleTime: 60_000,
  })
  const hasKey = keyStatus?.gemini_api_key_configured === true

  // Reset on ticker change
  useEffect(() => {
    abortRef.current?.abort()
    setMessages([])
    setInput('')
    setIsStreaming(false)
  }, [ticker])

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    const userMsg: UIMessage = { role: 'user', content: trimmed }
    const assistantMsg: UIMessage = { role: 'assistant', content: '', streaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)

    // Build history for the API: all previous completed turns + the new user message
    const history: ChatMessage[] = [
      ...messages
        .filter(m => !m.streaming && !m.error)
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: trimmed },
    ]

    const ac = new AbortController()
    abortRef.current = ac

    streamChat(
      ticker,
      history,
      (token) => {
        setMessages(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + token }
          }
          return next
        })
      },
      () => {
        setMessages(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, streaming: false }
          }
          return next
        })
        setIsStreaming(false)
      },
      (errMsg) => {
        setMessages(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, streaming: false, error: true, content: errMsg }
          }
          return next
        })
        setIsStreaming(false)
      },
      ac.signal,
    )
  }, [ticker, messages, isStreaming])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const noMessages = messages.length === 0

  return (
    <section className="ai-chat-panel" aria-label="AI stock chat">
      <div className="ai-chat-panel__header">
        <span className="text-label">AI Chat</span>
        {messages.length > 0 && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => { abortRef.current?.abort(); setMessages([]); setInput(''); setIsStreaming(false) }}
            aria-label="Clear chat"
          >
            Clear
          </button>
        )}
      </div>

      {/* API key not configured */}
      {keyStatus && !hasKey && (
        <p className="text-caption color-muted ai-chat-panel__no-key">
          AI Chat requires an Anthropic API key. Configure it in{' '}
          <a href="/settings" className="link-btn text-caption">Settings</a>.
        </p>
      )}

      {/* Quick-start chips */}
      {hasKey && noMessages && (
        <div className="ai-chat-chips" role="group" aria-label="Suggested questions">
          {CHIPS.map(chip => (
            <button
              key={chip}
              className="ai-chat-chip text-caption"
              onClick={() => sendMessage(chip)}
              disabled={isStreaming}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Message list */}
      {messages.length > 0 && (
        <div className="ai-chat-messages" role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <div key={i} className={`ai-chat-bubble ai-chat-bubble--${msg.role}`}>
              {msg.role === 'user' ? (
                <span className="text-body">{msg.content}</span>
              ) : msg.error ? (
                <span className="text-caption color-bear">
                  {msg.content}{' '}
                  <button
                    className="link-btn text-caption"
                    onClick={() => {
                      // Re-send last user message
                      const lastUser = [...messages].reverse().find(m => m.role === 'user')
                      if (lastUser) {
                        setMessages(prev => prev.slice(0, -2))
                        sendMessage(lastUser.content)
                      }
                    }}
                  >
                    Retry
                  </button>
                </span>
              ) : (
                <div className="ai-chat-bubble__content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {msg.streaming && <span className="ai-cursor" aria-hidden="true">▌</span>}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input row */}
      {hasKey && (
        <div className="ai-chat-input-row">
          <textarea
            className="ai-chat-input text-body"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this stock…"
            rows={1}
            disabled={isStreaming}
            aria-label="Chat input"
          />
          <button
            className="btn btn--primary btn--sm ai-chat-send"
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      )}
    </section>
  )
}
