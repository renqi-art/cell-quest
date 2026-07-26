import type { EditorNodeKind } from '@/editor/stores/case-editor'

export type EditorTool = 'select' | 'paint' | 'erase' | `node:${EditorNodeKind}`

export function nodeKindFromTool(tool: EditorTool): EditorNodeKind | null {
  if (!tool.startsWith('node:')) return null
  return tool.slice('node:'.length) as EditorNodeKind
}

export function isNodeTool(tool: EditorTool): boolean {
  return nodeKindFromTool(tool) !== null
}
