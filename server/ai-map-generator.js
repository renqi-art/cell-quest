const REQUEST_KEYS = new Set(['prompt', 'width', 'height']);
const BLUEPRINT_KEYS = new Set([
  'name', 'theme', 'cellType', 'difficulty',
  'platformDensity', 'enemyDensity', 'itemDensity', 'regions',
]);
const REGION_STYLES = new Set(['open', 'steps', 'arena', 'hazards']);
const DIFFICULTIES = new Set(['easy', 'normal', 'hard']);
const ALLOWED_TILES = new Set(' #=po?FPCgGtbBS^VJHDOnfda*M'.split(''));
const UNSAFE_TEXT = /<\s*(script|iframe)|javascript:|\beval\s*\(|\bfunction\s*\(/i;

function exactObject(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.size
    && Object.keys(value).every(key => keys.has(key));
}

function validateMapRequest(input) {
  if (!exactObject(input, REQUEST_KEYS)) return { ok: false, error: '请求字段无效' };
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (prompt.length < 1 || prompt.length > 1000) return { ok: false, error: '提示词长度必须为 1–1000' };
  if (!Number.isInteger(input.width) || input.width < 20 || input.width > 200) return { ok: false, error: '宽度必须为 20–200 的整数' };
  if (!Number.isInteger(input.height) || input.height < 10 || input.height > 80) return { ok: false, error: '高度必须为 10–80 的整数' };
  return { ok: true, value: { prompt, width: input.width, height: input.height } };
}

function boundedText(value, minimum, maximum) {
  return typeof value === 'string'
    && value.length >= minimum
    && value.length <= maximum
    && !UNSAFE_TEXT.test(value);
}

function boundedDensity(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateMapBlueprint(input) {
  if (!exactObject(input, BLUEPRINT_KEYS)) return { ok: false, error: '蓝图字段无效' };
  if (!boundedText(input.name, 1, 40)) return { ok: false, error: '关卡名称无效' };
  if (!boundedText(input.theme, 1, 120)) return { ok: false, error: '关卡主题无效' };
  if (![1, 3].includes(input.cellType)) return { ok: false, error: '细胞类型无效' };
  if (!DIFFICULTIES.has(input.difficulty)) return { ok: false, error: '难度无效' };
  for (const key of ['platformDensity', 'enemyDensity', 'itemDensity']) {
    if (!boundedDensity(input[key])) return { ok: false, error: `${key} 无效` };
  }
  if (!Array.isArray(input.regions) || input.regions.length < 1 || input.regions.length > 8) {
    return { ok: false, error: '区域数量无效' };
  }
  if (new Set(input.regions).size !== input.regions.length) return { ok: false, error: '区域不能重复' };
  if (!input.regions.every(region => typeof region === 'string' && region.length <= 80 && REGION_STYLES.has(region))) {
    return { ok: false, error: '区域风格无效' };
  }
  return { ok: true, value: { ...input, regions: [...input.regions] } };
}

function hashSeed(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function compileMap(blueprint, width, height, seed) {
  if (!Number.isInteger(width) || width < 20 || width > 200
    || !Number.isInteger(height) || height < 10 || height > 80) {
    throw new RangeError('Map dimensions must be within supported bounds');
  }
  const random = seededRandom(seed);
  const cells = Array.from({ length: height }, () => Array(width).fill(' '));
  const groundRow = height - 2;
  cells[groundRow].fill('#');
  cells[height - 1].fill('#');
  cells[groundRow - 1][2] = 'P';
  cells[groundRow - 1][width - 3] = 'F';

  const platformCount = Math.max(1, Math.round((width / 10) * blueprint.platformDensity));
  for (let index = 0; index < platformCount; index += 1) {
    const span = 3 + Math.floor(random() * 5);
    const left = 4 + Math.floor(random() * Math.max(1, width - span - 8));
    const lift = 3 + (index % Math.max(1, Math.min(4, height - 6)));
    const row = Math.max(2, groundRow - lift);
    for (let col = left; col < Math.min(width - 2, left + span); col += 1) cells[row][col] = '=';
  }

  const surfaces = [];
  for (let row = 1; row < groundRow; row += 1) {
    for (let col = 3; col < width - 3; col += 1) {
      if (cells[row][col] === ' ' && ['#', '='].includes(cells[row + 1][col])) {
        surfaces.push([row, col]);
      }
    }
  }

  function place(symbols, density, scale) {
    const target = Math.min(surfaces.length, Math.round(width * density * scale));
    for (let placed = 0; placed < target && surfaces.length; placed += 1) {
      const candidateIndex = Math.floor(random() * surfaces.length);
      const [row, col] = surfaces.splice(candidateIndex, 1)[0];
      if ((row === groundRow - 1 && col < 6) || (row === groundRow - 1 && col > width - 7)) {
        placed -= 1;
        continue;
      }
      cells[row][col] = symbols[Math.floor(random() * symbols.length)];
    }
  }

  place(blueprint.cellType === 1 ? ['g', 't', 'G'] : ['g', 't'], blueprint.enemyDensity, 0.08);
  place(blueprint.cellType === 1 ? ['a', 'o', 'D'] : ['a', 'o', 'O', 'n'], blueprint.itemDensity, 0.1);
  if (blueprint.regions.includes('hazards')) place(['^'], blueprint.platformDensity, 0.03);

  return {
    name: blueprint.name,
    cellType: blueprint.cellType,
    winCondition: blueprint.cellType === 1 ? 'killAll' : 'collectAll',
    width,
    height,
    map: cells.map(row => row.join('')),
  };
}

function validateCompiledLevel(level) {
  if (!level || typeof level !== 'object') return { ok: false, error: '地图对象无效' };
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height)) return { ok: false, error: '地图尺寸无效' };
  if (level.width < 20 || level.width > 200 || level.height < 10 || level.height > 80) {
    return { ok: false, error: 'Map dimensions out of bounds' };
  }
  if (!Array.isArray(level.map) || level.map.length !== level.height) return { ok: false, error: '地图高度无效' };
  if (!level.map.every(row => typeof row === 'string' && row.length === level.width)) {
    return { ok: false, error: '地图宽度无效' };
  }
  const joined = level.map.join('');
  if ([...joined].some(tile => !ALLOWED_TILES.has(tile))) return { ok: false, error: '地图包含非法瓷砖' };
  if ((joined.match(/P/g) || []).length !== 1) return { ok: false, error: '地图必须有一个出生点' };
  if ((joined.match(/F/g) || []).length !== 1) return { ok: false, error: '地图必须有一个终点' };
  const ground = '#'.repeat(level.width);
  if (level.map[level.height - 2] !== ground || level.map[level.height - 1] !== ground) {
    return { ok: false, error: '地图基础地面无效' };
  }
  return { ok: true, value: level };
}

const SYSTEM_PROMPT = [
  '你是 Cell Quest 经典2D平台关卡设计师。',
  '只输出一个 JSON 对象，不输出 Markdown。',
  '字段必须且只能是 name, theme, cellType, difficulty, platformDensity, enemyDensity, itemDensity, regions。',
  'cellType 只能为 1 或 3；difficulty 只能为 easy, normal, hard。',
  '三个 density 必须为 0 到 1；regions 只能从 open, steps, arena, hazards 选择，最多 8 项。',
  '不要输出地图、代码、HTML或脚本。',
].join('\n');

class AiMapError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function requestMapBlueprint(request, { apiKey, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetchImpl(
      process.env.CELL_QUEST_AI_BASE_URL || 'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.CELL_QUEST_AI_MODEL || 'deepseek-chat',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `主题：${request.prompt}\n目标尺寸：${request.width}×${request.height}` },
          ],
        }),
        signal: controller.signal,
      },
    );
    if (response.status === 401 || response.status === 403) {
      throw new AiMapError('AI_AUTH_FAILED', 'API Key 无效或无权限', 401);
    }
    if (response.status === 429) {
      throw new AiMapError('AI_RATE_LIMITED', 'AI 服务请求过于频繁，请稍后重试', 429);
    }
    if (!response.ok) {
      throw new AiMapError('AI_UPSTREAM_ERROR', 'AI 服务暂时不可用', 502);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new AiMapError('AI_INVALID_RESPONSE', 'AI 返回格式无效', 502);
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 65536) {
      throw new AiMapError('AI_INVALID_RESPONSE', 'AI 返回内容无效或过大', 502);
    }
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AiMapError('AI_INVALID_RESPONSE', 'AI 返回的蓝图不是有效 JSON', 502);
    }
    const validated = validateMapBlueprint(parsed);
    if (!validated.ok) throw new AiMapError('AI_INVALID_RESPONSE', validated.error, 502);
    return validated.value;
  } catch (error) {
    if (error instanceof AiMapError) throw error;
    if (controller.signal.aborted) throw new AiMapError('AI_TIMEOUT', 'AI 生成超时，请重试', 504);
    throw new AiMapError('AI_UPSTREAM_ERROR', '无法连接 AI 服务', 502);
  } finally {
    clearTimeout(timer);
  }
}

