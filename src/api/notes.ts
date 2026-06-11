export interface NoteData {
  ticker: string
  user_notes: string | null
  updated_at: string | null
}

import { apiBase } from './client'

export async function fetchNote(ticker: string): Promise<NoteData> {
  const res = await fetch(`${apiBase}/api/notes/${ticker}`)
  if (!res.ok) throw new Error('Failed to load note')
  return res.json()
}

export async function saveNote(ticker: string, user_notes: string): Promise<NoteData> {
  const res = await fetch(`${apiBase}/api/notes/${ticker}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_notes }),
  })
  if (!res.ok) throw new Error('Failed to save note')
  return res.json()
}

export async function fetchTickersWithNotes(): Promise<{ tickers: string[] }> {
  const res = await fetch(`${apiBase}/api/notes/tickers-with-notes`)
  if (!res.ok) throw new Error('Failed to fetch note tickers')
  return res.json()
}
