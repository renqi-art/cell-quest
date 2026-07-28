const MAX_API_KEY_LENGTH = 4096;
let runtimeApiKey = '';

function environmentApiKey() {
  return String(process.env.CELL_QUEST_AI_API_KEY || '').trim();
}

function getAiApiKey() {
  return runtimeApiKey || environmentApiKey();
}

function getAiConfigStatus() {
  if (runtimeApiKey) return { configured: true, source: 'runtime' };
  if (environmentApiKey()) return { configured: true, source: 'environment' };
  return { configured: false, source: 'none' };
}

function setRuntimeAiApiKey(value) {
  if (typeof value !== 'string') throw new TypeError('API key must be a string');
  const normalized = value.trim();
  if (normalized.length > MAX_API_KEY_LENGTH) {
    throw new RangeError('API key must not exceed 4096 characters');
  }
  runtimeApiKey = normalized;
  return getAiConfigStatus();
}

function clearRuntimeAiApiKey() {
  runtimeApiKey = '';
  return getAiConfigStatus();
}

async function readConfigBody(req) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    const error = new Error('Content-Type must be application/json');
    error.status = 415;
    throw error;
  }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body, 'utf8') > 8192) {
      const error = new Error('Request body is too large');
      error.status = 413;
      throw error;
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Invalid JSON body');
    error.status = 400;
    throw error;
  }
}

function handleGetAiConfig(res, sendJson) {
  sendJson(res, 200, getAiConfigStatus());
}

async function handleSetAiConfig(req, res, sendJson) {
  try {
    const body = await readConfigBody(req);
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'apiKey')) {
      return sendJson(res, 400, { ok: false, code: 'INVALID_CONFIG', error: '请求只允许 apiKey 字段' });
    }
    const status = body.apiKey === '' ? clearRuntimeAiApiKey() : setRuntimeAiApiKey(body.apiKey);
    return sendJson(res, 200, { ok: true, ...status });
  } catch (error) {
    return sendJson(res, error.status || 400, {
      ok: false,
      code: 'INVALID_CONFIG',
      error: error.message,
    });
  }
}

module.exports = {
  MAX_API_KEY_LENGTH,
  getAiApiKey,
  getAiConfigStatus,
  setRuntimeAiApiKey,
  clearRuntimeAiApiKey,
  handleGetAiConfig,
  handleSetAiConfig,
};
