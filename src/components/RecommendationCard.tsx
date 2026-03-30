import type { RecommendationWithEvent } from '@/domain/types'

type RecommendationCardProps = {
  recommendation: RecommendationWithEvent
  tone: 'primary' | 'secondary'
  reasonCode: string
  onReasonChange: (reasonCode: string) => void
  onAction: (action: 'done' | 'skipped' | 'deferred') => void
}

const rejectionReasons = [
  { value: 'wrong-time', label: 'Wrong time window' },
  { value: 'wrong-context', label: 'Wrong context' },
  { value: 'too-tired', label: 'Too much energy' },
  { value: 'blocked', label: 'Blocked by something else' },
  { value: 'not-now', label: 'Useful, just not now' },
]

export function RecommendationCard({
  recommendation,
  tone,
  reasonCode,
  onReasonChange,
  onAction,
}: RecommendationCardProps) {
  const { task, reasons, score, rank } = recommendation

  return (
    <article className={`card recommendation-card recommendation-card--${tone}`}>
      <div className="recommendation-card__header">
        <div>
          <p className="eyebrow">Option {rank}</p>
          <h3>{task.title}</h3>
        </div>
        <p className="score-chip">{score.toFixed(1)}</p>
      </div>

      <div className="recommendation-card__meta">
        <span>{task.estimatedMinutes} min</span>
        <span>{task.energy} energy</span>
        <span>{task.weeklyImportant ? 'important this week' : 'steady work'}</span>
      </div>

      <ul className="reason-list">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="recommendation-card__footer">
        <label className="stacked-label">
          <span>If you reject it, why?</span>
          <select value={reasonCode} onChange={(event) => onReasonChange(event.target.value)}>
            {rejectionReasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>

        <div className="button-row">
          <button type="button" className="button button--ghost" onClick={() => onAction('skipped')}>
            Skip
          </button>
          <button type="button" className="button button--ghost" onClick={() => onAction('deferred')}>
            Not now
          </button>
          <button type="button" className="button" onClick={() => onAction('done')}>
            Done
          </button>
        </div>
      </div>
    </article>
  )
}
