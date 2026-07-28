const REQUEST_KEYS = new Set(['prompt', 'width', 'height']);
const BLUEPRINT_REQUIRED = new Set([
  'name', 'theme', 'cellType', 'difficulty',
  'platformDensity', 'enemyDensity', 'itemDensity', 'regions',
]);
const BLUEPRINT_OPTIONAL = new Set([
  'atmosphere', 'pathStyle', 'enemyTypes', 'itemTypes',
  'mechanicTiles', 'checkpointSpacing',
]);
const BLUEPRINT_ALL_KEYS = new Set([...BLUEPRINT_REQUIRED, ...BLUEPRINT_OPTIONAL]);
const REGION_STYLES = new Set(['open', 'steps', 'arena', 'hazards']);
const DIFFICULTIES = new Set(['easy', 'normal', 'hard']);
const ATMOSPHERES = new Set(['tense', 'exploratory', 'speedrun', 'tactical', 'default']);
const PATH_STYLES = new Set(['zigzag', 'climb', 'cave_dive', 'open_arena', 'linear']);
const MECHANIC_TILE_OPTIONS = new Set(['V', 'J', 'H', 'B', 'p', '^', '?', '*', 'S', '_']);
const ENEMY_TILE_OPTIONS = new Set(['g', 't', 'G']);
const ITEM_TILE_OPTIONS = new Set(['a', 'o', 'D', 'O', 'n', 'f', 'd', 'M']);
const ALLOWED_TILES = new Set(' #=po?FPCgGtbBS^VJHDOnfda*M_'.split(''));
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

function blueprintHasRequired(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && BLUEPRINT_REQUIRED.size <= Object.keys(value).length
    && [...BLUEPRINT_REQUIRED].every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => BLUEPRINT_ALL_KEYS.has(key));
}

