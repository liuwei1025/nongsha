import Dexie, { type Table } from 'dexie'

import type { ParseNoteResult } from '@/domain/contracts'
import { mergeParsedGoals, mergeParsedTasks } from '@/domain/merge'
import { createId, nowIso } from '@/domain/normalize'
import { buildRecommendationBundle } from '@/domain/scoring'
import type {
  EnergyFilter,
  ExecutionAction,
  ExecutionEvent,
  Goal,
  GoalEditableField,
  PersistedRecommendationBundle,
  RawNote,
  RecommendationEvent,
  RecommendationWithEvent,
  Task,
  TaskEditableField,
} from '@/domain/types'

class NongshaDB extends Dexie {
  rawNotes!: Table<RawNote, string>
  goals!: Table<Goal, string>
  tasks!: Table<Task, string>
  recommendationEvents!: Table<RecommendationEvent, string>
  executionEvents!: Table<ExecutionEvent, string>

  constructor() {
    super('nongsha')
    this.version(1).stores({
      rawNotes: 'id, updatedAt, lastParseAt',
      goals: 'id, rawNoteId, sourceKey, updatedAt',
      tasks: 'id, rawNoteId, goalId, sourceKey, status, updatedAt, weeklyImportant, dailyUrgent',
      recommendationEvents: 'id, taskId, createdAt, timeBudget',
      executionEvents: 'id, taskId, recommendationEventId, action, createdAt',
    })
  }
}

export const db = new NongshaDB()

