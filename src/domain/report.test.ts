import { describe, expect, it } from 'vitest'

import { buildReport } from './report'
import type { ExecutionEvent, Goal, RecommendationEvent, Task } from './types'

describe('buildReport', () => {
  it('summarizes completed, skipped, and important-not-urgent work', () => {
    const goals: Goal[] = [
      {
        id: 'goal_1',
        rawNoteId: 'note_1',
        sourceKey: 'learning',
        title: 'Keep learning',
        description: '',
        category: 'Learning',
        createdAt: '2026-03-30T00:00:00.000Z',
        updatedAt: '2026-03-30T00:00:00.000Z',
        lockedFields: [],
        updatedBy: 'ai',
      },
    ]

    const tasks: Task[] = [
      {
        id: 'task_1',
        rawNoteId: 'note_1',
        sourceKey: 'learn-react',
        goalId: 'goal_1',
        title: 'Learn React',
        notes: '',
        status: 'done',
        importance: 4,
        urgency: 2,
        estimatedMinutes: 30,
        energy: 'high',
        context: 'computer',
        dueDate: null,
        recurrenceRule: null,
        weeklyImportant: true,
        dailyUrgent: false,
        createdAt: '2026-03-30T00:00:00.000Z',
        updatedAt: '2026-03-30T00:00:00.000Z',
        lockedFields: [],
        updatedBy: 'ai',
      },
    ]

    const recommendationEvents: RecommendationEvent[] = [
      {
        id: 'rec_1',
        taskId: 'task_1',
        createdAt: '2026-03-30T01:00:00.000Z',
        rank: 1,
        timeBudget: 30,
        energy: 'high',
        score: 9.5,
        snapshotTitle: 'Learn React',
        snapshotReason: 'Fits the time window.',
        estimatedMinutes: 30,
        importance: 4,
        urgency: 2,
        weeklyImportant: true,
        dailyUrgent: false,
        goalId: 'goal_1',
      },
    ]

    const executionEvents: ExecutionEvent[] = [
      {
        id: 'exec_1',
        recommendationEventId: 'rec_1',
        taskId: 'task_1',
        createdAt: '2026-03-30T01:20:00.000Z',
        action: 'done',
        reasonCode: null,
        estimatedMinutes: 30,
        importance: 4,
        urgency: 2,
        weeklyImportant: true,
        dailyUrgent: false,
        goalId: 'goal_1',
      },
    ]

    const report = buildReport({ tasks, goals, recommendationEvents, executionEvents })

    expect(report.completedCount).toBe(1)
    expect(report.importantNotUrgentMinutes).toBe(30)
    expect(report.goalProgress[0]).toMatchObject({ done: 1, total: 1 })
  })
})