function validateMapBlueprint(input) {
  if (!blueprintHasRequired(input)) return { ok: false, error: '蓝图字段无效' };
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
  // ── 可选字段（缺失时填默认值）──
  const atmosphere = Object.hasOwn(input, 'atmosphere') ? input.atmosphere : 'default';
  if (!ATMOSPHERES.has(atmosphere)) return { ok: false, error: 'atmosphere 无效' };
  const pathStyle = Object.hasOwn(input, 'pathStyle') ? input.pathStyle : 'zigzag';
  if (!PATH_STYLES.has(pathStyle)) return { ok: false, error: 'pathStyle 无效' };
  const enemyTypes = Object.hasOwn(input, 'enemyTypes') ? input.enemyTypes : (input.cellType === 1 ? ['g', 't'] : ['g', 't']);
  if (!Array.isArray(enemyTypes) || enemyTypes.length < 1 || enemyTypes.length > 3) {
    return { ok: false, error: 'enemyTypes 无效' };
  }
  if (!enemyTypes.every(e => typeof e === 'string' && ENEMY_TILE_OPTIONS.has(e))) {
    return { ok: false, error: 'enemyTypes 包含非法瓦片' };
  }
  if (input.cellType === 3 && enemyTypes.includes('G')) {
    return { ok: false, error: '红细胞关卡不能使用大型葡萄球菌 G' };
  }
  const itemTypes = Object.hasOwn(input, 'itemTypes') ? input.itemTypes : (input.cellType === 1 ? ['a', 'o', 'D'] : ['a', 'o', 'O', 'n']);
  if (!Array.isArray(itemTypes) || itemTypes.length < 1 || itemTypes.length > 4) {
    return { ok: false, error: 'itemTypes 无效' };
  }
  if (!itemTypes.every(e => typeof e === 'string' && ITEM_TILE_OPTIONS.has(e))) {
    return { ok: false, error: 'itemTypes 包含非法瓦片' };
  }
  const mechanicTiles = Object.hasOwn(input, 'mechanicTiles') ? input.mechanicTiles : [];
  if (!Array.isArray(mechanicTiles) || mechanicTiles.length > 4) {
    return { ok: false, error: 'mechanicTiles 无效' };
  }
  if (!mechanicTiles.every(e => typeof e === 'string' && MECHANIC_TILE_OPTIONS.has(e))) {
    return { ok: false, error: 'mechanicTiles 包含非法瓦片' };
  }
  const checkpointSpacing = Object.hasOwn(input, 'checkpointSpacing') ? input.checkpointSpacing : 30;
  if (!Number.isInteger(checkpointSpacing) || checkpointSpacing < 0 || checkpointSpacing > 100) {
    return { ok: false, error: 'checkpointSpacing 必须为 0-100 的整数' };
  }
  return {
    ok: true,
    value: {
      ...input,
      regions: [...input.regions],
      atmosphere,
      pathStyle,
      enemyTypes: [...enemyTypes],
      itemTypes: [...itemTypes],
      mechanicTiles: [...mechanicTiles],
      checkpointSpacing,
    },
  };
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

// ── 主题关键词→瓦片偏好（确定性映射，通过 hashSeed 偏置随机选择）──
function themeTileBias(theme) {
  const lower = (theme || '').toLowerCase();
  const bias = { enemyG: 0, itemO: 0, mechV: 0, mechB: 0, mechH: 0, mechJ: 0, mechHat: 0, mechQ: 0, mechStar: 0, mechS: 0, itemShield: 0 };
  if (/感染|炎症|败血|细菌|病菌|脓/.test(lower)) { bias.enemyG = 1; bias.mechB = 1; }
  if (/氧|肺泡|呼吸|窒息/.test(lower)) { bias.itemO = 1; bias.mechV = 1; }
  if (/血管|循环|心脏|血液|动脉/.test(lower)) { bias.mechJ = 1; bias.mechS = 1; }
  if (/骨|髓|隐藏|秘密|迷宫/.test(lower)) { bias.mechH = 1; bias.mechHat = 1; }
  if (/速|冲刺|跑酷|竞速/.test(lower)) { bias.mechV = 1; bias.mechJ = 1; }
  if (/战术|战略|堡垒|阵地/.test(lower)) { bias.itemShield = 1; bias.mechQ = 1; bias.mechS = 1; }
  if (/记忆|遗传|进化/.test(lower)) { bias.mechStar = 1; }
  return bias;
}

// ── 路径生成：根据 pathStyle 返回每列的目标行 ──
function generatePathHeights(width, height, pathStyle, seed) {
  const random = seededRandom(seed + 0x7F3A);
  const groundRow = height - 2;
  const heights = Array(width).fill(groundRow - 1);
  const safeTop = 2;
  const safeBottom = groundRow - 2;

  const waypointCount = Math.max(3, Math.floor(width / 25));
  const waypoints = [];
  waypoints.push({ col: 3, row: groundRow - 1 });

  switch (pathStyle) {
    case 'climb':
      for (let i = 1; i < waypointCount; i += 1) {
        const col = Math.floor((width / waypointCount) * i);
        const row = Math.max(safeTop, groundRow - 1 - Math.floor((i / (waypointCount - 1)) * (groundRow - 1 - safeTop)));
        waypoints.push({ col, row });
      }
      break;
    case 'cave_dive':
      for (let i = 1; i < waypointCount; i += 1) {
        const col = Math.floor((width / waypointCount) * i);
        const t = i / (waypointCount - 1);
        const depth = t < 0.5 ? t * 2 : (1 - t) * 2;
        const row = Math.min(safeBottom, groundRow - 1 - Math.floor(depth * 3) + Math.floor(random() * 4 - 2));
        waypoints.push({ col, row });
      }
      break;
    case 'open_arena':
      for (let i = 1; i < waypointCount; i += 1) {
        const col = Math.floor((width / waypointCount) * i);
        const row = groundRow - 1 - Math.floor(random() * 3);
        waypoints.push({ col, row });
      }
      break;
    case 'linear':
      for (let i = 1; i < waypointCount; i += 1) {
        const col = Math.floor((width / waypointCount) * i);
        const row = groundRow - 1 - Math.floor(random() * 2);
        waypoints.push({ col, row });
      }
      break;
    default: // zigzag
      for (let i = 1; i < waypointCount; i += 1) {
        const col = Math.floor((width / waypointCount) * i);
        const row = i % 2 === 0 ? groundRow - 1 : Math.max(safeTop, groundRow - 1 - 3 - Math.floor(random() * 3));
        waypoints.push({ col, row });
      }
      break;
  }

  waypoints.push({ col: width - 4, row: groundRow - 1 });

  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const span = to.col - from.col;
    for (let c = from.col; c <= to.col; c += 1) {
      const t = span > 0 ? (c - from.col) / span : 0;
      const smooth = (1 - Math.cos(t * Math.PI)) / 2;
      const row = Math.round(from.row + (to.row - from.row) * smooth);
      heights[c] = Math.max(safeTop, Math.min(safeBottom, row));
    }
  }

  return heights;
}

