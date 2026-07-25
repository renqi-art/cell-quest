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
          case 'N':
            Game.dcNPCs.push(new DendriticCell(c*TILE, r*TILE, Game.dcNPCs.length));
            arr.push(' '); break;
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
    // ? 方块始终有碰撞体积（顶完也不消失）
    if(Game.qBlocks.some(qb => qb.x/TILE === col && qb.y/TILE === row)) return true;
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
    // 清除迷你敌人（Boss召唤的小怪）
    this.enemies = this.enemies.filter(e => !e.isMini);
    // 只重置还活着的敌人，已杀死的保持死亡（WIN_KILL_ALL关卡需要）
    for(const e of this.enemies){
      if(e.alive) e.reset();
    }
    // 只重置还活着的Boss
    if(Game.boss && Game.boss.alive) Game.boss.reset();
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

    // 初速度：优先用显式 vy，否则根据方向取默认值
    const dir = ps.dir || 'up';
    const defaultVy = { up: -5, down: 3, up_jump: -9 };
    enemy.vy = (ps.vy != null) ? ps.vy : (defaultVy[dir] || -5);
    enemy.flyAway = false;

    // contact 触发：飞出天际不落地（可用 vy 覆盖速度）
    if(ps.trigger === 'contact'){
      if(ps.vy == null) enemy.vy = (dir === 'up_jump' ? -9 : -7);
      enemy.flyAway = true;
    }

    this.enemies.push(enemy);
    spawnParticles(ex, ey, ps.type==='strep'?C.strep:C.staph, 8, 3);
    // 所有触发模式都设 cooldown（防御性：保证不会每帧都刷）
    // timer 模式默认 300 帧（5秒），proximity/contact 默认 180 帧（3秒）
    this.pipeCooldowns[i] = ps.cooldown || (ps.trigger === 'timer' ? (ps.interval || 300) : 180);
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
    // v3: 终点门始终开放（抵达即通关，杀怪/收集为评分标准）
    const winMet = true;
    
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
      // v3: 评分提示
      ctx.fillStyle = '#ffd700';
      ctx.font = '9px sans-serif';
      const hint = Game.winCondition === WIN_KILL_ALL ? '抵达通关·击杀评分' : '抵达通关·收集评分';
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
  '1':'skill1', '2':'skill2', '3':'skill3', '4':'skill4',
};

// v3: P2 键位映射（方向键 + 小键盘区域）
const KEY_MAP_P2 = {
  'j':'left', 'J':'left',
  'l':'right', 'L':'right',
  'i':'jump', 'I':'jump',
  'k':'down', 'K':'down',
  'u':'skill', 'U':'skill',
  'o':'dash', 'O':'dash',
  '7':'skill1', '8':'skill2', '9':'skill3', '0':'skill4',
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
      Game.keys[KEY_MAP[e.key]] = false;
    }
    // v3: P2 keyup
    if(KEY_MAP_P2[e.key] !== undefined && Game.twoPlayer){
      Game.keysP2[KEY_MAP_P2[e.key]] = false;
    }
  });
  // blur 时清除按键（防止粘键）
  window.addEventListener('blur', ()=>{ Game.keys = {}; });
}

