const fs = require('fs');

// Read current (committed) levels.js
let content = fs.readFileSync('js/levels.js','utf8');

// ===== Step 1: Add cellType/winCondition to existing levels =====

// Level 0: 血液循环 (RBC, collectAll)
content = content.replace(
  "name: '血液循环',\n    width: 135,",
  "name: '血液循环',\n    width: 135,\n    cellType: 3,\n    winCondition: WIN_COLLECT_ALL,"
);

// Level 1: 擦伤 (WBC, killAll)
content = content.replace(
  "name: '擦伤',\n    width: 80,",
  "name: '擦伤',\n    width: 80,\n    cellType: 1,\n    winCondition: WIN_KILL_ALL,"
);

// Level 2: 肺泡迷宫 (WBC, killAll)
content = content.replace(
  "name: '肺泡迷宫',\n    width: 90,",
  "name: '肺泡迷宫',\n    width: 90,\n    cellType: 1,\n    winCondition: WIN_KILL_ALL,"
);

// Level 3: 血管奔流 (RBC, collectAll)
content = content.replace(
  "name: '血管奔流',\n    width: 90,",
  "name: '血管奔流',\n    width: 90,\n    cellType: 3,\n    winCondition: WIN_COLLECT_ALL,"
);

// Level 4: 淋巴结 (WBC, killAll)
content = content.replace(
  "name: '淋巴结',\n    width: 80,",
  "name: '淋巴结',\n    width: 80,\n    cellType: 1,\n    winCondition: WIN_KILL_ALL,"
);

// Fix Level 4 finish: change '>' to 'F'
content = content.replace(' ===> ', ' ===F ');

// ===== Step 2: Generate and add new levels (5-10) =====

function padMap(rows, width) {
  return rows.map(r => r.padEnd(width, ' '));
}
function fmtRows(rows) {
  return rows.map(r => '      "' + r + '"').join(',\n');
}

// Level 5: Boss感染 (WBC, killAll, 80 cols)
const l5 = padMap([
'',
'                                   ?',
'',
'',
'',
'                                                              o',
'                                                    o    o  ===',
'                                          o    o  ===  ===',
'                               o    o   ===  ===                    o',
'                     o    o  ===  ===                          o  ===   D',
'          o    o   ===  ===                         o    o   ===       ===',
'P  o  o ===  ===  ==     o    o    o   C   o   o  ===  ===  ==  o  b  ==   F',
'================================================================================',
'================================================================================',
'================================================================================',
], 80);

// Level 6: Cytokine Storm (WBC, 90 cols)
const l6 = padMap([
'',
'                                            ?',
'',
'                                   ?              ?          ?',
'                                                           ===',
'                               o   o   o          o    o   =  =          o',
'                    o    o   === === ===    o   ===  ===    =    =    o  ==    o',
'          o    o   ===  ===               === ===     ==  =      =  ===  ==  ===',
'   o     ===  ===          C   o          ==      o   ==  =  t   =  ==      ==   o',
'  ===   ==      ==  _   o  ========   o   ==  _  ===  == t  ========  ==  g  ==  ===',
'P == o ==  g  o == ^^^  ====      ======== ^^^  ===  ========    ==    ========  ==  D',
'=======  ======  ==========================^^^===================  ===========  ====F  ==',
'==========================================================================================',
'==========================================================================================',
'==========================================================================================',
], 90);

// Level 7: Bone Marrow Caverns (RBC, 100 cols)
const l7 = padMap([
'',
'                                 ?        ?         ?       ?        ?',
'',
'                         ?                     ?                ?        ?',
'',
'                                                            o',
'                        o   o          o    o          o  ===    o             o',
'   o    o       o     === ===   o    ===  ===   o    ===      ===  o    o   ===       o    o',
'  ===  ===     ===          === ===       ===  ===         o       ===  ===      o  ===  ===',
' ==    ==  o  ==  HHHHHoHHH==     C    ==    ==     o    ===       ==     o   === ==    ==   o',
'P  o  ==  ===  == ############ ==  ========  ==  =====  ==    o    ==  ======  ==  ==  *  =====F',
'=======^========^^^=^^^=^^^=^^^=^^=^^=^^=^^^=^^=^^^=^^=^^=^^=^^=^^=^^^=^^^=^^=^^^=^^^=^^=^^^=^^^=',
'####################################################################################################',
'####################################################################################################',
'####################################################################################################',
], 100);