// ── Zone 配置 ──
function getZoneConfig(width, difficulty) {
  const zones = [
    { name: 'warmup', start: 0, end: Math.floor(width * 0.2) },
    { name: 'challenge', start: Math.floor(width * 0.2), end: Math.floor(width * 0.65) },
    { name: 'climax', start: Math.floor(width * 0.65), end: Math.floor(width * 0.9) },
    { name: 'finish', start: Math.floor(width * 0.9), end: width },
  ];

  const diffMultiplier = { easy: 0.6, normal: 1.0, hard: 1.4 }[difficulty] || 1.0;

  return zones.map(z => ({
    ...z,
    enemyMult: (z.name === 'warmup' ? 0.3 : z.name === 'challenge' ? 0.9 : z.name === 'climax' ? 1.3 : 0.4) * diffMultiplier,
    itemMult: (z.name === 'warmup' ? 0.6 : z.name === 'challenge' ? 0.9 : z.name === 'climax' ? 1.2 : 0.5) * diffMultiplier,
    platformWidthMin: z.name === 'warmup' ? 4 : z.name === 'challenge' ? 3 : z.name === 'climax' ? 2 : 4,
    platformWidthMax: z.name === 'warmup' ? 8 : z.name === 'challenge' ? 6 : z.name === 'climax' ? 5 : 7,
    allowG: z.name === 'challenge' || z.name === 'climax',
    allowHazards: z.name === 'challenge' || z.name === 'climax',
    allowCheckpoint: z.name !== 'warmup',
    isBossZone: z.name === 'climax',
  }));
}

// ── 地表收集（所有可行走的表面位置）──
function collectSurfaces(cells, width, groundRow) {
  const surfaces = [];
  for (let row = 1; row < groundRow; row += 1) {
    for (let col = 3; col < width - 3; col += 1) {
      if (cells[row][col] === ' ' && ['#', '=', 'S'].includes(cells[row + 1] && cells[row + 1][col])) {
        surfaces.push([row, col]);
      }
    }
  }
  return surfaces;
}