async function readGenerateBody(req) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    throw new AiMapError('INVALID_REQUEST', 'Content-Type 必须为 application/json', 415);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > 16384) throw new AiMapError('INVALID_REQUEST', '请求体过大', 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AiMapError('INVALID_REQUEST', '请求 JSON 无效', 400);
  }
}

async function handleGenerateMapRequest(req, res, sendJson, options = {}) {
  const getApiKey = options.getApiKey || require('./ai-runtime-config').getAiApiKey;
  try {
    const validated = validateMapRequest(await readGenerateBody(req));
    if (!validated.ok) throw new AiMapError('INVALID_REQUEST', validated.error, 400);
    const apiKey = getApiKey();
    if (!apiKey) throw new AiMapError('AI_NOT_CONFIGURED', '请先配置 AI API Key', 409);
    const blueprint = await requestMapBlueprint(validated.value, {
      apiKey,
      fetchImpl: options.fetchImpl || fetch,
    });
    const level = compileMap(
      blueprint,
      validated.value.width,
      validated.value.height,
      hashSeed(validated.value.prompt + JSON.stringify(blueprint)),
    );
    const finalLevel = validateCompiledLevel(level);
    if (!finalLevel.ok) throw new AiMapError('AI_INVALID_RESPONSE', finalLevel.error, 502);
    return sendJson(res, 200, {
      ok: true,
      source: 'ai',
      level: finalLevel.value,
      blueprint: { theme: blueprint.theme, difficulty: blueprint.difficulty },
    });
  } catch (error) {
    const failure = error instanceof AiMapError
      ? error
      : new AiMapError('AI_UPSTREAM_ERROR', 'AI 地图生成失败', 502);
    return sendJson(res, failure.status, { ok: false, code: failure.code, error: failure.message });
  }
}

module.exports = {
  ALLOWED_TILES,
  hashSeed,
  validateMapRequest,
  validateMapBlueprint,
  compileMap,
  validateCompiledLevel,
  requestMapBlueprint,
  handleGenerateMapRequest,
};