// ===== 背景渲染 =====
function drawBackground(ctx, camX, bg){
  const preset = getParallaxPreset(Game.levelIndex);

  // 底层渐变
  const grad = ctx.createLinearGradient(0,0,0,CH);
  grad.addColorStop(0, bg[0]);
  grad.addColorStop(1, bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,CW,CH);

  // 远景层: 大圆点/细胞轮廓 (scroll 0.1x)
  const far = preset.far;
  const farX = Math.round(camX * 0.1) % CW;
  ctx.save();
  ctx.globalAlpha = far.alpha;
  ctx.fillStyle = far.color;
  for(let i = 0; i < 10; i++){
    const x = ((i * 140 - farX) % (CW + 200) + CW + 200) % (CW + 200) - 80;
    const y = 30 + (i % 4) * 100 + Math.sin(i * 1.7) * 20;
    const r = far.pattern === 'dots' ? 25 + (i%3)*12 : far.pattern === 'bubbles' ? 20 + Math.abs(Math.sin(i))*15 : 30;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // 中景层: 波纹/网格/气泡 (scroll 0.25x)
  const mid = preset.mid;
  const midX = Math.round(camX * 0.25);
  ctx.save();
  ctx.globalAlpha = mid.alpha;
  ctx.strokeStyle = mid.color;
  ctx.lineWidth = 4;
  if(mid.pattern === 'flow'){
    for(let i = 0; i < 6; i++){
      const y = 70 + i * 70;
      ctx.beginPath();
      for(let x = -60; x < CW+60; x += 6){
        const wy = y + Math.sin((x+midX)*0.02 + i*0.8) * 22;
        if(x === -60) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  } else if(mid.pattern === 'bubbles'){
    for(let i = 0; i < 20; i++){
      const x = ((i * 100 - midX/2) % (CW + 150) + CW + 150) % (CW + 150) - 50;
      const y = 30 + (i * 47) % 400;
      ctx.beginPath(); ctx.arc(x, y, 8 + (i%4)*3, 0, Math.PI*2); ctx.fill();
    }
  } else {
    for(let i = 0; i < 8; i++){
      const y = 50 + i * 55;
      ctx.beginPath();
      for(let x = -40; x < CW+40; x += 9){
        const wy = y + Math.sin((x+midX)*0.018 + i) * 16;
        if(x === -40) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();

  // 近景层: 小颗粒/血细胞 (scroll 0.5x)
  const near = preset.near;
  const nearX = Math.round(camX * 0.5) % CW;
  ctx.save();
  ctx.globalAlpha = near.alpha;
  ctx.fillStyle = near.color;
  for(let i = 0; i < 30; i++){
    const x = ((i * 50 + 23 - nearX) % (CW + 100) + CW + 100) % (CW + 100) - 30;
    const y = 20 + (i * 67) % 440;
    ctx.beginPath();
    if(near.pattern === 'cells'){
      ctx.arc(x, y, 3 + (i%3), 0, Math.PI*2);
    } else {
      ctx.arc(x, y, 2.5, 0, Math.PI*2);
    }
    ctx.fill();
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

  // v3: 更新所有玩家
  for(const player of Game.players){
    player.update(lvl);
  }

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
  // Boss召唤的迷你菌分裂（存活>10s）
  for(const e of lvl.enemies){
    if(!e.alive || !e.isMini) continue;
    if(e.lifeTimer == null) e.lifeTimer = 0;
    e.lifeTimer++;
    if(e.lifeTimer >= 900 && lvl.enemies.length < 10){ // 15s, 上限10只
      e.lifeTimer = 0;
      const child = new Enemy(e.x + (Math.random()-0.5)*20, e.y, 'staph');
      child.makeMini();
      child.spawnX = child.x; child.spawnY = child.y;
      child.lifeTimer = 0;
      child.patrolRange = 130; // 继承Boss附近巡逻限制
      lvl.enemies.push(child);
      spawnParticles(e.x+e.w/2, e.y+e.h/2, C.miniStaph, 5, 1);
    }
  }
  // 清除死亡敌人（保留非迷你死亡敌人用于重生）
  lvl.enemies = lvl.enemies.filter(e => e.alive || !e.isMini);

  // v3: 成就检测(每120帧检查一次,避免频繁check)
  if(Game.frame % 120 === 0) checkAchievements();

  // v2: 击杀回能
  const killedThisFrame = Game.stats.kills - prevKills;
  if(killedThisFrame > 0){
    Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + killedThisFrame * KILL_ATP_SMALL);
  }

  // Boss更新
  if(Game.boss) Game.boss.update(lvl, p);

  // v3: DC NPC 更新
  for(const dc of Game.dcNPCs) dc.update(p);

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

  // 终点门检测（v3: 双人模式需要两人都到）
  if(lvl.finish){
    let allAtGate = true;
    for(const pl of Game.players){
      if(!pl) continue;
      const atGate = pl.x+pl.w > lvl.finish.x+2 && pl.x < lvl.finish.x+TILE-2 &&
                     pl.y+pl.h > lvl.finish.y && pl.y < lvl.finish.y+TILE;
      if(!atGate){ allAtGate = false; break; }
    }
    if(allAtGate){
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
  // v3: 双人模式 — 摄像机跟随中点并缩放
  let camX, zoomScale = 1;
  if(Game.twoPlayer && Game.players.length >= 2){
    const p1 = Game.players[0], p2 = Game.players[1];
    const midX = (p1.x + p2.x) / 2;
    const dist = Math.abs(p1.x - p2.x);
    // 如果两人距离超过屏幕一半，则 zoom out
    if(dist > CW * 0.6){
      zoomScale = Math.max(0.65, 1 - (dist - CW * 0.6) / CW * 0.5);
    }
    camX = midX - (CW * zoomScale) / 2;
  } else {
    const p=Game.player;const ex=p.x+p.vx*Game.renderAlpha;
    camX=ex-CW/2+p.w/2;
  }
  camX=Math.max(0,Math.min(camX,lvl.width*TILE-CW*zoomScale));
  const shakeX=Game.camera.shake>0?Math.sin(Game.frame*1.7)*Game.camera.shake*0.7:0;
  const shakeY=Game.camera.shake>0?Math.cos(Game.frame*2.3)*Game.camera.shake*0.7:0;

  ctx.save();
  if(zoomScale < 1){
    ctx.scale(1/zoomScale, 1/zoomScale);
    ctx.translate(-camX*(1-zoomScale), 0);
  }
  ctx.translate(shakeX, shakeY);

  drawBackground(ctx, camX, lvl.bg);
  lvl.draw(ctx, camX);
  for(const tp of Game.tempPlatforms) tp.draw(ctx, camX);
  for(const pt of Game.pusTiles) pt.draw(ctx, camX);
  for(const fp of Game.floatPlatforms) fp.draw(ctx, camX);
  for(const it of lvl.items) it.draw(ctx, camX);
  for(const e of lvl.enemies) e.draw(ctx, camX);
  if(Game.boss) Game.boss.draw(ctx, camX);
  // v3: DC NPC 绘制
  for(const dc of Game.dcNPCs) dc.draw(ctx, camX);
  for(const pr of Game.projectiles) pr.draw(ctx, camX);
  // v3: 绘制所有玩家
  for(const player of Game.players){
    if(player) player.draw(ctx, camX);
  }
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

  // v3: 双人模式 — 更新 P2 HUD
  const p2hud = document.getElementById('hud-p2');
  if(Game.twoPlayer && Game.players.length >= 2){
    const p2 = Game.players[1];
    if(p2hud){
      p2hud.style.display = 'block';
      // P2 health
      const p2HealthBar = document.getElementById('health-bar-fill-p2');
      const p2HealthText = document.getElementById('health-text-p2');
      if(p2HealthBar){
        const pct2 = p2.maxHealth > 0 ? (p2.health / p2.maxHealth) * 100 : 0;
        p2HealthBar.style.width = pct2 + '%';
        p2HealthBar.classList.toggle('low', pct2 <= 50 && pct2 > 25);
        p2HealthBar.classList.toggle('critical', pct2 <= 25);
      }
      if(p2HealthText) p2HealthText.textContent = p2.health + '/' + p2.maxHealth;
      document.getElementById('cell-name-p2').textContent = p2.cell.name;
      document.getElementById('p2-indicator').textContent = 'P2 ' + p2.cell.short;
    }
  } else if(p2hud){
    p2hud.style.display = 'none';
  }

  // 左上角角色头像（跟随当前细胞）
  const avatarEl = $('cell-avatar');
  if(avatarEl){
    avatarEl.className = '';
    avatarEl.classList.add(p.cellType === 1 ? 'wbc' : p.cellType === 2 ? 'plt' : 'rbc');
    avatarEl.innerHTML = getCellAvatarHTML(p.cellType);
  }

  // 红心 → 血条
  const healthBar = $('health-bar-fill');
  const healthText = $('health-text');
  const healthPct = p.maxHealth > 0 ? (p.health / p.maxHealth) * 100 : 0;
  if(healthBar){
    healthBar.style.width = healthPct + '%';
    healthBar.classList.toggle('low', healthPct <= 50 && healthPct > 25);
    healthBar.classList.toggle('critical', healthPct <= 25);
  }
  if(healthText) healthText.textContent = p.health + '/' + p.maxHealth;

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

  // v3: 记忆细胞 — 显示全局收集进度
  const memIcon = $('memory-icon');
  if(memIcon){
    memIcon.classList.toggle('found', Game.stats.foundMemory);
    const total = getTotalMemoryCells();
    const bonus = getMemoryBonus(Game.memoryCells);
    let tooltip = Game.memoryCells + '/' + total + ' 记忆细胞';
    if(bonus.speedPct>0) tooltip += '\n移速 +' + bonus.speedPct + '%';
    if(bonus.maxHp>0) tooltip += '\n生命 +' + bonus.maxHp;
    if(bonus.startEnergy>0) tooltip += '\n初始能量 +' + bonus.startEnergy;
    if(bonus.swordDmg>0) tooltip += '\n伤害 +' + bonus.swordDmg;
    if(bonus.deathEnergyKeep>0) tooltip += '\n死亡保留 ' + bonus.deathEnergyKeep + '% 能量';
    if(bonus.startShield>0) tooltip += '\n开局护盾';
    memIcon.title = tooltip;
    memIcon.textContent = Game.memoryCells > 0 ? '🧬' + Game.memoryCells : '🧬';
  }

  // v3: 自适应难度指示器
  const objDisplay = $('objective-display');
  if(objDisplay){
    const diffCfg = ADAPTIVE_DIFFICULTY[Game.adaptiveDifficulty.level];
    const diffTag = objDisplay.querySelector('.diff-tag');
    if(diffTag){
      diffTag.textContent = diffCfg.name;
      diffTag.className = 'diff-tag ' + Game.adaptiveDifficulty.level;
    }
  }

  // ===== WBC 新技能槽更新 =====
  if(p.cellType === 1){
    const skills = [
      { id:'skill1', cd:p.biteCooldown, max:BITE_COOLDOWN, charges:null },
      { id:'skill2', cd:p.spitCooldown, max:SPIT_COOLDOWN, charges:null },
      { id:'skill3', cd:p.lanceCooldown, max:LANCE_COOLDOWN, charges:null },
      { id:'skill4', cd:p.pdashTimer>0?1:0, max:1, charges:p.pdashCharges, maxCharges:PDASH_CHARGES, pdashCooldown:p.pdashCooldown },
    ];
    for(const s of skills){
      const slot = $(s.id);
      if(!slot) continue;
      const cdEl = slot.querySelector('.skill-cooldown');
      if(s.cd > 0){
        slot.classList.add('cooling');
        slot.classList.remove('ready');
        const sec = Math.ceil(s.cd / 60);
        cdEl.textContent = sec + 's';
      } else {
        slot.classList.remove('cooling');
        slot.classList.add('ready');
        cdEl.textContent = '';
      }
      if(s.charges !== null){
        const chEl = slot.querySelector('.skill-charges');
        if(chEl) chEl.textContent = s.charges + '/' + s.maxCharges;
      }
    }
    const bar = $('skill-bar');
    if(bar) bar.style.display = 'flex';
  } else {
    const bar = $('skill-bar');
    if(bar) bar.style.display = 'none';
  }

  // v3: 通关目标 → 评分进度显示
  const objEl = $('objective-display');
  if(objEl){
    if(Game.winCondition === WIN_KILL_ALL){
      const totalEnemies = Game.level.enemies.length + (Game.boss&&Game.boss.alive?1:0);
      const killed = Game.stats.kills;
      const pct = totalEnemies > 0 ? killed / totalEnemies : 1;
      objEl.innerHTML = `⚔️ <b style="color:${pct>=0.9?'#66ff66':pct>=0.5?'#ffd700':'#ff6b6b'}">${killed}/${totalEnemies}</b> <small style="color:#888">${Math.round(pct*100)}%</small>`;
    } else if(Game.winCondition === WIN_COLLECT_ALL){
      const collected = Game.itemsCollected;
      const total = Game.totalItems;
      const pct = total > 0 ? collected / total : 1;
      objEl.innerHTML = `📦 <b style="color:${pct>=0.9?'#66ff66':pct>=0.5?'#ffd700':'#ff6b6b'}">${collected}/${total}</b> <small style="color:#888">${Math.round(pct*100)}%</small>`;
    }
  }

  // v2: 动态底栏
  const ctrlEl = $('hud-controls');
  if(ctrlEl && Game.player){
    const sprint = Game.player.sprinting;
    const sprintHint = ' <span class="sep">|</span> <span style="color:#ffd740;">🏃双击方向奔跑</span>';
    if(Game.player.cellType === 1){
      ctrlEl.innerHTML = '<span><kbd>←→</kbd>移动</span> <span class="sep">|</span> <span><kbd>空格</kbd>跳跃</span> <span class="sep">|</span> <span><kbd>↓</kbd>下蹲</span> <span class="sep">|</span> <span><kbd>E</kbd>挥剑</span> <span class="sep">|</span> <span><kbd>Shift</kbd>突进</span>' + sprintHint;
    } else {
      ctrlEl.innerHTML = '<span><kbd>←→</kbd>移动</span> <span class="sep">|</span> <span><kbd>空格</kbd>跳跃</span> <span class="sep">|</span> <span><kbd>↓</kbd>下蹲</span>' + sprintHint;
    }
    // 奔跑中高亮
    if(sprint){
      ctrlEl.innerHTML = ctrlEl.innerHTML.replace('双击方向奔跑', '奔跑中 <span style="color:#ff5252;">⚡1.5x -1ATP/0.5s</span>');
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

// 知识卡片位置触发（走到x坐标处触发，不限次数，每张卡独立）
function checkKnowledgeCards(){
  if(!Game.level || !Game.level.knowledgeCards) return;
  if(Game.memoryCardOpen) return;
  if(Game.tutorialPause) return;
  const p = Game.player;
  if(!Game.knowledgeCardTriggered) Game.knowledgeCardTriggered = new Set();
  for(let i = 0; i < Game.level.knowledgeCards.length; i++){
    const kc = Game.level.knowledgeCards[i];
    if(Game.knowledgeCardTriggered.has(i)) continue;
    if(p.x > kc.x){
      // 如果指定了y坐标，需要玩家在该高度附近才触发
      if(kc.y !== undefined && p.y > kc.y + 20){
        continue;
      }
      Game.knowledgeCardTriggered.add(i);
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

// ===== v3: 排行榜昵称 =====
function changeNickname(){
  const cur = Game.playerName || '';
  const name = prompt('输入你的玩家昵称 (最多 12 个字):', cur);
  if(name !== null && name.trim()){
    Game.playerName = name.trim().substring(0, 12);
    saveGame();
    showToast('昵称已更新: ' + Game.playerName);
    // 刷新排行榜面板
    const panel = document.getElementById('lb-panel');
    if(panel) panel.remove();
    setTimeout(()=>showLeaderboard(), 100);
  }
}

// ===== v3: 成就面板 =====
function showAchievements(){
  const achs = loadAchievements();
  const unlocked = Object.keys(achs).length;
  let html = '<h3>🎖️ 成就 (' + unlocked + '/' + ACHIEVEMENTS.length + ')</h3>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;max-height:350px;overflow-y:auto;margin:8px 0;">';
  for(const a of ACHIEVEMENTS){
    const earned = !!achs[a.id];
    const bg = earned ? 'rgba(224,64,251,.12)' : 'rgba(255,255,255,.03)';
    const opacity = earned ? '1' : '0.45';
    const date = earned ? new Date(achs[a.id]) : null;
    const dateStr = date ? (date.getMonth()+1)+'/'+date.getDate() : '';
    html += `<div style="flex:0 0 48%;background:${bg};border-radius:6px;padding:8px;opacity:${opacity};font-size:11px;">
      <b>${a.icon} ${a.name}</b> ${earned?'<span style="color:#81c784;">✓</span>':'<span style="color:#666;">🔒</span>'}
      <div style="color:#888;font-size:10px;">${a.desc}</div>
      ${earned?`<div style="color:#666;font-size:9px;">${dateStr}</div>`:''}
    </div>`;
  }
  html += '</div>';
  html += '<button class="btn-small" style="margin-top:6px;" onclick="document.getElementById(\'achs-panel\').remove()">关闭</button>';

  const existing = document.getElementById('achs-panel');
  if(existing) existing.remove();
  const panel = document.createElement('div');
  panel.id = 'achs-panel';
  panel.className = 'overlay';
  panel.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000;';
  panel.innerHTML = `<div class="confirm-inner" style="max-width:480px;">${html}</div>`;
  panel.addEventListener('click', e => { if(e.target === panel) panel.remove(); });
  document.getElementById('game-container').appendChild(panel);
}

// ===== v3: 排行榜面板 =====
function showLeaderboard(){
  const configs = buildLevelConfigs();
  const total = getTotalStarsRanking();
  const name = Game.playerName || '未设置';
  let html = '<h3>🏆 本地排行榜 (存档 ' + (Game.currentSlot+1) + ')</h3>';

  // 昵称设置
  html += `<div style="display:flex;align-items:center;gap:6px;margin:4px 0 8px;">
    <span style="font-size:12px;color:#aaa;">👤 昵称:</span>
    <b style="color:#ffd700;">${name}</b>
    <button class="btn-small" style="font-size:10px;padding:2px 8px;" onclick="changeNickname()">修改</button>
  </div>`;

  // 综合统计
  html += `<div style="background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.3);border-radius:6px;padding:8px;margin:8px 0;text-align:center;">
    ⭐ 总星数: <b>${total.totalStars}</b> | ✅ 已通关: <b>${total.totalCompleted}/${configs.length}</b> | 📊 Lv.${total.playerLevel}
  </div>`;

  // 分关排行
  html += '<div style="max-height:320px;overflow-y:auto;">';
  for(let i = 0; i < configs.length; i++){
    const cfg = configs[i];
    const entries = getLevelRanking(i);
    html += `<div style="margin:6px 0;padding:6px;background:rgba(255,255,255,.03);border-radius:4px;">
      <b title="${cfg.desc||''}">${cfg.icon||''} ${cfg.name}</b>`;
    if(entries.length === 0){
      html += '<div style="font-size:11px;color:#666;padding:2px 8px;">暂无记录</div>';
    } else {
      for(let j = 0; j < entries.length; j++){
        const e = entries[j];
        const medal = j === 0 ? '🥇' : j === 1 ? '🥈' : j === 2 ? '🥉' : (j+1);
        const pctStr = Math.round(e.completionPct * 100) + '%';
        const pctColor = e.completionPct >= 1 ? '#66ff66' : e.completionPct >= 0.9 ? '#ffd700' : '#aaa';
        const date = new Date(e.date);
        const dateStr = (date.getMonth()+1)+'/'+date.getDate();
        html += `<div style="font-size:11px;padding:2px 8px;display:flex;justify-content:space-between;color:#ccc;">
          <span>${medal} <b style="color:#ffd700;">${e.name||'???'}</b> <span style="color:${pctColor}">${pctStr}</span> | ${formatTime(e.time)} | Lv.${e.playerLevel}</span>
          <span style="color:#666;">${dateStr}</span>
        </div>`;
      }
    }
    html += '</div>';
  }
  html += '</div>';
  html += '<button class="btn-small" style="margin-top:6px;" onclick="document.getElementById(\'lb-panel\').remove()">关闭</button>';

  const existing = document.getElementById('lb-panel');
  if(existing) existing.remove();
  const panel = document.createElement('div');
  panel.id = 'lb-panel';
  panel.className = 'overlay';
  panel.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000;';
  panel.innerHTML = `<div class="confirm-inner" style="max-width:500px;">${html}</div>`;
  panel.addEventListener('click', e => { if(e.target === panel) panel.remove(); });
  document.getElementById('game-container').appendChild(panel);
}

// ===== v3: 存档管理面板 =====
function showSlotPanel(){
  saveGame(); // 先保存当前
  let html = '<h3>💾 存档管理 (当前: 存档 ' + (Game.currentSlot+1) + ')</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:6px;margin:10px 0;max-height:350px;overflow-y:auto;">';

  for(let i = 0; i < MAX_SLOTS; i++){
    const info = getSlotInfo(i);
    const isActive = i === Game.currentSlot;
    const bg = isActive ? 'rgba(129,199,132,.15)' : 'rgba(255,255,255,.05)';
    const border = isActive ? '1px solid #81c784' : '1px solid rgba(255,255,255,.1)';
    html += `<div style="background:${bg};border:${border};border-radius:6px;padding:10px;display:flex;align-items:center;justify-content:space-between;">
      <div style="flex:1;">
        <b>${info.exists ? '💾' : '📭'} 存档 ${i+1}</b>
        ${info.exists
          ? `<div style="font-size:11px;color:#aaa;">Lv.${info.level} | ⭐${info.stars} | 已通${info.completed}关 | 🧬${info.memoryCells} | ${info.date}</div>`
          : '<div style="font-size:11px;color:#666;">空存档</div>'}
      </div>
      <div style="display:flex;gap:4px;">
        ${isActive ? '<span style="font-size:10px;color:#81c784;">当前</span>' : ''}
        <button class="btn-small" style="font-size:10px;padding:4px 8px;" onclick="switchToSlot(${i})">选择</button>
        <button class="btn-small" style="font-size:10px;padding:4px 8px;border-color:#ff5252;color:#ff5252;" onclick="resetSlotConfirm(${i})">🗑</button>
      </div>
    </div>`;
  }

  html += '</div>';
  html += '<button class="btn-small" style="margin-top:6px;" onclick="document.getElementById(\'slot-panel\').remove()">关闭</button>';

  const existing = document.getElementById('slot-panel');
  if(existing) existing.remove();
  const panel = document.createElement('div');
  panel.id = 'slot-panel';
  panel.className = 'overlay';
  panel.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000;';
  panel.innerHTML = `<div class="confirm-inner" style="max-width:480px;">${html}</div>`;
  panel.addEventListener('click', e => { if(e.target === panel) panel.remove(); });
  document.getElementById('game-container').appendChild(panel);
}

function switchToSlot(slot){
  switchSlot(slot);
  const panel = document.getElementById('slot-panel');
  if(panel) panel.remove();
  showToast('已切换到 存档 ' + (slot+1));
  renderHub();
}

function resetSlotConfirm(slot){
  if(slot === Game.currentSlot){
    showToast('不能删除当前使用的存档！请先切换到其他存档');
    return;
  }
  const info = getSlotInfo(slot);
  if(!info.exists){ showToast('该存档已是空的'); return; }
  if(confirm('确定要删除 存档 ' + (slot+1) + ' 吗？\n(已通' + info.completed + '关 | ⭐' + info.stars + '星 | Lv.' + info.level + ')\n此操作不可撤销！')){
    resetSlot(slot);
    const panel = document.getElementById('slot-panel');
    if(panel) panel.remove();
    showToast('已删除 存档 ' + (slot+1));
    setTimeout(()=>showSlotPanel(), 100);
  }
}

function renderHub(){
  // 刷新关卡列表后需重新调用 showHub
  showHub();
}

// ===== v3: 细胞选择(Level 3+自由选) =====
function selectCellAndLoad(n){
  const idx = n - 1;
  const cfg = configs[idx];
  // 前两关(Level 1-2)锁定细胞类型，直接进入
  if(!cfg._isCustom && idx < 2){
    LoadLevel(n);
    return;
  }

  // 双人模式：两个玩家分别选
  if(Game.twoPlayer){
    showDualCellSelect(n);
    return;
  }

  const cells = [
    {type:1, name:'白细胞', icon:'⚔️', desc:'战斗型·击杀得分', color:'#f0ede0'},
    {type:3, name:'红细胞', icon:'🔴', desc:'收集型·探索得分', color:'#d93025'},
  ];

  let html = '<h3>选择细胞类型 (Level ' + n + ')</h3>';
  html += '<div style="display:flex;gap:10px;margin:12px 0;">';
  for(const c of cells){
    html += `<div onclick="LoadLevel(${n},${c.type});document.getElementById('cell-select-panel').remove()"
      style="flex:1;background:rgba(255,255,255,.05);border:2px solid ${c.color};border-radius:10px;padding:16px;cursor:pointer;text-align:center;transition:all .15s;"
      onmouseover="this.style.background='rgba(255,255,255,.12)'" onmouseout="this.style.background='rgba(255,255,255,.05)'">
      <div style="font-size:32px;">${c.icon}</div>
      <b style="color:${c.color};">${c.name}</b>
      <div style="font-size:11px;color:#888;margin-top:4px;">${c.desc}</div>
    </div>`;
  }
  html += '</div><button class="btn-small" onclick="document.getElementById(\'cell-select-panel\').remove()">取消</button>';

  const existing = document.getElementById('cell-select-panel');
  if(existing) existing.remove();
  const panel = document.createElement('div');
  panel.id = 'cell-select-panel';
  panel.className = 'overlay';
  panel.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000;';
  panel.innerHTML = `<div class="confirm-inner" style="max-width:420px;">${html}</div>`;
  panel.addEventListener('click', e => { if(e.target === panel) panel.remove(); });
  document.getElementById('game-container').appendChild(panel);
}

function showDualCellSelect(n){
  Game._dualSelectN = n;
  Game._dualSelectP1 = 1;
  Game._dualSelectP2 = 1;
  showDualCellStep(1);
}

function showDualCellStep(step){
  const label = step === 1 ? 'P1' : 'P2';
  const cells = [
    {type:1, name:'白细胞', icon:'⚔️', desc:'战斗型·击杀得分', color:'#f0ede0'},
    {type:3, name:'红细胞', icon:'🔴', desc:'收集型·探索得分', color:'#d93025'},
  ];

  let html = '<h3>选择细胞 — ' + label + '</h3>';
  html += '<div style="display:flex;gap:10px;margin:12px 0;">';
  for(const c of cells){
    html += `<div onclick="dualCellPicked(${step},${c.type})"
      style="flex:1;background:rgba(255,255,255,.05);border:2px solid ${c.color};border-radius:10px;padding:16px;cursor:pointer;text-align:center;"
      onmouseover="this.style.background='rgba(255,255,255,.12)'" onmouseout="this.style.background='rgba(255,255,255,.05)'">
      <div style="font-size:32px;">${c.icon}</div>
      <b style="color:${c.color};">${c.name}</b>
    </div>`;
  }
  html += '</div><button class="btn-small" onclick="document.getElementById(\'cell-select-panel\').remove()">取消</button>';

  const existing = document.getElementById('cell-select-panel');
  if(existing) existing.remove();
  const panel = document.createElement('div');
  panel.id = 'cell-select-panel';
  panel.className = 'overlay';
  panel.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000;';
  panel.innerHTML = `<div class="confirm-inner" style="max-width:420px;">${html}</div>`;
  panel.addEventListener('click', e => { if(e.target === panel) panel.remove(); });
  document.getElementById('game-container').appendChild(panel);
}

function dualCellPicked(step, cellType){
  if(step === 1){
    Game._dualSelectP1 = cellType;
    document.getElementById('cell-select-panel').remove();
    setTimeout(() => showDualCellStep(2), 100);
  } else {
    Game._dualSelectP2 = cellType;
    Game._p2CellType = cellType;
    document.getElementById('cell-select-panel').remove();
    LoadLevel(Game._dualSelectN, Game._dualSelectP1);
  }
}

// ===== v3: AI 关卡生成面板 =====
function showAIGeneratePanel(){
  const key = getDeepSeekKey();
  let html = '<h3>🤖 AI 生成关卡</h3>';

  // API Key 设置
  html += '<div style="margin:4px 0 8px;font-size:11px;">';
  html += '<span style="color:#aaa;">DeepSeek Key:</span> ';
  if(key){
    html += '<span style="color:#81c784;">已设置 (' + key.substring(0,8) + '...)</span> ';
    html += '<button class="btn-small" style="font-size:10px;padding:2px 6px;" onclick="changeDeepSeekKey()">更换</button>';
  } else {
    html += '<button class="btn-small" style="font-size:10px;padding:2px 8px;" onclick="changeDeepSeekKey()">设置API Key</button>';
    html += ' <span style="color:#666;">(需要DeepSeek账号)</span>';
  }
  html += '</div>';

  // 真AI: 输入关键词
  html += '<div style="border:1px solid #ab47bc;border-radius:6px;padding:10px;margin:8px 0;">';
  html += '<b style="color:#ab47bc;">🧠 AI 智能生成</b>';
  html += '<div style="margin:6px 0;display:flex;gap:4px;">';
  html += '<input id="ai-prompt-input" type="text" placeholder="输入主题词,如: 海底世界、太空站、僵尸入侵..." style="flex:1;padding:6px 8px;border:1px solid #555;border-radius:4px;background:#1a1a2e;color:#fff;font-size:13px;" onkeydown="if(event.key===\'Enter\')generateAILevelFromPrompt()">';
  html += '<button class="btn-small" style="background:#ab47bc;color:#fff;padding:6px 12px;white-space:nowrap;" onclick="generateAILevelFromPrompt()">生成</button>';
  html += '</div>';
  html += '<div style="font-size:10px;color:#888;">输入任意主题词,DeepSeek AI 为你生成专属关卡。需要联网 + API Key。</div>';
  html += '</div>';

  // 伪随机: 模板选择
  html += '<div style="margin:8px 0;"><b style="color:#ffd700;">🎲 随机模板生成</b></div>';
  const templates = AILevelGenerator.getTemplateList();
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;max-height:160px;overflow-y:auto;">';
  for(const t of templates){
    html += `<button class="btn-small" style="padding:6px 10px;font-size:11px;"
      onclick="generateAILevel('${t.id}')">${t.icon} ${t.name}</button>`;
  }
  html += '</div>';

  html += '<button class="btn-small" style="margin-top:10px;" onclick="document.getElementById(\'ai-panel\').remove()">关闭</button>';

  const existing = document.getElementById('ai-panel');
  if(existing) existing.remove();
  const panel = document.createElement('div');
  panel.id = 'ai-panel';
  panel.className = 'overlay';
  panel.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000;';
  panel.innerHTML = `<div class="confirm-inner" style="max-width:520px;">${html}</div>`;
  panel.addEventListener('click', e => { if(e.target === panel) panel.remove(); });
  document.getElementById('game-container').appendChild(panel);
  // v3: 自动聚焦输入框，防止失焦bug
  setTimeout(()=>{
    const inp = document.getElementById('ai-prompt-input');
    if(inp) inp.focus();
  }, 150);
}

function changeDeepSeekKey(){
  const cur = getDeepSeekKey();
  const key = prompt('输入 DeepSeek API Key:\n(获取: platform.deepseek.com → API Keys)\n\n留空则清除已保存的Key', cur || '');
  if(key !== null){
    if(key.trim()){
      setDeepSeekKey(key.trim());
      showToast('API Key 已保存');
    } else if(cur){
      localStorage.removeItem('cellQuest_ds_key');
      showToast('API Key 已清除');
    }
    const panel = document.getElementById('ai-panel');
    if(panel) panel.remove();
    setTimeout(()=>showAIGeneratePanel(), 100);
  }
}

async function generateAILevelFromPrompt(){
  const input = document.getElementById('ai-prompt-input');
  const prompt = input ? input.value.trim() : '';
  if(!prompt){ showToast('请输入主题词'); return; }

  const panel = document.getElementById('ai-panel');
  if(panel) panel.remove();
  showToast('🧠 AI 正在生成关卡... (可能需要10-30秒)');

  try{
    const levelData = await generateAIMap(prompt);
    if(levelData.error){
      showToast('生成失败: ' + levelData.error);
      return;
    }

    const idx = addCustomLevel(levelData, '🧠');
    refreshCustomLevels();
    showToast('✅ AI 关卡 "' + levelData.name + '" 已生成！');
    renderHub();
  }catch(e){
    showToast('生成出错: ' + e.message);
  }
}

let hubTab = 'builtin'; // 当前Hub标签

function switchHubTab(tab){
  hubTab = tab;
  document.querySelectorAll('.hub-tab').forEach(b=>b.classList.toggle('active', b.id === 'tab-'+tab));
  renderLevelGrid();
}

function showHub(){
  Game.state = 'hub';
  refreshCustomLevels();
  $('main-menu').classList.add('hidden');
  $('hub-screen').classList.remove('hidden');
  $('hud').classList.remove('active');
  $('pause-menu').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  const fp = $('focus-prompt');
  if(fp) fp.classList.add('hidden');
  hubTab = 'builtin';
  document.querySelectorAll('.hub-tab').forEach(b=>b.classList.toggle('active', b.id === 'tab-builtin'));
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
  const isCustomTab = hubTab === 'custom';
  grid.className = isCustomTab ? 'custom-grid' : '';
  const configs = buildLevelConfigs();
  const builtinCount = configs.filter(c=>!c._isCustom).length;
  const customCount = configs.length - builtinCount;
  const ccEl = $('custom-count'); if(ccEl) ccEl.textContent = customCount > 0 ? '('+customCount+')' : '';

  // 自定义标签空状态
  if(isCustomTab && customCount === 0){
    grid.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#888;width:100%;">
      <div style="font-size:40px;margin-bottom:12px;">🎨</div>
      <div style="font-size:15px;margin-bottom:4px;">暂无自定义关卡</div>
      <div style="font-size:12px;color:#666;">使用<b>地图编辑器</b>或<b>AI生成</b>创建关卡</div>
      <button class="btn-small" style="margin-top:12px;" onclick="window.open('editor.html','_blank')">🗺️ 打开地图编辑器</button>
    </div>`;
    return;
  }

  let idx = 0;

  for(let i=0; i < configs.length; i++){
    const cfg = configs[i];
    const isCustom = cfg._isCustom;

    // 按标签过滤
    if(isCustomTab && !isCustom) continue;
    if(!isCustomTab && isCustom) continue;

    const card = document.createElement('div');
    // 自定义关卡始终解锁,不检查locked
    const isLocked = isCustom ? false : !Game.unlocked[i];
    const cellLabel = cfg.cellType === 1 ? '⚪WBC' : cfg.cellType === 3 ? '🔴RBC' : '';
    const levelNum = isCustom ? (idx + 1) : (i + 1);

    let innerHTML = '';
    if(isCustom){
      // 自定义关卡: 小卡片矩阵风格
      innerHTML += `
        <div style="position:relative;padding:8px;text-align:center;">
          <div style="font-size:10px;color:#888;">自订#${levelNum}</div>
          <div style="font-size:28px;margin:4px 0;">${cfg.icon}</div>
          <div style="font-size:11px;color:#e8e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cfg.name}</div>
          ${Game.completed[i] ? `<div style="font-size:10px;color:#ffd700;">${'★'.repeat(Game.stars[i])}</div>` : ''}
          <div style="font-size:9px;color:#888;">${cellLabel}</div>
          <button style="position:absolute;top:2px;right:2px;background:rgba(220,50,50,.6);border:none;color:#fff;font-size:10px;width:18px;height:18px;border-radius:50%;cursor:pointer;line-height:1;" onclick="event.stopPropagation();deleteCustomLevelCard(${i})">✕</button>
          <button style="position:absolute;top:2px;right:22px;background:rgba(255,215,0,.4);border:none;color:#fff;font-size:10px;width:18px;height:18px;border-radius:50%;cursor:pointer;line-height:1;" onclick="event.stopPropagation();pickCustomIcon(${i})">🎨</button>
        </div>
      `;
      card.className = 'level-card custom-small';
      card.style.cssText = 'width:130px;height:auto;padding:0;';
      idx++;
    } else if(isLocked){
      innerHTML += `
        <div class="lv-header">第${levelNum}关</div>
        <div class="lock-overlay">🔒</div>
        <div class="lv-icon-wrap"><div class="lv-icon">${cfg.icon}</div></div>
        <div class="lv-name">???</div>
      `;
      card.className = 'level-card locked';
    } else {
      innerHTML += `
        <div class="lv-header">第${levelNum}关: ${cfg.name} <small>${cellLabel}</small></div>
        <div class="lv-icon-wrap"><div class="lv-icon">${cfg.icon}</div></div>
        <div class="lv-name">${cfg.name}</div>
        ${Game.completed[i] ? `<div class="stars">${'★'.repeat(Game.stars[i])}${'☆'.repeat(3-Game.stars[i])}</div>` : ''}
      `;
      card.className = 'level-card';
    }

    card.innerHTML = innerHTML;
    card.title = isLocked ? '未解锁' : cfg.desc;

    if(!isLocked){
      card.onclick = ()=>selectCellAndLoad(i + 1);
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

  // v3: 评分制星级评定
  let stars = 1; // 1星：抵达终点
  const energyPct = Game.globalEnergy / getMaxEnergy();

  // 计算完成度
  let completionPct = 0;
  if(Game.winCondition === WIN_KILL_ALL){
    const totalEnemies = Game.level.enemies.length + (Game.boss ? 1 : 0);
    completionPct = totalEnemies > 0 ? Game.stats.kills / totalEnemies : 1;
  } else if(Game.winCondition === WIN_COLLECT_ALL){
    completionPct = Game.totalItems > 0 ? Game.itemsCollected / Game.totalItems : 1;
  } else {
    completionPct = 1;
  }

  // 2星：完成度 ≥ 60%
  if(completionPct >= 0.6) stars++;
  // 3星：完成度 ≥ 90% + 0死亡 + 记忆细胞
  if(completionPct >= 0.9 && Game.stats.deaths === 0 && Game.stats.foundMemory) stars++;
  // 完美通关（100%完成+0死亡）：展示特殊标记
  const isPerfect = completionPct >= 1.0 && Game.stats.deaths === 0;

  if(Game.stars[idx] < stars) Game.stars[idx] = stars;

  // 存储完成度用于结算面板
  Game._lastCompletionPct = completionPct;
  Game._lastIsPerfect = isPerfect;

  // 通关后视为已熟悉本关，之后不再自动弹出教程
  Game.tutorialsDone = true;
  try{ localStorage.setItem('cellQuest_tutorials_done', '1'); }catch(e){}

  // v3: 更新自适应难度
  const energyPct2 = Game.globalEnergy / getMaxEnergy();
  updateAdaptiveDifficulty(true, Game.deathsThisRun, Game.levelTime, energyPct2);

  // 速通记录
  let isNewRecord = false;
  const best = Game.bestTime;
  if(best === 0 || Game.levelTime < best){
    Game.bestTime = Game.levelTime;
    isNewRecord = true;
    try{ localStorage.setItem(SPEEDRUN_KEY, String(Game.bestTime)); }catch(e){}
  }
  saveGame();

  // v3: 首次通关提示设置昵称
  if(!Game.playerName){
    const name = prompt('🎉 首次通关！\n请输入你的玩家昵称 (排行榜显示):', '免疫战士');
    if(name && name.trim()){
      Game.playerName = name.trim().substring(0, 12);
      saveGame();
    }
  }

  // v3: 录入本地排行榜
  const rank = recordLevelScore(idx, Game.levelTime, Game._lastCompletionPct, Game.stats.deaths, Game.playerLevel);

  // v3: 成就检测
  Game._justCleared = true;
  Game._lifetimeKills += Game.stats.kills;
  saveGame();
  checkAchievements();
  Game._justCleared = false;

  $('complete-level-name').textContent = buildLevelConfigs()[idx].name;
  $('stat-kills').textContent = Game.stats.kills;
  $('stat-items').textContent = Game.stats.items;
  // v3: 完成度
  $('stat-completion').textContent = Math.round(Game._lastCompletionPct * 100) + '%'
    + (Game._lastIsPerfect ? ' 👑 完美' : '');
  // v3: 科普卡片
  const kc = KNOWLEDGE_CARDS[idx + 1]; // 1-based ID mapping
  const knowEl = document.getElementById('stat-knowledge');
  if(knowEl && kc){
    knowEl.innerHTML = '<b style="color:#ffd700;">📖 ' + kc.title + '</b><br><small style="color:#aaa;">' + kc.text + '</small>';
    knowEl.style.display = 'block';
  } else if(knowEl){
    knowEl.style.display = 'none';
  }
  $('stat-energy').textContent = Math.round(Game.globalEnergy);
  $('stat-rating').textContent = '★'.repeat(stars) + '☆'.repeat(3-stars)
    + (Game._lastIsPerfect ? ' 👑' : '')
    + ' (' + Math.round(Game._lastCompletionPct * 100) + '%)';
  // v3: 排行
  if(rank && rank <= LB_MAX_ENTRIES){
    $('stat-rating').textContent += ' | 🏆 #' + rank;
  }
  $('stat-time').textContent = formatTime(Game.levelTime);
  $('stat-best-time').textContent = best > 0 ? formatTime(best) : '--:--.--';
  if(isNewRecord) $('stat-best-time').classList.add('new-record');
  else $('stat-best-time').classList.remove('new-record');
  // 记忆细胞状态
  const memEl = $('stat-memory');
  if(memEl) memEl.textContent = Game.stats.foundMemory ? '✓ 已收集' : '✗ 未找到';
  $('death-panel').classList.add('hidden');
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
  $('death-panel').classList.add('hidden');
  $('dialogue-bubble').classList.remove('active');
  $('memory-card').classList.add('hidden');
  $('hud').classList.remove('active');
  const fp = $('focus-prompt');
  if(fp){ fp.classList.remove('hidden'); fp.textContent = '点击此处开始游戏'; }
  showHub();
}

// ===== 关卡加载（通用入口函数） =====
function LoadLevel(n, cellTypeOverride){
  const idx = n - 1; // v3: 1-based → 0-based array index
  const configs = buildLevelConfigs();
  if(idx < 0 || idx >= configs.length) return false;
  // 自定义关卡始终可玩,不检查解锁状态
  if(!configs[idx]._isCustom && !Game.unlocked[idx]){
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
  Game.dcNPCs = [];     // v3: 重置DC NPC
  Game.level = new Level(mapData);
  const cfg = configs[idx];
  const isCustom = cfg._isCustom;

  // v3: 从Level 3开始(含自定义关卡)可自由选择细胞类型
  const defaultCell = cellTypeOverride || cfg.cellType || 1;
  Game.players = [];
  const p1 = new Player(Game.level.playerSpawn.x, Game.level.playerSpawn.y, 0);
  p1.cellType = defaultCell;
  Game.players.push(p1);

  if(Game.twoPlayer){
    const p2 = new Player(Game.level.playerSpawn.x + 40, Game.level.playerSpawn.y, 1);
    p2.cellType = Game._p2CellType || defaultCell;
    Game.players.push(p2);
    Game._p2CellType = null; // 用完清掉
  }

  Game.player = Game.players[0];
  Game.player.cellType = defaultCell;
  // 根据选择的细胞类型决定通关条件
  if(cellTypeOverride){
    cfg.winCondition = defaultCell === 3 ? WIN_COLLECT_ALL : WIN_KILL_ALL;
  }
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
  Game.cells = 3;          // 初始化细胞数（生命数）
  Game.deathsThisRun = 0;   // v3: 本局死亡计数
  Game.keysP2 = {};          // v3: 初始化P2按键
  Game.prevKeysP2 = {};
  // 挥剑状态重置（Boss 由关卡地图 b 瓦片创建，不在此处清空）
  Game.swordTimer = 0;
  Game.swordCooldown = 0;
  Game.allEnemiesDead = false;
  // 知识卡片触发状态（每张独立，不限制细胞类型）
  Game.knowledgeCardTriggered = new Set();

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

  // v3: 应用记忆细胞永久加成
  applyMemoryBonuses();
  // v3: 应用自适应难度调整
  applyAdaptiveDifficulty();

  Game.state = 'playing';
  $('hub-screen').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  $('death-panel').classList.add('hidden');
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

// ===== v3: 记忆细胞加成应用 =====
function applyMemoryBonuses(){
  const bonus = getMemoryBonus(Game.memoryCells);
  if(Game.memoryCells <= 0) return;

  // 应用到所有玩家
  for(const p of Game.players){
    if(!p) continue;
    // 初始能量加成
    Game.globalEnergy = Math.min(getMaxEnergy(), Game.globalEnergy + bonus.startEnergy);
    // 最大生命加成
    if(bonus.maxHp > 0){
      p.maxHealth = 100 + bonus.maxHp;
      p.health = p.maxHealth;
    }
    // 挥剑伤害加成
    if(bonus.swordDmg > 0){
      p.atk = WBC_BASE_ATK + bonus.swordDmg;
    } else {
      p.atk = WBC_BASE_ATK;
    }
    // 开局护盾
    if(bonus.startShield > 0){
      p.shield = 600; // 10秒护盾
    }
  }
}

// ===== v3: 自适应难度应用 =====
function applyAdaptiveDifficulty(){
  const d = Game.adaptiveDifficulty;
  const lvl = Game.level;
  if(!lvl) return;

  const cfg = ADAPTIVE_DIFFICULTY[d.level];
  showToast('当前难度：' + cfg.name + ' | 敌人' + (d.adjustEnemies>=0?'+':'') + d.adjustEnemies + '% | 道具' + (d.adjustItems>=0?'+':'') + d.adjustItems + '%');

  if(d.adjustEnemies > 0){
    const extraCount = Math.floor(lvl.enemies.length * d.adjustEnemies / 100);
    for(let i = 0; i < extraCount; i++){
      const col = 30 + Math.floor(Math.random() * (lvl.width - 35));
      const type = Math.random() < 0.5 ? 'staph' : 'strep';
      lvl.enemies.push(new Enemy(col * TILE + 4, 12 * TILE + 8, type));
    }
  } else if(d.adjustEnemies < 0){
    const removeCount = Math.floor(lvl.enemies.length * Math.abs(d.adjustEnemies) / 100);
    for(let i = 0; i < removeCount && lvl.enemies.length > 1; i++){
      lvl.enemies.splice(Math.floor(Math.random() * lvl.enemies.length), 1);
    }
  }

  if(d.adjustItems > 0){
    const extraItems = Math.floor(lvl.items.length * d.adjustItems / 100);
    for(let i = 0; i < extraItems; i++){
      lvl.items.push(new Item(10*TILE + Math.random()*(lvl.width-15)*TILE, 12*TILE+8, 'atp'));
    }
  } else if(d.adjustItems < 0){
    const removeItems = Math.floor(lvl.items.length * Math.abs(d.adjustItems) / 100);
    for(let i = 0; i < removeItems && lvl.items.length > 2; i++){
      lvl.items.splice(Math.floor(Math.random() * lvl.items.length), 1);
    }
  }
  Game.totalItems = lvl.items.length;
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

// ===== 死亡面板 =====
function showDeathPanel(){
  if(!Game.player) return;

  // 更新细胞名称
  const cellNames = {1:'白细胞（中性粒细胞）', 2:'血小板', 3:'红细胞'};
  $('death-cell-name').textContent = cellNames[Game.player.cellType] || '未知细胞';

  // 根据 cellType 选头像（WBC=1, PLT=2, RBC=3）
  const avatarMap = {1:'images/avatar-wbc.png', 2:'images/avatar-plt.png', 3:'images/avatar-rbc.png'};
  const avatarEl = $('death-cell-avatar');
  avatarEl.src = avatarMap[Game.player.cellType] || 'images/avatar-rbc.png';
  // Game.cells <= 0 时头像变灰
  if(Game.cells <= 0){
    avatarEl.classList.add('lost');
  } else {
    avatarEl.classList.remove('lost');
  }

  // 数字 -1
  const countEl = $('death-cells-count');
  countEl.textContent = Game.cells;
  if(Game.cells <= 0){
    countEl.classList.add('lost');
  } else {
    countEl.classList.remove('lost');
  }

  // 更新重试按钮
  const retryBtn = $('btn-retry');
  const countBtn = $('death-cells-count-btn');
  if(countBtn) countBtn.textContent = Game.cells;
  if(Game.cells <= 0){
    retryBtn.disabled = true;
    retryBtn.innerHTML = '细胞耗尽，无法继续挑战';
  } else {
    retryBtn.disabled = false;
    retryBtn.innerHTML = '继续挑战 (剩余细胞: <span id="death-cells-count-btn">' + Game.cells + ')</span>';
  }

  // 显示面板，隐藏 HUD
  $('death-panel').classList.remove('hidden');
  $('hud').classList.remove('active');
  $('death-flash').classList.remove('active');
  Game.deathTimer = 0; // 防止 update() 中再次激活死亡闪屏

  // 自动聚焦
  const container = $('game-container');
  container.focus();
}

function retryFromDeath(){
  if(Game.cells <= 0) return;

  const lvl = Game.level;
  if(!lvl) return;

  // v3: 双人模式 — 两个玩家都重生到检查点
  for(const p of Game.players){
    if(!p) continue;
    p.x = p.checkpointX;
    p.y = p.checkpointY;
    if(Game.twoPlayer && p.playerIndex === 1) p.x += 40;
    p.vx = 0; p.vy = 0;
    p.health = p.maxHealth;
    p.invincible = 60;
    p.jumpsLeft = 1;
  }
  // 兼容旧代码
  Game.player = Game.players[0];

  // v3: 记忆细胞 — 恢复保留的能量
  if(Game._deathEnergyKeep > 0){
    Game.globalEnergy = Math.min(getMaxEnergy(), Game._deathEnergyKeep);
    Game._deathEnergyKeep = 0;
  }

  // 隐藏死亡面板
  $('death-panel').classList.add('hidden');
  $('hud').classList.add('active');
  Game.state = 'playing';
  Game.deathTimer = 0;

  updateHUD();

  const container = $('game-container');
  container.focus();
}

function quitFromDeath(){
  // v3: 更新自适应难度（死亡退出也计入）
  updateAdaptiveDifficulty(false, Game.deathsThisRun, 0, 0);
  $('death-panel').classList.add('hidden');
  backToHub();
}

// ===== 初始化 =====
function init(){
  Game.canvas = $('canvas');
  Game.ctx = Game.canvas.getContext('2d');
  Game.ctx.imageSmoothingEnabled = false;

  loadSprites();

  // v3: 迁移旧版单存档 → 多栏位
  migrateOldSave();
  // 读取当前栏位
  try{
    const cs = localStorage.getItem('cellQuest_currentSlot');
    if(cs != null) Game.currentSlot = parseInt(cs) || 0;
  }catch(e){}
  loadGame();
  loadAdaptiveDifficulty();  // v3: AI自适应难度
  setupInput();

  $('btn-start').onclick = ()=>{
    Sfx.init();
    // 自动找第一个空存档作为新游戏
    let emptySlot = -1;
    for(let i=0;i<MAX_SLOTS;i++){ if(!getSlotInfo(i).exists){ emptySlot=i; break; } }
    if(emptySlot >= 0){
      switchSlot(emptySlot);
      showToast('已创建新存档: 存档 '+(emptySlot+1));
    }
    showHub(); $('game-container').focus();
  };
  // 主菜单快捷按钮: 在当前页面弹出面板,不跳转
  try{ $('btn-menu-slots').onclick = ()=>{ Sfx.init(); showSlotPanel(); }; }catch(e){}
  try{ $('btn-menu-lb').onclick = ()=>{ Sfx.init(); showLeaderboard(); }; }catch(e){}
  // Hub 左上角返回
  try{ $('btn-menu-back-top').onclick = ()=>{ showMenu(); }; }catch(e){}
  $('btn-menu-back').onclick = ()=>{ showMenu(); };
  $('btn-hub-pedia').onclick = ()=>{ showPedia(); };
  $('btn-pedia-close').onclick = ()=>{ closePedia(); };
  $('btn-pedia-wbc').onclick = ()=>{ showCharDetail('wbc'); };
  $('btn-pedia-rbc').onclick = ()=>{ showCharDetail('rbc'); };
  $('btn-pedia-plt').onclick = ()=>{ showCharDetail('plt'); };
  $('btn-char-back').onclick = ()=>{ closeCharDetail(); };
  $('btn-resume').onclick = ()=>{ togglePause(); };
  $('btn-quit').onclick = ()=>{ backToHub(); };
  $('btn-next-level').onclick = ()=>{ backToHub(); };
  // 死亡面板按钮
  $('btn-retry').onclick = ()=>{ retryFromDeath(); };
  $('btn-death-quit').onclick = ()=>{ quitFromDeath(); };
  // 对话气泡按钮
  $('btn-bubble-next').onclick = ()=>{ dismissTutorial(); };
  $('btn-bubble-skip').onclick = ()=>{ skipAllTutorials(); };
  // 记忆卡片关闭
  $('btn-memory-close').onclick = ()=>{ closeMemoryCard(); };
  // 确认框
  let confirmCallback=null;
  window.showConfirm=(msg,onYes)=>{Game.paused=true;$('confirm-msg').textContent=msg;$('confirm-dialog').classList.remove('hidden');confirmCallback=onYes;};
  window.hideConfirm=()=>{$('confirm-dialog').classList.add('hidden');confirmCallback=null;if(Game.state==='playing')Game.paused=false;};
  $('btn-confirm-yes').onclick=e=>{e.stopPropagation();try{if(confirmCallback)confirmCallback();}catch(err){console.error(err);}hideConfirm();};
  $('btn-confirm-no').onclick=e=>{e.stopPropagation();hideConfirm();};
  $('confirm-dialog').addEventListener('click',e=>{if(e.target===$('confirm-dialog'))hideConfirm();});
  $('home-btn').onclick=e=>{e.stopPropagation();if(Game.state!=='playing'&&Game.state!=='paused')return;showConfirm('确定要离开当前关卡吗？\n进度将不会保存。',()=>{backToHub();});};

  // v3: AI 生成关卡按钮
  $('btn-hub-ai').onclick = ()=>{ showAIGeneratePanel(); };

  // v3: 存档管理
  $('btn-hub-slots').onclick = ()=>{ showSlotPanel(); };

  // v3: 排行榜
  $('btn-hub-lb').onclick = ()=>{ showLeaderboard(); };

  // v3: 成就
  $('btn-hub-achs').onclick = ()=>{ showAchievements(); };

  // v3: 双人模式切换
  const btn2p = $('btn-hub-2p');
  if(btn2p){
    btn2p.onclick = ()=>{
      Game.twoPlayer = !Game.twoPlayer;
      btn2p.textContent = Game.twoPlayer ? '👥 双人模式: ON' : '👥 双人模式: OFF';
      btn2p.style.borderColor = Game.twoPlayer ? '#81c784' : '#4fc3f7';
      btn2p.style.color = Game.twoPlayer ? '#81c784' : '#4fc3f7';
      if(Game.twoPlayer){
        showToast('双人模式已开启 | P1: WASD+Space/E/Shift | P2: IJKL+U/O | 技能: P1=1234 P2=7890');
      }
    };
  }

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
