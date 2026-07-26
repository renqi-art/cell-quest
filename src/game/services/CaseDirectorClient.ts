import { LocalCaseDirector } from './LocalCaseDirector'
import type { DirectorContext, DirectorDecision, DirectorPlan } from '@/shared/types/director'

const PLAN_KEYS = new Set(['eventId', 'targetNode', 'severity', 'goal', 'doctorLine', 'reason'])
const GOAL_KEYS = new Set(['oxygenDeliveries', 'infectionSites', 'timeLimitSeconds'])
const EVENTS = new Set(['ACUTE_HYPOXIA', 'INFECTION_REBOUND', 'TRANSPORT_BLOCKAGE', 'ATP_CRISIS'])
const SAFE_NODE = /^[a-z][a-z0-9_-]{0,63}$/
const UNSAFE_TEXT = /<s*(script|iframe)|javascript:/i

export class CaseDirectorClient {
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number

  constructor(options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.timeoutMs = options.timeoutMs ?? 2500
  }

  async nextPlan(context: DirectorContext): Promise<DirectorDecision> {
    const fallback = (): DirectorDecision => ({ source: 'local', plan: LocalCaseDirector.nextPlan(context) })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchImpl('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
        signal: controller.signal,
      })
      if (!response.ok) return fallback()
      const payload: unknown = await response.json()
      if (!isDecisionPayload(payload) || !validatePlan(payload.plan, context)) return fallback()
      return { source: payload.source, plan: payload.plan }
    } catch {
      return fallback()
    } finally {
      clearTimeout(timer)
    }
  }
}

function exactObject(value: unknown, keys: ReadonlySet<string>): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).every(key => keys.has(key))
}
function boundedInteger(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max
}
function isDecisionPayload(value: unknown): value is { ok: true; source: 'ai' | 'local'; plan: unknown } {
  if (!exactObject(value, new Set(['ok', 'source', 'plan']))) return false
  return value.ok === true && (value.source === 'ai' || value.source === 'local') && 'plan' in value
}
function validatePlan(value: unknown, context: DirectorContext): value is DirectorPlan {
  if (!exactObject(value, PLAN_KEYS)) return false
  if (typeof value.eventId !== 'string' || !EVENTS.has(value.eventId) || !context.allowedEvents.includes(value.eventId as DirectorPlan['eventId'])) return false
  if (typeof value.targetNode !== 'string' || !SAFE_NODE.test(value.targetNode) || !context.validTargetNodes.includes(value.targetNode)) return false
  if (!boundedInteger(value.severity, 1, 3)) return false
  if (!exactObject(value.goal, GOAL_KEYS)) return false
  const goal = value.goal
  if (goal.oxygenDeliveries !== undefined && !boundedInteger(goal.oxygenDeliveries, 1, 3)) return false
  if (goal.infectionSites !== undefined && !boundedInteger(goal.infectionSites, 1, 3)) return false
  if (goal.timeLimitSeconds !== undefined && !boundedInteger(goal.timeLimitSeconds, 30, 60)) return false
  if (typeof value.doctorLine !== 'string' || value.doctorLine.length > 240 || UNSAFE_TEXT.test(value.doctorLine)) return false
  if (typeof value.reason !== 'string' || value.reason.length > 240 || UNSAFE_TEXT.test(value.reason)) return false
  return true
}
