import type { ParseGoalDraft, ParseTaskDraft } from './contracts'
import { createId, nowIso } from './normalize'
import type { Goal, RawNote, Task } from './types'

function preserveLockedField<T extends Goal | Task, K extends keyof T>(
  existing: T | undefined,
  incoming: T[K],
  field: K,
) {
  if (!existing) {
    return incoming
  }

  return existing.lockedFields.includes(String(field)) ? existing[field] : incoming
}

export function mergeParsedGoals(rawNote: RawNote, existingGoals: Goal[], drafts: ParseGoalDraft[]) {
  const timestamp = nowIso()
  const existingBySourceKey = new Map(existingGoals.map((goal) => [goal.sourceKey, goal]))
  const merged = drafts.map((draft) => {
    const existing = existingBySourceKey.get(draft.sourceKey)
    return {
      id: existing?.id ?? createId('goal'),
      rawNoteId: rawNote.id,
      sourceKey: draft.sourceKey,
      title: preserveLockedField(existing, draft.title, 'title'),
      description: preserveLockedField(existing, draft.description, 'description'),
      category: preserveLockedField(existing, draft.category, 'category'),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lockedFields: existing?.lockedFields ?? [],
      updatedBy: existing?.lockedFields.length ? 'user' : 'ai',
    } satisfies Goal
  })

  for (const goal of existingGoals) {
    if (!merged.find((entry) => entry.id === goal.id)) {
      merged.push(goal)
    }
  }

  return merged
}

export function mergeParsedTasks(
  rawNote: RawNote,
  existingTasks: Task[],
  drafts: ParseTaskDraft[],
  goals: Goal[],
) {
  const timestamp = nowIso()
  const existingBySourceKey = new Map(existingTasks.map((task) => [task.sourceKey, task]))
  const goalsBySourceKey = new Map(goals.map((goal) => [goal.sourceKey, goal]))
  const merged = drafts.map((draft) => {
    const existing = existingBySourceKey.get(draft.sourceKey)
    const goalId = draft.goalSourceKey ? goalsBySourceKey.get(draft.goalSourceKey)?.id ?? null : null
    return {
      id: existing?.id ?? createId('task'),
      rawNoteId: rawNote.id,
      sourceKey: draft.sourceKey,
      goalId: preserveLockedField(existing, goalId, 'goalId'),
      title: preserveLockedField(existing, draft.title, 'title'),
      notes: preserveLockedField(existing, draft.notes, 'notes'),
      status: preserveLockedField(existing, existing?.status ?? 'active', 'status'),
      importance: preserveLockedField(existing, draft.importance, 'importance'),
      urgency: preserveLockedField(existing, draft.urgency, 'urgency'),
      estimatedMinutes: preserveLockedField(existing, draft.estimatedMinutes, 'estimatedMinutes'),
      energy: preserveLockedField(existing, draft.energy, 'energy'),
      context: preserveLockedField(existing, draft.context, 'context'),
      dueDate: preserveLockedField(existing, draft.dueDate ?? null, 'dueDate'),
      recurrenceRule: preserveLockedField(existing, draft.recurrenceRule ?? null, 'recurrenceRule'),
      weeklyImportant: preserveLockedField(existing, draft.weeklyImportant, 'weeklyImportant'),
      dailyUrgent: preserveLockedField(existing, draft.dailyUrgent, 'dailyUrgent'),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lockedFields: existing?.lockedFields ?? [],
      updatedBy: existing?.lockedFields.length ? 'user' : 'ai',
    } satisfies Task
  })

  for (const task of existingTasks) {
    if (!merged.find((entry) => entry.id === task.id)) {
      merged.push(task)
    }
  }

  return merged
}
