import { parseNoteRequestSchema, parseNoteResultSchema } from '@/domain/contracts'

export async function requestParse(rawNote: string) {
  const payload = parseNoteRequestSchema.parse({ rawNote })
  const response = await fetch('/api/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof body.error === 'string' ? body.error : 'The parser failed and did not explain why.',
    )
  }

  return parseNoteResultSchema.parse(body)
}
