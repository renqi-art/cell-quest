/* ====================================================================
 * ai-levels.js — v3: AI 关卡生成器 + 模板系统
 * ==================================================================== */

// ===== 关卡模板 =====
const LEVEL_TEMPLATES = {
  // 模板1：战斗型（WBC关卡）
  combat: {
    name: '战斗训练场',
    icon: '⚔️',
    desc: 'AI生成的战斗型关卡，适合白细胞作战',
    cellType: 1,
    winCondition: WIN_KILL_ALL,
    sky: ['#2a1020', '#5a1a3a'],
    width: 100,
    height: 15,
    // 地形模式
    terrainPattern: [
      '###########################################                         ',
      '#                                         #######################',
      '#                                                             #',
      '#    ====        ========        =====        ========        #',
      '#                                                             #',
      '#        ====            ======        =====          =====   #',
      '#                                                             #',
      '#  ====        ========        ======        ========         #',
      '#                                                             #',
      '#      ====            =====        ======          =====     #',
      '#                                                             #',
      '#  ========      ========      ========      ========         #',
      '#                                                             #',
      '######################################################F#########',
    ],
    floatPlatforms: [],
    miniSpawnArea: null,
    pipeSpawners: [],
    knowledgeCards: [],
    tutorials: [],
  },

  // 模板2：收集型（RBC关卡）
  collect: {
    name: '氧气收集区',
    icon: '🔴',
    desc: 'AI生成的收集型关卡，适合红细胞探索',
    cellType: 3,
    winCondition: WIN_COLLECT_ALL,
    sky: ['#1a2a3a', '#4a6a8a'],
    width: 100,
    height: 15,
    terrainPattern: [
      '###############################################################',
      '#                                                             #',
      '#    ========      ========      ========      ========       #',
      '#                                                             #',
      '#               ========      ========      ========          #',
      '#                                                             #',
      '#    ========      ========      ========      ========       #',
      '#                                                             #',
      '#  ========      ========      ========      ========   F     #',
      '#                                                             #',
      '#    ========      ========      ========      ========       #',
      '#                                                             #',
      '#  ======    H       ======    H     ======    H    ======    #',
      '#                                                             #',
      '##############################################F################',
    ],
    floatPlatforms: [
      {x:40*TILE, y:6*TILE, range:48, speed:0.03, phase:0},
      {x:60*TILE, y:5*TILE, range:40, speed:0.04, phase:Math.PI},
    ],
    miniSpawnArea: null,
    pipeSpawners: [],
    knowledgeCards: [],
    tutorials: [],
  },

  // 模板3：平台跳跃型
  platform: {
    name: '弹簧跳跃',
    icon: '🦘',
    desc: 'AI生成的平台跳跃型关卡，考验操作技巧',
    cellType: 1,
    winCondition: WIN_KILL_ALL,
    sky: ['#1a1a2a', '#3a3a5a'],
    width: 100,
    height: 15,
    terrainPattern: [
      '###############################################################',
      '#                                                             #',
      '#         V                     V              V              #',
      '#    ========      ========      ======      ======          #',
      '#                                                             #',
      '#   V               V               V              V          #',
      '#        ======          ======          ==========           #',
      '#                                                             #',
      '#     V               V               V              V        #',
      '#            ======          ======          ======           #',
      '#                                                             #',
      '#   ^^^^^^               ^^^^^^              ^^^^^^           #',
      '#                                                             #',
      '##############################################F################',
    ],
    floatPlatforms: [],
    miniSpawnArea: null,
    pipeSpawners: [],
    knowledgeCards: [],
    tutorials: [],
  },

  // 模板4：陷阱型（碎裂平台+尖刺）
  trap: {
    name: '碎裂陷阱',
    icon: '💀',
    desc: 'AI生成的陷阱型关卡，充满碎裂平台和尖刺',
    cellType: 1,
    winCondition: WIN_KILL_ALL,
    sky: ['#2a0a0a', '#6a0a0a'],
    width: 100,
    height: 15,
    terrainPattern: [
      '###############################################################',
      '#                                                             #',
      '#    _________        _________         _________             #',
      '#         ^^              ^^               ^^                 #',
      '#  ========      ^^^^^^^^      ========      ========        #',
      '#                            ^^                              #',
      '#      _________        _________         _________          #',
      '#           ^^              ^^               ^^               #',
      '#    ======      ======      ======      ======              #',
      '#                                                             #',
      '#  _________        _________         _________              #',
      '#       ^^              ^^               ^^                   #',
      '#                                                             #',
      '##############################################F################',
    ],
    floatPlatforms: [],
    miniSpawnArea: null,
    pipeSpawners: [],
    knowledgeCards: [],
    tutorials: [],
  },

  // 模板5：混合型（全机制融合）
  mixed: {
    name: '综合战场',
    icon: '🌟',
    desc: 'AI生成的综合型关卡，包含所有机制',
    cellType: 1,
    winCondition: WIN_KILL_ALL,
    sky: ['#1a1a2a', '#4a2a4a'],
    width: 100,
    height: 15,
    terrainPattern: [
      '###############################################################',
      '#                                                             #',
      '#    ====     V     _________          ======     V           #',
      '#                       ^^                                   #',
      '#       ======    ?     ======     _________       ======    #',
      '#                                 ^^                         #',
      '#  ========      ======      H      ======      ======      #',
      '#                                                             #',
      '#      _________       ======      ======       _________    #',
      '#           ^^                                      ^^        #',
      '#    ======      V     ======      ======     V    ======    #',
      '#                                                             #',
      '############################################F##################',
    ],
    floatPlatforms: [
      {x:35*TILE, y:6*TILE, range:40, speed:0.035, phase:0},
      {x:65*TILE, y:5*TILE, range:50, speed:0.03, phase:Math.PI/2},
    ],
    miniSpawnArea: {colStart:50, colEnd:70},
    pipeSpawners: [
      {col:35, row:13, type:'staph', trigger:'timer', interval:420, cooldown:420},
      {col:55, row:13, type:'strep', trigger:'proximity', range:5, cooldown:300},
    ],
    knowledgeCards: [],
    tutorials: [],
  },
};

