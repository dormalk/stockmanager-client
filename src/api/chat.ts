import { apiBase } from './client'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

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
