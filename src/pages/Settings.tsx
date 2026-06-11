import { useQuery } from '@tanstack/react-query'
import { apiBase } from '../api/client'
import './Settings.css'

interface StatusData {
  gemini_api_key_configured: boolean
}

async function fetchSettingsStatus(): Promise<StatusData> {
  const res = await fetch(`${apiBase}/api/settings/status`)
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export default function Settings() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings-status'],
    queryFn: fetchSettingsStatus,
  })

  return (
    <main className="page settings-page">
      <h1 className="text-label">Settings & Status</h1>

      <section className="settings-section">
        <h2 className="text-heading">API Keys</h2>

        <div className="status-row">
          <span className="text-body">Gemini API Key</span>
          {isLoading ? (
            <span className="text-caption color-muted">Checking…</span>
          ) : data?.gemini_api_key_configured ? (
            <span className="status-badge status-badge--ok text-caption">Configured</span>
          ) : (
            <span className="status-badge status-badge--missing text-caption">Not configured</span>
          )}
        </div>

        {!isLoading && !data?.gemini_api_key_configured && (
          <div className="settings-instructions text-caption">
            <p>To enable AI analysis and chat, add your Gemini API key:</p>
            <ol>
              <li>Create or open <code>backend/.env</code></li>
              <li>Add: <code>GEMINI_API_KEY=your_key_here</code></li>
              <li>Restart the backend server</li>
            </ol>
            <p>Get a free API key at <strong>aistudio.google.com</strong></p>
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2 className="text-heading">External Services</h2>
        <div className="status-row">
          <span className="text-body">Yahoo Finance (yfinance)</span>
          <span className="status-badge status-badge--ok text-caption">Available</span>
        </div>
        <p className="text-caption color-muted" style={{ marginTop: 'var(--space-xs)' }}>
          Market data is sourced from Yahoo Finance via the yfinance library.
          This is an unofficial API with no SLA.
        </p>
      </section>
    </main>
  )
}
