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

module.exports = {
  ALLOWED_TILES,
  hashSeed,
  validateMapRequest,
  validateMapBlueprint,
  compileMap,
  validateCompiledLevel,
};
