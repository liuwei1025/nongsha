import {
  parseNoteResultSchema,
  type ParseGoalDraft,
  type ParseNoteResult,
  type ParseTaskDraft,
} from '../src/domain/contracts.ts'
import { clamp, normalizeSourceKey, stripJsonFences } from '../src/domain/normalize.ts'

const PARSER_VERSION = 1

type ProviderConfig = {
  apiKey: string
  baseUrl: string
  model: string
}

type ParsedPayload = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>
    }
  }>
}

const categoryBlueprints = [
  {
    category: 'Rhythm',
    goalTitle: 'Protect important dates and rituals',
    energy: 'low' as const,
    importance: 5,
    urgency: 3,
    estimatedMinutes: 15,
    context: 'calendar',
    keywords: ['生日', '纪念日', 'anniversary', 'birthday'],
  },
  {
    category: 'Health',
    goalTitle: 'Keep health moving forward',
    energy: 'high' as const,
    importance: 5,
    urgency: 2,
    estimatedMinutes: 45,
    context: 'body',
    keywords: ['健身', '锻炼', '运动', '瘦身', '减脂', '跑步', 'exercise', 'workout', 'fitness'],
  },
  {
    category: 'Learning',
    goalTitle: 'Keep the long-term learning engine warm',
    energy: 'high' as const,
    importance: 4,
    urgency: 2,
    estimatedMinutes: 30,
    context: 'computer',
    keywords: ['学习', 'read', 'course', 'react', 'learn', 'study', '练习'],
  },
  {
    category: 'Kitchen',
    goalTitle: 'Make home logistics feel lighter',
    energy: 'medium' as const,
    importance: 3,
    urgency: 3,
    estimatedMinutes: 25,
    context: 'home',
    keywords: ['做饭', '菜', '买菜', 'cook', 'meal', 'grocery', 'kitchen'],
  },
  {
    category: 'Errands',
    goalTitle: 'Close open loops before they sprawl',
    energy: 'low' as const,
    importance: 3,
    urgency: 3,
    estimatedMinutes: 20,
    context: 'errand',
    keywords: ['clean', 'tax', '账单', '家务', '买', 'pay', 'prep', '整理', '清理'],
  },
]

export async function parseRawNote(rawNote: string): Promise<ParseNoteResult> {
  const cleaned = rawNote.trim()
  if (!cleaned) {
    return parseNoteResultSchema.parse({
      version: PARSER_VERSION,
      summary: 'Start with one messy note so the app can shape it into goals and tasks.',
      goals: [],
      tasks: [],
    })
  }

  const remote = await maybeRemoteParse(cleaned)
  return parseNoteResultSchema.parse(remote ?? heuristicParse(cleaned))
}

async function maybeRemoteParse(rawNote: string): Promise<ParseNoteResult | null> {
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_REMOTE_PARSE === 'true') {
    return null
  }

  const provider = getProviderConfig()
  if (!provider) {
    return null
  }

  const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content:
            'You are a life-planning parser. Convert messy personal notes into JSON only. Return {version, summary, goals, tasks}. Each goal: {sourceKey,title,description,category}. Each task: {sourceKey,goalSourceKey,title,notes,importance,urgency,estimatedMinutes,energy,context,dueDate,recurrenceRule,weeklyImportant,dailyUrgent}. importance and urgency are 1-5.',
        },
        {
          role: 'user',
          content: rawNote,
        },
      ],
    }),
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as ParsedPayload
  const content = payload.choices?.[0]?.message?.content
  const text =
    typeof content === 'string'
      ? content
      : content
          ?.map((entry) => entry.text ?? '')
          .filter(Boolean)
          .join('\n') ?? ''

  if (!text) {
    return null
  }

  const parsed = JSON.parse(stripJsonFences(text))
  return parseNoteResultSchema.parse({
    ...parsed,
    version: PARSER_VERSION,
  })
}

function getProviderConfig(): ProviderConfig | null {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_BASE_URL && process.env.OPENAI_MODEL) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL,
    }
  }

  if (process.env.ARK_API_KEY && process.env.ARK_BASE_URL && process.env.ARK_MODEL) {
    return {
      apiKey: process.env.ARK_API_KEY,
      baseUrl: process.env.ARK_BASE_URL,
      model: process.env.ARK_MODEL,
    }
  }

  return null
}

function heuristicParse(rawNote: string): ParseNoteResult {
  const chunks = rawNote
    .split(/[\n,，;；。.!?]+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 1)
    .slice(0, 20)

  const goals = new Map<string, ParseGoalDraft>()
  const tasks: ParseTaskDraft[] = []

  for (const chunk of chunks) {
    const blueprint = pickBlueprint(chunk)
    const goal = ensureGoal(goals, blueprint)
    tasks.push(buildTaskDraft(chunk, goal.sourceKey, blueprint))
  }

  return {
    version: PARSER_VERSION,
    summary:
      chunks.length > 1
        ? `Captured ${chunks.length} loose thoughts and converted them into a tighter pool of goals and actions.`
        : 'One note, one clearer path. This draft turns the note into a small set of ready actions.',
    goals: [...goals.values()],
    tasks,
  }
}