export async function getOrCreateWorkingNote() {
  const latest = await db.rawNotes.orderBy('updatedAt').last()
  if (latest) {
    return latest
  }

  const timestamp = nowIso()
  const note: RawNote = {
    id: createId('note'),
    content: '',
    summary: 'Drop a messy note here. The parser will turn it into goals and tasks you can act on.',
    parserVersion: 1,
    parseStatus: 'idle',
    lastParseAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.rawNotes.add(note)
  return note
}

export async function saveRawNoteContent(noteId: string, content: string) {
  const note = await db.rawNotes.get(noteId)
  if (!note) {
    throw new Error('The active note disappeared before it could be saved.')
  }

  const updated: RawNote = {
    ...note,
    content,
    updatedAt: nowIso(),
  }
  await db.rawNotes.put(updated)
  return updated
}

export async function markRawNoteParsing(noteId: string) {
  const note = await db.rawNotes.get(noteId)
  if (!note) {
    throw new Error('The active note is missing.')
  }

  const updated: RawNote = {
    ...note,
    parseStatus: 'processing',
    updatedAt: nowIso(),
  }
  await db.rawNotes.put(updated)
  return updated
}

export async function applyParseResult(noteId: string, result: ParseNoteResult) {
  const note = await db.rawNotes.get(noteId)
  if (!note) {
    throw new Error('The note vanished before the parse result could be applied.')
  }

  const existingGoals = await db.goals.where('rawNoteId').equals(note.id).toArray()
  const existingTasks = await db.tasks.where('rawNoteId').equals(note.id).toArray()
  const mergedGoals = mergeParsedGoals(note, existingGoals, result.goals)
  const mergedTasks = mergeParsedTasks(note, existingTasks, result.tasks, mergedGoals)
  const timestamp = nowIso()
  const updatedNote: RawNote = {
    ...note,
    summary: result.summary,
    parserVersion: result.version,
    parseStatus: 'parsed',
    lastParseAt: timestamp,
    updatedAt: timestamp,
  }

  await db.transaction('rw', db.rawNotes, db.goals, db.tasks, async () => {
    await db.rawNotes.put(updatedNote)
    await db.goals.bulkPut(mergedGoals)
    await db.tasks.bulkPut(mergedTasks)
  })

  return updatedNote
}

export async function markParseError(noteId: string) {
  const note = await db.rawNotes.get(noteId)
  if (!note) {
    return
  }

  await db.rawNotes.put({
    ...note,
    parseStatus: 'error',
    updatedAt: nowIso(),
  })
}

export async function updateGoalField<K extends GoalEditableField>(
  goalId: string,
  field: K,
  value: Goal[K],
) {
  const goal = await db.goals.get(goalId)
  if (!goal) {
    return
  }

  await db.goals.put({
    ...goal,
    [field]: value,
    lockedFields: [...new Set([...goal.lockedFields, field])],
    updatedAt: nowIso(),
    updatedBy: 'user',
  })
}

export async function updateTaskField<K extends TaskEditableField>(
  taskId: string,
  field: K,
  value: Task[K],
) {
  const task = await db.tasks.get(taskId)
  if (!task) {
    return
  }

  await db.tasks.put({
    ...task,
    [field]: value,
    lockedFields: [...new Set([...task.lockedFields, field])],
    updatedAt: nowIso(),
    updatedBy: 'user',
  })
}

export async function clearGoalLocks(goalId: string) {
  const goal = await db.goals.get(goalId)
  if (!goal) {
    return
  }

  await db.goals.put({
    ...goal,
    lockedFields: [],
    updatedAt: nowIso(),
    updatedBy: 'ai',
  })
}

export async function clearTaskLocks(taskId: string) {
  const task = await db.tasks.get(taskId)
  if (!task) {
    return
  }

  await db.tasks.put({
    ...task,
    lockedFields: [],
    updatedAt: nowIso(),
    updatedBy: 'ai',
  })
}

export async function createRecommendationSnapshot(timeBudget: number, energy: EnergyFilter) {
  const tasks = await db.tasks.toArray()
  const bundle = buildRecommendationBundle({ tasks, timeBudget, energy })
  const events: RecommendationEvent[] = bundle.candidates.map((candidate) => ({
    id: createId('rec'),
    taskId: candidate.task.id,
    createdAt: bundle.generatedAt,
    rank: candidate.rank,
    timeBudget,
    energy,
    score: candidate.score,
    snapshotTitle: candidate.task.title,
    snapshotReason: candidate.reasons[0] ?? 'Recommended for this window.',
    estimatedMinutes: candidate.task.estimatedMinutes,
    importance: candidate.task.importance,
    urgency: candidate.task.urgency,
    weeklyImportant: candidate.task.weeklyImportant,
    dailyUrgent: candidate.task.dailyUrgent,
    goalId: candidate.task.goalId,
  }))

  if (events.length) {
    await db.recommendationEvents.bulkPut(events)
  }

  const candidates: RecommendationWithEvent[] = bundle.candidates.map((candidate, index) => ({
    ...candidate,
    event: events[index],
  }))

  return {
    ...bundle,
    candidates,
  } satisfies PersistedRecommendationBundle
}

export async function recordExecution(
  recommendation: RecommendationWithEvent,
  action: ExecutionAction,
  reasonCode: string | null,
) {
  const task = await db.tasks.get(recommendation.task.id)
  if (!task) {
    throw new Error('The task disappeared before the action could be recorded.')
  }

  const timestamp = nowIso()
  const nextStatus =
    action === 'done' ? 'done' : action === 'skipped' ? 'skipped' : 'deferred'

  const executionEvent: ExecutionEvent = {
    id: createId('exec'),
    recommendationEventId: recommendation.event.id,
    taskId: recommendation.task.id,
    createdAt: timestamp,
    action,
    reasonCode,
    estimatedMinutes: recommendation.event.estimatedMinutes,
    importance: recommendation.event.importance,
    urgency: recommendation.event.urgency,
    weeklyImportant: recommendation.event.weeklyImportant,
    dailyUrgent: recommendation.event.dailyUrgent,
    goalId: recommendation.event.goalId,
  }

  await db.transaction('rw', db.executionEvents, db.tasks, async () => {
    await db.executionEvents.put(executionEvent)
    await db.tasks.put({
      ...task,
      status: nextStatus,
      updatedAt: timestamp,
    })
  })
}