// Level 8: Complement Cascade (WBC, 85 cols)
const l8 = padMap([
'',
'                                   ?',
'',
'                                                                     ====',
'                                              o       o    o    o   =  =',
'                                   o    o   ===     ===  ===  ===  =    =   o',
'                          o    o  ===  ===       ==             =  t   =  ===',
'               o    o   ===  ===       ==   t   ==  _   o       =      =  ==',
'    o    o    ===  ===  ==      o  t   ==  ======== ^^^  ===    ==  _   ==    o',
'   ===  ===  ==      ==  V   ===  ========    ==  ^^^ ==   o  == ^^^  ==  V  ===',
'P ==      ==    C g  ==  ============    ==  g ==  ========  V  ==  ========  ==F',
'=================================================================================',
'=================================================================================',
'=================================================================================',
'=================================================================================',
], 85);

// Level 9: Allergic Storm (RBC, 95 cols)
const l9 = padMap([
'',
'                              ?                ?              ?',
'',
'',
'                                                                     o       o',
'                                                    o    o        ===     ===',
'            o            o          o    o        ===  ===              V   V   o',
' o   o    ===    o     ===    o   ===  ===    o       V    o    o     ========  ===     o',
'=== ===      ===    ==   V  ===       == o ===  ========  ===  ===  ==        ==  o  ===   o',
'=   V   o    V  o  ==  ========  o    ========  ==      ==      ==  V    o   ==  ===  V ===',
'P o ========  ======== ==========  ==========  ==  o  ==  C o  ==  ==========  ==  ==  =====F',
'==============================================================================================',
'==============================================================================================',
'==============================================================================================',
'==============================================================================================',
], 95);

// Level 10: Sepsis Finale (WBC, 100 cols)
const l10 = padMap([
'',
'                             ?              ?              ?',
'',
'                                                                                         ====',
'                                                                           o    o    o  =  =',
'                                                        o    o          ===  ===  ===  =    =  o',
'                                       o    o    o    ===  ===        ==          ==  =  t   = ===',
'                          o    o     ===  ===  ===  ==      ==  _  o ==  g   o   ==  =      =  ==',
'             o    o     ===  ===   ==      ==      ==  t   == ^^  ===  ==========  =  ==  _   ==',
'  o    o    ===  ===   ==      == ==  o   ==  _   ==  ======== ^^ ==      ==  o   =  == ^^  ==',
' ===  ===  ==      == ==  g   == ==  ===  == ^^^  ============^^^^==  o   ==  ===  == ^^^ ==  D',
'P  ==      ==  C o  ============  ========  =======^==^==^==^====^==  ========  ========  =====F',
'====================================================================================================',
'====================================================================================================',
'====================================================================================================',
], 100);

// Verify all new maps
const newMaps = [
  {name:'L5', w:80, m:l5},
  {name:'L6', w:90, m:l6},
  {name:'L7', w:100, m:l7},
  {name:'L8', w:85, m:l8},
  {name:'L9', w:95, m:l9},
  {name:'L10', w:100, m:l10},
];
let allOk = true;
newMaps.forEach(l => {
  l.m.forEach((r, i) => {
    if (r.length !== l.w) { console.log(l.name + ' R' + i + ': ' + r.length + ' (expected ' + l.w + ')'); allOk = false; }
  });
  if (l.m.length !== 15) { console.log(l.name + ': ' + l.m.length + ' rows'); allOk = false; }
});
if (!allOk) { console.log('MAP VERIFICATION FAILED!'); process.exit(1); }
console.log('All maps verified OK');

// Build the Level 5 entry
const l5Code = `
  /* ===== 第 5 关：Boss感染（WBC·Boss决战）===== */
  {
    name: 'Boss感染',
    width: 80,
    cellType: 1,
    winCondition: WIN_KILL_ALL,
    sky: ['#2a0a0a','#6a0a0a'],
    map: [
${fmtRows(l5)}
    ],
    floatPlatforms: [],
    tutorials: [
      { x: 300, useCurrent: true, body: '最终决战！巨型细菌集群挡在门前\\n挥剑+突进+踩踏连招\\n只有消灭 Boss 后终点大门才会打开！' },
    ],
    knowledgeCards: [],
    miniSpawnArea: { colStart: 18, colEnd: 40 },
  },
`;

