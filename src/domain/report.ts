import type { ExecutionEvent, Goal, RecommendationEvent, ReportSummary, Task } from './types'

type ReportInputs = {
  tasks: Task[]
  goals: Goal[]
  executionEvents: ExecutionEvent[]
  recommendationEvents: RecommendationEvent[]
}

export function buildReport({
  tasks,
  goals,
  executionEvents,
  recommendationEvents,
}: ReportInputs): ReportSummary {
  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  const goalsById = new Map(goals.map((goal) => [goal.id, goal]))
  const completed = executionEvents.filter((event) => event.action === 'done')
  const skipped = executionEvents.filter((event) => event.action === 'skipped')
  const deferred = executionEvents.filter((event) => event.action === 'deferred')

  return {
    completedCount: completed.length,
    skippedCount: skipped.length,
    deferredCount: deferred.length,
    importantNotUrgentMinutes: completed
      .filter((event) => event.weeklyImportant && !event.dailyUrgent)
      .reduce((total, event) => total + event.estimatedMinutes, 0),
    recommendationCount: recommendationEvents.length,
    timeline: [...executionEvents]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((event) => {
        const task = tasksById.get(event.taskId)
        const goalTitle = event.goalId ? goalsById.get(event.goalId)?.title ?? null : null
        return {
          id: event.id,
          createdAt: event.createdAt,
          action: event.action,
          reasonCode: event.reasonCode,
          taskTitle: task?.title ?? 'Unknown task',
          goalTitle,
          estimatedMinutes: event.estimatedMinutes,
        }
      }),
    goalProgress: goals.map((goal) => {
      const relatedTasks = tasks.filter((task) => task.goalId === goal.id)
      return {
        goalId: goal.id,
        title: goal.title,
        done: relatedTasks.filter((task) => task.status === 'done').length,
        total: relatedTasks.length,
      }
    }),
  }
}