// ── 主体编译器 ──
function compileMap(blueprint, width, height, seed) {
  if (!Number.isInteger(width) || width < 20 || width > 200
    || !Number.isInteger(height) || height < 10 || height > 80) {
    throw new RangeError('Map dimensions must be within supported bounds');
  }
  const random = seededRandom(seed);
  const bias = themeTileBias(blueprint.theme);
  const cells = Array.from({ length: height }, () => Array(width).fill(' '));
  const groundRow = height - 2;

  // ── 步骤1: 基础结构 ──
  cells[groundRow].fill('#');
  cells[height - 1].fill('#');
  cells[groundRow - 1][2] = 'P';
  cells[groundRow - 1][width - 3] = 'F';

  // ── 步骤2: 生成路径高度 ──
  const pathHeights = generatePathHeights(width, height, blueprint.pathStyle || 'zigzag', seed);

  // ── 步骤3: Zone 分区 ──
  const zones = getZoneConfig(width, blueprint.difficulty);
  const atmosphere = blueprint.atmosphere || 'default';
  const atmConfig = {
    tense: { platGap: 2, platChance: 0.5, mechBoost: ['B', '^'] },
    exploratory: { platGap: 4, platChance: 0.75, mechBoost: ['H', '*'] },
    speedrun: { platGap: 2, platChance: 0.65, mechBoost: ['V', 'J'] },
    tactical: { platGap: 3, platChance: 0.7, mechBoost: ['S', '?'] },
    default: { platGap: 3, platChance: 0.6, mechBoost: [] },
  }[atmosphere] || { platGap: 3, platChance: 0.6, mechBoost: [] };

  // ── 步骤4: 平台填充 ──
  let lastPlatformCol = 3;
  for (let zoneIdx = 0; zoneIdx < zones.length; zoneIdx += 1) {
    const zone = zones[zoneIdx];
    const targetPlatformCount = Math.round(
      ((zone.end - zone.start) / 5) * blueprint.platformDensity * atmConfig.platChance,
    );
    let placedInZone = 0;
    let attempts = 0;
    while (placedInZone < targetPlatformCount && attempts < targetPlatformCount * 3) {
      attempts += 1;
      const col = zone.start + 1 + Math.floor(random() * (zone.end - zone.start - 2));
      if (Math.abs(col - lastPlatformCol) < atmConfig.platGap) continue;
      const idealRow = pathHeights[Math.min(col, width - 1)];
      const row = Math.max(2, Math.min(groundRow - 2, idealRow + Math.floor(random() * 4 - 2)));
      const span = zone.platformWidthMin + Math.floor(random() * (zone.platformWidthMax - zone.platformWidthMin + 1));
      const left = Math.max(2, col - Math.floor(span / 2));
      const right = Math.min(width - 2, left + span);
      let canPlace = true;
      for (let c = left; c < right; c += 1) {
        if (cells[row][c] !== ' ' || (cells[row - 1] && cells[row - 1][c] !== ' ')) {
          canPlace = false;
          break;
        }
      }
      if (!canPlace) continue;
      for (let c = left; c < right; c += 1) cells[row][c] = '=';
      lastPlatformCol = col;
      placedInZone += 1;
    }
  }

  // 确保起点和终点附近有平台
  for (let c = 3; c < 10; c += 1) {
    if (cells[groundRow - 1][c] === ' ') cells[groundRow - 1][c] = '=';
  }
  for (let c = width - 10; c < width - 3; c += 1) {
    if (cells[groundRow - 1][c] === ' ') cells[groundRow - 1][c] = '=';
  }

  // ── 步骤5: 实体放置 ──
  function chooseFrom(items, biasKey, biasVal) {
    if (biasVal && bias[biasKey] && items.length > 1) {
      const boosted = items[items.length - 1];
      if (random() < 0.3) return boosted;
    }
    return items[Math.floor(random() * items.length)];
  }

  function placeEntities(symbols, density, scale, avoidSpawnProtect) {
    const surfaces = collectSurfaces(cells, width, groundRow);
    const target = Math.min(surfaces.length, Math.round(width * density * scale));
    let placed = 0;
    for (let attempt = 0; attempt < target * 3 && placed < target && surfaces.length; attempt += 1) {
      const idx = Math.floor(random() * surfaces.length);
      const [row, col] = surfaces.splice(idx, 1)[0];
      if (avoidSpawnProtect && row === groundRow - 1 && col < 8) continue;
      if (avoidSpawnProtect && row === groundRow - 1 && col > width - 9) continue;
      cells[row][col] = chooseFrom(symbols);
      placed += 1;
    }
  }

  const combatEnemySymbols = blueprint.enemyTypes || ['g', 't'];
  const collectEnemySymbols = (blueprint.enemyTypes || ['g', 't']).filter(e => e !== 'G');
  const enemySymbols = blueprint.cellType === 1 ? combatEnemySymbols : collectEnemySymbols;
  const itemSymbols = blueprint.itemTypes || (blueprint.cellType === 1 ? ['a', 'o', 'D'] : ['a', 'o', 'O', 'n']);

  for (const zone of zones) {
    const zoneSurfaces = [];
    for (let row = 1; row < groundRow; row += 1) {
      for (let col = zone.start; col < zone.end; col += 1) {
        if (cells[row][col] === ' ' && ['#', '='].includes(cells[row + 1] && cells[row + 1][col])) {
          zoneSurfaces.push([row, col]);
        }
      }
    }
    const enemyTarget = Math.min(zoneSurfaces.length, Math.round((zone.end - zone.start) * blueprint.enemyDensity * zone.enemyMult * 0.08));
    let ePlaced = 0;
    for (let a = 0; a < enemyTarget * 3 && ePlaced < enemyTarget && zoneSurfaces.length; a += 1) {
      const idx = Math.floor(random() * zoneSurfaces.length);
      const [row, col] = zoneSurfaces.splice(idx, 1)[0];
      if (row === groundRow - 1 && col < 8) continue;
      if (row === groundRow - 1 && col > width - 9) continue;
      const sym = zone.allowG ? chooseFrom(enemySymbols, 'enemyG', true) : chooseFrom(enemySymbols.filter(e => e !== 'G'));
      cells[row][col] = sym;
      ePlaced += 1;
    }
    const itemTarget = Math.min(zoneSurfaces.length, Math.round((zone.end - zone.start) * blueprint.itemDensity * zone.itemMult * 0.1));
    let iPlaced = 0;
    for (let a = 0; a < itemTarget * 3 && iPlaced < itemTarget && zoneSurfaces.length; a += 1) {
      const idx = Math.floor(random() * zoneSurfaces.length);
      const [row, col] = zoneSurfaces.splice(idx, 1)[0];
      if (row === groundRow - 1 && col < 8) continue;
      if (row === groundRow - 1 && col > width - 9) continue;
      const sym = chooseFrom(itemSymbols, 'itemO', bias.itemO);
      cells[row][col] = sym;
      iPlaced += 1;
    }
  }

  // ── 步骤6: 机制瓦片 ──
  const mechChoices = blueprint.mechanicTiles || [];
  if (blueprint.regions.includes('hazards') && !mechChoices.includes('^')) mechChoices.push('^');
  if (atmConfig.mechBoost.length) {
    for (const m of atmConfig.mechBoost) {
      if (!mechChoices.includes(m)) mechChoices.push(m);
    }
  }

  const allSurfaces = collectSurfaces(cells, width, groundRow);
  for (const mech of mechChoices) {
    const count = Math.max(1, Math.floor((width / 30) * (bias['mech' + (mech === '^' ? 'Hat' : mech === '?' ? 'Q' : mech === '*' ? 'Star' : mech)] ? 2 : 1)));
    const candidates = allSurfaces.filter(([r, c]) =>
      c > 10 && c < width - 10 && r > 3 && cells[r][c] === ' ' &&
      (mech !== 'B' || r < groundRow - 1));
    shuffleInPlace(candidates, random);
    let placed = 0;
    for (const [row, col] of candidates) {
      if (placed >= count) break;
      if (cells[row][col] !== ' ') continue;
      cells[row][col] = mech;
      placed += 1;
      // 尖刺下面需要有平台支撑（视觉上尖刺在平台上方）
      if (mech === '^' && cells[row + 1][col] === ' ') cells[row + 1][col] = '=';
    }
  }

  // ── 步骤7: 存档点 ──
  const checkpointSpacing = blueprint.checkpointSpacing != null ? blueprint.checkpointSpacing : 30;
  if (checkpointSpacing > 0) {
    const cpSurface = collectSurfaces(cells, width, groundRow);
    const cpCols = [];
    for (let col = 15; col < width - 10; col += checkpointSpacing) {
      cpCols.push(col);
    }
    // Boss 前必放一个
    const bossZone = zones.find(z => z.isBossZone);
    if (bossZone) cpCols.push(bossZone.start + 2);
    for (const col of cpCols) {
      const candidates = cpSurface.filter(([r, c]) => Math.abs(c - col) < 5 && r > 3);
      if (candidates.length) {
        const [row, rcol] = candidates[Math.floor(random() * candidates.length)];
        cells[row][Math.min(width - 2, rcol)] = 'C';
      }
    }
  }

  // ── 步骤8: 组装输出 ──
  return {
    name: blueprint.name,
    cellType: blueprint.cellType,
    winCondition: blueprint.cellType === 1 ? 'killAll' : 'collectAll',
    width,
    height,
    map: cells.map(row => row.join('')),
  };
}

