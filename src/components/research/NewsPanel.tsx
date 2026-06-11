import { useQuery, useQueryClient } from '@tanstack/react-query'
import Skeleton from '../ui/Skeleton'
import Tooltip from '../ui/Tooltip'
import { fetchNews, type AnalystData, type NewsItem } from '../../api/research'
import { formatCurrency } from '../../utils/format'
import './NewsPanel.css'

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function absoluteTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

function consensusClass(c: AnalystData['consensus']): string {
  if (c === 'Buy')  return 'color-bull'
  if (c === 'Sell') return 'color-bear'
  return 'color-neutral'
}

interface Props { ticker: string }

export default function NewsPanel({ ticker }: Props) {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['news', ticker],
    queryFn: () => fetchNews(ticker),
  })

  const analyst = data?.analyst
  const news = data?.news ?? []

  return (
    <section className="news-panel" aria-label="News and analyst ratings">
      <div className="news-panel__header">
        <span className="text-label">News & Analyst</span>
      </div>

      {isError && (
        <p className="text-caption color-muted news-panel__error">
          Failed to load news.{' '}
          <button
            className="link-btn text-caption"
            onClick={() => qc.invalidateQueries({ queryKey: ['news', ticker] })}
          >
            Retry
          </button>
        </p>
      )}

      {/* Analyst block */}
      {isLoading ? (
        <div className="analyst-block">
          <Skeleton height="20px" width="60px" />
          <Skeleton height="13px" width="120px" />
        </div>
      ) : analyst ? (
        <div className="analyst-block">
          {analyst.consensus && (
            <span className={`analyst-consensus text-heading ${consensusClass(analyst.consensus)}`}>
              {analyst.consensus}
            </span>
          )}
          <div className="analyst-details text-caption color-muted">
            {analyst.analyst_count != null && (
              <span>{analyst.analyst_count} analysts</span>
            )}
            {analyst.target_mean != null && (
              <span>Mean: {formatCurrency(analyst.target_mean)}</span>
            )}
            {analyst.target_high != null && analyst.target_low != null && (
              <span>
                Range: {formatCurrency(analyst.target_low)}–{formatCurrency(analyst.target_high)}
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* News list */}
      <div className="news-list">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="news-item">
                <Skeleton height="13px" width="100%" />
                <Skeleton height="11px" width="120px" />
              </div>
            ))
          : news.length === 0
          ? <p className="text-caption color-muted">No recent news found.</p>
          : news.map((item: NewsItem, i: number) => (
              <div key={i} className="news-item">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-item__title text-body"
                >
                  {item.title}
                </a>
                <div className="news-item__meta text-caption color-muted">
                  <span>{item.publisher}</span>
                  {item.published_at && (
                    <Tooltip content={absoluteTime(item.published_at)}>
                      <span className="news-item__time">{relativeTime(item.published_at)}</span>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))
        }
      </div>
    </section>
  )
}
