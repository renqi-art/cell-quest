import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CaseDraft } from '@/shared/models/case-draft'
import { createCaseDraft } from '@/shared/services/CaseSchema'
import { CaseDraftRepository } from '@/shared/services/CaseDraftRepository'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'

function createInMemoryAdapter(): StorageAdapter {
  const store = new Map<string, string>()
  return {
    get(key: string): string | null {
      return store.get(key) ?? null
    },
    set(key: string, value: string): void {
      store.set(key, value)
    },
    remove(key: string): void {
      store.delete(key)
    },
  }
}

describe('CaseDraftRepository', () => {
  let adapter: ReturnType<typeof createInMemoryAdapter>
  let repo: CaseDraftRepository

  beforeEach(() => {
    adapter = createInMemoryAdapter()
    repo = new CaseDraftRepository(adapter)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves and loads a draft per slot', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    repo.saveNamedDraft(2, draft)

    const loaded = repo.load(2, draft.id)
    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe(draft.id)
  })

  it('isolates drafts by slot', () => {
    const draft1 = createCaseDraft({ primaryCell: 'rbc' })
    repo.saveNamedDraft(1, draft1)

    expect(repo.list(2)).toEqual([])
    expect(repo.list(1)[0]?.id).toBe(draft1.id)
  })

  it('lists all drafts in a slot', () => {
    const draft1 = createCaseDraft({ primaryCell: 'rbc' })
    const draft2 = createCaseDraft({ primaryCell: 'wbc' })
    repo.saveNamedDraft(1, draft1)
    repo.saveNamedDraft(1, draft2)

    const list = repo.list(1)
    expect(list.length).toBe(2)
  })

  it('deletes a draft', () => {
    const draft = createCaseDraft({ primaryCell: 'rbc' })
    repo.saveNamedDraft(1, draft)
    repo.delete(1, draft.id)

    expect(repo.load(1, draft.id)).toBeNull()
  })

  it('migrates legacy custom levels without loss', () => {
    const legacyJson = JSON.stringify([{ name: 'Test', map: ['   ', ' # '], width: 3, height: 2 }])
    adapter.set('cellQuest_customLevels', legacyJson)

    repo.migrateLegacySlot(1)

    const list = repo.list(1)
    expect(list.length).toBeGreaterThanOrEqual(1)
  })

  it('idempotent migration does not duplicate', () => {
    adapter.set('cellQuest_customLevels', JSON.stringify([{ name: 'Test', map: ['   ', ' # '], width: 3, height: 2 }]))
    repo.migrateLegacySlot(1)
    repo.migrateLegacySlot(1)

    const list = repo.list(1)
    expect(list.length).toBe(1)
  })

  it('handles corrupted JSON gracefully', () => {
    adapter.set('cellQuest_caseDrafts_v1_slot_1', 'not valid json')
    const list = repo.list(1)
    expect(list).toEqual([])
  })

  it('merges slot-specific and global legacy levels then removes migrated keys', () => {
    adapter.set('cellQuest_customLevels_0', JSON.stringify([{ name: 'current level', map: ['###'] }]))
    adapter.set('cellQuest_customLevels', JSON.stringify([{ name: 'legacy level', map: ['   '] }]))

    repo.migrateLegacySlot(0)

    expect(repo.list(0).map(item => item.metadata.title)).toEqual(['current level', 'legacy level'])
    expect(adapter.get('cellQuest_customLevels_0')).toBeNull()
    expect(adapter.get('cellQuest_customLevels')).toBeNull()
  })

})
