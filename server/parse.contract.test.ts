// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { parseRawNote } from './parse'

describe('parseRawNote', () => {
  it('produces a stable structured draft for mixed life input', async () => {
    const result = await parseRawNote(
      '下个月妈妈生日，要准备一下。每周保持锻炼。学 React。周末做一顿新菜。',
    )

    expect(result.version).toBe(1)
    expect(result.goals.length).toBeGreaterThanOrEqual(3)
    expect(result.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: expect.stringMatching(/生日|birthday/i) }),
        expect.objectContaining({ recurrenceRule: 'weekly' }),
        expect.objectContaining({ energy: 'high' }),
      ]),
    )
  })
})
