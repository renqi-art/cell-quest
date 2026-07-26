import { describe, expect, it } from 'vitest'
import { parsePreviewPayload } from '@/game/services/PreviewBootstrap'
import { createCaseTemplate } from '@/shared/models/case-templates'

describe('preview bootstrap payload', () => {
  it('accepts a validated case draft and role', () => {
    const draft = createCaseTemplate('rbc-transport')
    const result = parsePreviewPayload(JSON.stringify({
      draft,
      options: { role: 'rbc', start: { type: 'full' }, timestamp: Date.now() },
    }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.draft.metadata.title).toBe('氧气运输')
  })

  it.each([
    null,
    '{bad json',
    JSON.stringify({ draft: { version: 99 }, options: { role: 'rbc' } }),
    JSON.stringify({ draft: createCaseTemplate('rbc-transport'), options: { role: 'platelet' } }),
  ])('rejects invalid or retired preview payloads', raw => {
    expect(parsePreviewPayload(raw).ok).toBe(false)
  })
})
