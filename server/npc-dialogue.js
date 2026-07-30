// === AI NPC Dialogue — combat tactical analysis + hub multi-round chat ===

const { getAiApiKey } = require('./ai-runtime-config');

const MAX_BODY_BYTES = 16384;
const AI_TIMEOUT_MS = 4000;

// ---- Request Validation ----

function validateNpcRequest(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Input must be an object' };
  if (!['combat', 'hub'].includes(body.mode)) return { ok: false, error: 'mode must be combat or hub' };
  if (!body.context || typeof body.context !== 'object') return { ok: false, error: 'context is required' };

  const ctx = body.context;
  if (ctx.hpPct !== undefined && (typeof ctx.hpPct !== 'number' || ctx.hpPct < 0 || ctx.hpPct > 1)) {
    return { ok: false, error: 'hpPct must be 0-1' };
  }
  if (ctx.energy !== undefined && (typeof ctx.energy !== 'number' || ctx.energy < 0)) {
    return { ok: false, error: 'Invalid energy' };
  }

  if (body.mode === 'hub') {
    if (typeof body.question !== 'string' || body.question.trim().length === 0) {
      return { ok: false, error: 'question is required for hub mode' };
    }
    if (body.question.length > 500) {
      return { ok: false, error: 'question too long (max 500 chars)' };
    }
    if (body.history !== undefined && !Array.isArray(body.history)) {
      return { ok: false, error: 'history must be an array' };
    }
    if (body.history && body.history.length > 20) {
      return { ok: false, error: 'history too long (max 20 turns)' };
    }
  }

  if (body.mode === 'combat' && body.question !== undefined && body.question !== '') {
    return { ok: false, error: 'question not supported in combat mode' };
  }

  return { ok: true, value: body };
}

// ---- System Prompt ----

function buildCombatSystemPrompt() {
  return [
    '你是《细胞远征》游戏中的树突状细胞(DC)NPC。你是免疫系统的侦察兵和抗原呈递细胞。',
    '玩家正在关卡中战斗，你需要根据战场态势给出战术建议。',
    '',
    '规则：',
    '- 用生动比喻解释免疫学概念（如"抗体像精确制导导弹锁定细菌"）',
    '- 结合具体数据给出针对性建议',
    '- 1-3句话，不超过120字',
    '- 语气像一个经验丰富的战友',
    '- 不要说"作为AI"、"根据分析"之类的套话',
    '- 不要输出markdown、代码或HTML',
  ].join('\n');
}

function buildHubSystemPrompt() {
  return [
    '你是《细胞远征》游戏Hub主城中的树突状细胞(DC)NPC。你是免疫系统的侦察兵和科普向导。',
    '玩家会向你提问免疫学知识或关卡攻略，你需要耐心解答。',
    '',
    '规则：',
    '- 用生活化比喻解释专业概念（如"巨噬细胞像垃圾清理车"）',
    '- 科普内容要有科学依据，但表达要通俗易懂',
    '- 攻略建议要结合游戏机制（WBC战斗/RBC收集/ATP管理）',
    '- 1-5句话，不超过200字',
    '- 语气像一个博学的导师，带一点幽默感',
    '- 不要说"作为AI"、"根据我的知识库"之类的套话',
    '- 不要输出markdown、代码或HTML',
  ].join('\n');
}

function buildCombatUserMessage(context) {
  const hp = Math.round((context.hpPct || 1) * 100);
  const energy = context.energy ?? 0;
  const kills = context.kills ?? 0;
  const totalEnemies = context.totalEnemies ?? 0;
  const progress = Math.round((context.progress || 0) * 100);
  const cellName = context.cellName || '白细胞';
  const levelName = context.levelName || '未知区域';
  const isBeforeBoss = context.isBeforeBoss || false;

  let situation = `玩家状态 — 细胞:${cellName}, 关卡:${levelName}, HP:${hp}%, ATP:${energy}, 已击杀:${kills}/${totalEnemies}, 进度:${progress}%`;
  if (isBeforeBoss) situation += ', Boss战即将开始';

  return situation + '\n\n请给出一条战术建议。';
}

// ---- Local Fallback (combat) ----

