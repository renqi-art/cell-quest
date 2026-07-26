// === AI Case Generator — server-side blueprint generation ===

const EVENT_IDS = new Set([
  'ACUTE_HYPOXIA',
  'INFECTION_REBOUND',
  'TRANSPORT_BLOCKAGE',
  'ATP_CRISIS',
]);

function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// ---- Case Blueprint type (shared with client) ----

/**
 * @typedef {Object} CaseBlueprint
 * @property {string} title
 * @property {'rbc'|'wbc'|'coop'} primaryCell
 * @property {'assist'|'standard'|'challenge'} difficulty
 * @property {string[]} tags
 * @property {string} icon
 * @property {string} description
 * @property {{oxygen:number, infection:number, tissue:number}} vitals
 * @property {number} oxygenDecayPerSecond
 * @property {number} infectionGrowthPerSecond
 * @property {number} tissueDecayPerSecond
 * @property {{oxygenRoutes:number, infectionSites:number}} nodeCounts
 * @property {string[]} allowedEvents
 * @property {string} educationalTopic
 * @property {number} stabilitySeconds
 */

const DIFFICULTIES = ['assist', 'standard', 'challenge'];
const CELLS = ['rbc', 'wbc', 'coop'];

const PRESET_TEMPLATES = [
  {
    title: '肺炎球菌感染',
    primaryCell: 'wbc',
    difficulty: 'standard',
    tags: ['呼吸', '细菌', '免疫'],
    icon: '🫁',
    description: '肺炎链球菌入侵肺泡，白细胞需要清除感染灶并维持组织健康。',
    vitals: { oxygen: 70, infection: 35, tissue: 75 },
    oxygenDecayPerSecond: 2,
    infectionGrowthPerSecond: 2,
    tissueDecayPerSecond: 0.5,
    nodeCounts: { oxygenRoutes: 1, infectionSites: 2 },
    allowedEvents: ['INFECTION_REBOUND', 'ACUTE_HYPOXIA'],
    educationalTopic: '肺炎',
    stabilitySeconds: 5,
  },
  {
    title: '缺氧急救',
    primaryCell: 'rbc',
    difficulty: 'assist',
    tags: ['呼吸', '循环', '急救'],
    icon: '🩸',
    description: '组织严重缺氧，红细胞必须快速运输氧气到目标组织。',
    vitals: { oxygen: 50, infection: 10, tissue: 60 },
    oxygenDecayPerSecond: 3,
    infectionGrowthPerSecond: 1,
    tissueDecayPerSecond: 0.8,
    nodeCounts: { oxygenRoutes: 2, infectionSites: 0 },
    allowedEvents: ['ACUTE_HYPOXIA', 'TRANSPORT_BLOCKAGE'],
    educationalTopic: '缺氧',
    stabilitySeconds: 5,
  },
  {
    title: '败血症危象',
    primaryCell: 'coop',
    difficulty: 'challenge',
    tags: ['重症', '细菌', '炎症'],
    icon: '🦠',
    description: '全身性感染引发败血症，需要RBC供氧和WBC清除的双重配合。',
    vitals: { oxygen: 65, infection: 45, tissue: 55 },
    oxygenDecayPerSecond: 3,
    infectionGrowthPerSecond: 3,
    tissueDecayPerSecond: 0.7,
    nodeCounts: { oxygenRoutes: 2, infectionSites: 3 },
    allowedEvents: ['ACUTE_HYPOXIA', 'INFECTION_REBOUND', 'ATP_CRISIS'],
    educationalTopic: '败血症',
    stabilitySeconds: 7,
  },
  {
    title: '伤口愈合',
    primaryCell: 'rbc',
    difficulty: 'assist',
    tags: ['创伤', '修复', '凝血'],
    icon: '🩹',
    description: '表皮擦伤后，红细胞输送氧气支持组织修复，白细胞巡逻防止感染。',
    vitals: { oxygen: 80, infection: 15, tissue: 65 },
    oxygenDecayPerSecond: 1.5,
    infectionGrowthPerSecond: 1.5,
    tissueDecayPerSecond: 0.3,
    nodeCounts: { oxygenRoutes: 1, infectionSites: 1 },
    allowedEvents: ['INFECTION_REBOUND'],
    educationalTopic: '创伤',
    stabilitySeconds: 4,
  },
];

