/* ====================================================================
 * game.js — 关卡类、相机、输入、游戏循环、渲染、UI、扩展接口
 * ==================================================================== */

const $ = id => document.getElementById(id);

// ===== Level 类 =====
class Level {
  constructor(mapData){
    this.mapData = mapData;
    this.grid = [];
    this.enemies = [];
    this.items = [];
    this.checkpoints = [];
    this.finish = null;
    this.playerSpawn = { x:64, y:384 };
    this.width = mapData.width || 80;
    this.tutorials = mapData.tutorials || [];
    this.bg = mapData.sky || [C.sky1, C.sky3];
    this.miniSpawnArea = mapData.miniSpawnArea || null;
    this.miniSpawnTimer = 0;
    this.knowledgeCards = mapData.knowledgeCards || [];
    this.pipeSpawners = mapData.pipeSpawners || [];
    this.pipeTimers = this.pipeSpawners.map(() => 0);
    this.pipeCooldowns = this.pipeSpawners.map(() => 0);
    this.pipeTriggered = this.pipeSpawners.map(() => false);
    // 碎裂平台 (Cat Mario 式陷阱)
    this.crumblePlatforms = [];
    this.load();
    this.loadFloatPlatforms(mapData);
  }

  loadFloatPlatforms(mapData){
    Game.floatPlatforms = [];
    if(mapData.floatPlatforms){
      for(const fp of mapData.floatPlatforms){
        Game.floatPlatforms.push(new FloatingPlatform(fp.x, fp.y, fp.range, fp.speed, fp.phase));
      }
    }
  }

  load(){
    const map = this.mapData.map;
    if(!map || map.length === 0) return;
    for(let r=0;r<map.length;r++){
      const line = map[r];
      const arr = [];
      for(let c=0;c<this.width;c++){
        const ch = line[c] || ' ';
        switch(ch){
          case '#': case '=': case 'S': case 'B': case '^': case 'V': case 'J': case 'p':
            arr.push(ch); break;
          case 'P':
            this.playerSpawn = {x:c*TILE, y:r*TILE};
            arr.push(' '); break;
          case 'g':
            this.enemies.push(new Enemy(c*TILE+4, r*TILE+8, 'staph'));
            arr.push(' '); break;
          case 'G':
            this.enemies.push(new Enemy(c*TILE+2, r*TILE, 'staph', true));
            arr.push(' '); break;
          case 't':
            this.enemies.push(new Enemy(c*TILE+4, r*TILE+8, 'strep'));
            arr.push(' '); break;
          case 'C':
            this.checkpoints.push({x:c*TILE, y:r*TILE, col:c, row:r, active:false});
            arr.push(' '); break;
          case 'F':
            this.finish = {x:c*TILE, y:r*TILE, col:c, row:r};
            arr.push(' '); break;
          case 'D':
            this.items.push(new Item(c*TILE+8, r*TILE+8, 'shield'));
            arr.push(' '); break;
          case 'O':
            this.items.push(new Item(c*TILE+8, r*TILE+8, 'oxygen'));
            arr.push(' '); break;
          case 'M':
            this.items.push(new Item(c*TILE+8, r*TILE+8, 'complement'));
            arr.push(' '); break;
          case 'o':
            this.items.push(new Item(c*TILE+8, r*TILE+8, 'coin'));
            arr.push(' '); break;
          case 'f':
            this.items.push(new Item(c*TILE+8, r*TILE+8, 'food'));
            arr.push(' '); break;
          case 'd':
            this.items.push(new Item(c*TILE+8, r*TILE+8, 'drink'));
            arr.push(' '); break;
          case 'n':
            this.items.push(new Item(c*TILE+8, r*TILE+8, 'nutrition'));
            arr.push(' '); break;
          case 'b':
            Game.boss = new Boss(c*TILE, r*TILE + TILE - BOSS_H);
            arr.push(' '); break;
          case '*':
            this.items.push(new Item(c*TILE+8, r*TILE+8, 'memory'));
            arr.push(' '); break;
          case '?':
            Game.qBlocks.push(new QBlock(c*TILE, r*TILE));
            arr.push(' '); break;
          case 'X':
            Game.qBlocks.push(new QBlock(c*TILE, r*TILE, true));
            arr.push(' '); break;
          case 'H':
            arr.push('H'); break;
          case 'F':
            this.finish = {x:c*TILE, y:r*TILE, col:c, row:r};
            arr.push(' '); break;
          case 'a':
            this.items.push(new Item(c*TILE+4, r*TILE+4, 'atp'));
            arr.push(' '); break;
          case '_':
            this.crumblePlatforms.push({x:c*TILE, y:r*TILE, col:c, row:r, state:'solid', timer:0});
            arr.push('_'); break;
          default:
            arr.push(' ');
        }
      }
      this.grid.push(arr);
    }
  }

  solidTile(ch){ return ch==='#'||ch==='='||ch==='S'||ch==='B'||ch==='p'||ch==='_'; }

  // 碎裂平台：检查指定位置是否已崩解（已崩解则不实心）
  isCrumbleGone(col, row){
    for(const cp of this.crumblePlatforms){
      if(cp.col === col && cp.row === row && cp.state === 'gone') return true;
    }
    return false;
  }

  // 触发碎裂平台抖动
  triggerCrumble(col, row){
    for(const cp of this.crumblePlatforms){
      if(cp.col === col && cp.row === row && cp.state === 'solid'){
        cp.state = 'shaking';
        cp.timer = CRUMBLE_SHAKE_FRAMES;
        return;
      }
    }
  }

  updateCrumblePlatforms(){
    for(const cp of this.crumblePlatforms){
      if(cp.state === 'shaking'){
        cp.timer--;
        if(cp.timer <= 0){
          cp.state = 'gone';
          cp.timer = CRUMBLE_RESPAWN_FRAMES;
          spawnParticles(cp.x + TILE/2, cp.y + TILE/2, C.crumbleShake, 12, 3);
        }
      } else if(cp.state === 'gone'){
        cp.timer--;
        if(cp.timer <= 0){
          cp.state = 'solid';
          cp.timer = 0;
        }
      }
    }
  }

  solidAt(col, row){
    if(col<0 || row<0 || row>=this.grid.length) return false;
    if(!this.grid[row] || col>=this.grid[row].length) return false;
    const ch = this.grid[row][col];
    if(!this.solidTile(ch)) return false;
    // 碎裂平台崩解后不实心
    if(ch === '_' && this.isCrumbleGone(col, row)) return false;
    return true;
  }

  solidAtPX(x, y, w, h){
    const c1=Math.floor(x/TILE), c2=Math.floor((x+w-1)/TILE);
    const r1=Math.floor(y/TILE), r2=Math.floor((y+h-1)/TILE);
    for(let r=r1;r<=r2;r++) for(let c=c1;c<=c2;c++)
      if(this.solidAt(c,r)) return true;
    return false;
  }

  tileAt(px, py){
    const col=Math.floor(px/TILE), row=Math.floor(py/TILE);
    if(row<0||row>=this.grid.length||!this.grid[row]||col<0||col>=this.grid[row].length) return ' ';
    return this.grid[row][col];
  }

  getOverlapTiles(ent){
    const c1=Math.floor(ent.x/TILE), c2=Math.floor((ent.x+ent.w-1)/TILE);
    const r1=Math.floor(ent.y/TILE), r2=Math.floor((ent.y+ent.h-1)/TILE);
    const tiles=[];
    for(let r=r1;r<=r2;r++) for(let c=c1;c<=c2;c++)
      tiles.push({col:c, row:r, tile:(this.grid[r]&&this.grid[r][c])||' '});
    return tiles;
  }

  respawnEnemies(){
    // 重置非迷你敌人，清除迷你敌人
    this.enemies = this.enemies.filter(e => !e.isMini);
    for(const e of this.enemies) e.reset();
    // 重置Boss
    if(Game.boss) Game.boss.reset();
  }

  // ===== 潮汐系统 =====
  isTideSurge(){
    if(Game.tidePaused > 0) return false; // 血小板止血暂停
    const hp = Game.healingProgress;
    const cycle = TIDE_CYCLE + Math.floor(hp * TIDE_CYCLE * 0.5); // 周期最多延长50%
    const surge = Math.max(30, TIDE_SURGE_FRAMES - Math.floor(hp * TIDE_SURGE_FRAMES * 0.5)); // 涌动最多缩短50%
    return (Game.tideTimer % cycle) < surge;
  }
  isTideWarn(){
    if(Game.tidePaused > 0) return false;
    const hp = Game.healingProgress;
    const cycle = TIDE_CYCLE + Math.floor(hp * TIDE_CYCLE * 0.5);
    const surge = Math.max(30, TIDE_SURGE_FRAMES - Math.floor(hp * TIDE_SURGE_FRAMES * 0.5));
    const t = Game.tideTimer % cycle;
    return t >= (surge - TIDE_WARN_FRAMES) && t < surge;
  }