function shuffleInPlace(array, random) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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
  // ── 游戏背景 ──
  '你是 Cell Quest 的关卡设计师。这是一款免疫系统主题的 2D 平台跳跃游戏。',
  '玩家扮演免疫细胞（白细胞/红细胞），在人体血管和组织中战斗与收集。',
  '游戏氛围融合了生物学教育 + 科幻探索感，关卡应体现"微观人体世界"的独特美学。',
  '',
  // ── 输出格式 ──
  '只输出一个 JSON 对象，不输出 Markdown。',
  'JSON 字段：name, theme, cellType, difficulty, platformDensity, enemyDensity, itemDensity, regions（以上必填）',
  '可选字段：atmosphere, pathStyle, enemyTypes, itemTypes, mechanicTiles, checkpointSpacing',
  'cellType 只能为 1（白细胞/战斗型）或 3（红细胞/收集型）。',
  'difficulty 只能为 easy, normal, hard。',
  '三个 density 必须为 0 到 1。regions 只能从 open, steps, arena, hazards 选择，最多 8 项。',
  '不要输出地图、代码、HTML 或脚本。',
  '',
  // ── 瓦片目录 ──
  '【瓦片目录 — 你可以在 mechanicTiles / enemyTypes / itemTypes 中引用】',
  '地形：#地面(实心) =平台(可穿越) S痂皮平台 _碎裂平台(踩上会崩解)',
  '敌人：g葡萄球菌(普通) t链球菌(冲刺) G大型葡萄球菌(分裂,仅WBC关卡)',
  '机制：V弹簧(弹射) J血液泵(推流) ^尖刺(接触即死) B失血区(持续扣能量) H隐藏墙(半透明实心)',
  '道具：aATP能量 o金币 D护盾 O氧气瓶 n营养包 f食物 d饮料 M补体弹药',
  '特殊：C存档点 ?问号方块(随机掉落) *记忆细胞(永久加成,每关最多1个) p管道(定时刷怪)',
  '标记：P出生点(必须1个) F终点门(必须1个)',
  '',
  // ── 设计原则 ──
  '【关卡设计原则 — 严格遵守】',
  '1. 路径连贯——相邻平台间距不超过 4 格（玩家最大跳跃≈3.5格高），确保可达。',
  '2. 难度曲线——从易到难。出生点附近最多放 1 个弱敌(g)，大型敌人和尖刺放在后半区。',
  '3. Zone 分区——至少隐含 3 区：热身区→挑战区→高潮区。各区通过平台疏密和敌人密度区分。',
  '4. 存档点——easy 2-3个C，normal 1-2个C，hard 0-1个C（boss附近必放1个）。',
  '5. WBC(cellType=1)——以战斗为核心，敌人密度高(0.4-0.7)，多用G/t敌人，少用纯收集道具。',
  '6. RBC(cellType=3)——以收集为核心，道具密度高(0.4-0.7)，多用o/O/n/f/d，少用敌人。',
  '7. 主题驱动——platformDensity/enemyDensity/itemDensity 必须反映 theme 描述。',
  '   如"感染防线"→ enemyDensity>0.5，"缺氧区域"→ itemDensity>0.4、多O氧气瓶，"血管迷宫"→ platformDensity<0.4、多H隐藏墙。',
  '8. 瓦片多样——mechanicTiles 至少选 1 种机制瓦片，enemyTypes/itemTypes 至少各 2 种。',
  '   避免千篇一律的"地面+平台+少量敌人"模板。',
  '',
  // ── 难度映射 ──
  '【难度→参数映射】',
  'easy: platformDensity 0.5-0.7, enemyDensity 0.2-0.35, itemDensity 0.35-0.5, mechanicTiles 偏V/?/D',
  'normal: platformDensity 0.35-0.55, enemyDensity 0.35-0.5, itemDensity 0.25-0.4, mechanicTiles 偏^/S/J',
  'hard: platformDensity 0.2-0.35, enemyDensity 0.5-0.7, itemDensity 0.15-0.3, mechanicTiles 偏B/^/p',
  '',
  // ── 新字段说明 ──
  'atmosphere: tense(紧张/少平台多敌人) | exploratory(探索/多隐藏多道具) | speedrun(速通/弹簧+泵) | tactical(战术/护盾补体+?方块) | default(均衡)',
  'pathStyle: zigzag(蛇形上升,默认) | climb(持续爬升) | cave_dive(先降后升) | open_arena(宽大平台) | linear(水平前进)',
  'enemyTypes: 选择的敌人字符列表，如 ["g","t"] 或 ["g","t","G"]，最多3种。cellType=3 不带 G。',
  'itemTypes: 选择的道具字符列表，如 ["a","o","D"]，最多4种。cellType=1 偏战斗补给 D/M/a，cellType=3 偏收集品 o/O/n/f/d。',
  'mechanicTiles: 选择的机制瓦片列表，从 V/J/H/B/p/^/?/*/S 中选择，最多4种。',
  'checkpointSpacing: 存档点间距(格)，建议 easy=20-25, normal=25-35, hard=35-50。填 0 则不放置。',
  '',
  // ── 安全约束 ──
  '所有文本不包含 <script、<iframe、javascript:、eval( 等危险模式。',
  'name 最长 40 字，theme 最长 120 字。所有密度为 0-1 的有限数。',
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
            { role: 'user', content: [
              `主题：${request.prompt}`,
              `地图尺寸：${request.width}×${request.height}`,
              request.width >= 100 ? '这是一个宽阔的地图，可以利用水平空间设计多阶段路线。' : '',
              request.height >= 25 ? '纵向空间充裕，可以设计多层平台和垂直探索路线。' : '',
              '请设计一个与主题气质匹配的关卡蓝图，选择合适的 atmosphere/pathStyle 和瓦片组合。',
            ].filter(Boolean).join('\n') },
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
  BLUEPRINT_REQUIRED,
  BLUEPRINT_OPTIONAL,
  BLUEPRINT_ALL_KEYS,
  ATMOSPHERES,
  PATH_STYLES,
  MECHANIC_TILE_OPTIONS,
  ENEMY_TILE_OPTIONS,
  ITEM_TILE_OPTIONS,
  hashSeed,
  validateMapRequest,
  validateMapBlueprint,
  compileMap,
  validateCompiledLevel,
  requestMapBlueprint,
  handleGenerateMapRequest,
};
