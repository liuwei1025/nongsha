import { describe, expect, it } from 'vitest'

import { buildRecommendationBundle } from './scoring'
import type { Task } from './types'

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: `task_${Math.random()}`,
    rawNoteId: 'note_1',
    sourceKey: `source_${Math.random()}`,
    goalId: null,
    title: 'Task',
    notes: '',
    status: 'active',
    importance: 3,
    urgency: 2,
    estimatedMinutes: 20,
    energy: 'medium',
    context: 'anywhere',
    dueDate: null,
    recurrenceRule: null,
    weeklyImportant: false,
    dailyUrgent: false,
    createdAt: '2026-03-30T00:00:00.000Z',
    updatedAt: '2026-03-30T00:00:00.000Z',
    lockedFields: [],
    updatedBy: 'ai',
    ...overrides,
  }
}

describe('buildRecommendationBundle', () => {
  it('prefers important and time-fitting work over oversized tasks', () => {
    const bundle = buildRecommendationBundle({
      tasks: [
        makeTask({
          id: 'long',
          title: 'Deep research sprint',
          estimatedMinutes: 90,
          importance: 5,
          urgency: 3,
        }),
        makeTask({
          id: 'fit',
          title: 'Short planning review',
          estimatedMinutes: 15,
          importance: 4,
          urgency: 2,
          weeklyImportant: true,
        }),
      ],
      timeBudget: 15,
      energy: 'medium',
    })

    expect(bundle.candidates).toHaveLength(1)
    expect(bundle.candidates[0].task.title).toBe('Short planning review')
  })

  it('returns an empty reason when nothing fits the current window', () => {
    const bundle = buildRecommendationBundle({
      tasks: [
        makeTask({
          title: 'Too large',
          estimatedMinutes: 60,
        }),
      ],
      timeBudget: 5,
      energy: 'low',
    })

    expect(bundle.candidates).toHaveLength(0)
    expect(bundle.emptyReason).toMatch(/Nothing fits/)
  })
})
