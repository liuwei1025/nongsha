import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/data/db'
import { buildReport } from '@/domain/report'

export function ReportPage() {
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const recommendationEvents = useLiveQuery(() => db.recommendationEvents.toArray(), [])
  const executionEvents = useLiveQuery(() => db.executionEvents.toArray(), [])

  const report = useMemo(
    () =>
      buildReport({
        goals: goals ?? [],
        tasks: tasks ?? [],
        recommendationEvents: recommendationEvents ?? [],
        executionEvents: executionEvents ?? [],
      }),
    [executionEvents, goals, recommendationEvents, tasks],
  )

  return (
    <section className="page-grid">
      <div className="card hero-card">
        <div className="hero-card__copy">
          <p className="eyebrow">Report</p>
          <h2>Use believable signals, not fake precision.</h2>
          <p>
            Nongsha tracks actions and recommendation outcomes. It does not pretend a browser timer
            knows exactly how much attention your life spent.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <article className="card stat-card" data-testid="completed-count">
          <p className="eyebrow">Completed actions</p>
          <h3>{report.completedCount}</h3>
        </article>
        <article className="card stat-card">
          <p className="eyebrow">Skipped</p>
          <h3>{report.skippedCount}</h3>
        </article>
        <article className="card stat-card">
          <p className="eyebrow">Deferred</p>
          <h3>{report.deferredCount}</h3>
        </article>
        <article className="card stat-card">
          <p className="eyebrow">Important, not urgent</p>
          <h3>{report.importantNotUrgentMinutes} min</h3>
        </article>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Timeline</p>
            <h3>Every action keeps the recommendation honest</h3>
          </div>
          <p className="helper-text">{report.recommendationCount} recommendations issued</p>
        </div>

        {report.timeline.length === 0 ? (
          <p className="empty-state">No execution events yet. Mark one recommendation done or skipped first.</p>
        ) : (
          <div className="timeline">
            {report.timeline.map((entry) => (
              <article key={entry.id} className="timeline__item">
                <div>
                  <p className="timeline__action">{entry.action}</p>
                  <h4>{entry.taskTitle}</h4>
                  <p className="helper-text">
                    {entry.goalTitle ? `${entry.goalTitle} · ` : ''}
                    {entry.estimatedMinutes} min
                    {entry.reasonCode ? ` · ${entry.reasonCode}` : ''}
                  </p>
                </div>
                <time>{new Date(entry.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Goal progress</p>
            <h3>Progress compounds when it stays linked</h3>
          </div>
        </div>

        {report.goalProgress.length === 0 ? (
          <p className="empty-state">No linked goals yet. Capture and parse a note to create them.</p>
        ) : (
          <div className="goal-progress-list">
            {report.goalProgress.map((entry) => (
              <article key={entry.goalId} className="goal-progress-item">
                <div>
                  <strong>{entry.title}</strong>
                  <p className="helper-text">
                    {entry.done} done / {entry.total} total
                  </p>
                </div>
                <div className="progress-bar">
                  <span
                    style={{
                      width: `${entry.total === 0 ? 0 : Math.round((entry.done / entry.total) * 100)}%`,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