  // ===== 迷你敌人刷新（仅潮涌期·氧气领域停止·愈合衰减） =====
  updateMiniSpawn(player){
    if(!this.miniSpawnArea) return;
    if(Game.oxyField) return; // 氧气领域抑制刷新
    if(!this.isTideSurge()) return; // 仅潮涌周期内批量刷新
    const hp = Game.healingProgress;
    const interval = MINI_SPAWN_INTERVAL + Math.floor(hp * MINI_SPAWN_INTERVAL); // 间隔最多翻倍
    const maxCount = Math.max(0, MINI_SPAWN_MAX - Math.ceil(hp * MINI_SPAWN_MAX)); // 上限递减至0
    this.miniSpawnTimer++;
    if(this.miniSpawnTimer < interval) return;
    this.miniSpawnTimer = 0;
    const miniCount = this.enemies.filter(e => e.isMini && e.alive).length;
    if(miniCount >= maxCount) return;
    const spawnCol = this.miniSpawnArea.colStart + Math.floor(Math.random() * (this.miniSpawnArea.colEnd - this.miniSpawnArea.colStart));
    const dx = Math.abs(spawnCol * TILE - player.x);
    if(dx > CW) return;
    const mini = new Enemy(spawnCol * TILE, 12 * TILE, 'staph');
    mini.makeMini();
    this.enemies.push(mini);
    spawnParticles(spawnCol*TILE + TILE/2, 13*TILE, C.miniStaph, 8, 1.5);
  }

  // ===== 管道刷怪 =====
  updatePipeSpawns(player){
    for(let i=0;i<this.pipeSpawners.length;i++){
      const ps = this.pipeSpawners[i];
      const px = ps.col * TILE;
      const dx = Math.abs(px - player.x);
      if(dx > CW * 1.5) continue;
      
      // Cooldown tick
      if(this.pipeCooldowns[i] > 0){ this.pipeCooldowns[i]--; continue; }
      
      const trigger = ps.trigger || 'timer';
      if(trigger === 'proximity'){
        const range = (ps.range || 5) * TILE;
        if(dx < range && !this.pipeTriggered[i]){
          this.pipeTriggered[i] = true;
          this.spawnPipeEnemy(ps, i);
        }
        if(dx > range * 1.5) this.pipeTriggered[i] = false;
      } else if(trigger === 'contact'){
        // 踩上管道才出怪
        const px2 = ps.col * TILE;
        const py2 = ps.row * TILE;
        if(Math.abs(player.x - px2) < TILE * 1.2 && 
           player.y + player.h > py2 - 4 && player.y + player.h < py2 + TILE &&
           !this.pipeTriggered[i]){
          this.pipeTriggered[i] = true;
          this.spawnPipeEnemy(ps, i);
        }
        if(Math.abs(player.x - px2) > TILE * 3) this.pipeTriggered[i] = false;
      } else {
        this.pipeTimers[i]++;
        if(this.pipeTimers[i] < (ps.interval || 300)) continue;
        this.pipeTimers[i] = 0;
        this.spawnPipeEnemy(ps, i);
      }
    }
  }
  
  spawnPipeEnemy(ps, i){
    const ex = ps.col * TILE + TILE/2;
    const ey = ps.row * TILE - 8;
    const enemy = new Enemy(ps.col * TILE + 4, ey, ps.type || 'staph');
    enemy.vy = ps.trigger === 'contact' ? -9 : -5; // contact: 飞出天际
    enemy.flyAway = ps.trigger === 'contact';      // 不落地
    this.enemies.push(enemy);
    spawnParticles(ex, ey, ps.type==='strep'?C.strep:C.staph, 8, 3);
    if(ps.trigger === 'proximity' || ps.trigger === 'contact'){
      this.pipeCooldowns[i] = ps.cooldown || 180;
    }
  }

  draw(ctx, camX){
    const startCol=Math.max(0,Math.floor(camX/TILE));
    const endCol=Math.min(this.width-1, Math.ceil((camX+CW)/TILE));
    for(let r=0;r<this.grid.length;r++){
      for(let c=startCol;c<=endCol;c++){
        const ch=this.grid[r][c];
        if(ch===' ') continue;
        this.drawTile(ctx, ch, Math.round(c*TILE-camX), r*TILE, c, r);
      }
    }
    for(const cp of this.checkpoints) this.drawCheckpoint(ctx, cp, camX);
    if(this.finish) this.drawGate(ctx, camX);
  }

