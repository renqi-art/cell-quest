import type { CaseNode, CaseConfig, CaseDraft } from '@/shared/models/case-draft'
import type { CaseMetadata } from '@/shared/types/case'

export interface CellChange {
  readonly x: number
  readonly y: number
  readonly tile: string
}

export type CaseCommand =
  | { readonly type: 'paint-cells'; readonly cells: readonly CellChange[] }
  | { readonly type: 'add-node'; readonly node: CaseNode }
  | { readonly type: 'move-node'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly type: 'remove-node'; readonly id: string }
  | { readonly type: 'replace-config'; readonly config: CaseConfig }
  | { readonly type: 'replace-metadata'; readonly metadata: CaseMetadata }
  | { readonly type: 'replace-draft'; readonly draft: CaseDraft; readonly reason: 'import' | 'ai-patch' | 'template' }

export class CaseCommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaseCommandError'
  }
}

export function applyCaseCommand(draft: CaseDraft, command: CaseCommand): CaseDraft {
  switch (command.type) {
    case 'paint-cells': {
      const mapArr = draft.map.map(row => row)
      for (const cell of command.cells) {
        if (cell.y < 0 || cell.y >= mapArr.length) continue
        const row = mapArr[cell.y]!
        if (cell.x < 0 || cell.x > row.length) continue
        const tile = cell.tile.length === 1 ? cell.tile : cell.tile[0]!
        mapArr[cell.y] = row.slice(0, cell.x) + tile + row.slice(cell.x + 1)
      }
      return { ...draft, map: mapArr, revision: draft.revision + 1, editorMeta: { ...draft.editorMeta, updatedAt: new Date().toISOString() } }
    }

    case 'add-node': {
      if (draft.nodes.some(n => n.id === command.node.id)) {
        throw new CaseCommandError(`Node ${command.node.id} already exists`)
      }
      return { ...draft, nodes: [...draft.nodes, command.node], revision: draft.revision + 1, editorMeta: { ...draft.editorMeta, updatedAt: new Date().toISOString() } }
    }

    case 'move-node': {
      const nodeIndex = draft.nodes.findIndex(n => n.id === command.id)
      if (nodeIndex === -1) throw new CaseCommandError(`Node ${command.id} not found`)
      const updatedNode = { ...draft.nodes[nodeIndex]!, x: command.x, y: command.y }
      const newNodes = [...draft.nodes]
      newNodes[nodeIndex] = updatedNode
      return { ...draft, nodes: newNodes, revision: draft.revision + 1, editorMeta: { ...draft.editorMeta, updatedAt: new Date().toISOString() } }
    }

    case 'remove-node': {
      if (!draft.nodes.some(n => n.id === command.id)) throw new CaseCommandError(`Node ${command.id} not found`)
      return { ...draft, nodes: draft.nodes.filter(n => n.id !== command.id), revision: draft.revision + 1, editorMeta: { ...draft.editorMeta, updatedAt: new Date().toISOString() } }
    }

    case 'replace-config': {
      return { ...draft, caseConfig: command.config, revision: draft.revision + 1, editorMeta: { ...draft.editorMeta, updatedAt: new Date().toISOString() } }
    }

    case 'replace-metadata': {
      return { ...draft, metadata: command.metadata, revision: draft.revision + 1, editorMeta: { ...draft.editorMeta, updatedAt: new Date().toISOString() } }
    }

    case 'replace-draft': {
      return { ...command.draft, revision: draft.revision + 1, editorMeta: { ...command.draft.editorMeta, updatedAt: new Date().toISOString() } }
    }

    default:
      throw new CaseCommandError(`Unknown command: ${(command as { type: string }).type}`)
  }
}