// Build the remaining new levels (6-10)
const newLevels = `
  /* ===== 第 6 关：细胞因子风暴（WBC·碎裂平台+伏击）===== */
  {
    name: '细胞因子风暴',
    width: 90,
    cellType: 1,
    winCondition: WIN_KILL_ALL,
    sky: ['#3a0a1a','#8a2a3a'],
    map: [
${fmtRows(l6)}
    ],
    floatPlatforms: [],
    pipeSpawners: [
      { col:18, row:9, dir:'up', trigger:'contact', type:'staph', cooldown:240 },
      { col:38, row:9, dir:'up', trigger:'contact', type:'staph', cooldown:200 },
      { col:60, row:9, dir:'up', trigger:'proximity', range:3, cooldown:180, type:'strep' },
    ],
    tutorials: [
      { x: 400, useCurrent: true, body: '细胞因子风暴来袭！\\n免疫系统失控攻击自身！\\n碎裂平台(_)踩踏后崩解！\\n务必快速通过！' },
      { x: 1400, useCurrent: true, body: '注意脚下！碎裂平台\\n崩解前会抖动预警\\n踩到后立即跳跃离开\\n掉下去就是尖刺！' },
      { x: 2200, useCurrent: true, body: '前方有伏击管道！\\n经过时会有细菌飞出\\n蹲下或快速通过\\n消灭全部细菌后通关！' },
    ],
    knowledgeCards: [
      { x: 300, key: 'cytokine',
        title: '细胞因子风暴 — 免疫双刃剑',
        text: '细胞因子是免疫细胞释放的信号分子。\\n正常时精准调控免疫反应，\\n但某些感染(如COVID-19)会导致\\n"细胞因子风暴"——免疫系统失控，\\n大量细胞因子释放，导致严重炎症、\\n组织损伤甚至器官衰竭。' },
    ],
  },

  /* ===== 第 7 关：骨髓洞穴（RBC·隐藏密室探索）===== */
  {
    name: '骨髓洞穴',
    width: 100,
    cellType: 3,
    winCondition: WIN_COLLECT_ALL,
    sky: ['#0a0a1a','#1a1a3a'],
    map: [
${fmtRows(l7)}
    ],
    floatPlatforms: [],
    pipeSpawners: [],
    tutorials: [
      { x: 300, useCurrent: true, body: '潜入骨髓深处！\\n这是血细胞的诞生地\\n半透明墙壁(H)可以穿过\\n后面藏着秘密房间！' },
      { x: 1800, useCurrent: true, body: '骨髓洞穴满是宝藏\\n需要收集全部物品通关\\n利用二段跳探索高处\\n隐藏房间里有大量物品！' },
    ],
    knowledgeCards: [
      { x: 600, key: 'marrow',
        title: '骨髓 — 血细胞的摇篮',
        text: '骨髓是骨骼内部的海绵状组织，\\n每天产生数千亿个血细胞。\\n造血干细胞(HSC)是所有血细胞的祖先，\\n可分化为红细胞、白细胞和血小板。\\n骨髓移植可治疗白血病等血液疾病。' },
    ],
  },

  /* ===== 第 8 关：补体级联（WBC·尖刺+弹簧跳跃）===== */
  {
    name: '补体级联',
    width: 85,
    cellType: 1,
    winCondition: WIN_KILL_ALL,
    sky: ['#1a0a2a','#4a1a5a'],
    map: [
${fmtRows(l8)}
    ],
    floatPlatforms: [],
    pipeSpawners: [
      { col:35, row:9, dir:'up', trigger:'proximity', range:3, cooldown:200, type:'strep' },
      { col:52, row:9, dir:'up', trigger:'proximity', range:3, cooldown:200, type:'staph' },
      { col:68, row:9, dir:'up', trigger:'proximity', range:3, cooldown:220, type:'strep' },
    ],
    tutorials: [
      { x: 300, useCurrent: true, body: '补体级联启动！\\n杀死一个细菌触发连锁反应\\nV=弹簧方块 可超级弹跳\\n尖刺(^)碰到即受伤！' },
      { x: 1500, useCurrent: true, body: '弹簧配合二段跳可飞很高\\n碎裂平台下方是尖刺\\n蹲下可躲避链球菌冲刺\\n消灭全部敌人才能通关！' },
    ],
    knowledgeCards: [
      { x: 200, key: 'complement',
        title: '补体系统 — 免疫级联反应',
        text: '补体是血浆中的一组蛋白质，\\n被激活后产生级联反应：\\nC1→C4→C2→C3→C5...→C9，\\n最终在细菌膜上打孔(MAC复合体)，\\n导致细菌溶解死亡。\\n这一过程称为"补体级联"。' },
    ],
  },

  /* ===== 第 9 关：过敏风暴（RBC·弹跳乐园）===== */
  {
    name: '过敏风暴',
    width: 95,
    cellType: 3,
    winCondition: WIN_COLLECT_ALL,
    sky: ['#2a3a1a','#4a6a2a'],
    map: [
${fmtRows(l9)}
    ],
    floatPlatforms: [],
    pipeSpawners: [],
    tutorials: [
      { x: 300, useCurrent: true, body: '过敏风暴席卷全身！\\nV方块=弹簧 踩上弹射起飞\\n利用弹簧收集高处物品\\n红细胞的跳跃速度极快！' },
      { x: 1600, useCurrent: true, body: '二段跳+弹簧=超高弹跳\\n所有物品都收集了吗？\\n有些藏在弹簧上方的平台\\n必须弹跳到高处才能拿到！' },
    ],
    knowledgeCards: [
      { x: 500, key: 'allergy',
        title: '过敏反应 — 免疫系统的误判',
        text: '过敏是免疫系统对无害物质(如花粉、\\n花生蛋白)产生过度反应的现象。\\n肥大细胞释放大量组胺，\\n导致血管扩张、平滑肌收缩等症状。\\n严重时引发过敏性休克，危及生命。\\n这就是为什么有人需要随身携带EpiPen。' },
    ],
  },

  /* ===== 第 10 关：败血症决战（WBC·全机制融合）===== */
  {
    name: '败血症决战',
    width: 100,
    cellType: 1,
    winCondition: WIN_KILL_ALL,
    sky: ['#0a0a0a','#3a0a0a'],
    map: [
${fmtRows(l10)}
    ],
    floatPlatforms: [],
    pipeSpawners: [
      { col:25, row:9, dir:'up', trigger:'proximity', range:4, cooldown:180, type:'strep' },
      { col:45, row:9, dir:'up', trigger:'contact', type:'staph', cooldown:300 },
      { col:72, row:9, dir:'up', trigger:'proximity', range:3, cooldown:150, type:'strep' },
    ],
    tutorials: [
      { x: 400, useCurrent: true, body: '败血症全面爆发！\\n这是终极挑战——\\n所有敌人类型+碎裂平台+尖刺\\n合理使用挥剑和突进！' },
      { x: 2400, useCurrent: true, body: 'Boss就在前方！\\n两个精英细菌+boss守护终点\\n先用挥剑清理精英\\n再跳踩+突进连招打Boss！' },
    ],
    knowledgeCards: [
      { x: 1000, key: 'sepsis',
        title: '败血症 — 免疫系统的最后防线',
        text: '败血症是感染引起的全身性炎症反应，\\n死亡率高达30%-50%。\\n细菌进入血液循环后大量繁殖，\\n引发全身性细胞因子释放，\\n导致多器官功能障碍(MODS)。\\n早期诊断+抗生素是治疗关键。\\n每年的9月13日是世界败血症日。' },
    ],
    miniSpawnArea: { colStart: 35, colEnd: 60 },
  },
`;

