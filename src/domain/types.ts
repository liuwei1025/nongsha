export type ParseStatus = 'idle' | 'processing' | 'parsed' | 'error'
export type TaskStatus = 'inbox' | 'active' | 'done' | 'skipped' | 'deferred'
export type EnergyLevel = 'low' | 'medium' | 'high'
export type EnergyFilter = EnergyLevel | 'any'
export type ExecutionAction = 'done' | 'skipped' | 'deferred'
export type GoalEditableField = 'title' | 'description' | 'category'
export type TaskEditableField =
  | 'title'
  | 'notes'
  | 'goalId'
  | 'importance'
  | 'urgency'
  | 'estimatedMinutes'
  | 'energy'
  | 'context'
  | 'dueDate'
  | 'recurrenceRule'
  | 'weeklyImportant'
  | 'dailyUrgent'
  | 'status'

type EntityBase = {
  id: string
  sourceKey: string
  createdAt: string
  updatedAt: string
  lockedFields: string[]
  updatedBy: 'ai' | 'user'
}

export type RawNote = {
  id: string
  content: string
  summary: string
  parserVersion: number
  parseStatus: ParseStatus
  lastParseAt: string | null
  createdAt: string
  updatedAt: string
}

export type Goal = EntityBase & {
  rawNoteId: string
  title: string
  description: string
  category: string
}

export type Task = EntityBase & {
  rawNoteId: string
  goalId: string | null
  title: string
  notes: string
  status: TaskStatus
  importance: number
  urgency: number
  estimatedMinutes: number
  energy: EnergyLevel
  context: string
  dueDate: string | null
  recurrenceRule: string | null
  weeklyImportant: boolean
  dailyUrgent: boolean
}

export type RecommendationCandidate = {
  task: Task
  score: number
  reasons: string[]
  rank: number
}

export type RecommendationBundle = {
  timeBudget: number
  energy: EnergyFilter
  generatedAt: string
  candidates: RecommendationCandidate[]
  emptyReason: string | null
}

export type RecommendationEvent = {
  id: string
  taskId: string
  createdAt: string
  rank: number
  timeBudget: number
  energy: EnergyFilter
  score: number
  snapshotTitle: string
  snapshotReason: string
  estimatedMinutes: number
  importance: number
  urgency: number
  weeklyImportant: boolean
  dailyUrgent: boolean
  goalId: string | null
}

export type RecommendationWithEvent = RecommendationCandidate & {
  event: RecommendationEvent
}

export type PersistedRecommendationBundle = Omit<RecommendationBundle, 'candidates'> & {
  candidates: RecommendationWithEvent[]
}

export type ExecutionEvent = {
  id: string
  recommendationEventId: string
  taskId: string
  createdAt: string
  action: ExecutionAction
  reasonCode: string | null
  estimatedMinutes: number
  importance: number
  urgency: number
  weeklyImportant: boolean
  dailyUrgent: boolean
  goalId: string | null
}

export type ReportSummary = {
  completedCount: number
  skippedCount: number
  deferredCount: number
  importantNotUrgentMinutes: number
  recommendationCount: number
  timeline: Array<{
    id: string
    createdAt: string
    action: ExecutionAction
    reasonCode: string | null
    taskTitle: string
    goalTitle: string | null
    estimatedMinutes: number
  }>
  goalProgress: Array<{
    goalId: string
    title: string
    done: number
    total: number
  }>
}
