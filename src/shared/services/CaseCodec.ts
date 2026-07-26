import type { CaseDraft } from '@/shared/models/case-draft'
import type { CaseConfig, CaseNode } from '@/shared/types/case'

/** 公开的病例载荷，CQ2! 分享格式 */
export interface PublishedCase {
  readonly v: 2
  readonly id: string
  readonly revision: number
  readonly name: string
  readonly author: string
  readonly difficulty: 'assist' | 'standard' | 'challenge'
  readonly tags: readonly string[]
  readonly icon: string
  readonly map: readonly string[]
  readonly nodes: readonly CaseNode[]
  readonly caseConfig: CaseConfig
}

export interface EncodeResult {
  readonly ok: true
  readonly code: string
}

export interface EncodeError {
  readonly ok: false
  readonly error: string
}

export type CaseEncodeResult = EncodeResult | EncodeError

export interface DecodeSuccess {
  readonly ok: true
  readonly value: PublishedCase
}

export interface DecodeError {
  readonly ok: false
  readonly error: string
}

export type CaseDecodeResult = DecodeSuccess | DecodeError

const MAX_DECODED_BYTES = 128 * 1024 // 128 KiB
const CQ2_PREFIX = 'CQ2!'
const CQ1_PREFIX = 'CQ!'

const KNOWN_PUBLISHED_KEYS = new Set([
  'v', 'id', 'revision', 'name', 'author', 'difficulty', 'tags', 'icon', 'map', 'nodes', 'caseConfig',
])

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromBase64Url(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) base64 += '='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function validatePublishedCase(input: unknown): PublishedCase {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object')
  }

  const obj = input as Record<string, unknown>

  // Check for unknown top-level keys
  const extraKeys = Object.keys(obj).filter(k => !KNOWN_PUBLISHED_KEYS.has(k))
  if (extraKeys.length > 0) {
    throw new Error(`Unknown top-level keys: ${extraKeys.join(', ')}`)
  }

  if (obj.v !== 2) throw new Error('Unsupported version, expected v: 2')

  if (typeof obj.id !== 'string' || obj.id.length === 0) throw new Error('Missing or invalid id')
  if (typeof obj.revision !== 'number' || obj.revision < 1) throw new Error('Invalid revision')
  if (typeof obj.name !== 'string') throw new Error('Missing name')
  if (typeof obj.author !== 'string') throw new Error('Missing author')

  const validDifficulties = ['assist', 'standard', 'challenge']
  if (typeof obj.difficulty !== 'string' || !validDifficulties.includes(obj.difficulty)) {
    throw new Error(`Invalid difficulty: ${obj.difficulty}`)
  }

  if (!Array.isArray(obj.tags)) throw new Error('tags must be an array')
  for (const tag of obj.tags) {
    if (typeof tag !== 'string') throw new Error('Each tag must be a string')
  }

  if (typeof obj.icon !== 'string') throw new Error('Missing icon')

  // Validate map
  if (!Array.isArray(obj.map)) throw new Error('map must be an array')
  if (obj.map.length === 0) throw new Error('map must not be empty')
  if (obj.map.length > 30) throw new Error('map exceeds maximum height')
  const mapWidth = (obj.map[0] as string).length
  if (mapWidth > 200) throw new Error('map exceeds maximum width')
  for (const row of obj.map) {
    if (typeof row !== 'string') throw new Error('Each map row must be a string')
    if (row.length !== mapWidth) throw new Error('Map rows are not uniform width')
  }

  // Validate nodes
  if (!Array.isArray(obj.nodes)) throw new Error('nodes must be an array')
  const nodeIds = new Set<string>()
  for (const node of obj.nodes as CaseNode[]) {
    if (typeof node.id !== 'string') throw new Error('Each node must have a string id')
    if (nodeIds.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}`)
    nodeIds.add(node.id)
  }

  // Validate caseConfig exists
  if (!obj.caseConfig || typeof obj.caseConfig !== 'object') {
    throw new Error('Missing caseConfig')
  }

  // Check for executable strings (JSON.parse would have caught these, but be safe)
  const json = JSON.stringify(obj)
  if (/function\s*\(|eval\s*\(|<script/i.test(json)) {
    throw new Error('Payload contains potentially unsafe content')
  }

  return obj as unknown as PublishedCase
}

/** 从 CaseDraft 生成 CQ2! 分享码 */
export function encodeCaseCode(draft: CaseDraft): CaseEncodeResult {
  try {
    if (!draft.caseConfig) {
      return { ok: false, error: 'Draft has no caseConfig' }
    }

    const published: PublishedCase = {
      v: 2,
      id: draft.id,
      revision: draft.revision,
      name: draft.metadata.title || '未命名病例',
      author: draft.metadata.author || '匿名',
      difficulty: draft.metadata.difficulty,
      tags: draft.metadata.tags,
      icon: draft.metadata.icon,
      map: draft.map,
      nodes: draft.nodes,
      caseConfig: draft.caseConfig,
    }

    const json = JSON.stringify(published)
    if (json.length > MAX_DECODED_BYTES) {
      return { ok: false, error: `Payload exceeds ${MAX_DECODED_BYTES / 1024} KiB limit` }
    }

    const bytes = new TextEncoder().encode(json)
    const code = CQ2_PREFIX + toBase64Url(bytes)
    return { ok: true, code }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown encoding error' }
  }
}

/** 解码 CQ2! 分享码 */
export function decodeCaseCode(input: string): CaseDecodeResult {
  try {
    if (!input.startsWith(CQ2_PREFIX)) {
      return { ok: false, error: 'Not a CQ2! code' }
    }

    const base64url = input.slice(CQ2_PREFIX.length)
    if (base64url.length === 0) {
      return { ok: false, error: 'Empty payload' }
    }

    let bytes: Uint8Array
    try {
      bytes = fromBase64Url(base64url)
    } catch {
      return { ok: false, error: 'Invalid Base64 encoding' }
    }

    if (bytes.length > MAX_DECODED_BYTES) {
      return { ok: false, error: `Payload exceeds ${MAX_DECODED_BYTES / 1024} KiB limit` }
    }

    let json: unknown
    try {
      const text = new TextDecoder().decode(bytes)
      json = JSON.parse(text)
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' }
    }

    const validated = validatePublishedCase(json)
    return { ok: true, value: validated }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown decoding error' }
  }
}

/** 解码旧 CQ! 分享码（兼容导入，转为经典预览） */
export function decodeLegacyCQCode(input: string): { ok: false; error: string } | { ok: true; value: Record<string, unknown> } {
  try {
    if (!input.startsWith(CQ1_PREFIX)) {
      return { ok: false, error: 'Not a CQ! code' }
    }

    const base64url = input.slice(CQ1_PREFIX.length)
    const bytes = fromBase64Url(base64url)
    const text = new TextDecoder().decode(bytes)
    const json = JSON.parse(text)

    if (typeof json !== 'object' || json === null) {
      return { ok: false, error: 'CQ! payload is not an object' }
    }

    return { ok: true, value: json as Record<string, unknown> }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid CQ! code' }
  }
}
