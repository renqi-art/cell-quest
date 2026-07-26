import type { CrisisEventId, DirectorContext, DirectorPlan } from '@/shared/types/director'

const DOCTOR_LINES: Record<CrisisEventId, string> = {
  ACUTE_HYPOXIA: '血氧骤降，请立即增加氧气运输。',
  INFECTION_REBOUND: '感染反弹，新的感染灶已经活跃。',
  TRANSPORT_BLOCKAGE: '运输通道受阻，请优先恢复目标路径。',
  ATP_CRISIS: '能量供应紧张，请提高行动效率。',
}
const REASONS: Record<CrisisEventId, string> = {
  ACUTE_HYPOXIA: '组织耗氧量上升',
  INFECTION_REBOUND: '免疫控制不足导致病原体反弹',
  TRANSPORT_BLOCKAGE: '局部通道收缩影响运输',
  ATP_CRISIS: '细胞能量储备下降',
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function buildGoal(eventId: CrisisEventId, severity: 1 | 2 | 3) {
  switch (eventId) {
    case 'ACUTE_HYPOXIA': return { oxygenDeliveries: severity > 1 ? 2 : 1, timeLimitSeconds: 45 - (severity - 1) * 5 }
    case 'INFECTION_REBOUND': return { infectionSites: severity, timeLimitSeconds: 50 - (severity - 1) * 5 }
    case 'TRANSPORT_BLOCKAGE': return { oxygenDeliveries: severity > 1 ? 2 : 1, timeLimitSeconds: 40 - (severity - 1) * 5 }
    case 'ATP_CRISIS': return { oxygenDeliveries: severity, timeLimitSeconds: 40 }
  }
}

export class LocalCaseDirector {
  static nextPlan(context: DirectorContext): DirectorPlan {
    const seed = hashSeed(context.levelId + ':' + context.phase + ':' + context.runId)
    const eventId = context.allowedEvents[seed % context.allowedEvents.length]
    const targetNode = context.validTargetNodes[(seed >>> 4) % context.validTargetNodes.length]
    if (!eventId || !targetNode) throw new Error('Director context requires events and target nodes')
    const severity = (1 + ((seed >>> 8) % 3)) as 1 | 2 | 3
    return {
      eventId,
      targetNode,
      severity,
      goal: buildGoal(eventId, severity),
      doctorLine: DOCTOR_LINES[eventId],
      reason: REASONS[eventId],
    }
  }
}
