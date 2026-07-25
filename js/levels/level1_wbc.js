/* 肠道危机·食物中毒（上）
 * 严格沿用第一关（血液循环）原始血管赛道样式：地形 / 路线 / 障碍物与第一关一致，
 * 不修改任何地形。仅在此基础上叠加可自主巡逻的病菌与营养/血液物资，
 * 胜负条件为清除全部病菌（白细胞灭杀，红细胞供氧）。 */
const _L2_BASE = LEVEL_0.map.map(r => {
  const a = r.split('');
  while(a.length < 135) a.push(' ');
  return a;
});
const _L2_H = _L2_BASE.length;
// 地面顶部：自顶向下第一个近乎整行实心的行（即底部岩壁顶端）
function _l2GroundRow(){
  for(let r = 0; r < _L2_H; r++){
    let solid = 0;
    for(let c = 0; c < 135; c++) if(_L2_BASE[r][c] === '#') solid++;
    if(solid > 135 * 0.9) return r;
  }
  return _L2_H - 3;
}
const _L2_G = _l2GroundRow();
// 在指定列从地面表层向上寻找首个空格落点（避开柱子/平台）
function _l2Place(col, ch){
  for(let r = _L2_G - 1; r >= 0; r--){
    if(_L2_BASE[r][col] === ' '){ _L2_BASE[r][col] = ch; return; }
  }
}

// 敌人：葡萄球菌 / 链球菌（供白细胞灭杀）
[22, 33, 47, 58, 72, 88, 101, 115].forEach((c, i) => _l2Place(c, i % 2 ? 't' : 'g'));
// 营养 / 血液物资（仅红细胞可拾取）
[18, 41, 64, 92].forEach(c => _l2Place(c, 'f'));   // 食物
[27, 53, 79].forEach(c => _l2Place(c, 'n'));       // 营养
[36, 69, 105].forEach(c => _l2Place(c, 'O'));      // 氧气
[50, 84, 120].forEach(c => _l2Place(c, 'd'));      // 饮料

const _L2_MAP = _L2_BASE.map(r => r.join(''));

const LEVEL_1 = {
  name: '肠道危机·食物中毒(上)',
  width: 135,
  cellType: 1,
  winCondition: WIN_KILL_ALL,
  sky: [C.sky2, '#e8a0a0'],
  map: _L2_MAP,
  floatPlatforms: [],
  pipeSpawners: [
    { col: 10, row: 9, dir: 'up_jump', trigger: 'proximity', range: 2 },
    { col: 75, row: 6, dir: 'up', trigger: 'contact' }
  ],
  // 开局自动滚动剧情对话（透明气泡）：树突状细胞、中性粒细胞、红细胞三方协同
  tutorials: [
    { x: 80,  speaker: '树突状细胞',       color: '#ab47bc', body: '注意，这里是肠道黏膜前线。沙门氏菌已经突破上皮屏障，局部组织开始出现缺氧迹象。' },
    { x: 240, speaker: '中性粒细胞（白细胞）', color: '#efe8d0', body: '明白。我会第一时间切入菌群中心，把它们逐个撕裂。' },
    { x: 400, speaker: '红细胞',           color: '#ff9a9a', body: '哼，冲锋陷阵就交给你了。本小姐只负责把氧气送到还有救的细胞手里，可别让我白跑一趟。' },
    { x: 560, speaker: '树突状细胞',       color: '#ab47bc', body: '很好。白细胞清场，红细胞供氧，血小板堵漏——这就是免疫协同作战。务必小心，这里的病菌数量不少。' },
    { x: 720, speaker: '中性粒细胞（白细胞）', color: '#efe8d0', body: '跟紧我。' }
  ],
  knowledgeCards: [
    { x: 320, key: 'wbc', title: '白细胞', text: '白细胞是抵御伤口感染的先锋。当细菌通过创面入侵身体，白细胞会奔赴患处，吞噬并消灭病菌。我们看到的脓液，很多是英勇作战后牺牲的白细胞。' }
  ],
  // 侧边透明对话：靠近特定场景时触发
  sceneInfos: [
    { x: 320, y: 320, speaker: 'dc',  text: '注意前方的管道结构，敌人可能从那里涌出。保持移动，不要停留在正下方。' },
    { x: 720, y: 320, speaker: 'wbc', text: '第一个菌群据点。记住，踩击是最直接的消灭方式，不要和它们拼血。' },
    { x: 1180, y: 300, speaker: 'rbc', text: '这里有氧气补给。我能吸收它并给周围组织供氧——白细胞可不要乱抢哦。' }
  ]
};