// ===== AI 关卡生成器 =====
const AILevelGenerator = {
  // 基于模板 + AI参数 生成关卡
  generate(templateName, params){
    const template = LEVEL_TEMPLATES[templateName];
    if(!template) return null;

    const p = params || {};
    const seed = p.seed || Date.now();
    this._rng = this._seededRandom(seed);

    // 1. 从模板复制地形
    const map = template.terrainPattern.map(row => row.slice(0, template.width).padEnd(template.width, ' '));

    // 2. AI 放置敌人
    const enemyCount = Math.floor(this._rng() * 8 + 6); // 6-13个
    const enemyTypes = ['staph', 'staph', 'staph', 'strep', 'strep', p.cellType===1?'G':null].filter(Boolean);
    for(let i = 0; i < enemyCount; i++){
      const type = enemyTypes[Math.floor(this._rng() * enemyTypes.length)];
      const ch = type === 'staph' ? 'g' : type === 'strep' ? 't' : 'G';
      this._placeOnPlatform(map, ch, template.width, template.height);
    }

    // 3. AI 放置收集物
    const collectCount = Math.floor(this._rng() * 8 + 5); // 5-12个
    const collectTypes = p.cellType === 3 ? ['o','o','o','f','d','n'] : ['o','f','d'];
    for(let i = 0; i < collectCount; i++){
      const ch = collectTypes[Math.floor(this._rng() * collectTypes.length)];
      this._placeOnPlatform(map, ch, template.width, template.height);
    }

    // 4. AI 放置道具
    const itemCount = Math.floor(this._rng() * 4 + 2); // 2-5个
    const itemTypes = ['D','O','M'];
    for(let i = 0; i < itemCount; i++){
      const ch = itemTypes[Math.floor(this._rng() * itemTypes.length)];
      this._placeOnPlatform(map, ch, template.width, template.height);
    }

    // 5. AI 放置ATP
    const atpCount = Math.floor(this._rng() * 6 + 4); // 4-9个
    for(let i = 0; i < atpCount; i++){
      this._placeOnPlatform(map, 'a', template.width, template.height);
    }

    // 6. AI 放置?方块
    const qBlockCount = Math.floor(this._rng() * 3 + 1); // 1-3个
    for(let i = 0; i < qBlockCount; i++){
      this._placeOnPlatform(map, '?', template.width, template.height);
    }

    // 7. 确保出生点在开始位置
    const spawnRow = template.height - 3;
    const spawnCol = 3;
    if(map[spawnRow] && map[spawnRow][spawnCol] === ' '){
      map[spawnRow] = map[spawnRow].substring(0, spawnCol) + 'P' + map[spawnRow].substring(spawnCol + 1);
    }

    // 8. 构建完整关卡数据
    return {
      name: p.name || template.name,
      icon: p.icon || template.icon,
      desc: p.desc || template.desc,
      cellType: p.cellType || template.cellType,
      winCondition: p.winCondition || template.winCondition,
      sky: p.sky || template.sky,
      map: map,
      width: template.width,
      floatPlatforms: template.floatPlatforms || [],
      miniSpawnArea: template.miniSpawnArea || null,
      pipeSpawners: template.pipeSpawners || [],
      knowledgeCards: template.knowledgeCards || [],
      tutorials: template.tutorials || [],
    };
  },

  // 种子随机数生成器
  _seededRandom(seed){
    let s = seed;
    return function(){
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  },
  _rng: Math.random,

  // 在平台上方随机放置实体
  _placeOnPlatform(map, ch, width, height){
    const maxAttempts = 50;
    for(let attempt = 0; attempt < maxAttempts; attempt++){
      const col = Math.floor(this._rng() * (width - 10)) + 5;
      const row = Math.floor(this._rng() * (height - 4)) + 1;
      // 检查该位置是空的，下方是平台
      if(map[row] && map[row][col] === ' '){
        const below = map[row + 1] ? map[row + 1][col] : '#';
        if(below === '=' || below === '#' || below === '_'){
          map[row] = map[row].substring(0, col) + ch + map[row].substring(col + 1);
          return;
        }
      }
    }
  },

  // 获取所有模板列表
  getTemplateList(){
    return Object.entries(LEVEL_TEMPLATES).map(([key, t]) => ({
      id: key,
      name: t.name,
      icon: t.icon,
      desc: t.desc,
      cellType: t.cellType,
      winCondition: t.winCondition,
    }));
  },
};

// ===== 编辑器模板导出（给 editor.html 用） =====
const EDITOR_TEMPLATES = {
  blank: {
    name: '空白地图',
    desc: '从零开始创建',
    width: 80, height: 15,
    map: Array(15).fill(' '.repeat(80)),
  },
  basicPlatform: {
    name: '基础平台',
    desc: '地面+平台+出生点+终点',
    width: 80, height: 15,
    map: [
      '################################################################################',
      '#                                                                              #',
      '#      ========                  ======                    ========             #',
      '#                                                                              #',
      '#            ========                    ======                    ========     #',
      '#                                                                              #',
      '#  ========            ======                      ========                    #',
      '#                                                                              #',
      '#        ======                  ========                    ======             #',
      '#                                                                              #',
      '#              ========                    ======                    ========   #',
      '#                                                                              #',
      '################################################################################',
    ],
  },
  combatArena: {
    name: '战斗竞技场',
    desc: '含敌人+道具的WBC关卡',
    width: 80, height: 15,
    map: [
      '################################################################################',
      '#                                                                              #',
      '#    ====        ========        =====        ========        =====            #',
      '#                                                                              #',
      '#        ====            ======        =====          ======                   #',
      '#                                                                              #',
      '#  ====        ========        ======        ========        =====             #',
      '#                                                                              #',
      '#      ====            =====        ======          =====                      #',
      '#                                                                              #',
      '#  ========      ========      ========      ========      ========            #',
      '#                                                                              #',
      '################################################################################',
    ],
  },
};


// ===== v3: DeepSeek AI 真·AI关卡生成 =====
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

function getDeepSeekKey(){
  try{ return localStorage.getItem('cellQuest_ds_key') || ''; }catch(e){ return ''; }
}
function setDeepSeekKey(key){
  try{ localStorage.setItem('cellQuest_ds_key', key.trim()); return true; }catch(e){ return false; }
}

const DEEPSEEK_SYSTEM_PROMPT = [
  '你是一个关卡地图生成器。根据用户输入的主题词,生成2D平台跳跃关卡地图。',
  '输出格式:只输出一个JSON对象,不要任何其他文字。',
  '字段:name(≤10字中文),desc(≤20字),cellType(1=战斗WBC/3=收集RBC),map(15行×80列字符串数组)',
  '瓦片:#=地面 = =平台 P=出生点 F=终点 g=葡萄球菌 t=链球菌 G=大型菌 ^=尖刺 ?=隐藏方块 V=弹簧 _=碎裂 H=隐藏墙 a=ATP o=金币',
  '规则:第0行和14行全#,P在第13行列2-5,F在第13行列75-79,平台间距≤5格,敌人6-12个,道具3-6个,ATP4-8个',
  '示例主题"火山":{"name":"熔岩之地","desc":"火山战斗关卡","cellType":1,"theme":"火山","map":["                                                                                ","                                                                                ","      ======      ======      ======      ======      ======      ======        ","              ??                 g                   t                          ","            ======      ======      ======      ======      ======               ","                                                                                ","        ======            ======          ======            ======               ","                          G                                                      ","  ======      ======      ======      ======      ======      ======             ","                                                                                ","                          ^^                                                    ","                                                                                ","P                                                                          F     ","################################################################################","################################################################################"]}',
].join('\n');

async function generateAIMap(prompt){
  const key = getDeepSeekKey();
  if(!key) return { error: '请先设置 DeepSeek API Key' };

  try{
    const resp = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: DEEPSEEK_SYSTEM_PROMPT },
          { role: 'user', content: '生成关卡地图,主题: ' + prompt }
        ],
        temperature: 0.8, max_tokens: 4096,
      }),
    });

    if(!resp.ok){
      const err = await resp.json().catch(()=>({}));
      return { error: 'API错误: ' + (err.error?.message || resp.status) };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    return parseAIMapResponse(content, prompt);
  }catch(e){
    return { error: '网络错误: ' + e.message };
  }
}

