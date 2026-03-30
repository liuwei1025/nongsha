import { z } from 'zod'

export const energyLevelSchema = z.enum(['low', 'medium', 'high'])

export const parseGoalDraftSchema = z.object({
  sourceKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default('General'),
})

export const parseTaskDraftSchema = z.object({
  sourceKey: z.string().min(1),
  goalSourceKey: z.string().nullable().optional(),
  title: z.string().min(1),
  notes: z.string().default(''),
  importance: z.number().int().min(1).max(5).default(3),
  urgency: z.number().int().min(1).max(5).default(2),
  estimatedMinutes: z.number().int().min(5).max(240).default(15),
  energy: energyLevelSchema.default('medium'),
  context: z.string().default('anywhere'),
  dueDate: z.string().nullable().optional(),
  recurrenceRule: z.string().nullable().optional(),
  weeklyImportant: z.boolean().default(false),
  dailyUrgent: z.boolean().default(false),
})

export const parseNoteRequestSchema = z.object({
  rawNote: z.string().trim().min(1).max(8000),
})

export const parseNoteResultSchema = z.object({
  version: z.number().int().min(1),
  summary: z.string().min(1),
  goals: z.array(parseGoalDraftSchema),
  tasks: z.array(parseTaskDraftSchema),
})

export type ParseGoalDraft = z.infer<typeof parseGoalDraftSchema>
export type ParseTaskDraft = z.infer<typeof parseTaskDraftSchema>
export type ParseNoteResult = z.infer<typeof parseNoteResultSchema>
