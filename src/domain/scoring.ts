import { daysUntil, nowIso } from './normalize'
import type { EnergyFilter, RecommendationBundle, Task } from './types'

type RecommendationInputs = {
  tasks: Task[]
  timeBudget: number
  energy: EnergyFilter
  now?: Date
}

export function buildRecommendationBundle({
  tasks,
  timeBudget,
  energy,
  now = new Date(),
}: RecommendationInputs): RecommendationBundle {
  const eligible = tasks.filter((task) => task.status !== 'done')
  if (!eligible.length) {
    return {
      timeBudget,
      energy,
      generatedAt: nowIso(),
      candidates: [],
      emptyReason: 'No active tasks exist yet. Capture one messy note first.',
    }
  }

  const scored = eligible
    .map((task) => scoreTask(task, timeBudget, energy, now))
    .filter((entry) => entry.score > -20)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((entry, index) => ({
      task: entry.task,
      score: Number(entry.score.toFixed(2)),
      reasons: entry.reasons,
      rank: index + 1,
    }))

  return {
    timeBudget,
    energy,
    generatedAt: nowIso(),
    candidates: scored,
    emptyReason:
      scored.length > 0
        ? null
        : `Nothing fits a ${timeBudget}-minute window yet. Tighten durations or lower the energy filter.`,
  }
}

function scoreTask(task: Task, timeBudget: number, energy: EnergyFilter, now: Date) {
  const reasons: string[] = []
  let score = 0

  if (task.estimatedMinutes > timeBudget) {
    return {
      task,
      score: -99,
      reasons: ['Too large for the current time window.'],
    }
  }

  score += task.importance * 2.4
  score += task.urgency * 1.8

  if (task.weeklyImportant && !task.dailyUrgent) {
    score += 2.5
    reasons.push('Protects important work before trivia swallows the window.')
  }

  if (task.dailyUrgent) {
    score += 2.25
    reasons.push('Marked urgent today, so it deserves a faster lane.')
  }

  const slack = timeBudget - task.estimatedMinutes
  score += slack >= 10 ? 1.6 : slack >= 0 ? 1 : 0
  reasons.push(`Fits the ${timeBudget}-minute window without leaving you stranded.`)

  if (energy !== 'any') {
    if (task.energy === energy) {
      score += 1.5
      reasons.push(`Matches your ${energy} energy setting.`)
    } else if (energy === 'high' && task.energy === 'medium') {
      score += 0.5
    } else if (energy === 'low' && task.energy !== 'low') {
      score -= 1
    } else {
      score -= 0.35
    }
  }

  const dueInDays = daysUntil(task.dueDate, now)
  if (dueInDays !== null) {
    if (dueInDays <= 1) {
      score += 2.2
      reasons.push('Deadline pressure is close enough to matter now.')
    } else if (dueInDays <= 3) {
      score += 1.25
    } else if (dueInDays <= 7) {
      score += 0.6
    }
  }

  if (task.goalId) {
    score += 0.35
    reasons.push('This task is tied to a larger goal, so progress compounds.')
  }

  if (task.status === 'deferred') {
    score -= 0.4
    reasons.push('Recently deferred, so it stays available without forcing itself to the top.')
  }

  if (task.status === 'skipped') {
    score -= 0.8
    reasons.push('Recently skipped, so it needs a stronger case to come back first.')
  }

  return { task, score, reasons }
}