  drawTile(ctx, ch, x, y, col, row){
    switch(ch){
      case '#':
        ctx.fillStyle=C.ground; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=C.groundTop; ctx.fillRect(x,y,TILE,4);
        ctx.fillStyle=C.groundDark;
        ctx.fillRect(x+5,y+12,3,3); ctx.fillRect(x+20,y+18,3,3); ctx.fillRect(x+12,y+24,3,3);
        break;
      case '=':
        ctx.fillStyle=C.platform; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=C.platformTop; ctx.fillRect(x,y,TILE,4);
        break;
      case 'S':
        ctx.fillStyle=C.scab; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=C.scabTop; ctx.fillRect(x,y,TILE,4);
        ctx.fillStyle=C.scabDark;
        ctx.fillRect(x+6,y+10,4,4); ctx.fillRect(x+18,y+16,4,4);
        ctx.fillRect(x+12,y+22,3,3);
        break;
      case 'B':
        // 潮汐变色
        if(this.isTideSurge()){
          ctx.fillStyle=C.tideSurge;
        } else if(this.isTideWarn()){
          const flash = Math.floor(Game.frame/4)%2===0;
          ctx.fillStyle = flash ? C.tideWarn : C.bloodLoss;
        } else {
          ctx.fillStyle=C.bloodLoss;
        }
        ctx.fillRect(x,y,TILE,TILE);
        // 顶部
        ctx.fillStyle = this.isTideSurge() ? '#ff4050' : C.bloodLossTop;
        ctx.fillRect(x,y,TILE,4);
        // 滴血动画
        const drip=(Math.floor(Game.frame/20)+col)%4;
        ctx.fillStyle=C.bloodLoss;
        ctx.globalAlpha=0.6;
        ctx.fillRect(x+2+drip*7, y+TILE-8, 2, 8);
        ctx.globalAlpha=1;
        // 潮涌时波纹
        if(this.isTideSurge()){
          ctx.save();
          ctx.globalAlpha=0.3+Math.sin(Game.frame*0.1+col)*0.15;
          ctx.fillStyle=C.tideWarn;
          ctx.fillRect(x, y - 4 + Math.sin(Game.frame*0.08+col)*2, TILE, 4);
          ctx.restore();
        }
        break;
      case '^':
        ctx.fillStyle=C.spike;
        for(let i=0;i<4;i++){
          ctx.beginPath();
          ctx.moveTo(x+i*8, y+TILE);
          ctx.lineTo(x+i*8+4, y+4);
          ctx.lineTo(x+i*8+8, y+TILE);
          ctx.closePath(); ctx.fill();
        }
        break;
      case 'V':
        // 弹簧方块：绿色弹跳垫
        ctx.fillStyle = '#2a6a4a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#4acd6a';
        ctx.fillRect(x+2, y+TILE-8, TILE-4, 8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('▲', x + TILE/2, y + TILE - 4);
        ctx.fillText('SPRING', x + TILE/2, y + TILE/2);
        break;
      case 'J':
        // 左心室泵跳板：红色弹跳垫
        ctx.fillStyle = '#c04040';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#ff6060';
        ctx.fillRect(x+2, y+TILE-6, TILE-4, 6);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('PUMP', x + TILE/2, y + TILE/2);
        break;
      case 'p':
        // 血管管道：暗绿色圆柱
        ctx.fillStyle = '#1a5c2a';
        ctx.fillRect(x+2, y, TILE-4, TILE);
        ctx.fillStyle = '#2a8c3a';
        ctx.fillRect(x+2, y, TILE-4, 4);
        ctx.fillRect(x+2, y, 6, TILE);
        ctx.fillStyle = '#0d3d15';
        ctx.fillRect(x+TILE-8, y, 6, TILE);
        break;
      case 'H':
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = C.hiddenWall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = C.hiddenWallHint;
        ctx.fillRect(x+4, y+4, TILE-8, TILE-8);
        ctx.globalAlpha = 1;
        break;
      case '_':
        // 碎裂平台：检查状态
        { const cp = this.crumblePlatforms.find(p => p.col === col && p.row === row);
          if(cp && cp.state === 'gone') break; // 已崩解不绘制
          const shaking = cp && cp.state === 'shaking';
          const shakeX = shaking ? Math.sin(cp.timer * 0.8) * 3 : 0;
          ctx.fillStyle = shaking ? C.crumbleShake : C.crumble;
          ctx.fillRect(x + shakeX, y, TILE, TILE);
          ctx.fillStyle = shaking ? '#ffcc66' : C.crumbleTop;
          ctx.fillRect(x + shakeX, y, TILE, 4);
          // 抖动时画裂纹
          if(shaking){
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(x+4, y+4); ctx.lineTo(x+10, y+20); ctx.lineTo(x+18, y+8);
            ctx.lineTo(x+26, y+24);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        break;
    }
  }

  drawCheckpoint(ctx, cp, camX){
    const x=Math.round(cp.x) - Math.round(camX) + Math.round(TILE/2), y=cp.y+TILE/2;
    const t=Game.frame*0.05;
    const col = cp.active ? C.checkpointActive : C.checkpoint;
    ctx.save();
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
    ctx.fillText(cp.active?'✓':'C', x, y+5);
    ctx.restore();
  }

  drawGate(ctx, camX){
    const x = Math.round(this.finish.x) - Math.round(camX);
    const y = this.finish.y;
    const t = Game.frame * 0.06;
    const winMet = (Game.winCondition === WIN_KILL_ALL && Game.allEnemiesDead)
                || (Game.winCondition === WIN_COLLECT_ALL && Game.itemsCollected >= Game.totalItems);
    
    ctx.save();
    if(winMet){
      // 门打开：金色光柱 + 门板向两侧滑开
      const openAmt = Math.min(1, (Game.frame % 120) / 30); // 渐开动画
      // 光柱
      const grad = ctx.createLinearGradient(x+TILE/2, y-60, x+TILE/2, y+TILE);
      grad.addColorStop(0, 'rgba(255,215,0,0)');
      grad.addColorStop(0.5, C.gateGlow);
      grad.addColorStop(1, 'rgba(255,215,0,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y-60, TILE, TILE+60);
      // 左门板
      ctx.fillStyle = C.gateOpen;
      ctx.fillRect(x + 2 - openAmt * TILE/2, y, TILE/2 - 2, TILE);
      // 右门板
      ctx.fillRect(x + TILE/2 + openAmt * TILE/2, y, TILE/2 - 2, TILE);
      // 顶部门楣
      ctx.fillStyle = C.gateOpen;
      ctx.fillRect(x+2, y-4, TILE-4, 8);
      // 脉冲光环
      ctx.globalAlpha = 0.3 + Math.sin(t*2)*0.15;
      ctx.strokeStyle = C.gateOpen;
      ctx.lineWidth = 2;
      ctx.strokeRect(x+1, y, TILE-2, TILE);
      ctx.globalAlpha = 1;
    } else {
      // 门锁着：深色门 + 锁图标
      ctx.fillStyle = C.gateLocked;
      ctx.fillRect(x+2, y, TILE-4, TILE);
      ctx.fillStyle = '#6a4a0a';
      ctx.fillRect(x+4, y+2, TILE-8, TILE-4);
      // 锁
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', x+TILE/2, y+TILE/2+5);
      // 条件提示
      ctx.fillStyle = '#ffd700';
      ctx.font = '9px sans-serif';
      const hint = Game.winCondition === WIN_KILL_ALL ? '消灭全部敌人' : '收集全部物品';
      ctx.fillText(hint, x+TILE/2, y-6);
    }
    ctx.restore();
  }
}

// ===== 输入系统 =====
const KEY_MAP = {
  ArrowLeft:'left', a:'left', A:'left',
  ArrowRight:'right', d:'right', D:'right',
  ArrowUp:'jump', w:'jump', W:'jump', ' ':'jump',
  ArrowDown:'down', s:'down', S:'down',
  e:'skill', E:'skill',
  Shift:'dash',
};

function setupInput(){
  // 点击游戏区域获取焦点
  const container = $('game-container');
  const focusPrompt = $('focus-prompt');
  container.addEventListener('click', ()=>{
    container.focus();
    if(focusPrompt) focusPrompt.classList.add('hidden');
  });
  // 焦点丢失时显示提示（仅游戏中）
  container.addEventListener('blur', ()=>{
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
      Game.keys[KEY_MAP[e.key]] = true;
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
    // 教程对话：Space/Enter 继续（忽略按键重复）
    if(Game.tutorialPause && !e.repeat && (e.key===' '||e.key==='Enter')){
      dismissTutorial();
      e.preventDefault();
    }
    if(e.key==='Escape' && Game.state==='playing' && !Game.memoryCardOpen && !Game.tutorialPause){
      togglePause();
    }
  });
  document.addEventListener('keyup', e=>{
    if(KEY_MAP[e.key] !== undefined){
      Game.keys[KEY_MAP[e.key]] = false;
    }
  });
  // blur 时清除按键（防止粘键）
  window.addEventListener('blur', ()=>{ Game.keys = {}; });
}

// ===== 背景渲染 =====
function drawBackground(ctx, camX, bg){
  // 绘制场景背景图（视差滚动）
  if(Game.bgImg && Game.bgImg.complete){
    const img = Game.bgImg;
    // cover 模式：图片铺满整个画布
    const scale = Math.max(CW / img.width, CH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const offsetX = Math.round(((camX * 0.2) % w + w) % w); // 视差
    ctx.drawImage(img, -offsetX, 0, w, h);
    ctx.drawImage(img, -offsetX + w, 0, w, h); // 无缝衔接
  } else {
    // 图片未加载时用渐变兜底
    const grad = ctx.createLinearGradient(0,0,0,CH);
    grad.addColorStop(0, bg[0]);
    grad.addColorStop(1, bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,CW,CH);
  }

  const farX = Math.round(camX * 0.15);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ff6b8a';
  for(let i=0;i<12;i++){
    const baseX = i*180;
    const x = ((baseX - farX) % (12*180) + 12*180) % (12*180) - 100;
    const y = 40 + (i%4)*100;
    ctx.beginPath();
    ctx.arc(x, y, 35+(i%3)*15, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  const midX = Math.round(camX * 0.4);
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ff4466';
  ctx.lineWidth = 6;
  for(let i=0;i<4;i++){
    const y = 80 + i*100;
    ctx.beginPath();
    for(let x=-60; x<CW+60; x+=8){
      const wy = y + Math.sin((x+midX)*0.015 + i) * 18;
      if(x===-60) ctx.moveTo(x,wy); else ctx.lineTo(x,wy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ===== 相机 =====
function updateCamera(){
  const p = Game.player;
  const lvl = Game.level;
  let cx = p.x - CW/2 + p.w/2;
  cx = Math.max(0, Math.min(cx, lvl.width*TILE - CW));
  Game.camera.x = cx;
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
  }
  Game.renderAlpha=Math.min(1,Game.accumulator/FIXED_STEP);
  try{render();}catch(err){console.error('Render error:',err);}
  requestAnimationFrame(loop);
}

// ===== 更新逻辑 =====
function update(){
  if(Game.state !== 'playing') return;

  if(Game.memoryCardOpen){
    Game.prevKeys = {...Game.keys};
    if(Game.camera.shake > 0) Game.camera.shake = 0;
    return;
  }
  if(Game.tutorialPause){
    Game.prevKeys = {...Game.keys};
    return;
  }
  if(Game.paused){
    Game.prevKeys = {...Game.keys};
    return;
  }

  const p = Game.player;
  const lvl = Game.level;

  // v2: ATP 基础代谢消耗
  Game.globalEnergy -= PASSIVE_DRAIN;
  if(Game.globalEnergy < 0) Game.globalEnergy = 0;

  // 开局出血期（前8秒持续缓慢扣能量）
  if(Game.bleedingTimer < BLEEDING_PHASE_FRAMES){
    Game.bleedingTimer++;
    Game.globalEnergy -= BLEEDING_DRAIN;
    if(Game.globalEnergy < 0) Game.globalEnergy = 0;
  }

  // 潮汐计时（止血暂停期间仍推进周期）
  if(Game.tidePaused > 0) Game.tidePaused--;
  Game.tideTimer++;

  // 玩家更新
  p.update(lvl);

  // 缺口未止血倍率
  if(p.x > 24 * TILE && !Game.bridgeUsedInGap){
    Game.gapBloodMult = GAP_BLOOD_MULT;
  } else {
    Game.gapBloodMult = 1;
  }

  // 愈合衰减进度（越靠近终点，潮汐/刷新逐步消退）
  const healStart = HEALING_START_COL * TILE;
  const healEnd = HEALING_END_COL * TILE;
  Game.healingProgress = p.x > healStart
    ? Math.min(1, (p.x - healStart) / (healEnd - healStart))
    : 0;

  // 死亡闪烁
  if(Game.deathTimer > 0){
    Game.deathTimer--;
    $('death-flash').classList.toggle('active', Game.deathTimer > 15);
  }

  // 敌人更新
  const prevKills = Game.stats.kills;
  for(const e of lvl.enemies) e.update(lvl, p);
  // 清除死亡敌人（保留非迷你死亡敌人用于重生）
  lvl.enemies = lvl.enemies.filter(e => e.alive || !e.isMini);

  // v2: 击杀回能
  const killedThisFrame = Game.stats.kills - prevKills;
  if(killedThisFrame > 0){
    Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + killedThisFrame * KILL_ATP_SMALL);
  }

  // Boss更新
  if(Game.boss) Game.boss.update(lvl, p);

  // 全敌击杀检测（含Boss）
  const allEnemiesDead = lvl.enemies.every(e => !e.alive) && (!Game.boss || !Game.boss.alive);
  Game.allEnemiesDead = allEnemiesDead;

  // 道具更新
  for(const it of lvl.items) it.update(p);
  // 记忆卡片可能在此弹出，立即暂停本帧后续逻辑
  if(Game.memoryCardOpen){
    Game.prevKeys = {...Game.keys};
    return;
  }

  // 子弹更新
  for(const pr of Game.projectiles) pr.update(lvl, lvl.enemies);
  Game.projectiles = Game.projectiles.filter(pr=>pr.alive);

  // 临时平台更新
  for(const tp of Game.tempPlatforms) tp.update();
  Game.tempPlatforms = Game.tempPlatforms.filter(tp=>!tp.expired);

  // 脓液地块更新
  for(const pt of Game.pusTiles) pt.update();
  Game.pusTiles = Game.pusTiles.filter(pt=>!pt.expired);

  // 碎裂平台更新
  lvl.updateCrumblePlatforms();

  // 浮动平台更新
  for(const fp of Game.floatPlatforms) fp.update();

  // 粒子更新
  for(const pa of Game.particles) pa.update();
  Game.particles = Game.particles.filter(pa=>pa.life>0);
  for(const dn of Game.damageNumbers)dn.update();Game.damageNumbers=Game.damageNumbers.filter(dn=>dn.life>0);
  // 迷你敌人刷新
  lvl.updateMiniSpawn(p);
  // 管道刷怪
  lvl.updatePipeSpawns(p);

  // 存档点检测
  for(const cp of lvl.checkpoints){
    if(!cp.active && p.x+p.w > cp.x && p.x < cp.x+TILE && p.y+p.h > cp.y && p.y < cp.y+TILE){
      cp.active = true;
      p.checkpointX = cp.x + 4;
      p.checkpointY = cp.y;
      Sfx.checkpoint();
      showToast('存档点激活！');
      spawnParticles(cp.x+TILE/2, cp.y+TILE/2, C.checkpoint, 12, 2);
    }
  }

  // 终点门检测
  if(lvl.finish && p.x+p.w > lvl.finish.x+2 && p.x < lvl.finish.x+TILE-2 &&
     p.y+p.h > lvl.finish.y && p.y < lvl.finish.y+TILE){
    if(Game.winCondition === WIN_KILL_ALL && !Game.allEnemiesDead){
      showToast('还有细菌未消灭！\n请清除全部敌人后再进入大门');
    } else if(Game.winCondition === WIN_COLLECT_ALL && Game.itemsCollected < Game.totalItems){
      showToast(`还有物品未收集！\n已收集 ${Game.itemsCollected}/${Game.totalItems}`);
    } else {
      levelComplete();
      return;
    }
  }

  // 教程触发
  checkTutorials();
  // 知识卡片触发
  checkKnowledgeCards();

  // 相机
  updateCamera();

  // 计时器
  Game.levelTime = performance.now() - Game.levelStartTime;

  // HUD
  if(Game.frame % 6 === 0) updateHUD();

  Game.prevKeys = {...Game.keys};
}

// ===== 渲染 =====
function render(){
  const ctx = Game.ctx;
  ctx.clearRect(0,0,CW,CH);

  if(Game.state === 'menu' || Game.state === 'hub'){
    const t = Game.frame * 0.01;
    const grad = ctx.createLinearGradient(0,0,0,CH);
    grad.addColorStop(0, '#0a0a18');
    grad.addColorStop(1, '#1a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,CW,CH);
    ctx.save();
    ctx.globalAlpha = 0.15;
    for(let i=0;i<8;i++){
      const x = (i*120 + Math.sin(t+i)*30) % CW;
      const y = 60 + (i%3)*120 + Math.cos(t+i)*20;
      ctx.fillStyle = ['#e94560','#ff6b6b','#4fc3f7','#ab47bc'][i%4];
      ctx.beginPath(); ctx.arc(x, y, 25+Math.sin(t*2+i)*8, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    return;
  }

  if(Game.state !== 'playing' && Game.state !== 'paused') return;

  const lvl = Game.level;
  const p=Game.player;const ex=p.x+p.vx*Game.renderAlpha;
  let camX=ex-CW/2+p.w/2;camX=Math.max(0,Math.min(camX,lvl.width*TILE-CW));
  const shakeX=Game.camera.shake>0?Math.sin(Game.frame*1.7)*Game.camera.shake*0.7:0;
  const shakeY=Game.camera.shake>0?Math.cos(Game.frame*2.3)*Game.camera.shake*0.7:0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(ctx, camX, lvl.bg);
  lvl.draw(ctx, camX);
  for(const tp of Game.tempPlatforms) tp.draw(ctx, camX);
  for(const pt of Game.pusTiles) pt.draw(ctx, camX);
  for(const fp of Game.floatPlatforms) fp.draw(ctx, camX);
  for(const it of lvl.items) it.draw(ctx, camX);
  for(const e of lvl.enemies) e.draw(ctx, camX);
  if(Game.boss) Game.boss.draw(ctx, camX);
  for(const pr of Game.projectiles) pr.draw(ctx, camX);
  if(Game.player) Game.player.draw(ctx, camX);
  for(const pa of Game.particles) pa.draw(ctx, camX);
  for(const dn of Game.damageNumbers) dn.draw(ctx, camX);
  for(const qb of Game.qBlocks) qb.draw(ctx, camX);
  ctx.restore();

  // 潮汐状态指示器 (屏幕顶部)
  if(Game.tidePaused > 0){
    // 止血暂停：绿色平静指示
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Game.frame*0.2)*0.1;
    ctx.fillStyle = C.heal;
    ctx.fillRect(0, 0, CW, 3);
    ctx.restore();
  } else if(lvl.isTideSurge()){
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(Game.frame*0.1)*0.05;
    ctx.fillStyle = C.tideSurge;
    ctx.fillRect(0, 0, CW, 3);
    ctx.restore();
  } else if(lvl.isTideWarn()){
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Game.frame*0.3)*0.15;
    ctx.fillStyle = C.tideWarn;
    ctx.fillRect(0, 0, CW, 3);
    ctx.restore();
  }

  // 开局出血期红色覆盖
  if(Game.bleedingTimer < BLEEDING_PHASE_FRAMES){
    const intensity = 1 - (Game.bleedingTimer / BLEEDING_PHASE_FRAMES);
    ctx.save();
    ctx.globalAlpha = intensity * 0.1;
    ctx.fillStyle = C.bloodLoss;
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = C.bloodLoss;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = intensity * 0.6;
    ctx.fillText('⚠ 出血期', CW/2, 18);
    ctx.restore();
  }

  // 愈合衰减暖色覆盖
  if(Game.healingProgress > 0){
    ctx.save();
    ctx.globalAlpha = Game.healingProgress * 0.08;
    ctx.fillStyle = C.heal;
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

}

// ===== HUD 更新 =====
function updateHUD(){
  if(!Game.player) return;
  const p = Game.player;

  // 左上角角色头像（跟随当前细胞）
  const avatarEl = $('cell-avatar');
  if(avatarEl){
    avatarEl.className = '';
    avatarEl.classList.add(p.cellType === 1 ? 'wbc' : p.cellType === 2 ? 'plt' : 'rbc');
    avatarEl.innerHTML = getCellAvatarHTML(p.cellType);
  }

  // 红心
  const heartsDiv = $('hearts');
  let html = '';
  for(let i=0;i<p.maxHealth;i++){
    const filled = i < p.health;
    html += `<div class="heart${filled?'':' empty'}"><svg viewBox="0 0 24 22"><path d="M12 21l-1.5-1.4C5 14.7 2 11.9 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.4-3 6.2-8.5 11.1L12 21z" fill="${filled?'#ff4757':'#3a1520'}" stroke="${filled?'#ff6b8a':'#4a2030'}" stroke-width="1"/></svg></div>`;
  }
  heartsDiv.innerHTML = html;

  // 能量条
  const pct=(Game.globalEnergy/getMaxEnergy())*100;
  const ef = $('energy-fill');
  ef.style.width = pct + '%';
  ef.className=pct<LOW_ENERGY?'low':'';
  const lvBadge=$('level-badge');if(lvBadge)lvBadge.textContent='Lv.'+Game.playerLevel;
  const xpFill=$('xp-fill');if(xpFill){const xpNext=xpForLevel(Game.playerLevel+1);const xpCurr=Game.playerLevel<=1?0:xpForLevel(Game.playerLevel);const xpPct=xpNext>xpCurr?((Game.xp-xpCurr)/(xpNext-xpCurr))*100:100;xpFill.style.width=Math.min(100,Math.max(0,xpPct))+'%';}
  // 细胞名称
  $('cell-name').textContent = p.cell.name;
  document.querySelector('#cell-badge .dot').style.background = p.cell.color;

  // Buff图标
  const buffsDiv = $('buffs');
  let bh = '';
  if(p.shield > 0){
    const sec = Math.ceil(p.shield/60);
    bh += `<div class="buff-icon" style="border-color:${C.shield};color:${C.shield}">盾<span class="timer">${sec}</span></div>`;
  }
  if(p.oxygen > 0){
    const sec = Math.ceil(p.oxygen/60);
    bh += `<div class="buff-icon" style="border-color:${C.oxygen};color:${C.oxygen}">O₂<span class="timer">${sec}</span></div>`;
  }
  if(p.complementAmmo > 0){
    bh += `<div class="buff-icon" style="border-color:${C.complement};color:${C.complement}">补<span class="timer">×${p.complementAmmo}</span></div>`;
  }
  if(p.aoeStomp > 0){
    const sec = Math.ceil(p.aoeStomp/60);
    bh += `<div class="buff-icon" style="border-color:${C.aoeBuff};color:${C.aoeBuff}">AOE<span class="timer">${sec}</span></div>`;
  }
  if(Game.oxyField){
    bh += `<div class="buff-icon" style="border-color:${C.oxyField};color:${C.oxyField}">领域<span class="timer">ON</span></div>`;
  }
  if(Game.tidePaused > 0){
    const sec = Math.ceil(Game.tidePaused/60);
    bh += `<div class="buff-icon" style="border-color:${C.heal};color:${C.heal}">止血<span class="timer">${sec}</span></div>`;
  }
  buffsDiv.innerHTML = bh;

  // 计时器
  const timerDiv = $('timer');
  if(timerDiv){
    timerDiv.textContent = formatTime(Game.levelTime);
  }

  // 记忆细胞标记
  const memIcon = $('memory-icon');
  if(memIcon){
    memIcon.classList.toggle('found', Game.stats.foundMemory);
  }

  // v2: 通关目标显示
  const objEl = $('objective-display');
  if(objEl){
    if(Game.winCondition === WIN_KILL_ALL){
      const alive = (Game.level.enemies.filter(e=>e.alive).length) + (Game.boss&&Game.boss.alive?1:0);
      objEl.textContent = alive === 0 ? '⚔️ ✓' : `⚔️ ${alive}`;
      objEl.style.color = alive === 0 ? '#66ff66' : '#ff6b6b';
    } else if(Game.winCondition === WIN_COLLECT_ALL){
      const done = Game.itemsCollected >= Game.totalItems;
      objEl.textContent = `📦 ${Game.itemsCollected}/${Game.totalItems}`;
      objEl.style.color = done ? '#66ff66' : '#ffd700';
    }
  }

  // v2: 动态底栏
  const ctrlEl = $('hud-controls');
  if(ctrlEl && Game.player){
    if(Game.player.cellType === 1){
      ctrlEl.innerHTML = '<span><kbd>←→</kbd>移动</span> <span class="sep">|</span> <span><kbd>空格</kbd>跳跃</span> <span class="sep">|</span> <span><kbd>↓</kbd>下蹲</span> <span class="sep">|</span> <span><kbd>E</kbd>挥剑</span> <span class="sep">|</span> <span><kbd>Shift</kbd>突进</span>';
    } else {
      ctrlEl.innerHTML = '<span><kbd>←→</kbd>移动</span> <span class="sep">|</span> <span><kbd>空格</kbd>跳跃</span> <span class="sep">|</span> <span><kbd>↓</kbd>下蹲</span>';
    }
  }
}

// ===== 头像：使用角色设计原画裁切图 =====
const _AVATAR_SPRITES = {
  1: { src: 'images/avatar-wbc.png', name: 'wbc' },   // 白细胞 Aetherion 脸部
  2: { src: 'images/avatar-plt.png', name: 'plt' },     // 血小板 脸部
  3: { src: 'images/avatar-rbc.png', name: 'rbc' },     // 红细胞 R-07 脸部
};

// 根据细胞类型返回左上角头像 HTML
function getCellAvatarHTML(cellType){
  const cfg = _AVATAR_SPRITES[cellType];
  return `<img src="${cfg.src}" alt="${cfg.name}" class="avatar-img avatar-${cfg.name}">`;
}

function formatTime(ms){
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

// ===== 教程系统（对话气泡） =====
function checkTutorials(){
  // 已通关或全部跳过后不再显示教程
  if(Game.tutorialsDone) return;
  const p = Game.player;
  const lvl = Game.level;
  for(let i=0;i<lvl.tutorials.length;i++){
    const tut = lvl.tutorials[i];
    if(Game.tutShown[i]) continue;
    if(p.x > tut.x){
      Game.tutShown[i] = true;
      // 持久化：已看过的教程不再重复弹出
      try{
        localStorage.setItem('cellQuest_tutShown_' + Game.levelIndex, JSON.stringify(Game.tutShown));
      }catch(e){}
      // 动态跟随当前角色：useCurrent 标记的教程用玩家当前细胞发言
      if(tut.useCurrent){
        showTutorial(p.cell.name, p.cell.color, tut.body);
      } else {
        showTutorial(tut.speaker, tut.color, tut.body);
      }
      return;
    }
  }
}

let tutorialQueue = [];
function showTutorial(speaker, color, body){
  tutorialQueue.push({speaker, color, body});
  if(!Game.tutorialPause) showNextTutorial();
}

function showNextTutorial(){
  if(tutorialQueue.length === 0) return;
  const tut = tutorialQueue.shift();
  Game.tutorialPause = true;
  $('bubble-speaker').textContent = tut.speaker.trim();
  $('bubble-speaker').style.color = tut.color;
  $('bubble-body').textContent = tut.body;
  $('dialogue-bubble').classList.add('active');
}

function dismissTutorial(){
  $('dialogue-bubble').classList.remove('active');
  if(tutorialQueue.length > 0){
    // 保持 tutorialPause=true，防止间隔期间 checkTutorials 触发新教程
    setTimeout(showNextTutorial, 100);
  } else {
    Game.tutorialPause = false;
  }
  // 清除 jump 键状态，防止关闭对话框的 Space/Enter 被消费为跳跃输入（空中卡住 bug）
  Game.keys.jump = false;
  if(Game.player) Game.player.jumpBuffer = 0;
}

function skipAllTutorials(){
  const lvl = Game.level;
  if(lvl){
    for(let i=0;i<lvl.tutorials.length;i++) Game.tutShown[i] = true;
    try{
      localStorage.setItem('cellQuest_tutShown_' + Game.levelIndex, JSON.stringify(Game.tutShown));
    }catch(e){}
  }
  tutorialQueue = [];
  $('dialogue-bubble').classList.remove('active');
  Game.tutorialPause = false;
  Game.tutorialsDone = true;
  try{ localStorage.setItem('cellQuest_tutorials_done', '1'); }catch(e){}
}

// ===== 记忆细胞科普卡片 =====
function showMemoryCard(){
  showKnowledgeCard(MEMORY_CARD.title, MEMORY_CARD.text);
}

// 通用知识卡片（白细胞/红细胞/血小板/记忆细胞）
function showKnowledgeCard(title, text){
  const card = $('memory-card');
  $('memory-card-title').textContent = title;
  $('memory-card-text').textContent = text;
  card.classList.remove('hidden');
  Game.memoryCardOpen = true;
  Game.memoryCardOpenTime = performance.now();
}

// 知识卡片位置触发（白细胞/红细胞/血小板）
function checkKnowledgeCards(){
  if(!Game.level || !Game.level.knowledgeCards) return;
  if(Game.memoryCardOpen) return;
  if(Game.tutorialPause) return;
  const p = Game.player;
  for(const kc of Game.level.knowledgeCards){
    if(Game.knowledgeShown[kc.key]) continue;
    if(p.x > kc.x){
      // 如果指定了y坐标，需要玩家在该高度附近才触发（y越小越高）
      if(kc.y !== undefined && p.y > kc.y + 20){
        continue; // 玩家不够高，跳过
      }
      Game.knowledgeShown[kc.key] = true;
      showKnowledgeCard(kc.title, kc.text);
      return;
    }
  }
}

function closeMemoryCard(){
  $('memory-card').classList.add('hidden');
  if(Game.memoryCardOpen){
    // 补偿暂停期间的计时器，避免速通时间包含读卡时间
    Game.levelStartTime += performance.now() - Game.memoryCardOpenTime;
  }
  Game.memoryCardOpen = false;
}

// ===== Toast =====
let toastTimer = null;
function showToast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('active');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('active'), 2500);
}

// ===== 角色图鉴 =====
function showPedia(){
  $('hub-screen').classList.add('hidden');
  $('pedia-screen').classList.remove('hidden');
}
function closePedia(){
  $('pedia-screen').classList.add('hidden');
  $('hub-screen').classList.remove('hidden');
}
function showCharDetail(type){
  const bgMap = { wbc: 'char-wbc.jpg', rbc: 'char-rbc.jpg', plt: 'char-plt.jpg' };
  const img = $('char-detail-img');
  img.src = 'images/' + bgMap[type];
  $('pedia-screen').classList.add('hidden');
  $('char-detail-screen').classList.remove('hidden');
}
function closeCharDetail(){
  $('char-detail-screen').classList.add('hidden');
  $('pedia-screen').classList.remove('hidden');
}

// ===== 状态转换 =====
function showMenu(){
  Game.state = 'menu';
  $('main-menu').classList.remove('hidden');
  $('hub-screen').classList.add('hidden');
  $('hud').classList.remove('active');
  $('pause-menu').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  const fp = $('focus-prompt');
  if(fp) fp.classList.add('hidden');
}

function showHub(){
  Game.state = 'hub';
  // 刷新自定义关卡（编辑器可能新保存了关卡）
  refreshCustomLevels();
  $('main-menu').classList.add('hidden');
  $('hub-screen').classList.remove('hidden');
  $('hud').classList.remove('active');
  $('pause-menu').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  const fp = $('focus-prompt');
  if(fp) fp.classList.add('hidden');
  renderLevelGrid();
}

function updateHubEnergy(){
  // 主城界面已改为细胞人物介绍，不再显示全局能量条
  // 保留函数兼容旧存档调用
}

function renderHubCellIntros(){
  const avatars = document.querySelectorAll('.cell-intro-avatar');
  avatars.forEach(el=>{
    if(el.classList.contains('wbc')) el.innerHTML = getCellAvatarSVG(1);
    else if(el.classList.contains('plt')) el.innerHTML = getCellAvatarSVG(2);
    else if(el.classList.contains('rbc')) el.innerHTML = getCellAvatarSVG(3);
  });
}

function renderLevelGrid(){
  const grid = $('level-grid');
  grid.innerHTML = '';
  const configs = buildLevelConfigs();
  for(let i=0; i < configs.length; i++){
    const cfg = configs[i];
    const card = document.createElement('div');
    const isLocked = !Game.unlocked[i];
    const isCustom = cfg._isCustom;
    const cellLabel = cfg.cellType === 1 ? '⚪WBC' : cfg.cellType === 3 ? '🔴RBC' : '';

    let innerHTML = '';

    if(isLocked){
      innerHTML += `
        <div class="lv-header">${isCustom ? '<span class="custom-badge">自定义</span>???' : '第'+i+'关'}</div>
        <div class="lock-overlay">🔒</div>
        <div class="lv-icon-wrap"><div class="lv-icon">${cfg.icon}</div></div>
        <div class="lv-name">???</div>
      `;
    } else {
      const customNum = i - 6 + 1;
      innerHTML += `
        <div class="lv-header">${isCustom ? '<span class="custom-badge">自订#'+customNum+'</span>'+cfg.name : '第'+i+'关: '+cfg.name} <small>${cellLabel}</small></div>
        <div class="lv-icon-wrap"><div class="lv-icon">${cfg.icon}</div></div>
        <div class="lv-name">${cfg.name}</div>
        ${Game.completed[i] ? `<div class="stars">${'★'.repeat(Game.stars[i])}${'☆'.repeat(3-Game.stars[i])}</div>` : ''}
        ${isCustom ? `<button class="btn-icon-pick" data-idx="${i}" title="更换图标" onclick="event.stopPropagation();pickCustomIcon(${i})">🎨</button><button class="btn-level-delete" data-idx="${i}" title="删除此关卡" onclick="event.stopPropagation();deleteCustomLevelCard(${i})">✕</button>` : ''}
      `;
    }

    card.className = 'level-card' + (isLocked ? ' locked' : '') + (isCustom ? ' custom' : '');
    card.innerHTML = innerHTML;
    card.title = isLocked ? '未解锁' : cfg.desc;

    if(!isLocked){
      card.onclick = ()=>LoadLevel(i);
    }

    grid.appendChild(card);
  }
}

// 删除自定义关卡（从主页）
function deleteCustomLevelCard(idx){
  const ci = idx - 6; // custom index within the array
  if(ci < 0) return;
  const levels = loadCustomLevels();
  if(ci >= levels.length) return;
  const name = levels[ci].name || '自定义关卡';
  if(!confirm(`确定要删除「${name}」吗？\n此操作不可撤销。`)) return;
  deleteCustomLevel(ci);
  refreshCustomLevels();
  renderLevelGrid();
  showToast(`已删除「${name}」`);
}
function pickCustomIcon(idx){
  const levels = loadCustomLevels();
  const ci = idx - 6; // custom index within the array
  if(ci < 0 || ci >= levels.length) return;

  // 弹出图标选择器
  const overlay = document.createElement('div');
  overlay.className = 'icon-picker-overlay';
  overlay.onclick = (e)=>{ if(e.target === overlay) overlay.remove(); };
  const box = document.createElement('div');
  box.className = 'icon-picker-box';
  box.innerHTML = '<h3>选择关卡图标</h3>';
  const iconGrid = document.createElement('div');
  iconGrid.className = 'icon-picker-grid';
  CUSTOM_LEVEL_ICONS.forEach(ico => {
    const btn = document.createElement('div');
    btn.className = 'icon-picker-item' + (ico.id === levels[ci].icon ? ' selected' : '');
    btn.title = ico.label;
    btn.textContent = ico.id;
    btn.onclick = (e)=>{
      e.stopPropagation();
      setCustomLevelIcon(ci, ico.id);
      refreshCustomLevels();
      renderLevelGrid();
      overlay.remove();
    };
    iconGrid.appendChild(btn);
  });
  box.appendChild(iconGrid);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.textContent = '关闭';
  closeBtn.onclick = ()=> overlay.remove();
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function togglePause(){
  if(Game.state === 'playing'){
    Game.state = 'paused';
    Game.paused = true;
    $('pause-menu').classList.remove('hidden');
  } else if(Game.state === 'paused'){
    Game.state = 'playing';
    Game.paused = false;
    $('pause-menu').classList.add('hidden');
    // 恢复时重新聚焦
    const container = $('game-container');
    const fp = $('focus-prompt');
    if(fp) fp.classList.add('hidden');
    container.focus();
  }
}

function levelComplete(){
  Game.state = 'complete';
  Sfx.complete();
  const idx = Game.levelIndex;
  Game.completed[idx] = true;
  const configs = buildLevelConfigs();
  if(idx + 1 < configs.length) Game.unlocked[idx + 1] = true;

  // 星级评定
  const energyPct = Game.globalEnergy / getMaxEnergy();
  let stars = 1; // 1星：正常通关
  if(Game.stats.deaths === 0) stars++; // 2星：0死亡
  if(Game.stats.deaths === 0 && energyPct > 0.5 && Game.stats.foundMemory) stars++; // 3星：0死亡+能量>50%+记忆细胞
  if(Game.stars[idx] < stars) Game.stars[idx] = stars;

  // 通关后视为已熟悉本关，之后不再自动弹出教程
  Game.tutorialsDone = true;
  try{ localStorage.setItem('cellQuest_tutorials_done', '1'); }catch(e){}

  // 速通记录
  let isNewRecord = false;
  const best = Game.bestTime;
  if(best === 0 || Game.levelTime < best){
    Game.bestTime = Game.levelTime;
    isNewRecord = true;
    try{ localStorage.setItem(SPEEDRUN_KEY, String(Game.bestTime)); }catch(e){}
  }
  saveGame();

  $('complete-level-name').textContent = buildLevelConfigs()[idx].name;
  $('stat-kills').textContent = Game.stats.kills;
  $('stat-items').textContent = Game.stats.items;
  $('stat-energy').textContent = Math.round(Game.globalEnergy);
  $('stat-rating').textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
  $('stat-time').textContent = formatTime(Game.levelTime);
  $('stat-best-time').textContent = best > 0 ? formatTime(best) : '--:--.--';
  if(isNewRecord) $('stat-best-time').classList.add('new-record');
  else $('stat-best-time').classList.remove('new-record');
  // 记忆细胞状态
  const memEl = $('stat-memory');
  if(memEl) memEl.textContent = Game.stats.foundMemory ? '✓ 已收集' : '✗ 未找到';
  $('complete-screen').classList.remove('hidden');
  $('hud').classList.remove('active');
}

function backToHub(){
  Game.state = 'hub';
  Game.paused = false;
  Game.tutorialPause = false;
  Game.memoryCardOpen = false;
  Game.oxyField = false;
  Game.boss = null;
  Game.swordTimer = 0;
  Game.swordCooldown = 0;
  Game.pusTiles = [];
  Game.tidePaused = 0;
  tutorialQueue = [];
  $('pause-menu').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  $('dialogue-bubble').classList.remove('active');
  $('memory-card').classList.add('hidden');
  $('hud').classList.remove('active');
  const fp = $('focus-prompt');
  if(fp){ fp.classList.remove('hidden'); fp.textContent = '点击此处开始游戏'; }
  showHub();
}

// ===== 关卡加载（通用入口函数） =====
function LoadLevel(n){
  const idx = n; // v2: 0-based index
  if(idx < 0 || idx >= buildLevelConfigs().length) return false;
  if(!Game.unlocked[idx]){
    showToast('关卡未解锁！');
    return false;
  }
  const mapData = LEVEL_MAPS[idx];
  if(!mapData.map || mapData.map.length === 0){
    showToast('该关卡正在建设中...');
    return false;
  }

  Game.levelIndex = idx;
  Game.qBlocks = [];
  Game.level = new Level(mapData);
  Game.player = new Player(Game.level.playerSpawn.x, Game.level.playerSpawn.y);
  // v2: 关卡锁定细胞类型
  const cfg = buildLevelConfigs()[idx];
  Game.player.cellType = cfg.cellType || 1;
  Game.winCondition = cfg.winCondition || WIN_KILL_ALL;
  Game.itemsCollected = 0;
  Game.totalItems = Game.level.items.length;
  Game.particles = [];Game.damageNumbers = [];
  Game.player.checkpointX = Game.level.playerSpawn.x;
  Game.player.checkpointY = Game.level.playerSpawn.y;
  Game.tempPlatforms = [];
  Game.projectiles = [];
  Game.camera = {x:0, y:0, shake:0};
  Game.stats = {kills:0, items:0, deaths:0, foundMemory:false};
  // 教程进度持久化：避免每次进关卡都重新弹出已看过的教程
  try{
    const savedTut = localStorage.getItem('cellQuest_tutShown_' + idx);
    Game.tutShown = savedTut ? JSON.parse(savedTut) : {};
  }catch(e){ Game.tutShown = {}; }
  tutorialQueue = [];
  Game.tutorialPause = false;
  Game.memoryCardOpen = false;
  Game.paused = false;
  Game.deathTimer = 0;
  Game.tideTimer = 0;
  // 四段生理剧情状态重置
  Game.bleedingTimer = 0;
  Game.gapBloodMult = 1;
  Game.bridgeUsedInGap = false;
  Game.pusTiles = [];
  Game.oxyField = false;
  Game.tidePaused = 0;
  Game.healingProgress = 0;
  // Boss与挥剑状态重置
  Game.boss = null;
  Game.swordTimer = 0;
  Game.swordCooldown = 0;
  Game.allEnemiesDead = false;
  // 知识卡片状态（每次进关卡都重置，确保每次都能看到科普内容）
  Game.knowledgeShown = {
    wbc: false, rbc: false, plt: false
  };

  // 检查是否首次游玩（教程）
  try{
    Game.tutorialsDone = localStorage.getItem('cellQuest_tutorials_done') === '1';
  }catch(e){ Game.tutorialsDone = false; }

  // 计时器
  Game.levelStartTime = performance.now();
  Game.levelTime = 0;

  // 加载最佳速通
  try{
    const bt = localStorage.getItem(SPEEDRUN_KEY);
    Game.bestTime = bt ? parseInt(bt) : 0;
  }catch(e){ Game.bestTime = 0; }

  // 低能量惩罚提示
  if(Game.globalEnergy < LOW_ENERGY){
    showToast('⚠ 能量不足！移动速度降低');
  }

  Game.state = 'playing';
  $('hub-screen').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  $('pause-menu').classList.add('hidden');
  $('dialogue-bubble').classList.remove('active');
  $('memory-card').classList.add('hidden');
  $('hud').classList.add('active');
  // 自动聚焦游戏容器
  const container = $('game-container');
  const fp = $('focus-prompt');
  if(fp) fp.classList.add('hidden');
  container.focus();
  updateHUD();

  return true;
}

// ===== 预留扩展接口 =====
const BossSystem = {
  phase: 0, hp: 0, maxHp: 0, patterns: [], timers: {},
  init(levelId){ /* 后续Boss关卡填充 */ },
  update(player, level){ /* Boss AI逻辑 */ },
  draw(ctx, camX){ /* Boss渲染 */ },
  reset(){ this.phase=0; this.hp=0; this.maxHp=0; this.patterns=[]; this.timers={}; },
};

function level2Mechanics(player, level){ /* 肺泡迷宫：气体流动/气泡平台 */ }
function level3Mechanics(player, level){ /* 血管奔流：血流冲击/高速通道 */ }
function level4Mechanics(player, level){ /* 淋巴结：免疫中枢/强敌AI */ }
function level5Mechanics(player, level){ /* Boss感染：三阶段Boss战 */ }

// ===== 初始化 =====
function init(){
  Game.canvas = $('canvas');
  Game.ctx = Game.canvas.getContext('2d');
  Game.ctx.imageSmoothingEnabled = false;

  // 预加载游戏场景背景图
  Game.bgImg = new Image();
  Game.bgImg.src = 'images/game-bg.png';

  // ATP 能量图像
  Game.atpImg = new Image();
  Game.atpImg.src = 'images/atp.png';

  // ===== WBC 完整动作精灵系统 v3 =====
  // 动作精灵表（12帧：idle/walk/crouch/jump/attack/side/back/special）
  Game.wbcActions = new Image();
  Game.wbcActions.src = 'images/sprites/wbc-actions.png?v=2';
  Game.wbcActions.onload = function(){ console.log('[WBC] 动作精灵(右)加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcActionsLeft = new Image();
  Game.wbcActionsLeft.src = 'images/sprites/wbc-actions-left.png?v=2';
  Game.wbcActionsLeft.onload = function(){ console.log('[WBC] 动作精灵(左)加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // 走路专用精灵表 - v3 慢走版（6帧x248x372，flood-fill 抠图 + 硬 alpha）
  Game.wbcWalkRight = new Image();
  Game.wbcWalkRight.src = 'images/sprites/wbc-walk-right-v3.png?v=2';
  Game.wbcWalkRight.onload = function(){ console.log('[WBC] 右走v3加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcWalkLeft = new Image();
  Game.wbcWalkLeft.src = 'images/sprites/wbc-walk-left-v3.png?v=2';
  Game.wbcWalkLeft.onload = function(){ console.log('[WBC] 左走v3加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // 待机专用精灵表 - 用户提供（左走停下姿态，1帧x248x372）
  Game.wbcIdleRight = new Image();
  Game.wbcIdleRight.src = 'images/sprites/wbc-idle-right.png?v=1';
  Game.wbcIdleRight.onload = function(){ console.log('[WBC] 右idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcIdleLeft = new Image();
  Game.wbcIdleLeft.src = 'images/sprites/wbc-idle-left.png?v=1';
  Game.wbcIdleLeft.onload = function(){ console.log('[WBC] 左idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // 蹲下/跳起使用专用精灵表

  // 动作精灵表配置: 5292x461, 12帧 x 441x461
  // 帧索引: 0=idle, 1=walk(单), 2=crouch, 3=jump_up, 4=attack_1, 5=attack_2,
  //         6=side_idle, 7=side_walk, 8=back_idle, 9=back_idle2, 10=back_walk, 11=special
  Game.wbcActionFrameSize = { w: 441, h: 461 };

  // 走路精灵表配置: 1488x372, 6帧 x 248x372
  Game.wbcWalkFrameSize = { w: 248, h: 372 };

  // 跳起专用精灵表 - 用户提供（1帧x248x372）
  Game.wbcJump = new Image();
  Game.wbcJump.src = 'images/sprites/wbc-jump.png?v=4';
  Game.wbcJump.onload = function(){ console.log('[WBC] 跳起加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // 蹲下专用精灵表 - 用户提供（1帧x248x372）
  Game.wbcCrouch = new Image();
  Game.wbcCrouch.src = 'images/sprites/wbc-crouch.png?v=2';
  Game.wbcCrouch.onload = function(){ console.log('[WBC] 蹲下加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // 攻击专用精灵表 - 用户提供（左+镜像右，1帧x248x372）
  Game.wbcAttackRight = new Image();
  Game.wbcAttackRight.src = 'images/sprites/wbc-attack-right.png?v=2';
  Game.wbcAttackRight.onload = function(){ console.log('[WBC] 右attack加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.wbcAttackLeft = new Image();
  Game.wbcAttackLeft.src = 'images/sprites/wbc-attack-left.png?v=2';
  Game.wbcAttackLeft.onload = function(){ console.log('[WBC] 左attack加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };

  // 待机精灵表配置: 248x372, 1帧
  Game.wbcIdleFrameSize = { w: 248, h: 372 };

  // 跳起精灵表配置: 248x372, 1帧
  Game.wbcJumpFrameSize = { w: 248, h: 372 };

  // 蹲下精灵表配置: 248x372, 1帧
  Game.wbcCrouchFrameSize = { w: 248, h: 372 };

  // 攻击精灵表配置: 435x372, 1帧（按高 fit，剑超出 248 帧宽）
  Game.wbcAttackFrameSize = { w: 435, h: 372 };

  // 完整帧映射（v3多状态系统）
  Game.wbcSpriteFrames = {
    idle: [0],                    // 待机 - 用待机精灵表帧0
    walk: [0,1,2,3,4,5],          // 走路 - 6帧循环
    jump: [0],                    // 跳起 - 用跳起精灵表帧0
    crouch: [0],                  // 蹲下 - 用蹲下精灵表帧0
    attack: [0, 0],               // 攻击 - 用攻击精灵表帧0（2 帧让挥剑有点节奏）
    hurt: [11]                    // 受伤 - 用动作精灵表帧11(special)
  };

  // 预加载血小板像素精灵图（Aetherion）
  Game.pltSprite = new Image();
  Game.pltSprite.src = 'images/sprites/v1-plt.png?v=1';
  Game.pltSprite.onload = function(){ console.log('[PLT] v1精灵加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.pltSpriteFrames = { idle: [0,1], run: [4,5,6,7], jump: [8,9,10,11], attack: [12,13,14,15] };
  Game.pltFrameSize = { w: 256, h: 256 };

  // 预加载红细胞像素精灵图（R-07）
  Game.rbcSprite = new Image();
  Game.rbcSprite.src = 'images/sprites/v1-rbc.png?v=1';
  Game.rbcSprite.onload = function(){ console.log('[RBC] v1精灵加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcSpriteFrames = { idle: [0,1], run: [4,5,6,7], jump: [8,9,10,11], attack: [12,13,14,15] };
  Game.rbcFrameSize = { w: 256, h: 256 }; // 每帧在1024x1024图中的大小

  // RBC 走路专用精灵表 - v7（v6 朝右走 + 水平镜像得朝左走，R/L 完全镜像对齐）
  Game.rbcWalkRight = new Image();
  Game.rbcWalkRight.src = 'images/sprites/rbc-walk-right-v1.png?v=8';
  Game.rbcWalkRight.onload = function(){ console.log('[RBC] 右走v7加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcWalkLeft = new Image();
  Game.rbcWalkLeft.src = 'images/sprites/rbc-walk-left-v1.png?v=8';
  Game.rbcWalkLeft.onload = function(){ console.log('[RBC] 左走v7加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcWalkFrameSize = { w: 256, h: 372 };
  Game.rbcWalkSpriteFrames = [0, 1, 2, 3, 4, 5];  // 6 帧循环

  // RBC idle 待机精灵表 - 用户提供（朝右 + 朝左镜像），按 walk 人物大小对齐（头y=1, 脚y=340）
  Game.rbcIdleRight = new Image();
  Game.rbcIdleRight.src = 'images/sprites/rbc-idle-right-v1.png?v=2';
  Game.rbcIdleRight.onload = function(){ console.log('[RBC] 右idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcIdleLeft = new Image();
  Game.rbcIdleLeft.src = 'images/sprites/rbc-idle-left-v1.png?v=2';
  Game.rbcIdleLeft.onload = function(){ console.log('[RBC] 左idle加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcIdleFrameSize = { w: 256, h: 372 };

  // RBC 跳起精灵图 - 用户提供
  Game.rbcJump = new Image();
  Game.rbcJump.src = 'images/sprites/rbc-jump-v1.png?v=1';
  Game.rbcJump.onload = function(){ console.log('[RBC] 跳起加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcJumpFrameSize = { w: 275, h: 372 };

  // RBC 蹲下精灵图 - 用户提供
  Game.rbcCrouch = new Image();
  Game.rbcCrouch.src = 'images/sprites/rbc-crouch-v1.png?v=1';
  Game.rbcCrouch.onload = function(){ console.log('[RBC] 蹲下加载完成:', this.naturalWidth + 'x' + this.naturalHeight); };
  Game.rbcCrouchFrameSize = { w: 1436, h: 2303 };

  loadGame();
  setupInput();

  $('btn-start').onclick = ()=>{ Sfx.init(); showHub(); $('game-container').focus(); };
  $('btn-menu-back').onclick = ()=>{ showMenu(); };
  $('btn-hub-pedia').onclick = ()=>{ showPedia(); };
  $('btn-hub-settings').onclick = ()=>{
    showToast('⚙️ 设置功能开发中...');
  };
  $('btn-pedia-close').onclick = ()=>{ closePedia(); };
  $('btn-pedia-wbc').onclick = ()=>{ showCharDetail('wbc'); };
  $('btn-pedia-rbc').onclick = ()=>{ showCharDetail('rbc'); };
  $('btn-pedia-plt').onclick = ()=>{ showCharDetail('plt'); };
  $('btn-char-back').onclick = ()=>{ closeCharDetail(); };
  $('btn-resume').onclick = ()=>{ togglePause(); };
  $('btn-quit').onclick = ()=>{ backToHub(); };
  $('btn-next-level').onclick = ()=>{ backToHub(); };
  // 对话气泡按钮
  $('btn-bubble-next').onclick = ()=>{ dismissTutorial(); };
  $('btn-bubble-skip').onclick = ()=>{ skipAllTutorials(); };
  // 记忆卡片关闭
  $('btn-memory-close').onclick = ()=>{ closeMemoryCard(); };
  // 技能树
  $('btn-hub-settings').onclick = ()=>{ openSkillTree(); };
  $('btn-skill-close').onclick = ()=>{ closeSkillTree(); };
  // 装备
  $('btn-hub-equip').onclick = ()=>{ openEquipment(); };
  $('btn-equip-close').onclick = ()=>{ closeEquipment(); };
  // 确认框
  let confirmCallback=null;
  window.showConfirm=(msg,onYes)=>{Game.paused=true;$('confirm-msg').textContent=msg;$('confirm-dialog').classList.remove('hidden');confirmCallback=onYes;};
  window.hideConfirm=()=>{$('confirm-dialog').classList.add('hidden');confirmCallback=null;if(Game.state==='playing')Game.paused=false;};
  $('btn-confirm-yes').onclick=e=>{e.stopPropagation();try{if(confirmCallback)confirmCallback();}catch(err){console.error(err);}hideConfirm();};
  $('btn-confirm-no').onclick=e=>{e.stopPropagation();hideConfirm();};
  $('confirm-dialog').addEventListener('click',e=>{if(e.target===$('confirm-dialog'))hideConfirm();});
  $('home-btn').onclick=e=>{e.stopPropagation();if(Game.state!=='playing')return;showConfirm('确定要离开当前关卡吗？\n进度将不会保存。',()=>{backToHub();});};

  showMenu();
  requestAnimationFrame(loop);
}

// ===== 技能树 UI =====
function openSkillTree(){renderSkillTree();$('skill-tree-screen').classList.remove('hidden');}
function closeSkillTree(){$('skill-tree-screen').classList.add('hidden');}
function renderSkillTree(){$('skill-points-display').textContent=Game.skillPoints+' 技能点';document.querySelectorAll('.skill-col').forEach(col=>{const cell=col.dataset.cell;const tree=SKILL_TREES[cell];let h='<h3 style="background:'+tree.color+'20;color:'+tree.color+'">'+tree.icon+' '+tree.name+'</h3>';tree.nodes.forEach(node=>{const rank=getSkillLevel(cell,node.id);const maxed=rank>=node.maxRank;let dots='';for(let i=0;i<node.maxRank;i++)dots+='<span class="sk-rank-dot'+(i<rank?' filled':'')+'"></span>';const btnCls=maxed?'sk-btn maxed':'sk-btn';const btnTxt=maxed?'MAX':'升级';const btnDis=maxed||Game.skillPoints<1?' disabled':'';h+='<div class="skill-node"><span class="sk-icon">'+node.icon+'</span><div class="sk-info"><div class="sk-name">'+node.name+'</div><div class="sk-desc">'+node.desc+'</div><div class="sk-ranks">'+dots+'</div></div><button class="'+btnCls+'"'+btnDis+' onclick="unlockSkill(\''+cell+'\',\''+node.id+'\');renderSkillTree();">'+btnTxt+'</button></div>';});col.innerHTML=h;});}

// ===== 装备 UI =====
function openEquipment(){renderEquipment();$('equipment-screen').classList.remove('hidden');}
function closeEquipment(){$('equipment-screen').classList.add('hidden');}
function renderEquipment(){['weapon','armor','accessory'].forEach(slot=>{const el=$('es-'+slot);const eid=Game.equipment[slot];if(eid){const eq=findEquip(eid);el.innerHTML=(eq?eq.name:eid)+'<br><small style="color:'+(eq?RARITY_COLORS[eq.rarity]:'#aaa')+'">'+(eq?RARITY_NAMES[eq.rarity]:'')+'</small>';el.className='es-item equipped';el.onclick=()=>{if(confirm('卸下'+(eq?eq.name:eid)+'？')){unequipItem(slot);renderEquipment();}};}else{el.innerHTML='空';el.className='es-item';el.onclick=null;}});$('inv-count').textContent=Game.inventory.length+'/20';const grid=$('inventory-grid');grid.innerHTML='';Game.inventory.forEach(eid=>{const eq=findEquip(eid);if(!eq)return;const card=document.createElement('div');card.className='inv-card';card.innerHTML='<div class="ic-name">'+eq.name+'</div><div class="ic-rarity" style="color:'+RARITY_COLORS[eq.rarity]+'">'+RARITY_NAMES[eq.rarity]+'</div><div class="ic-stats">'+statsText(eq.stats)+'</div>';card.onclick=()=>{equipItem(eid);renderEquipment();};grid.appendChild(card);});}
function statsText(stats){const n={atk:'攻',def:'防',spd:'速',maxHp:'命',maxEnergy:'能'};return Object.keys(stats).map(k=>n[k]+'+'+stats[k]).join(' ');}

window.addEventListener('load', init);

window.addEventListener('load', init);
