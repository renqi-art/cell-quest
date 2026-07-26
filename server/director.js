// === AI Case Director — server-side contract, validation & local fallback ===

const EVENT_IDS = new Set([
  'ACUTE_HYPOXIA',
  'INFECTION_REBOUND',
  'TRANSPORT_BLOCKAGE',
  'ATP_CRISIS',
]);

const PLAN_KEYS = ['eventId', 'targetNode', 'severity', 'goal', 'doctorLine', 'reason'];
const GOAL_KEYS = ['oxygenDeliveries', 'infectionSites', 'timeLimitSeconds'];
const VALID_NODE_RE = /^[a-z]+_\d+$/;

function isBoundedInt(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isBoundedNumber(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

// ---- Request Validation ----

function validateDirectorRequest(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Input must be an object' };
  if (input.schemaVersion !== 1) return { ok: false, error: 'Unsupported schemaVersion' };
  if (!['single', 'coop'].includes(input.mode)) return { ok: false, error: 'Invalid mode' };
  if (!['rbc', 'wbc'].includes(input.primaryCell)) return { ok: false, error: 'Invalid primaryCell' };
  if (![1, 2].includes(input.phase)) return { ok: false, error: 'Invalid phase' };
  if (!Array.isArray(input.allowedEvents) || input.allowedEvents.length === 0) {
    return { ok: false, error: 'allowedEvents is required' };
  }
  if (input.allowedEvents.some(id => !EVENT_IDS.has(id))) return { ok: false, error: 'Unknown event in allowedEvents' };
  if (!Array.isArray(input.validTargetNodes) || input.validTargetNodes.length === 0) {
    return { ok: false, error: 'validTargetNodes is required' };
  }
  if (input.validTargetNodes.some(id => typeof id !== 'string' || !VALID_NODE_RE.test(id))) {
    return { ok: false, error: 'Invalid target node in validTargetNodes' };
  }
  if (input.vitals && typeof input.vitals === 'object') {
    for (const value of Object.values(input.vitals)) {
      if (typeof value !== 'number' || !isBoundedNumber(value, 0, 100)) {
        return { ok: false, error: 'Invalid vital value' };
      }
    }
  }
  return { ok: true, value: structuredClone(input) };
}

// ---- Plan Validation ----

function validateDirectorPlan(plan, request) {
  if (!plan || typeof plan !== 'object') return { ok: false, error: 'Plan must be an object' };

  // Check no extra keys
  const planKeys = Object.keys(plan);
  const extraKeys = planKeys.filter(k => !PLAN_KEYS.includes(k));
  if (extraKeys.length > 0) return { ok: false, error: `Unknown plan keys: ${extraKeys.join(', ')}` };

  // Validate eventId
  if (typeof plan.eventId !== 'string' || !EVENT_IDS.has(plan.eventId)) {
    return { ok: false, error: 'Invalid eventId' };
  }
  if (!request.allowedEvents.includes(plan.eventId)) {
    return { ok: false, error: 'Event not in allowedEvents' };
  }

  // Validate targetNode
  if (typeof plan.targetNode !== 'string' || !VALID_NODE_RE.test(plan.targetNode)) {
    return { ok: false, error: 'Invalid targetNode format' };
  }
  if (!request.validTargetNodes.includes(plan.targetNode)) {
    return { ok: false, error: 'targetNode not in validTargetNodes' };
  }

  // Validate severity
  if (!isBoundedInt(plan.severity, 1, 3)) {
    return { ok: false, error: 'severity must be 1-3' };
  }

  // Validate goal
  if (!plan.goal || typeof plan.goal !== 'object') {
    return { ok: false, error: 'goal is required' };
  }
  const goalKeys = Object.keys(plan.goal);
  const extraGoalKeys = goalKeys.filter(k => !GOAL_KEYS.includes(k));
  if (extraGoalKeys.length > 0) return { ok: false, error: `Unknown goal keys: ${extraGoalKeys.join(', ')}` };

  if (plan.goal.timeLimitSeconds !== undefined &&
      !isBoundedInt(plan.goal.timeLimitSeconds, 30, 60)) {
    return { ok: false, error: 'timeLimitSeconds must be 30-60' };
  }
  if (plan.goal.oxygenDeliveries !== undefined &&
      !isBoundedInt(plan.goal.oxygenDeliveries, 1, 3)) {
    return { ok: false, error: 'oxygenDeliveries must be 1-3' };
  }
  if (plan.goal.infectionSites !== undefined &&
      !isBoundedInt(plan.goal.infectionSites, 1, 3)) {
    return { ok: false, error: 'infectionSites must be 1-3' };
  }

  // Validate doctorLine — no HTML/scripts
  if (typeof plan.doctorLine === 'string') {
    if (/<script|<iframe|javascript:/i.test(plan.doctorLine)) {
      return { ok: false, error: 'doctorLine contains unsafe content' };
    }
  }

  return { ok: true, value: plan };
}

// ---- Local Fallback ----

function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const PRESET_DOCTOR_LINES = {
  ACUTE_HYPOXIA: '血氧骤降！立即增加氧气输送。',
  INFECTION_REBOUND: '感染反弹！病原体已进化。',
  TRANSPORT_BLOCKAGE: '运输通道堵塞！寻找替代路线。',
  ATP_CRISIS: '能量危机！技能消耗增加。',
};

const PRESET_REASONS = {
  ACUTE_HYPOXIA: '组织氧需求急剧上升',
  INFECTION_REBOUND: '抗生素耐药性出现',
  TRANSPORT_BLOCKAGE: '血管痉挛导致通道狭窄',
  ATP_CRISIS: '线粒体功能障碍',
};

function buildPresetPlan(eventId, targetNode, severity, request) {
  const goal = {};
  switch (eventId) {
    case 'ACUTE_HYPOXIA':
      goal.oxygenDeliveries = 1 + (severity > 1 ? 1 : 0);
      goal.timeLimitSeconds = 45 - (severity - 1) * 5;
      break;
    case 'INFECTION_REBOUND':
      goal.infectionSites = severity;
      goal.timeLimitSeconds = 50 - (severity - 1) * 5;
      break;
    case 'TRANSPORT_BLOCKAGE':
      goal.oxygenDeliveries = severity > 1 ? 2 : 1;
      goal.timeLimitSeconds = 40 - (severity - 1) * 5;
      break;
    case 'ATP_CRISIS':
      goal.oxygenDeliveries = severity;
      goal.timeLimitSeconds = 40;
      break;
  }

  return {
    eventId,
    targetNode,
    severity,
    goal,
    doctorLine: PRESET_DOCTOR_LINES[eventId] || '',
    reason: PRESET_REASONS[eventId] || '',
  };
}

function createLocalPlan(request) {
  const seed = hashSeed(`${request.levelId || 'level'}:${request.phase}:${request.runId || 'offline'}`);
  const eventIdx = seed % request.allowedEvents.length;
  const eventId = request.allowedEvents[eventIdx];
  const targetIdx = (seed >>> 4) % request.validTargetNodes.length;
  const targetNode = request.validTargetNodes[targetIdx];
  const severity = 1 + ((seed >>> 8) % 3);
  return buildPresetPlan(eventId, targetNode, severity, request);
}

// ---- AI Model Call ----

function buildDirectorMessages(request) {
  return [
    {
      role: 'system',
      content: [
        'You are the Cell Quest patient crisis director.',
        'Return exactly one JSON object and no markdown.',
        'Output only: {"eventId":"...","targetNode":"...","severity":1-3,"goal":{"oxygenDeliveries":1-3,"infectionSites":1-3,"timeLimitSeconds":30-60},"doctorLine":"...","reason":"..."}',
        `Allowed events: ${request.allowedEvents.join(', ')}`,
        `Allowed target nodes: ${request.validTargetNodes.join(', ')}`,
        'severity must be 1, 2, or 3.',
        'timeLimitSeconds must be 30 through 60.',
        'oxygenDeliveries and infectionSites must be 1 through 3.',
        'Do not return HTML, code, or extra keys.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        phase: request.phase,
        mode: request.mode,
        primaryCell: request.primaryCell,
        vitals: request.vitals || {},
        performance: request.performance || {},
        levelId: request.levelId,
      }),
    },
  ];
}

async function requestAiPlan(request, fetchImpl) {
  const actualFetch = fetchImpl || fetch;
  const apiKey = process.env.CELL_QUEST_AI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.CELL_QUEST_AI_BASE_URL || 'https://api.deepseek.com/v1/chat/completions';
  const model = process.env.CELL_QUEST_AI_MODEL || 'deepseek-chat';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await actualFetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: buildDirectorMessages(request),
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Combined handler ----

async function handleDirectorRequest(req, res, sendJsonFn, fetchImpl) {
  // Read body
  let body = '';
  req.setEncoding('utf8');
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 65536) {
      return sendJsonFn(res, 413, { ok: false, error: 'Payload too large' });
    }
  }

  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return sendJsonFn(res, 400, { ok: false, error: 'Invalid JSON' });
  }

  const validated = validateDirectorRequest(input);
  if (!validated.ok) {
    return sendJsonFn(res, 400, { ok: false, error: validated.error });
  }

  const request = validated.value;

  // Try AI first
  let plan = null;
  let source = 'local';
  try {
    const aiPlan = await requestAiPlan(request, fetchImpl);
    if (aiPlan) {
      const planValidated = validateDirectorPlan(aiPlan, request);
      if (planValidated.ok) {
        plan = planValidated.value;
        source = 'ai';
      }
    }
  } catch {
    // fall through to local
  }

  if (!plan) {
    plan = createLocalPlan(request);
  }

  return sendJsonFn(res, 200, { ok: true, source, plan });
}

// Export for testing
module.exports = {
  EVENT_IDS,
  PLAN_KEYS,
  GOAL_KEYS,
  VALID_NODE_RE,
  validateDirectorRequest,
  validateDirectorPlan,
  createLocalPlan,
  buildPresetPlan,
  buildDirectorMessages,
  requestAiPlan,
  handleDirectorRequest,
  hashSeed,
};