// Insert Level 5 before the closing ]; of LEVEL_MAPS
const oldLevelsEnd = '    knowledgeCards: [\n      { x: 200, key: \'sepsis\',\n        title: \'败血症 — 免疫系统的最后防线\',\n        text: \'败血症是感染引起的全身性炎症反应，\\n死亡率高达30%-50%。\\n细菌进入血液循环后大量繁殖，\\n引发全身性细胞因子释放，\\n导致多器官功能障碍(MODS)。\\n早期诊断+抗生素是治疗关键。\\n每年的9月13日是世界败血症日。\' },\n    ],\n  },\n];';

// Actually let me find the simpler ending pattern
// The last level (lv4 淋巴结) ends with:
// knowledgeCards: [...],\n  },\n];
// Let me search for this

// Find the last '},' before '];'
const idxClose = content.lastIndexOf('\n];');
if (idxClose > 0) {
  // Find the closing of the last level entry
  const beforeClose = content.substring(0, idxClose);
  const lastLevelEnd = beforeClose.lastIndexOf('\n  },');
  if (lastLevelEnd > 0) {
    // Insert level 5 + new levels between last level and ];
    const part1 = content.substring(0, idxClose);
    content = part1 + ',\n' + l5Code + newLevels + '\n];';
  }
}

// ===== Step 3: Update LEVEL_DEFS =====
// Find and replace the LEVEL_DEFS closing
const oldDefsEnd = "  { id:4, name:'淋巴结',     bgMusic:'lymph',  enemies:['staph','staphLarge','strep'], mechanics:['sword','dash','stomp'], checkpoint:true },\n];";
const newDefsEnd = "  { id:4, name:'淋巴结',     bgMusic:'lymph',  enemies:['staph','staphLarge','strep'], mechanics:['sword','dash','stomp'], checkpoint:true },\n" +
  "  { id:5, name:'Boss感染',   bgMusic:'boss',   enemies:['boss'], mechanics:['sword','dash','stomp','qblock'], checkpoint:true },\n" +
  "  { id:6, name:'细胞因子风暴', bgMusic:'storm', enemies:['staph','strep','staphLarge'], mechanics:['crumble','ambush','spike','sword','dash'], checkpoint:true },\n" +
  "  { id:7, name:'骨髓洞穴',   bgMusic:'marrow', enemies:[], mechanics:['hiddenWall','secret','crumble','collect','qblock'], checkpoint:true },\n" +
  "  { id:8, name:'补体级联',   bgMusic:'complement', enemies:['staph','staphLarge','strep'], mechanics:['spring','spike','crumble','cascade','sword'], checkpoint:true },\n" +
  "  { id:9, name:'过敏风暴',   bgMusic:'allergy', enemies:[], mechanics:['spring','heartPump','bounce','collect','qblock'], checkpoint:true },\n" +
  "  { id:10, name:'败血症决战', bgMusic:'sepsis', enemies:['staph','staphLarge','strep','boss'], mechanics:['crumble','spike','ambush','sword','dash','boss'], checkpoint:true },\n" +
  "];";

