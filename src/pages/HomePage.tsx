import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { RecommendationCard } from '@/components/RecommendationCard'
import { createRecommendationSnapshot, db, recordExecution, updateTaskField } from '@/data/db'
import type { EnergyFilter, PersistedRecommendationBundle } from '@/domain/types'

const timeOptions = [5, 15, 30, 60]
const energyOptions: EnergyFilter[] = ['low', 'medium', 'high']

export function HomePage() {
  const [timeBudget, setTimeBudget] = useState(15)
  const [energy, setEnergy] = useState<EnergyFilter>('medium')
  const [bundle, setBundle] = useState<PersistedRecommendationBundle | null>(null)
  const [reasonByRecommendation, setReasonByRecommendation] = useState<Record<string, string>>({})

  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const note = useLiveQuery(() => db.rawNotes.orderBy('updatedAt').last(), [])

  const lightweightReview = useMemo(
    () =>
      (tasks ?? [])
        .filter((task) => task.status !== 'done')
        .sort((left, right) => right.importance - left.importance || right.urgency - left.urgency)
        .slice(0, 5),
    [tasks],
  )

  async function recommendNow() {
    const nextBundle = await createRecommendationSnapshot(timeBudget, energy)
    setBundle(nextBundle)
  }

  async function handleAction(index: number, action: 'done' | 'skipped' | 'deferred') {
    if (!bundle) {
      return
    }

    const recommendation = bundle.candidates[index]
    const reasonCode = reasonByRecommendation[recommendation.event.id] ?? 'not-now'
    await recordExecution(recommendation, action, action === 'done' ? null : reasonCode)
    const refreshed = await createRecommendationSnapshot(timeBudget, energy)
    setBundle(refreshed)
  }

  return (
    <section className="page-grid">
      <div className="card hero-card">
        <div className="hero-card__copy">
          <p className="eyebrow">Home</p>
          <h2>Ask one question: what fits right now?</h2>
          <p>
            Recommendation stays local and deterministic. The note may be messy, but the score should
            never feel like a black box.
          </p>
        </div>

        <div className="control-block">
          <div>
            <p className="eyebrow">Time window</p>
            <div className="segmented-row">
              {timeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented-button${timeBudget === option ? ' segmented-button--active' : ''}`}
                  onClick={() => setTimeBudget(option)}
                >
                  {option}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">Energy</p>
            <div className="segmented-row">
              {energyOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented-button${energy === option ? ' segmented-button--active' : ''}`}
                  onClick={() => setEnergy(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="button-row">
          <button type="button" className="button" onClick={() => void recommendNow()} data-testid="recommend-now">
            Recommend now
          </button>
          <p className="helper-text">
            {note?.summary ?? 'Capture something first, then come back for a ranked action pool.'}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lightweight review</p>
            <h3>Keep importance and urgency visible, not ceremonial</h3>
          </div>
          <p className="helper-text">{lightweightReview.length} tasks in view</p>
        </div>

        {lightweightReview.length === 0 ? (
          <p className="empty-state">No parsed tasks yet. Analyze a note on Capture first.</p>
        ) : (
          <div className="mini-review-list">
            {lightweightReview.map((task) => (
              <article key={task.id} className="mini-review-item">
                <div>
                  <strong>{task.title}</strong>
                  <p className="helper-text">
                    {task.estimatedMinutes} min · {task.energy} energy · {task.status}
                  </p>
                </div>
                <div className="toggle-row toggle-row--compact">
                  <label>
                    <input
                      type="checkbox"
                      checked={task.weeklyImportant}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'weeklyImportant', event.target.checked)
                      }}
                    />
                    important
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.dailyUrgent}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'dailyUrgent', event.target.checked)
                      }}
                    />
                    urgent
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="recommendation-stack">
        {!bundle ? (
          <div className="card empty-state-card">
            <p className="eyebrow">Recommendation</p>
            <h3>Generate a local recommendation snapshot</h3>
            <p>
              Nongsha stores a snapshot of what it showed you, so history and reports stay stable even
              if the ranking formula changes later.
            </p>
          </div>
        ) : bundle.candidates.length === 0 ? (
          <div className="card empty-state-card">
            <p className="eyebrow">No fit found</p>
            <h3>{bundle.emptyReason}</h3>
            <p>
              This usually means the durations are too large for the chosen window or the note has not
              been structured yet.
            </p>
          </div>
        ) : (
          bundle.candidates.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.event.id}
              recommendation={recommendation}
              tone={index === 0 ? 'primary' : 'secondary'}
              reasonCode={reasonByRecommendation[recommendation.event.id] ?? 'not-now'}
              onReasonChange={(reasonCode) => {
                setReasonByRecommendation((current) => ({
                  ...current,
                  [recommendation.event.id]: reasonCode,
                }))
              }}
              onAction={(action) => {
                void handleAction(index, action)
              }}
            />
          ))
        )}
      </div>

      <div className="card">
        <p className="eyebrow">Goal links</p>
        <h3>Why this recommendation can compound</h3>
        <div className="mini-review-list">
          {(goals ?? []).map((goal) => {
            const count = (tasks ?? []).filter((task) => task.goalId === goal.id && task.status !== 'done').length
            return (
              <article key={goal.id} className="mini-review-item">
                <div>
                  <strong>{goal.title}</strong>
                  <p className="helper-text">{goal.category}</p>
                </div>
                <p className="helper-text">{count} active tasks</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
