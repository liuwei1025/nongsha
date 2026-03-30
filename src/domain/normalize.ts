export function nowIso() {
  return new Date().toISOString()
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeSourceKey(input: string) {
  return input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[，,。.!?;；:："'“”‘’]/g, '')
    .slice(0, 120)
}

export function stripJsonFences(input: string) {
  return input.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
}

export function daysUntil(dateString: string | null | undefined, now = new Date()) {
  if (!dateString) {
    return null
  }
  const dueDate = new Date(dateString)
  if (Number.isNaN(dueDate.valueOf())) {
    return null
  }
  const diff = dueDate.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