content = content.replace(oldDefsEnd, newDefsEnd);

// Write the result
fs.writeFileSync('js/levels.js', content);
console.log('Done! levels.js rebuilt with all 11 levels.');

// Final verification
const WIN_KILL_ALL = 'killAll';
const WIN_COLLECT_ALL = 'collectAll';
const C = { sky1:'', sky2:'', sky3:'' };
let finalCode = fs.readFileSync('js/levels.js','utf8');
let cleanCode = finalCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
let mapsMatch = cleanCode.match(/LEVEL_MAPS = (\[[\s\S]*\])/);
if (mapsMatch) {
  const maps = eval(mapsMatch[1]);
  console.log('Final verification: ' + maps.length + ' levels');
  let allOk = true;
  maps.forEach((m, i) => {
    const issues = [];
    if (!m.map) { issues.push('NO MAP'); }
    else if (m.map.length !== 15) issues.push('ROWS=' + m.map.length);
    if (m.map) m.map.forEach((row, r) => {
      if (row.length !== m.width) issues.push('R' + r + ':' + row.length);
    });
    if (issues.length === 0) {
      console.log('  Lv' + i + ' ' + m.name + ' (' + m.width + 'x15): OK');
    } else {
      console.log('  Lv' + i + ' ' + m.name + ' (' + m.width + 'x15): ' + issues.join(', '));
      allOk = false;
    }
  });
  if (allOk) console.log('ALL 11 LEVELS VERIFIED!');
}
