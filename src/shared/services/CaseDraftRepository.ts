import type { CaseDraft } from '@/shared/models/case-draft'
import { parseCaseDraft } from '@/shared/services/CaseSchema'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'

const DRAFTS_PREFIX = 'cellQuest_caseDrafts_v1_slot_'
const RECOVERY_KEY = 'cellQuest_caseDraftRecovery_v1'
const LEGACY_CUSTOM_LEVELS = 'cellQuest_customLevels'

export class CaseDraftRepository {
  constructor(private readonly storage: StorageAdapter) {}

  private slotKey(slot: number): string {
    return `${DRAFTS_PREFIX}${slot}`
  }

  list(slot: number): CaseDraft[] {
    const raw = this.storage.get(this.slotKey(slot))
    if (!raw) return []
    try {
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) return []
      return arr.map(item => parseCaseDraft(item)).filter(r => r.ok).map(r => (r as { ok: true; value: CaseDraft }).value)
    } catch {
      return []
    }
  }

  load(slot: number, id: string): CaseDraft | null {
    return this.list(slot).find(d => d.id === id) ?? null
  }

  saveNamedDraft(slot: number, draft: CaseDraft): void {
    const current = this.list(slot)
    const index = current.findIndex(d => d.id === draft.id)
    if (index >= 0) {
      current[index] = draft
    } else {
      current.push(draft)
    }
    this.writeCollection(slot, current)
  }

  delete(slot: number, id: string): void {
    const current = this.list(slot).filter(d => d.id !== id)
    this.writeCollection(slot, current)
  }

  migrateLegacySlot(slot: number): void {
    const raw = this.storage.get(LEGACY_CUSTOM_LEVELS)
    if (!raw) return

    try {
      const legacyLevels: Array<{ name: string; map: string[]; width: number; height: number }> = JSON.parse(raw)
      if (!Array.isArray(legacyLevels)) return

      const existing = new Set(this.list(slot).map(d => d.id))

      for (const level of legacyLevels) {
        const legacyId = `legacy-${level.name}`
        if (existing.has(legacyId)) continue
        existing.add(legacyId)

        const draft: CaseDraft = {
          version: 1,
          mode: 'classic',
          id: legacyId,
          revision: 1,
          metadata: { title: level.name, author: 'legacy', difficulty: 'standard', tags: [], icon: '🗺️' },
          map: level.map,
          nodes: [],
          caseConfig: null,
          editorMeta: { source: 'import', updatedAt: new Date().toISOString() },
        }
        this.saveNamedDraft(slot, draft)
      }
    } catch {
      // corrupted legacy data — skip
    }
  }

  private writeCollection(slot: number, drafts: CaseDraft[]): void {
    const serialized = JSON.stringify(drafts)
    this.storage.set(RECOVERY_KEY, serialized)
    this.storage.set(this.slotKey(slot), serialized)
    // verify write
    const readback = this.storage.get(this.slotKey(slot))
    if (readback === serialized) {
      this.storage.remove(RECOVERY_KEY)
    }
  }
}