function pickBlueprint(chunk: string) {
  const lowered = chunk.toLowerCase()
  return (
    categoryBlueprints.find((candidate) =>
      candidate.keywords.some((keyword) => lowered.includes(keyword.toLowerCase())),
    ) ?? {
      category: 'General',
      goalTitle: 'Turn loose intentions into ready actions',
      energy: 'medium' as const,
      importance: 3,
      urgency: 2,
      estimatedMinutes: 20,
      context: 'anywhere',
      keywords: [],
    }
  )
}

function ensureGoal(goals: Map<string, ParseGoalDraft>, blueprint: ReturnType<typeof pickBlueprint>) {
  const sourceKey = normalizeSourceKey(blueprint.goalTitle)
  const existing = goals.get(sourceKey)
  if (existing) {
    return existing
  }

  const goal: ParseGoalDraft = {
    sourceKey,
    title: blueprint.goalTitle,
    description: `Tasks in ${blueprint.category.toLowerCase()} should be easy to act on during fuzzy time.`,
    category: blueprint.category,
  }
  goals.set(sourceKey, goal)
  return goal
}

function buildTaskDraft(
  chunk: string,
  goalSourceKey: string,
  blueprint: ReturnType<typeof pickBlueprint>,
): ParseTaskDraft {
  const normalizedChunk = chunk.replace(/^想|^需要/u, '').trim()
  const dueDate = inferDueDate(chunk)
  const recurrenceRule = inferRecurrence(chunk, blueprint.category)
  const estimatedMinutes = inferEstimatedMinutes(chunk, blueprint.estimatedMinutes)
  const importance = inferImportance(chunk, blueprint.importance)
  const urgency = inferUrgency(chunk, blueprint.urgency)

  return {
    sourceKey: normalizeSourceKey(chunk),
    goalSourceKey,
    title: normalizedChunk.charAt(0).toUpperCase() + normalizedChunk.slice(1),
    notes: `Captured from: ${chunk}`,
    importance,
    urgency,
    estimatedMinutes,
    energy: blueprint.energy,
    context: blueprint.context,
    dueDate,
    recurrenceRule,
    weeklyImportant: importance >= 4 || blueprint.category === 'Learning' || blueprint.category === 'Health',
    dailyUrgent: urgency >= 4,
  }
}

function inferEstimatedMinutes(chunk: string, fallback: number) {
  const lowered = chunk.toLowerCase()
  if (lowered.includes('workout') || lowered.includes('跑步') || lowered.includes('锻炼')) {
    return 45
  }
  if (lowered.includes('cook') || lowered.includes('做饭') || lowered.includes('meal')) {
    return 30
  }
  if (lowered.includes('buy') || lowered.includes('买') || lowered.includes('call')) {
    return 10
  }
  if (lowered.includes('review') || lowered.includes('计划') || lowered.includes('整理')) {
    return 15
  }
  return fallback
}

function inferImportance(chunk: string, fallback: number) {
  const lowered = chunk.toLowerCase()
  const bonus =
    lowered.includes('纪念日') ||
    lowered.includes('birthday') ||
    lowered.includes('学习') ||
    lowered.includes('健身') ||
    lowered.includes('长期')
      ? 1
      : 0
  return clamp(fallback + bonus, 1, 5)
}

function inferUrgency(chunk: string, fallback: number) {
  const lowered = chunk.toLowerCase()
  const bonus =
    lowered.includes('today') ||
    lowered.includes('今天') ||
    lowered.includes('马上') ||
    lowered.includes('tomorrow') ||
    lowered.includes('下周')
      ? 2
      : lowered.includes('soon') || lowered.includes('next month') || lowered.includes('下个月')
        ? 1
        : 0
  return clamp(fallback + bonus, 1, 5)
}

function inferDueDate(chunk: string) {
  const now = new Date()
  if (/今天|today/i.test(chunk)) {
    return now.toISOString().slice(0, 10)
  }
  if (/明天|tomorrow/i.test(chunk)) {
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  }
  if (/下周|next week/i.test(chunk)) {
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)
    return nextWeek.toISOString().slice(0, 10)
  }
  if (/下个月|next month/i.test(chunk)) {
    const nextMonth = new Date(now)
    nextMonth.setMonth(now.getMonth() + 1)
    return nextMonth.toISOString().slice(0, 10)
  }
  return null
}

function inferRecurrence(chunk: string, category: string) {
  if (/每天|daily/i.test(chunk)) {
    return 'daily'
  }
  if (/每周|weekly/i.test(chunk) || category === 'Health') {
    return 'weekly'
  }
  if (/每月|monthly/i.test(chunk) || category === 'Rhythm') {
    return 'monthly'
  }
  return null
}