function validateBlueprint(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Not an object' };

  if (typeof input.title !== 'string' || input.title.length === 0) return { ok: false, error: 'Invalid title' };
  if (!CELLS.includes(input.primaryCell)) return { ok: false, error: 'Invalid primaryCell' };
  if (!DIFFICULTIES.includes(input.difficulty)) return { ok: false, error: 'Invalid difficulty' };
  if (!Array.isArray(input.tags)) return { ok: false, error: 'tags must be an array' };
  for (const tag of input.tags) {
    if (typeof tag !== 'string') return { ok: false, error: 'Each tag must be a string' };
  }
  if (typeof input.icon !== 'string') return { ok: false, error: 'Missing icon' };
  if (typeof input.description !== 'string') return { ok: false, error: 'Missing description' };

  const v = input.vitals;
  if (!v || typeof v !== 'object') return { ok: false, error: 'Missing vitals' };
  for (const key of ['oxygen', 'infection', 'tissue']) {
    if (typeof v[key] !== 'number' || v[key] < 0 || v[key] > 100) return { ok: false, error: `Invalid vital: ${key}` };
  }

  for (const key of ['oxygenDecayPerSecond', 'infectionGrowthPerSecond', 'tissueDecayPerSecond']) {
    if (typeof input[key] !== 'number' || input[key] <= 0) return { ok: false, error: `Invalid rate: ${key}` };
  }

  if (!Array.isArray(input.allowedEvents)) return { ok: false, error: 'allowedEvents must be an array' };
  if (input.allowedEvents.some(e => !EVENT_IDS.has(e))) return { ok: false, error: 'Unknown event' };

  // Check for dangerous content
  if (/<script|<iframe|javascript:/i.test(input.title + input.description + input.icon)) {
    return { ok: false, error: 'Unsafe content' };
  }

  return { ok: true, value: input };
}

function createLocalBlueprint(seed) {
  const idx = seed % PRESET_TEMPLATES.length;
  return { ...PRESET_TEMPLATES[idx] };
}

// ---- API handler ----

async function handleGenerateCaseRequest(req, res, sendJsonFn, fetchImpl) {
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

  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const seed = hashSeed(prompt || 'default');

  // Try AI if key is available
  const apiKey = process.env.CELL_QUEST_AI_API_KEY;
  if (apiKey && prompt) {
    try {
      const baseUrl = process.env.CELL_QUEST_AI_BASE_URL || 'https://api.deepseek.com/v1/chat/completions';
      const model = process.env.CELL_QUEST_AI_MODEL || 'deepseek-chat';
      const actualFetch = fetchImpl || fetch;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await actualFetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.6,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: [
                  'You generate Cell Quest patient case blueprints.',
                  'Output exactly one JSON with: title, primaryCell(rbc|wbc|coop), difficulty(assist|standard|challenge), tags[string array], icon(single emoji), description, vitals{oxygen(0-100),infection(0-100),tissue(0-100)}, oxygenDecayPerSecond(0.5-5), infectionGrowthPerSecond(0.5-5), tissueDecayPerSecond(0.1-2), nodeCounts{oxygenRoutes(0-3),infectionSites(0-3)}, allowedEvents(from ACUTE_HYPOXIA,INFECTION_REBOUND,TRANSPORT_BLOCKAGE,ATP_CRISIS), educationalTopic, stabilitySeconds(3-10).',
                  'Make the case educationally relevant to Chinese university immunology courses.',
                  'Respond in Chinese.',
                ].join('\n'),
              },
              { role: 'user', content: prompt },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          const payload = await response.json();
          const content = payload.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const validated = validateBlueprint(parsed);
            if (validated.ok) {
              return sendJsonFn(res, 200, { ok: true, source: 'ai', blueprint: validated.value });
            }
          }
        }
      } catch {
        // Timeout or fetch error, fall through to local
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // fall through to local
    }
  }

  // Local fallback
  const blueprint = createLocalBlueprint(seed);
  return sendJsonFn(res, 200, { ok: true, source: 'local', blueprint });
}

module.exports = {
  handleGenerateCaseRequest,
  createLocalBlueprint,
  validateBlueprint,
  PRESET_TEMPLATES,
  hashSeed,
};
