import { describe, expect, it } from 'vitest'

import { mergeParsedGoals, mergeParsedTasks } from './merge'
import type { Goal, RawNote, Task } from './types'

const rawNote: RawNote = {
  id: 'note_1',
  content: 'learn react, keep working out',
  summary: '',
  parserVersion: 1,
  parseStatus: 'parsed',
  lastParseAt: null,
  createdAt: '2026-03-30T00:00:00.000Z',
  updatedAt: '2026-03-30T00:00:00.000Z',
}

describe('mergeParsedTasks', () => {
  it('preserves locked task fields while still applying new unlocked values', () => {
    const goals: Goal[] = [
      {
        id: 'goal_1',
        rawNoteId: rawNote.id,
        sourceKey: 'keep-learning',
        title: 'Keep learning',
        description: '',
        category: 'Learning',
        createdAt: rawNote.createdAt,
        updatedAt: rawNote.updatedAt,
        lockedFields: [],
        updatedBy: 'ai',
      },
    ]

    const existingTask: Task = {
      id: 'task_1',
      rawNoteId: rawNote.id,
      sourceKey: 'learn-react',
      goalId: 'goal_1',
      title: 'Custom React study sprint',
      notes: 'The user tightened this title by hand.',
      status: 'active',
      importance: 4,
      urgency: 2,
      estimatedMinutes: 30,
      energy: 'high',
      context: 'computer',
      dueDate: null,
      recurrenceRule: null,
      weeklyImportant: true,
      dailyUrgent: false,
      createdAt: rawNote.createdAt,
      updatedAt: rawNote.updatedAt,
      lockedFields: ['title'],
      updatedBy: 'user',
    }

    const merged = mergeParsedTasks(
      rawNote,
      [existingTask],
      [
        {
          sourceKey: 'learn-react',
          goalSourceKey: 'keep-learning',
          title: 'Learn React fundamentals',
          notes: 'AI rewrote the task.',
          importance: 3,
          urgency: 4,
          estimatedMinutes: 20,
          energy: 'medium',
          context: 'computer',
          dueDate: '2026-04-02',
          recurrenceRule: null,
          weeklyImportant: false,
          dailyUrgent: true,
        },
      ],
      goals,
    )

    expect(merged).toHaveLength(1)
    expect(merged[0].title).toBe('Custom React study sprint')
    expect(merged[0].urgency).toBe(4)
    expect(merged[0].dueDate).toBe('2026-04-02')
    expect(merged[0].dailyUrgent).toBe(true)
  })

  it('keeps unmatched existing tasks instead of deleting them during reparsing', () => {
    const existingTask: Task = {
      id: 'task_2',
      rawNoteId: rawNote.id,
      sourceKey: 'buy-groceries',
      goalId: null,
      title: 'Buy groceries',
      notes: '',
      status: 'active',
      importance: 3,
      urgency: 3,
      estimatedMinutes: 15,
      energy: 'low',
      context: 'errand',
      dueDate: null,
      recurrenceRule: null,
      weeklyImportant: false,
      dailyUrgent: false,
      createdAt: rawNote.createdAt,
      updatedAt: rawNote.updatedAt,
      lockedFields: [],
      updatedBy: 'ai',
    }

    const merged = mergeParsedTasks(rawNote, [existingTask], [], [])
    expect(merged).toEqual([existingTask])
  })
})

describe('mergeParsedGoals', () => {
  it('preserves locked goal fields', () => {
    const existingGoal: Goal = {
      id: 'goal_2',
      rawNoteId: rawNote.id,
      sourceKey: 'health',
      title: 'Health ritual',
      description: 'Custom description',
      category: 'Health',
      createdAt: rawNote.createdAt,
      updatedAt: rawNote.updatedAt,
      lockedFields: ['description'],
      updatedBy: 'user',
    }

    const merged = mergeParsedGoals(rawNote, [existingGoal], [
      {
        sourceKey: 'health',
        title: 'Keep health moving forward',
        description: 'AI description',
        category: 'Fitness',
      },
    ])

    expect(merged[0].description).toBe('Custom description')
    expect(merged[0].title).toBe('Keep health moving forward')
  })
})
