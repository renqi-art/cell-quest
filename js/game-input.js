/* ====================================================================
 * game-input.js — KEY_MAP / setupInput() / drawBackground() / updateCamera() / loop()
 * ==================================================================== */

// ===== 输入系统 =====
const KEY_MAP = {
  a:'left', A:'left',
  d:'right', D:'right',
  w:'jump', W:'jump', ' ':'jump',
  s:'down', S:'down',
  ArrowLeft:'left', ArrowRight:'right',
  ArrowUp:'jump', ArrowDown:'down',
  e:'skill', E:'skill',
  Shift:'dash',
  q:'switchCell', Q:'switchCell',
  '1':'skill1', '2':'skill2', '3':'skill3', '4':'skill4',
};

// P2 键位映射（双人模式时 P1 不响应方向键，由 P2 独占）
const KEY_MAP_P2 = {
  ArrowLeft:'left',
  ArrowRight:'right',
  ArrowUp:'jump',
  ArrowDown:'down',
  'u':'skill', 'U':'skill',
  'o':'dash', 'O':'dash',
  'y':'switchCell', 'Y':'switchCell',
  '7':'skill1', '8':'skill2', '9':'skill3', '0':'skill4',
};

function setupInput(){
  // 点击游戏区域获取焦点
  const container = $('game-container');
  const focusPrompt = $('focus-prompt');
  container.addEventListener('click', (event)=>{
    const interactive = event.target.closest && event.target.closest('button, input, select, textarea, a');
    if(interactive){
      if(focusPrompt) focusPrompt.classList.add('hidden');
      return;
    }
    container.focus();
    if(focusPrompt) focusPrompt.classList.add('hidden');
  });
  // 焦点丢失时显示提示（仅游戏中）
  container.addEventListener('blur', (event)=>{
    if(event.relatedTarget && container.contains(event.relatedTarget)) return;
    if(Game.state === 'playing' && focusPrompt){
      focusPrompt.textContent = '点击此处继续游戏';
      focusPrompt.classList.remove('hidden');
    }
  });
  container.addEventListener('focus', ()=>{
    if(focusPrompt) focusPrompt.classList.add('hidden');
  });

  document.addEventListener('keydown', e=>{
    Sfx.init();
    if(KEY_MAP[e.key] !== undefined){
      // 双人模式下 P1 不响应方向键（留给 P2）
      if(!Game.twoPlayer || !e.key.startsWith('Arrow')){
        Game.keys[KEY_MAP[e.key]] = true;
      }
      e.preventDefault();
    }
    // v3: P2 输入路由
    if(KEY_MAP_P2[e.key] !== undefined && Game.twoPlayer){
      Game.keysP2[KEY_MAP_P2[e.key]] = true;
      e.preventDefault();
    }
    // v2: 角色切换已移除，细胞由关卡锁定
    if(Game.memoryCardOpen && (e.key===' '||e.key==='Enter'||e.key==='Escape')){
      closeMemoryCard();
      e.preventDefault();
      return;
    }
    if((e.key==='p'||e.key==='P') && (Game.state==='playing'||Game.state==='paused')){
      togglePause();
    }
    // M 键：背景音乐自由开关（仅控制 BGM，不影响音效）
    if((e.key==='m'||e.key==='M') && !e.repeat){
      if(typeof toggleMusic === 'function'){ toggleMusic(); e.preventDefault(); }
    }
    // 教程对话：Space/Enter 继续（忽略按键重复）
    if(Game.tutorialPause && !e.repeat && (e.key===' '||e.key==='Enter')){
      dismissTutorial();
      e.preventDefault();
    }
    if(e.key==='Escape' && Game.state==='playing' && !Game.memoryCardOpen && !Game.tutorialPause){
      togglePause();
    }
    // 死亡面板：Space/Enter 重试，Escape 返回主城
    if(Game.state === 'dead'){
      if(e.key === ' ' || e.key === 'Enter'){
        retryFromDeath();
        e.preventDefault();
      } else if(e.key === 'Escape'){
        quitFromDeath();
        e.preventDefault();
      }
    }
  });
  document.addEventListener('keyup', e=>{
    if(KEY_MAP[e.key] !== undefined){
      if(!Game.twoPlayer || !e.key.startsWith('Arrow')){
        Game.keys[KEY_MAP[e.key]] = false;
      }
    }
    // v3: P2 keyup
    if(KEY_MAP_P2[e.key] !== undefined && Game.twoPlayer){
      Game.keysP2[KEY_MAP_P2[e.key]] = false;
    }
  });
  // blur 时清除按键（防止粘键）
  window.addEventListener('blur', ()=>{
    Game.keys = {};
    if(Game.mobile) Game.mobile.input.releaseAll();
  });
}

// ===== 移动端状态通知 =====
function _notifyMobileState(){
  if(!Game.mobile) return;
  Game.mobile.viewport.onGameStateChange();
  // 战斗中且未暂停 → 启用控制层，否则禁用
  const inBattle = Game.state === 'playing' && !Game.paused && !Game.memoryCardOpen && !Game.tutorialPause;
  Game.mobile.overlay.setDisabled(!inBattle);
}
function drawBackground(ctx, camX, bg){
  const img = Game.bgImages[Game.levelIndex];
  if(img && img.complete && img.naturalWidth > 0){
    // 缩放图片使其填满画布高度
    const scale = CH / img.naturalHeight;
    const imgW = img.naturalWidth * scale;
    const imgH = CH;
    // 根据摄像机位置做视差偏移（0.2x）
    const offsetX = -(camX * 0.2) % imgW;
    // 平铺填满画布（从左到右依次绘制）
    for(let x = offsetX - imgW; x < CW; x += imgW){
      ctx.drawImage(img, x, 0, imgW, imgH);
    }
  } else {
    // 图片未加载：降级为渐变
    const grad = ctx.createLinearGradient(0,0,0,CH);
    grad.addColorStop(0, bg[0]);
    grad.addColorStop(1, bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,CW,CH);
  }
}

// ===== 相机 =====
function updateCamera(){
  const p = Game.player;
  const lvl = Game.level;
  let cx = p.x - CW/2 + p.w/2;
  cx = Math.max(0, Math.min(cx, lvl.width*TILE - CW));
  Game.camera.x = cx;
  let cy = p.y - CH/2 + p.h/2;
  cy = Math.max(0, Math.min(cy, lvl.height*TILE - CH));
  Game.camera.y = cy;
  if(Game.camera.shake > 0){
    Game.camera.shake *= 0.85;
    if(Game.camera.shake < 0.3) Game.camera.shake = 0;
  }
}

// ===== 游戏循环 =====
const FIXED_STEP = 1000/60;

function loop(time){
  if(!Game.lastTime) Game.lastTime = time;
  const dt = Math.min(time - Game.lastTime, 100);
  Game.lastTime = time;
  Game.accumulator += dt;

  while(Game.accumulator >= FIXED_STEP){
    try{update();}catch(err){console.error('Update error:',err);Game.accumulator=0;break;}
    Game.accumulator-=FIXED_STEP;Game.frame++;
    if(window.CellQuestLegacy.onTick) window.CellQuestLegacy.onTick(FIXED_STEP);
  }
  Game.renderAlpha=Math.min(1,Game.accumulator/FIXED_STEP);
  try{render();}catch(err){console.error('Render error:',err);}
  requestAnimationFrame(loop);
}

