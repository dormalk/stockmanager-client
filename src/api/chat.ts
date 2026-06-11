import { apiBase } from './client'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export interface ChatSessionSummary {
  id: number
  title: string
  created_at: string
  message_count: number
}

export interface ChatSessionDetail {
  id: number
  title: string | null
  created_at: string
  messages: ChatMessage[]
}

export async function saveChatSession(ticker: string, messages: ChatMessage[]): Promise<void> {
  if (messages.length === 0) return
  await fetch(`${apiBase}/api/ai/chat/${ticker}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
}

export async function fetchChatSessions(ticker: string): Promise<ChatSessionSummary[]> {
  const res = await fetch(`${apiBase}/api/ai/chat/${ticker}/sessions`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchChatSession(ticker: string, id: number): Promise<ChatSessionDetail | null> {
  const res = await fetch(`${apiBase}/api/ai/chat/${ticker}/sessions/${id}`)
  if (!res.ok) return null
  return res.json()
}

export async function deleteChatSession(ticker: string, id: number): Promise<void> {
  await fetch(`${apiBase}/api/ai/chat/${ticker}/sessions/${id}`, { method: 'DELETE' })
}

export async function streamChat(
  ticker: string,
  messages: ChatMessage[],
  onToken: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${apiBase}/api/ai/chat/${ticker}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    onError('Connection failed.')
    return
  }

  if (!response.ok) {
    onError(`Request failed (${response.status}).`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) { onError('No response body.'); return }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { onDone(); return }
        if (data.startsWith('[ERROR:')) {
          const detail = data.slice(7).replace(/\}?\]$/, '').trim()
          onError(detail || 'AI response failed. Please retry.')
          return
        }
        try {
          const text = JSON.parse(data) as string
          onToken(text.replace(/\\n/g, '\n'))
        } catch {
          onToken(data)
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') onError('Stream interrupted.')
    return
  }
  onDone()
}