function combatFallback(context) {
  const hp = Math.round((context.hpPct || 1) * 100);
  const energy = context.energy ?? 0;
  const kills = context.kills ?? 0;
  const totalEnemies = context.totalEnemies ?? 0;
  const progress = Math.round((context.progress || 0) * 100);
  const isBeforeBoss = context.isBeforeBoss || false;

  if (isBeforeBoss) {
    return '前方侦测到病原体大本营！保存ATP，Boss战需要大量能量来发动技能。准备好了再冲进去！';
  }
  if (hp < 30) {
    return '你的细胞膜严重受损！先脱离交战区，寻找ATP分子补充能量。免疫细胞也要先保护好自己才能战斗。';
  }
  if (energy < 25) {
    return 'ATP储备告急！每个免疫细胞都需要线粒体持续供能。试试踩踏攻击——它不消耗能量，是最经济的基础技能。';
  }
  if (progress > 70 && kills < totalEnemies) {
    return '太棒了！已经消灭了' + progress + '%的病原体，还剩' + (totalEnemies - kills) + '个。乘胜追击，不要给细菌喘息的机会！';
  }
  if (progress < 20 && totalEnemies > 3) {
    return '我是树突状细胞，免疫系统的侦察兵。我捕获了' + totalEnemies + '个病原体的抗原信息。踩踏是最基本的攻击方式，试试看！';
  }
  if (kills >= 10) {
    return '已击杀' + kills + '个病原体！你的战斗力让我想起了记忆B细胞——一旦见过敌人，第二次交手就快得多。继续前进！';
  }
  return '你好，免疫战士！我是树突状细胞，正在这片区域侦察敌情。前方有' + totalEnemies + '个病原体需要清除，我们一起守护这片组织。';
}

// ---- Local Fallback (hub) ----

const HUB_KNOWLEDGE = {
  '免疫': '免疫系统有三道防线：第一道是皮肤和黏膜（物理屏障），第二道是固有免疫（巨噬细胞、中性粒细胞快速反应），第三道是适应性免疫（B细胞产生抗体、T细胞精准打击）。游戏里你操控的就是第三道防线的精锐部队！',
  '抗体': '抗体也叫免疫球蛋白，是B细胞分泌的Y形蛋白质。它们像"精确制导导弹"——每个抗体只锁定一种抗原。在游戏中，白细胞挥剑就像是抗体中和毒素的过程。',
  '白细胞': '白细胞是免疫系统的主力战斗部队。中性粒细胞最先到达感染现场，巨噬细胞吞噬病原体，T细胞精准击杀被感染的细胞。游戏中的WBC角色综合了这些能力！',
  '红细胞': '红细胞占血液细胞的99%，专职运输氧气。每个红细胞含约2.7亿个血红蛋白分子。游戏里RBC关卡的设计灵感就来自它们的"快递员"身份——快速穿梭、收集氧气。',
  'atp': 'ATP（三磷酸腺苷）是所有细胞的通用能量货币。一个细胞每天消耗约1000万个ATP分子。在游戏中，ATP驱动你的特殊技能——挥剑消耗5点，突进消耗10点，踩踏免费！',
  '细菌': '细菌是单细胞微生物，大小约1-5微米。不是所有细菌都有害——肠道菌群帮助消化食物。但致病菌释放的毒素会破坏组织，这也是游戏中你需要消灭的目标。',
  '病毒': '病毒比细菌小100倍，必须寄生在活细胞中才能繁殖。流感病毒攻击呼吸道，HIV攻击免疫系统本身。游戏中Level 4的流感关卡就是模拟这个过程。',
  '攻略': 'WBC关卡的核心是战斗：优先踩踏（免费）攒ATP，然后挥剑（5点）清场，突进（10点）用于脱离包围。RBC关卡的核心是路线规划：先观察物品分布再行动，利用二段跳到达高处收集物。',
  'boss': 'Boss战的秘诀是节奏感。观察Boss的攻击模式，躲过攻击后立刻反击。保存ATP用于关键时刻的突进闪避。血量低于一半时，优先找安全位置回血再继续！',
  '默认': '我是个免疫学百事通！你可以问我关于免疫系统、细胞功能、疾病机制、或者关卡攻略的问题。比如："抗体是怎么工作的？"或者"Boss怎么打？"',
};

