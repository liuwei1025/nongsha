import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import {
  applyParseResult,
  clearGoalLocks,
  clearTaskLocks,
  db,
  getOrCreateWorkingNote,
  markParseError,
  markRawNoteParsing,
  saveRawNoteContent,
  updateGoalField,
  updateTaskField,
} from '@/data/db'
import { requestParse } from '@/services/parserClient'

export function CapturePage() {
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const note = useLiveQuery(
    async () => (noteId ? (await db.rawNotes.get(noteId)) ?? null : null),
    [noteId],
  )
  const goals = useLiveQuery(
    async () => (note ? db.goals.where('rawNoteId').equals(note.id).toArray() : []),
    [note?.id],
  )
  const tasks = useLiveQuery(
    async () => (note ? db.tasks.where('rawNoteId').equals(note.id).toArray() : []),
    [note?.id],
  )

  const groupedGoals = useMemo(() => goals ?? [], [goals])
  const groupedTasks = useMemo(() => tasks ?? [], [tasks])

  useEffect(() => {
    let alive = true
    async function bootstrap() {
      const workingNote = await getOrCreateWorkingNote()
      if (alive) {
        setNoteId(workingNote.id)
      }
    }

    void bootstrap()
    return () => {
      alive = false
    }
  }, [])

  async function handleAnalyze() {
    if (!note || !note.content.trim()) {
      setError('Write one messy note first. The parser needs raw material.')
      return
    }

    setError(null)
    setIsParsing(true)
    try {
      await markRawNoteParsing(note.id)
      const result = await requestParse(note.content)
      await applyParseResult(note.id, result)
    } catch (parseError) {
      await markParseError(note.id)
      setError(parseError instanceof Error ? parseError.message : 'The parser failed unexpectedly.')
    } finally {
      setIsParsing(false)
    }
  }

  if (!note) {
    return <section className="panel">Preparing your local note...</section>
  }

  return (
    <section className="page-grid">
      <div className="card hero-card">
        <div className="hero-card__copy">
          <p className="eyebrow">Capture</p>
          <h2>Keep the raw note. Let structure come second.</h2>
          <p>
            Nongsha stores the original note locally, then sends it for transient parsing only when
            you explicitly ask. If you later edit structured fields, those edits stay authoritative.
          </p>
        </div>

        <label className="stacked-label">
          <span>Raw note</span>
          <textarea
            data-testid="raw-note"
            value={note.content}
            onChange={(event) => {
              void saveRawNoteContent(note.id, event.target.value)
            }}
            placeholder="Try a messy brain dump: fitness goals, anniversaries, dishes, errands, learning..."
            rows={9}
          />
        </label>

        <div className="button-row">
          <button type="button" className="button" onClick={() => void handleAnalyze()} disabled={isParsing}>
            {isParsing ? 'Analyzing...' : 'Analyze note'}
          </button>
          <p className="helper-text">
            Parse status: <strong>{note.parseStatus}</strong>
          </p>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div className="card">
        <p className="eyebrow">Draft summary</p>
        <h3>{note.summary}</h3>
        <p className="helper-text">
          Last parse: {note.lastParseAt ? new Date(note.lastParseAt).toLocaleString() : 'not yet'}
        </p>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Goals</p>
            <h3>Editable, but your edits win</h3>
          </div>
          <p className="helper-text">{groupedGoals.length} goals</p>
        </div>

        <div className="editor-list">
          {groupedGoals.length === 0 ? (
            <p className="empty-state">No goals yet. Analyze a note to generate the first draft.</p>
          ) : (
            groupedGoals.map((goal) => (
              <article key={goal.id} className="editor-card">
                <div className="editor-card__top">
                  <span className="lock-badge">
                    {goal.lockedFields.length ? `${goal.lockedFields.length} locked fields` : 'AI-refreshable'}
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      void clearGoalLocks(goal.id)
                    }}
                  >
                    Allow AI updates
                  </button>
                </div>

                <label className="stacked-label">
                  <span>Title</span>
                  <input
                    value={goal.title}
                    onChange={(event) => {
                      void updateGoalField(goal.id, 'title', event.target.value)
                    }}
                  />
                </label>

                <label className="stacked-label">
                  <span>Description</span>
                  <textarea
                    value={goal.description}
                    rows={3}
                    onChange={(event) => {
                      void updateGoalField(goal.id, 'description', event.target.value)
                    }}
                  />
                </label>

                <label className="stacked-label">
                  <span>Category</span>
                  <input
                    value={goal.category}
                    onChange={(event) => {
                      void updateGoalField(goal.id, 'category', event.target.value)
                    }}
                  />
                </label>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tasks</p>
            <h3>Keep the model honest before it reaches Home</h3>
          </div>
          <p className="helper-text">{groupedTasks.length} tasks</p>
        </div>

        <div className="editor-list">
          {groupedTasks.length === 0 ? (
            <p className="empty-state">
              No tasks yet. Once the note is parsed, each action lands here with duration, urgency, and energy.
            </p>
          ) : (
            groupedTasks.map((task) => (
              <article key={task.id} className="editor-card" data-testid="task-editor">
                <div className="editor-card__top">
                  <span className="lock-badge">
                    {task.lockedFields.length ? `${task.lockedFields.length} locked fields` : 'AI-refreshable'}
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      void clearTaskLocks(task.id)
                    }}
                  >
                    Allow AI updates
                  </button>
                </div>

                <div className="grid-two">
                  <label className="stacked-label">
                    <span>Task title</span>
                    <input
                      value={task.title}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'title', event.target.value)
                      }}
                    />
                  </label>

                  <label className="stacked-label">
                    <span>Status</span>
                    <select
                      value={task.status}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'status', event.target.value as typeof task.status)
                      }}
                    >
                      <option value="active">active</option>
                      <option value="inbox">inbox</option>
                      <option value="deferred">deferred</option>
                      <option value="skipped">skipped</option>
                      <option value="done">done</option>
                    </select>
                  </label>
                </div>

                <label className="stacked-label">
                  <span>Notes</span>
                  <textarea
                    value={task.notes}
                    rows={2}
                    onChange={(event) => {
                      void updateTaskField(task.id, 'notes', event.target.value)
                    }}
                  />
                </label>

                <div className="grid-three">
                  <label className="stacked-label">
                    <span>Goal</span>
                    <select
                      value={task.goalId ?? ''}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'goalId', event.target.value || null)
                      }}
                    >
                      <option value="">No linked goal</option>
                      {groupedGoals.map((goal) => (
                        <option key={goal.id} value={goal.id}>
                          {goal.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="stacked-label">
                    <span>Importance</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={task.importance}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'importance', Number(event.target.value))
                      }}
                    />
                  </label>

                  <label className="stacked-label">
                    <span>Urgency</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={task.urgency}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'urgency', Number(event.target.value))
                      }}
                    />
                  </label>
                </div>

                <div className="grid-three">
                  <label className="stacked-label">
                    <span>Minutes</span>
                    <input
                      type="number"
                      min={5}
                      max={240}
                      step={5}
                      value={task.estimatedMinutes}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'estimatedMinutes', Number(event.target.value))
                      }}
                    />
                  </label>

                  <label className="stacked-label">
                    <span>Energy</span>
                    <select
                      value={task.energy}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'energy', event.target.value as typeof task.energy)
                      }}
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </label>

                  <label className="stacked-label">
                    <span>Context</span>
                    <input
                      value={task.context}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'context', event.target.value)
                      }}
                    />
                  </label>
                </div>

                <div className="grid-three">
                  <label className="stacked-label">
                    <span>Due date</span>
                    <input
                      type="date"
                      value={task.dueDate ?? ''}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'dueDate', event.target.value || null)
                      }}
                    />
                  </label>

                  <label className="stacked-label">
                    <span>Recurrence</span>
                    <input
                      value={task.recurrenceRule ?? ''}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'recurrenceRule', event.target.value || null)
                      }}
                      placeholder="weekly / monthly"
                    />
                  </label>
                </div>

                <div className="toggle-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={task.weeklyImportant}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'weeklyImportant', event.target.checked)
                      }}
                    />
                    Important this week
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.dailyUrgent}
                      onChange={(event) => {
                        void updateTaskField(task.id, 'dailyUrgent', event.target.checked)
                      }}
                    />
                    Urgent today
                  </label>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