function parseAIMapResponse(content, prompt){
  let json = null;
  const cleaned = content.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
  try{
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if(start >= 0 && end > start) json = JSON.parse(cleaned.substring(start, end + 1));
  }catch(e){ return { error: 'AI返回格式错误,请重试' }; }

  if(!json || !json.map || !Array.isArray(json.map)) return { error: 'AI返回缺少地图数据' };

  const map = [], width = 80;
  for(let i = 0; i < 15; i++){
    let row = (json.map[i] || '');
    row = row.substring(0, width).padEnd(width, ' ');
    if((i === 0 || i === 14) && row.trim() === '') row = '#'.repeat(width);
    map.push(row);
  }

  let hasP = false, hasF = false;
  for(const r of map){ if(r.indexOf('P')>=0) hasP=true; if(r.indexOf('F')>=0) hasF=true; }
  if(!hasP) map[13] = map[13].substring(0,3) + 'P' + map[13].substring(4);
  if(!hasF) map[13] = map[13].substring(0,77) + 'F' + map[13].substring(78);

  return {
    name: json.name || prompt, icon: '\u{1F916}',
    desc: json.desc || json.theme || 'AI生成',
    cellType: json.cellType === 3 ? 3 : 1,
    winCondition: json.cellType === 3 ? WIN_COLLECT_ALL : WIN_KILL_ALL,
    sky: json.cellType === 3 ? ['#1a2a3a','#4a6a8a'] : ['#2a1020','#5a1a3a'],
    map, width, floatPlatforms: [], miniSpawnArea: null, pipeSpawners: [],
    knowledgeCards: [], tutorials: [],
  };
}