function hubFallback(question) {
  const q = question.toLowerCase();
  const keywords = [
    { keys: ['免疫', '防线', '三道'], topic: '免疫' },
    { keys: ['抗体', '免疫球蛋白', 'b细胞'], topic: '抗体' },
    { keys: ['白细胞', 'wbc', '巨噬', '中性粒', 't细胞'], topic: '白细胞' },
    { keys: ['红细胞', 'rbc', '氧气', '血红'], topic: '红细胞' },
    { keys: ['atp', '能量', '线粒体', '三磷酸腺苷'], topic: 'atp' },
    { keys: ['细菌', '病原', '感染'], topic: '细菌' },
    { keys: ['病毒', '流感', 'hiv'], topic: '病毒' },
    { keys: ['攻略', '怎么打', '怎么过', '技巧', '通关'], topic: '攻略' },
    { keys: ['boss', '首领', '大怪', '决战'], topic: 'boss' },
  ];

  for (const entry of keywords) {
    if (entry.keys.some(k => q.includes(k))) {
      return HUB_KNOWLEDGE[entry.topic];
    }
  }
  return HUB_KNOWLEDGE['默认'];
}

// ---- AI Call ----

function buildMessages(mode, context, question, history) {
  const systemPrompt = mode === 'combat' ? buildCombatSystemPrompt() : buildHubSystemPrompt();
  const messages = [{ role: 'system', content: systemPrompt }];

  if (history && history.length > 0) {
    for (const turn of history) {
      if (turn.role === 'user' || turn.role === 'assistant') {
        messages.push({ role: turn.role, content: String(turn.content || '').slice(0, 500) });
      }
    }
  }

  if (mode === 'combat') {
    messages.push({ role: 'user', content: buildCombatUserMessage(context) });
  } else {
    messages.push({ role: 'user', content: question });
  }

  return messages;
}

async function requestAiDialogue(mode, context, question, history, fetchImpl) {
  const actualFetch = fetchImpl || fetch;
  const apiKey = getAiApiKey();
  if (!apiKey) return null;

  const baseUrl = process.env.CELL_QUEST_AI_BASE_URL || 'https://api.deepseek.com/v1/chat/completions';
  const model = process.env.CELL_QUEST_AI_MODEL || 'deepseek-chat';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await actualFetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 300,
        messages: buildMessages(mode, context, question, history),
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text = payload.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') return null;

    // Sanitize: strip markdown code blocks, HTML tags
    const sanitized = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();

    return sanitized.slice(0, 300);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---- HTTP Handler ----

async function readNpcBody(req) {
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    const error = new Error('Content-Type must be application/json');
    error.status = 415;
    throw error;
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        const error = new Error('Request body too large');
        error.status = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        const error = new Error('Invalid JSON');
        error.status = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function handleNpcDialogue(req, res, sendJsonFn, fetchImpl) {
  let body;
  try {
    body = await readNpcBody(req);
  } catch (error) {
    sendJsonFn(res, error.status || 400, { ok: false, error: error.message });
    return;
  }

  const validated = validateNpcRequest(body);
  if (!validated.ok) {
    sendJsonFn(res, 400, { ok: false, error: validated.error });
    return;
  }

  const { mode, context, question, history } = validated.value;

  let text = null;
  let source = 'local';

  try {
    const aiText = await requestAiDialogue(mode, context, question, history, fetchImpl);
    if (aiText && aiText.length >= 4) {
      text = aiText;
      source = 'ai';
    }
  } catch (e) {
    console.error('[npc-dialogue] AI call failed:', e.message || e);
  }

  if (!text) {
    text = mode === 'combat' ? combatFallback(context) : hubFallback(question);
  }

  sendJsonFn(res, 200, { ok: true, source, text });
}

// Export for testing + server.js registration
module.exports = {
  validateNpcRequest,
  buildCombatSystemPrompt,
  buildHubSystemPrompt,
  buildCombatUserMessage,
  combatFallback,
  hubFallback,
  buildMessages,
  requestAiDialogue,
  handleNpcDialogue,
};
