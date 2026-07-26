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
    this.sceneInfos = mapData.sceneInfos || [];
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
          case 's':
            this.enemies.push(new Enemy(c*TILE+4, r*TILE+8, 'salmonella'));
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
    if(!this.finish) return;
    const x = Math.round(this.finish.x) - Math.round(camX);
    const y = this.finish.y;
    const cx = x + TILE/2;
    const cy = y + TILE/2;
    const t = Game.frame;
    ctx.save();

    // 外层绿色光晕（始终存在，不自动消失）
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE * 1.2);
    glow.addColorStop(0,    'rgba(120,255,160,0.85)');
    glow.addColorStop(0.35, 'rgba(60,220,120,0.45)');
    glow.addColorStop(1,    'rgba(60,220,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 旋转双光环
    ctx.translate(cx, cy);
    const rot = t * 0.04;
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(140,255,180,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, TILE * 0.42, TILE * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(Math.PI / 2);
    ctx.strokeStyle = 'rgba(80,230,140,0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, TILE * 0.42, TILE * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 核心光点
    ctx.rotate(-rot - Math.PI / 2);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, TILE * 0.32);
    core.addColorStop(0, 'rgba(230,255,235,0.95)');
    core.addColorStop(1, 'rgba(80,255,140,0.1)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, TILE * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // 上升粒子
    ctx.rotate(rot + Math.PI / 2);
    for(let i = 0; i < 5; i++){
      const ph = ((t * 0.02) + i * 0.2) % 1;
      const py2 = TILE * 0.5 - ph * TILE;
      const px2 = Math.sin((t * 0.05) + i * 1.3) * TILE * 0.28;
      const r = 2 + (1 - ph) * 2;
      ctx.globalAlpha = 0.8 * (1 - ph);
      ctx.fillStyle = 'rgba(180,255,200,0.9)';
      ctx.beginPath();
      ctx.arc(px2, py2, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 地面「终点」标识
    ctx.save();
    ctx.fillStyle = 'rgba(120,255,160,0.9)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('终点', cx, y - 8);
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
  q:'switchCell', Q:'switchCell',
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
  'y':'switchCell', 'Y':'switchCell',
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

  // 首次点击/聚焦时解锁音频上下文（浏览器自动播放策略）
  const unlockAudio = () => { Sfx.resume(); Sfx.startBgm(); }; // 沿用当前模式（默认菜单舒缓）
  container.addEventListener('click', unlockAudio);

  // 音效静音按钮（覆盖层，不改动原有布局）
  if(!document.getElementById('sfx-mute-btn')){
    const mb = document.createElement('button');
    mb.id = 'sfx-mute-btn';
    mb.type = 'button';
    mb.textContent = '🔊';
    mb.title = '音效开关（或按 M 键）';
    mb.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2000;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(20,20,30,.6);color:#fff;font-size:18px;line-height:1;cursor:pointer;backdrop-filter:blur(4px);';
    mb.addEventListener('click', (ev) => {
      ev.stopPropagation();
      Sfx.toggleMute();
      mb.textContent = Sfx.muted ? '🔇' : '🔊';
    });
    document.body.appendChild(mb);
  }

  // 关卡开场剧情：点击画面推进下一句
  const introScreen = $('intro-screen');
  if(introScreen){
    introScreen.addEventListener('click', e=>{
      if(Game.state === 'intro'){
        e.stopPropagation();
        Sfx.init();
        advanceIntroDialogue();
      }
    });
  }

  document.addEventListener('keydown', e=>{
    Sfx.init();
    // 开场剧情状态：只响应空格/Enter推进下一句，其余游戏操作全部锁定
    if(Game.state === 'intro'){
      if(!e.repeat && (e.key === ' ' || e.key === 'Enter')){
        advanceIntroDialogue();
        e.preventDefault();
      }
      return;
    }
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
    // 音效静音切换（M 键）
    if(e.key === 'm' || e.key === 'M'){
      Sfx.toggleMute();
      const mb = document.getElementById('sfx-mute-btn');
      if(mb) mb.textContent = Sfx.muted ? '🔇' : '🔊';
    }
  });
  document.addEventListener('keyup', e=>{
    if(Game.state === 'intro') return;
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
// ===== 像素风关卡背景（按关卡主题定制，置于最底层，不遮挡任何实体/UI）=====
const _BG_TILE_W = 1200;
const _bgTileCache = {};
const BG_THEMES = {
  // 第1关 皮肤防线·擦伤：浅肉粉、米肤色
  0:{top:'#f6d9c6',bot:'#e3a39c',cell:'#f8dfcc',cellEdge:'#e3b59d',crack:'#b5564f',bact:'#7cc36b'},
  // 第2关 肠道危机·食物中毒(上)：橙黄、暗红
  1:{top:'#5a2c16',bot:'#34130b',villi:'#c8632e',villiEdge:'#8f3d18',food:'#f0b03a',toxin:'#7a1f1f'},
  // 第3关 蠕虫侵袭·食物中毒(下)：暗褐、深红
  2:{top:'#3a241a',bot:'#1a0f0a',villi:'#7a4a32',worm:'#cc9270',wormEdge:'#8a5a3a',spore:'#9c3b3b'},
  // 第4关 呼吸道烽火·流行性感冒：冷调淡蓝、浅紫
  3:{top:'#26405f',bot:'#3a2c5e',tube:'#82abdc',tubeEdge:'#4a6a9a',virus:'#b18fd8',drop:'#bfe0ff'},
  // 第5关 组织溃烂·真菌感染：暗紫、灰褐
  4:{top:'#2a2030',bot:'#151018',tissue:'#5a4a66',fungus:'#8a7a6a',spore:'#b08fd0',hypha:'#6a5a4a'},
  // 第6关 细胞畸变·癌细胞侵袭：深红、暗紫
  5:{top:'#3a0e1a',bot:'#1e0814',cancer:'#c01f3a',cancerEdge:'#7a0e22',normal:'#c7a6b0',nucleus:'#3a0a14'},
};
function bgTheme(idx){ return BG_THEMES[idx] || BG_THEMES[0]; }

// 像素圆：用方块填充，呈现颗粒像素感
function _pxBlob(bx, cx, cy, r, color, edge){
  const s = 4;
  for(let y=-r; y<=r; y+=s){
    for(let x=-r; x<=r; x+=s){
      const d = Math.sqrt(x*x+y*y);
      if(d <= r){
        bx.fillStyle = (edge && d > r - s*1.4) ? edge : color;
        bx.fillRect((cx+x)|0, (cy+y)|0, s, s);
      }
    }
  }
}
// 随机像素颗粒（纹理感）
function _speckle(bx, x0, y0, w, h, color, count){
  for(let i=0;i<count;i++){
    const x = x0 + Math.random()*w, y = y0 + Math.random()*h;
    bx.fillStyle = color;
    bx.fillRect(x|0, y|0, 3, 3);
  }
}

// --- 各关卡主题场景（绘制到离屏瓦片，仅建一次）---
// 第1关：表皮角质层细胞 + 屏障破损裂口 + 少量入侵细菌
function _sceneSkin(bx,T,W,H){
  const cw=64, ch=48;
  for(let y=20; y<H-30; y+=ch){
    const off = ((y/ch)%2)*(cw/2);
    for(let x=40; x<W-40; x+=cw){
      const jx = x+off;
      bx.fillStyle = T.cell; bx.fillRect(jx, y, cw-9, ch-9);
      bx.fillStyle = 'rgba(255,255,255,0.28)'; bx.fillRect(jx, y, cw-9, 4);
      bx.fillStyle = T.cellEdge; bx.fillRect(jx, y+ch-12, cw-9, 4);
    }
  }
  const crackX = W*0.56;
  for(let y=0; y<H; y+=8){
    const cx = crackX + Math.sin(y*0.05)*24 + (y>H*0.5? 16:0);
    bx.fillStyle = T.crack; bx.fillRect(cx, y, 11, 8);
    bx.fillStyle = 'rgba(0,0,0,0.28)'; bx.fillRect(cx+3, y, 4, 8);
  }
  for(let i=0;i<7;i++){
    const bxx = 120 + (i*150)%(W-220);
    const byy = 70 + (i*97)%(H-140);
    bx.fillStyle = T.bact; bx.fillRect(bxx, byy, 16, 8);
    bx.fillStyle = 'rgba(255,255,255,0.2)'; bx.fillRect(bxx, byy, 16, 3);
    bx.fillStyle = 'rgba(0,0,0,0.25)'; bx.fillRect(bxx+13, byy, 3, 8);
  }
}
// 第2/3关：小肠绒毛场景（worm=true 增加蠕虫与孢子）
function _sceneIntestine(bx,T,W,H,worm){
  const step = 72;
  for(let x=50; x<W-40; x+=step){
    const vh = 150 + ((x*7)%90);
    const w = 34;
    bx.fillStyle = T.villi; bx.fillRect(x, 0, w, vh);
    _pxBlob(bx, x+w/2, vh, w/2, T.villi, T.villiEdge);
    bx.fillStyle = T.villiEdge; bx.fillRect(x, vh-12, w, 6);
    bx.fillStyle = 'rgba(255,255,255,0.16)'; bx.fillRect(x+5, 4, 6, vh*0.5);
  }
  if(worm){
    for(let k=0;k<4;k++){
      const baseY = 230 + k*58; const phase = k*1.3;
      for(let x=40;x<W-40;x+=10){
        const yy = baseY + Math.sin(x*0.03+phase)*34;
        _pxBlob(bx, x, yy, 13, T.worm, T.wormEdge);
      }
      for(let x=40;x<W-40;x+=40){
        const yy = baseY + Math.sin(x*0.03+phase)*34;
        bx.fillStyle = T.wormEdge; bx.fillRect(x-2, yy-13, 4, 26);
      }
    }
    for(let i=0;i<14;i++){
      _pxBlob(bx, 60+(i*83)%(W-100), 80+(i*53)%(H-120), 7, T.spore, '#5a1414');
    }
  } else {
    for(let i=0;i<16;i++){
      const fx=70+(i*71)%(W-110), fy=120+(i*113)%(H-180);
      bx.fillStyle = T.food; bx.fillRect(fx, fy, 18, 14);
      bx.fillStyle = 'rgba(255,255,255,0.22)'; bx.fillRect(fx, fy, 18, 4);
    }
    for(let i=0;i<10;i++){
      const tx=90+(i*109)%(W-120), ty=H-90-(i*37)%(H-150);
      _pxBlob(bx, tx, ty, 12, T.toxin, '#4a0f0f');
    }
  }
}
// 第4关：气管/支气管 + 流感病毒 + 飞沫
function _sceneRespiratory(bx,T,W,H){
  const my = H*0.5;
  bx.fillStyle = T.tube; bx.fillRect(0, my-26, W, 52);
  bx.fillStyle = T.tubeEdge; bx.fillRect(0, my-26, W, 5); bx.fillRect(0, my+21, W, 5);
  bx.fillStyle = 'rgba(255,255,255,0.18)';
  for(let x=20;x<W;x+=44) bx.fillRect(x, my-26, 6, 52);
  for(let x=80;x<W;x+=180){
    for(let d=-1; d<=1; d+=2){
      const sgn=d;
      bx.fillStyle = T.tube;
      for(let t=0;t<70;t+=6){
        const bxp = x + sgn*t*0.5; const byp = my + sgn*t;
        bx.fillRect(bxp-4, byp-4, 8, 8);
      }
    }
  }
  for(let i=0;i<16;i++){
    const vx=60+(i*97)%(W-110), vy=50+(i*61)%(H-90);
    _pxBlob(bx, vx, vy, 12, T.virus, '#7a5aa0');
    bx.fillStyle = '#5a3a7a';
    for(let a=0;a<8;a++){ const ang=a/8*Math.PI*2; bx.fillRect(vx+Math.cos(ang)*14-2, vy+Math.sin(ang)*14-2, 4,4); }
  }
  for(let i=0;i<22;i++){
    _pxBlob(bx, 40+(i*53)%(W-80), 30+(i*89)%(H-60), 4, T.drop, null);
  }
}
// 第5关：病变组织斑块 + 真菌菌丝 + 孢子（蘑菇点）
function _sceneFungus(bx,T,W,H){
  for(let i=0;i<26;i++){
    const px=40+(i*113)%(W-80), py=30+(i*79)%(H-80);
    _pxBlob(bx, px, py, 26+(i%5)*6, T.tissue, '#3a2e48');
  }
  bx.fillStyle = T.hypha;
  for(let s=0;s<10;s++){
    let x=60+(s*121)%(W-100), y=40+(s*97)%(H-80);
    for(let t=0;t<40;t++){
      x += Math.sin(t*0.6+s)*3; y += 4;
      bx.fillRect(x|0, y|0, 3, 3);
      if(t%12===0) bx.fillRect((x+6)|0, (y-4)|0, 3, 3);
    }
  }
  for(let i=0;i<30;i++){
    const sx=50+(i*67)%(W-90), sy=60+(i*143)%(H-100);
    bx.fillStyle = T.fungus; bx.fillRect(sx-3, sy, 6, 5);
    _pxBlob(bx, sx, sy-4, 5, T.spore, null);
  }
}
// 第6关：大量异常增殖癌细胞 + 少量被包围的正常细胞
function _sceneCancer(bx,T,W,H){
  for(let i=0;i<60;i++){
    const cx=40+(i*97)%(W-80), cy=20+(i*131)%(H-40);
    _pxBlob(bx, cx, cy, 16+(i%4)*4, T.cancer, T.cancerEdge);
    bx.fillStyle = T.nucleus; _pxBlob(bx, cx, cy, 7, T.nucleus, null);
  }
  for(let i=0;i<8;i++){
    const cx=120+(i*150)%(W-180), cy=80+(i*97)%(H-140);
    _pxBlob(bx, cx, cy, 14, T.normal, '#9a7a86');
    bx.fillStyle = '#8a6a76'; _pxBlob(bx, cx, cy, 6, '#8a6a76', null);
  }
}
function _paintScene(bx, idx, T, W, H){
  if(idx===0 || idx>=6) _sceneSkin(bx,T,W,H);
  else if(idx===1) _sceneIntestine(bx,T,W,H,false);
  else if(idx===2) _sceneIntestine(bx,T,W,H,true);
  else if(idx===3) _sceneRespiratory(bx,T,W,H);
  else if(idx===4) _sceneFungus(bx,T,W,H);
  else if(idx===5) _sceneCancer(bx,T,W,H);
  _speckle(bx, 30, 20, W-60, H-40, 'rgba(0,0,0,0.05)', 2600);
  _speckle(bx, 30, 20, W-60, H-40, 'rgba(255,255,255,0.045)', 2200);
}
function _getBgTile(idx){
  if(_bgTileCache[idx]) return _bgTileCache[idx];
  const T = bgTheme(idx);
  const cv = document.createElement('canvas');
  cv.width = _BG_TILE_W; cv.height = CH;
  const bx = cv.getContext('2d');
  bx.imageSmoothingEnabled = false;
  const g = bx.createLinearGradient(0,0,0,CH);
  g.addColorStop(0, T.top); g.addColorStop(1, T.bot);
  bx.fillStyle = g; bx.fillRect(0,0,_BG_TILE_W,CH);
  _paintScene(bx, idx, T, _BG_TILE_W, CH);
  _bgTileCache[idx] = cv;
  return cv;
}

// ===== 生成的像素风关卡背景图（按关卡索引叠加，置于最底层，不遮挡任何实体/UI）=====
// 文件名采用 ASCII（bg1..bg6），与 Game.levelIndex 0..5 一一对应
const _LEVEL_BG_URLS = [
  'images/backgrounds/bg1.png', // 0: 第1关 皮肤防线·擦伤
  'images/backgrounds/bg2.png', // 1: 第2关 肠道危机·食物中毒(上)
  'images/backgrounds/bg3.png', // 2: 第3关 蠕虫侵袭·食物中毒(下)
  'images/backgrounds/bg4.png', // 3: 第4关 呼吸道烽火·流行性感冒
  'images/backgrounds/bg5.png', // 4: 第5关 组织溃烂·真菌感染
  'images/backgrounds/bg6.png', // 5: 第6关 细胞畸变·癌细胞侵袭
];
const _levelBgImg = {};
for(let i = 0; i < _LEVEL_BG_URLS.length; i++){
  const im = new Image();
  im.src = _LEVEL_BG_URLS[i];
  _levelBgImg[i] = im;
}

// 通关胜利背景图（危机解除风）：进入完整结算画面时作为最底层背景，
// 危险元素消散 + 柔和治愈光效铺满，与第2关通关画面统一风格；角色/UI/实体仍按原样绘制在最上层
const _WIN_BG_URLS = [
  'images/backgrounds/bg1_win.png', // 0: 第1关
  'images/backgrounds/bg2_win.png', // 1: 第2关
  'images/backgrounds/bg3_win.png', // 2: 第3关
  'images/backgrounds/bg4_win.png', // 3: 第4关
  'images/backgrounds/bg5_win.png', // 4: 第5关
  'images/backgrounds/bg6_win.png', // 5: 第6关
];
const _winBgImg = {};
for(let i = 0; i < _WIN_BG_URLS.length; i++){
  const im = new Image();
  im.src = _WIN_BG_URLS[i];
  _winBgImg[i] = im;
}

function drawBackground(ctx, camX, bg){
  const idx = Game.levelIndex;
  // 通关结算状态：使用对应的"危机解除"胜利背景图（最底层），角色/实体/UI 在其上原样绘制
  if(Game.state === 'complete'){
    const wimg = _winBgImg[idx];
    if(wimg && wimg.complete && wimg.naturalWidth > 0){
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(wimg, 0, 0, CW, CH);
      ctx.imageSmoothingEnabled = false;
      return;
    }
  }
  // 本关有生成背景图且已加载完成 → 以其作为最底层背景
  // 拉伸铺满 800x480，不裁切、不偏移，原构图完整保留；前景实体/UI 在其之上绘制，完全不变
  const img = _levelBgImg[idx];
  if(img && img.complete && img.naturalWidth > 0){
    ctx.imageSmoothingEnabled = true;   // 背景图适度平滑，呈现梦幻朦胧感
    ctx.drawImage(img, 0, 0, CW, CH);
    ctx.imageSmoothingEnabled = false;
    return;
  }
  // 无对应背景图（自定义关卡等）→ 回退到原程序化像素背景
  const T = bgTheme(idx);
  const grad = ctx.createLinearGradient(0,0,0,CH);
  grad.addColorStop(0, T.top); grad.addColorStop(1, T.bot);
  ctx.fillStyle = grad; ctx.fillRect(0,0,CW,CH);

  const tile = _getBgTile(idx);
  const par = 0.55; // 视差系数：背景慢于世界移动
  let off = Math.round(camX * par) % _BG_TILE_W;
  if(off < 0) off += _BG_TILE_W;
  ctx.imageSmoothingEnabled = false;
  for(let x = -off; x < CW; x += _BG_TILE_W){
    ctx.drawImage(tile, x, 0);
  }
}

// ===== 第2关：肠道视觉特效（粘液 + 受损肠道细胞 + 互动物体提示） =====
function drawIntestineDecor(ctx, camX){
  if(!Game.level) return;
  const floorTopAt = (typeof intestineFloorTop === 'function') ? intestineFloorTop : (c => 9);
  ctx.save();
  for(let c = 0; c < Game.level.width; c++){
    const wx = c * TILE - camX;
    if(wx < -50 || wx > CW + 50) continue;
    const ft = floorTopAt(c);
    // 受损 / 发炎肠道上皮细胞：附着于地板表面的玫红-紫斑（随帧脉动）
    if((c * 7) % 9 === 0){
      const fy = ft * TILE;
      const pulse = 0.5 + Math.sin(Game.frame * 0.05 + c) * 0.3;
      ctx.globalAlpha = 0.18 + 0.3 * pulse;
      ctx.fillStyle = '#c2185b';
      ctx.beginPath();
      ctx.ellipse(wx + TILE/2, fy + 3, 11, 5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 0.12 + 0.18 * pulse;
      ctx.fillStyle = '#e040fb';
      ctx.beginPath();
      ctx.ellipse(wx + TILE/2 - 3, fy + 1, 4, 2, 0, 0, Math.PI*2);
      ctx.fill();
    }
    // 肠道粘液：自顶部肠壁垂下的半透明绿黄团块（随风轻微摆动）
    if((c * 5) % 11 === 0){
      const sway = Math.sin(Game.frame * 0.03 + c) * 4;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#9ccc65';
      ctx.beginPath();
      ctx.ellipse(wx + TILE/2 + sway, 1*TILE + 14, 9, 15, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.ellipse(wx + TILE/2 + sway, 1*TILE + 32, 6, 11, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }
  // 互动物体提示（💡）：标出可阅读介绍的地点
  if(Game.level.sceneInfos && Game.level.sceneInfos.length){
    for(const si of Game.level.sceneInfos){
      const wx = si.x - camX;
      if(wx < -24 || wx > CW + 24) continue;
      const wy = si.y - 26 + Math.sin(Game.frame * 0.08) * 3;
      ctx.globalAlpha = 0.85;
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💡', wx, wy);
    }
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
  // 第2关：侧边固定对话（场景互动提示）
  updateSceneInfo();

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

  if(Game.state !== 'playing' && Game.state !== 'paused' && Game.state !== 'intro' && Game.state !== 'complete') return;

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
  // 第2关：肠道视觉特效（粘液 + 受损肠道细胞提示）
  if(Game.levelIndex === 1) drawIntestineDecor(ctx, camX);
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
  // 音效：血量过低触发/停止警报；能量不足触发预警（仅在游戏中）
  if(Game.state === 'playing'){
    if(healthPct <= 25) Sfx.startAlarm(); else Sfx.stopAlarm();
    if(Game.globalEnergy < LOW_ENERGY){
      if(!Game._energyWarned){ Game._energyWarned = true; Sfx.energyWarn(); }
    } else if(Game.globalEnergy > LOW_ENERGY + 10){
      Game._energyWarned = false;
    }
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

  // v3: 双评分 — 击杀+收集同时显示
  const objEl = $('objective-display');
  if(objEl){
    let html = '';
    // 击杀进度
    const totalEnemies = Game.level ? (Game.level.enemies.length + (Game.boss&&Game.boss.alive?1:0)) : 0;
    const killed = Game.stats.kills;
    const kpct = totalEnemies > 0 ? killed / totalEnemies : 1;
    html += `⚔️<b style="color:${kpct>=0.9?'#66ff66':kpct>=0.5?'#ffd700':'#ff6b6b'}">${killed}/${totalEnemies}</b><small>${Math.round(kpct*100)}%</small> `;
    // 收集进度
    const collected = Game.itemsCollected;
    const totalItems = Game.totalItems;
    const cpct = totalItems > 0 ? collected / totalItems : 1;
    html += `📦<b style="color:${cpct>=0.9?'#66ff66':cpct>=0.5?'#ffd700':'#ff6b6b'}">${collected}/${totalItems}</b><small>${Math.round(cpct*100)}%</small>`;
    objEl.innerHTML = html;
  }

  // v2: 动态底栏
  const ctrlEl = $('hud-controls');
  if(ctrlEl && Game.player){
    const sprint = Game.player.sprinting;
    const sprintHint = ' <span class="sep">|</span> <span style="color:#ffd740;">🏃双击方向奔跑</span>';
    if(Game.player.cellType === 1){
      ctrlEl.innerHTML = '<span><kbd>←→</kbd>移动</span> <span class="sep">|</span> <span><kbd>空格</kbd>跳跃</span> <span class="sep">|</span> <span><kbd>↓</kbd>下蹲</span> <span class="sep">|</span> <span><kbd>E</kbd>挥剑</span> <span class="sep">|</span> <span><kbd>Shift</kbd>突进</span> <span class="sep">|</span> <span><kbd>Q</kbd>切换细胞</span>' + sprintHint;
    } else {
      ctrlEl.innerHTML = '<span><kbd>←→</kbd>移动</span> <span class="sep">|</span> <span><kbd>空格</kbd>跳跃</span> <span class="sep">|</span> <span><kbd>↓</kbd>下蹲</span> <span class="sep">|</span> <span><kbd>Q</kbd>切换细胞</span>' + sprintHint;
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
  // 不再暂停游戏、不再要求按空格：自动浮现，数秒后自动消失
  // （与后续场景对话一致：仅出现、不提示、不打断操作）
  $('bubble-speaker').textContent = tut.speaker.trim();
  $('bubble-speaker').style.color = tut.color;
  $('bubble-body').textContent = tut.body;
  $('dialogue-bubble').classList.add('active');
  clearTimeout(Game._bubbleTimer);
  Game._bubbleTimer = setTimeout(dismissTutorialBubble, 3800);
}

// 自动消失版：与 showNextTutorial 配对，无需玩家按键
function dismissTutorialBubble(){
  $('dialogue-bubble').classList.remove('active');
  clearTimeout(Game._bubbleTimer);
  if(tutorialQueue.length > 0){
    setTimeout(showNextTutorial, 350);
  }
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
  clearTimeout(Game._bubbleTimer);
  $('dialogue-bubble').classList.remove('active');
  Game.tutorialPause = false;
  Game.tutorialsDone = true;
  try{ localStorage.setItem('cellQuest_tutorials_done', '1'); }catch(e){}
}

// ===== 关卡开场剧情系统（玩家载入关卡后强制触发，不可跳过）=====
let _introData = [];
let _introIndex = 0;
let _introLocked = false; // 防止连续点击/连按空格快进

function startLevelIntro(){
  const idx = Game.levelIndex;
  const L = (typeof LEVEL_INTRO_LINES !== 'undefined' ? LEVEL_INTRO_LINES[idx] : null);
  if(!L || !L.dendritic){
    finishIntro();
    return;
  }
  // 玩家所选 2 名角色（出战队伍），默认 白细胞 + 红细胞
  const party = (Game.party && Game.party.length === 2) ? Game.party : [1, 3];
  const TYPE_KEY  = { 1:'wbc', 3:'rbc', 2:'plt' };
  const TYPE_NAME = { 1:'白细胞', 3:'红细胞', 2:'血小板' };
  // 实际对话 = 树突状细胞固定开场 + 所选 2 名角色各自一句回应（未选中绝不出现）
  _introData = [{ speaker:'树突状细胞', text: L.dendritic }];
  party.forEach(t => {
    const key = TYPE_KEY[t];
    if(key && L[key]){
      _introData.push({ speaker: TYPE_NAME[t] || ('角色'+t), text: L[key] });
    }
  });
  _introIndex = 0;
  _introLocked = false;
  Game.state = 'intro';
  Game.paused = true;
  $('intro-screen').classList.remove('hidden');
  $('hud').classList.remove('active');
  renderIntroLine();
}
function renderIntroLine(){
  const d = _introData[_introIndex];
  if(!d) return;
  $('intro-speaker').textContent = d.speaker || '';
  const txt = $('intro-text');
  txt.classList.remove('show');
  txt.textContent = d.text || '';
  void txt.offsetWidth; // 强制重绘以触发 CSS 动画
  txt.classList.add('show');
}
function advanceIntroDialogue(){
  if(_introLocked) return;
  _introLocked = true;
  setTimeout(()=>{ _introLocked = false; }, 220);
  _introIndex++;
  if(_introIndex >= _introData.length){
    finishIntro();
    return;
  }
  renderIntroLine();
}
function finishIntro(){
  $('intro-screen').classList.add('hidden');
  Game.state = 'playing';
  Game.paused = false;
  Game.tutorialPause = false;
  $('hud').classList.add('active');
  // 清除开场中可能按住的键位，防止影响正式游戏
  Game.keys = {};
  Game.keysP2 = {};
  updateHUD();
  // 音效：进入关卡后启动循环背景音乐
  Sfx.resume();
  Sfx.startBgm('level');
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
  // 仅出现、不阻塞：数秒后自动消失（与教程气泡一致：仅出现不提示）
  clearTimeout(Game._kcTimer);
  Game._kcTimer = setTimeout(closeMemoryCard, 7000);
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
  clearTimeout(Game._kcTimer);
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
  Sfx.startBgm('menu'); // 主菜单即播放舒缓背景音乐
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
  // v3: 取消弹窗输入，使用默认昵称；若已有昵称则保持不变
  if(!Game.playerName || !Game.playerName.trim()){
    Game.playerName = '免疫战士';
    saveGame();
    showToast('已使用默认昵称：免疫战士');
  } else {
    showToast('当前昵称：' + Game.playerName);
  }
  // 刷新排行榜面板
  const panel = document.getElementById('lb-panel');
  if(panel) panel.remove();
  setTimeout(()=>showLeaderboard(), 100);
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
  // v3: 取消弹窗确认，直接删除改为仅提示，避免误操作
  showToast('已取消删除确认弹窗，请使用存档管理中的安全入口');
}

function renderHub(){
  // 刷新关卡列表后需重新调用 showHub
  showHub();
}

// ===== v3: 关卡分享 =====
function exportLevelToClipboard(idx){
  const code = exportLevelCode(idx);
  if(!code){ showToast('导出失败'); return; }
  navigator.clipboard.writeText(code).then(()=>{
    showToast('关卡代码已复制到剪贴板! 发给朋友即可导入');
  }).catch(()=>{
    // 降级方案
    const ta = document.createElement('textarea');
    ta.value = code; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('代码已复制! (长度:'+code.length+')');
  });
}

function importLevelFromCode(){
  // v3: 取消 prompt 弹窗，改为非弹窗入口提示
  showToast('关卡代码导入已改为非弹窗入口，当前请通过编辑器导入');
}

// ===== 英雄预选：选择 2 名角色出战 =====
function startLevelOrLoading(n, cellTypeOverride){
  // v3: 统一走 LoadLevel，开场剧情系统接管所有关卡（含第2关）的剧情演出
  LoadLevel(n, cellTypeOverride);
}

function showLevel2LoadingPage(n){
  const existing = document.getElementById('lv2-loading');
  if(existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'lv2-loading';
  overlay.className = 'overlay';
  overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1100;';
  overlay.innerHTML = `
    <div class="lv2-loading-inner">
      <div class="lv2-channel">📡 免疫通讯频道</div>
      <div class="lv2-dialogue">
        <div class="lv2-line lv2-dc">
          <div class="lv2-avatar dc">树</div>
          <div class="lv2-speech"><b>树突状细胞</b><span>各位，收到紧急情报！变质食物携带大量沙门氏菌入侵肠道！这些病菌会不断增殖、释放毒素，引发食物中毒，持续侵蚀肠道上皮细胞！</span></div>
        </div>
        <div class="lv2-line lv2-wbc">
          <div class="lv2-avatar wbc">白</div>
          <div class="lv2-speech"><b>中性粒细胞（白细胞）</b><span>明白了。所有侵入肠道的病菌，我会逐一肃清。</span></div>
        </div>
        <div class="lv2-line lv2-rbc">
          <div class="lv2-avatar rbc">红</div>
          <div class="lv2-speech"><b>红细胞</b><span>哼哼！守护肠道细胞氧气供给的重任就交由本小姐！要是组织坏死，这场战斗可就彻底陷入劣势咯！</span></div>
        </div>
        <div class="lv2-line lv2-dc">
          <div class="lv2-avatar dc">树</div>
          <div class="lv2-speech"><b>树突状细胞</b><span>请牢记两项任务：清除全部沙门氏菌，持续输送氧气，守护肠道细胞！</span></div>
        </div>
      </div>
      <div class="lv2-tasks">
        <div class="lv2-task-title">📋 任务清单</div>
        <div class="lv2-task">✅ 清除场景内全部沙门氏菌</div>
        <div class="lv2-task">✅ 运输氧气，维持肠道细胞活性</div>
        <div class="lv2-task tip">💡 推荐出战组合：白细胞负责灭杀细菌，红细胞负责供氧</div>
      </div>
      <div class="btn-row" style="justify-content:center;margin-top:14px;">
        <button class="btn" onclick="document.getElementById('lv2-loading').remove()">返回</button>
        <button class="btn primary" id="lv2-start-btn">⚔️ 进入肠道战场</button>
      </div>
    </div>
  `;
  document.getElementById('game-container').appendChild(overlay);
  overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
  document.getElementById('lv2-start-btn').onclick = () => {
    overlay.remove();
    LoadLevel(n);
  };
}

// ===== 第2关：侧边固定区域对话（替代弹窗展示场景互动物体介绍） =====
function updateSceneInfo(){
  if(Game.levelIndex !== 1 || !Game.level || !Game.level.sceneInfos || !Game.level.sceneInfos.length) return;
  const p = Game.player;
  if(!p) return;
  let near = null;
  for(const si of Game.level.sceneInfos){
    const dx = (p.x + p.w/2) - si.x;
    const dy = (p.y + p.h/2) - si.y;
    if(Math.abs(dx) < 48 && Math.abs(dy) < 48){ near = si; break; }
  }
  if(near){
    Game._sceneInfoTimer = 150;
    showSceneInfo(near);
  } else if(Game._sceneInfoTimer > 0){
    Game._sceneInfoTimer--;
    if(Game._sceneInfoTimer === 0) hideSceneInfo();
  }
}

function showSceneInfo(si){
  const el = document.getElementById('scene-info');
  if(!el) return;
  let name = '树突状细胞', cls = 'dc';
  if(si.speaker === 'wbc'){ name = '中性粒细胞（白细胞）'; cls = 'wbc'; }
  else if(si.speaker === 'rbc'){ name = '红细胞'; cls = 'rbc'; }
  el.className = 'scene-info active ' + cls;
  el.innerHTML = '<div class="scene-speaker">' + name + '</div><div class="scene-text">' + si.text + '</div>';
}

function hideSceneInfo(){
  const el = document.getElementById('scene-info');
  if(el) el.className = 'scene-info hidden';
}

function selectCellAndLoad(n){
  const idx = n - 1;
  const cfg = buildLevelConfigs()[idx];

  // 双人模式：沿用原有双玩家分别选择
  if(Game.twoPlayer){
    showDualCellSelect(n);
    return;
  }

  const existing = document.getElementById('cell-select-panel');
  if(existing) existing.remove();

  const selected = [];
  const party = { selected: [], levelN: n };
  window._partyPick = party;

  const CHARS = [
    { type:1, key:'wbc', name:'白细胞', subtitle:'中性粒细胞', color:'#f0ede0', border:'#b4a890', avatar:'images/avatar-wbc.png', skills:['⚔️ 挥剑斩杀','💨 游走穿梭'] },
    { type:3, key:'rbc', name:'红细胞', subtitle:'运氧者', color:'#d93025', border:'#d93025', avatar:'images/avatar-rbc.png', skills:['💨 高速冲刺','🔋 供氧输送'] },
    { type:2, key:'plt', name:'血小板', subtitle:'凝血者', color:'#ff8a8a', border:'#ff8a8a', avatar:'images/avatar-plt.png', skills:['🧱 凝血铺路','🛡️ 凝血屏障'] },
  ];

  function renderPartyPanel(){
    const panel = document.getElementById('cell-select-panel');
    if(!panel) return;
    const cardsHtml = CHARS.map(c => {
      const picked = party.selected.includes(c.type);
      const order = party.selected.indexOf(c.type) + 1;
      const disabled = !picked && party.selected.length >= 2;
      return `
        <div id="party-card-${c.type}" class="party-card ${picked ? 'picked' : ''} ${disabled ? 'disabled' : ''}"
          onclick="_partyPick.toggle(${c.type})"
          style="--c-border:${c.border};--c-color:${c.color};">
          <div class="party-avatar"><img src="${c.avatar}" alt="${c.name}"></div>
          <div class="party-name" style="color:${c.color}">${c.name}</div>
          <div class="party-subtitle">${c.subtitle}</div>
          <div class="party-skills">
            <div>${c.skills[0]}</div>
            <div>${c.skills[1]}</div>
          </div>
          ${picked ? `<div class="party-order">${order}</div>` : ''}
          ${disabled ? '<div class="party-mask">已达上限</div>' : ''}
        </div>
      `;
    }).join('');

    const canConfirm = party.selected.length === 2;
    // 关卡标题：名称格式 "X·Y" → 大标题=Y(点后,置于图片上方) 小标题=X(点前,置于图片下方)
    const nameParts = (cfg.name || '').split('·');
    const bigTitle = nameParts.length > 1 ? nameParts.slice(1).join('·') : (cfg.name || '');
    const smallTitle = nameParts.length > 1 ? nameParts[0] : '';
    const bg0 = (cfg.bg && cfg.bg[0]) || '#22263a';
    const bg1 = (cfg.bg && cfg.bg[1]) || '#3a3f5a';
    panel.innerHTML = `
      <div class="confirm-inner party-panel" style="max-width:520px;width:92%;">
        <div class="level-title-block">
          <div class="level-big-title">${bigTitle}</div>
          <div class="level-hero-banner" style="background:linear-gradient(135deg, ${bg0}, ${bg1});">
            <span class="level-hero-icon">${cfg.icon || '🎮'}</span>
          </div>
          <div class="level-small-title">${smallTitle}</div>
        </div>
        <p style="font-size:12px;color:#8a8aaa;margin:12px 0;">英雄预选 — 选择 <b>2 名</b> 出战，对局内按 <kbd>Q</kbd> 自由切换</p>
        <div class="party-grid">${cardsHtml}</div>
        <div class="btn-row" style="justify-content:center;margin-top:16px;">
          <button class="btn" onclick="_partyPick.clear()">清空</button>
          <button class="btn primary ${canConfirm ? '' : 'disabled'}" id="party-confirm-btn" onclick="_partyPick.confirm()" ${canConfirm ? '' : 'disabled'}>确认出战 (${party.selected.length}/2)</button>
          <button class="btn" onclick="_partyPick.cancel()">取消</button>
        </div>
      </div>
    `;
  }

  party.toggle = (type) => {
    const i = party.selected.indexOf(type);
    if(i >= 0){
      party.selected.splice(i, 1);
    } else if(party.selected.length < 2){
      party.selected.push(type);
    }
    renderPartyPanel();
  };
  party.clear = () => { party.selected = []; renderPartyPanel(); };
  party.cancel = () => { const p = document.getElementById('cell-select-panel'); if(p) p.remove(); window._partyPick = null; };
  party.confirm = () => {
    if(party.selected.length !== 2) return;
    Game.party = [...party.selected];
    Game.partyIndex = 0;
    const p = document.getElementById('cell-select-panel');
    if(p) p.remove();
    window._partyPick = null;
    startLevelOrLoading(n);
  };

  const panel = document.createElement('div');
  panel.id = 'cell-select-panel';
  panel.className = 'overlay';
  panel.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:1000;';
  panel.addEventListener('click', e => { if(e.target === panel) party.cancel(); });
  document.getElementById('game-container').appendChild(panel);
  renderPartyPanel();
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
    {type:1, name:'白细胞', icon:'⚔️', desc:'战斗型', color:'#f0ede0'},
    {type:3, name:'红细胞', icon:'🔴', desc:'收集型', color:'#d93025'},
    {type:2, name:'血小板', icon:'🛡️', desc:'支援型', color:'#ff8a8a'},
  ];

  let html = '<h3>选择细胞 — ' + label + '</h3>';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0;">';
  for(const c of cells){
    html += `<div onclick="dualCellPicked(${step},${c.type})"
      style="background:rgba(255,255,255,.05);border:2px solid ${c.color};border-radius:10px;padding:12px 8px;cursor:pointer;text-align:center;"
      onmouseover="this.style.background='rgba(255,255,255,.12)'" onmouseout="this.style.background='rgba(255,255,255,.05)'">
      <div style="font-size:28px;">${c.icon}</div>
      <b style="color:${c.color};font-size:14px;">${c.name}</b>
      <div style="font-size:10px;color:#888;margin-top:4px;">${c.desc}</div>
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
    startLevelOrLoading(Game._dualSelectN, Game._dualSelectP1);
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
  // v3: 取消 prompt 弹窗，改为非弹窗入口提示
  showToast('DeepSeek API Key 设置已改为非弹窗入口，请通过配置页面操作');
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
  Sfx.startBgm('menu'); // 关卡选择菜单持续播放舒缓背景音乐
  Sfx.stopAlarm();
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
      <button class="btn-small" style="margin-top:12px;" onclick="openEditor()">🗺️ 打开地图编辑器</button>
      <br><small style="color:#888;">或</small>
      <button class="btn-small" style="margin-top:8px;" onclick="importLevelFromCode()">📥 导入关卡代码</button>
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
    // 全部关卡已解锁，移除锁定限制（自定义关卡同样始终可进入）
    const isLocked = false;
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
          <button style="position:absolute;bottom:2px;right:2px;background:rgba(100,180,255,.5);border:none;color:#fff;font-size:10px;width:18px;height:18px;border-radius:50%;cursor:pointer;line-height:1;" title="导出关卡代码" onclick="event.stopPropagation();exportLevelToClipboard(${i})">📋</button>
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
  // v3: 取消弹窗确认，直接删除改为仅提示，避免误操作
  showToast('已取消删除确认弹窗，请通过编辑器安全删除「' + name + '」');
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
    Sfx.suspendAll(); // 暂停时静音（含警报）
    $('pause-menu').classList.remove('hidden');
  } else if(Game.state === 'paused'){
    Game.state = 'playing';
    Game.paused = false;
    Sfx.resume(); // 恢复时重启音频
    $('pause-menu').classList.add('hidden');
    // 恢复时重新聚焦
    const container = $('game-container');
    const fp = $('focus-prompt');
    if(fp) fp.classList.add('hidden');
    container.focus();
  }
}

// 通关庆祝特效：彩带 + 横幅弹出（不阻塞结算面板，pointer-events:none）
function playWinFx(){
  const layer = document.getElementById('win-fx');
  if(!layer) return;
  layer.innerHTML = '';
  layer.classList.remove('hidden');

  // 彩带
  const colors = ['#ffd700','#ff5252','#4caf50','#2196f3','#e040fb','#ff9800','#00e5ff','#ffffff'];
  const count = 96;
  for(let i = 0; i < count; i++){
    const c = document.createElement('div');
    c.className = 'wfx-confetti';
    c.style.left = (Math.random() * 100) + 'vw';
    c.style.background = colors[(Math.random() * colors.length) | 0];
    const w = 6 + Math.random() * 8;
    c.style.width = w + 'px';
    c.style.height = (w * 0.6) + 'px';
    c.style.animationDelay = (Math.random() * 0.7) + 's';
    c.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
    layer.appendChild(c);
  }

  // 横幅
  const cfg = buildLevelConfigs()[Game.levelIndex] || {};
  const banner = document.createElement('div');
  banner.className = 'wfx-banner';
  banner.innerHTML = '<div class="wfx-title">🎉 关卡完成！</div>' +
    '<div class="wfx-sub">' + (cfg.name || '') + ' · 顺利通过</div>';
  layer.appendChild(banner);

  // 自动清理（保留结算面板交互）
  clearTimeout(Game._winFxTimer);
  Game._winFxTimer = setTimeout(() => {
    if(layer){ layer.innerHTML = ''; layer.classList.add('hidden'); }
  }, 3300);
}

function levelComplete(){
  Game.state = 'complete';
  Sfx.stopBgm();
  Sfx.stopAlarm();
  playWinFx();
  Sfx.complete();
  // 通关先放彩带；无论如何都调度结算面板（含3个按钮）在彩带之后跳出。
  // 即使后续填充逻辑出错，面板也保证显示（兜底，避免“只有彩带没有按钮”）。
  clearTimeout(Game._completeRevealTimer);
  Game._completeRevealTimer = setTimeout(() => {
    const cs = document.getElementById('complete-screen');
    if(cs) cs.classList.remove('hidden');
  }, 1600);
  const idx = Game.levelIndex;
  Game.completed[idx] = true;
  const configs = buildLevelConfigs();
  if(idx + 1 < configs.length) Game.unlocked[idx + 1] = true;

  // v3: 双评分制星级评定
  let stars = 1;
  // 击杀完成度
  const totalEnemies = Game.level.enemies.length + (Game.boss ? 1 : 0);
  const killPct = totalEnemies > 0 ? Game.stats.kills / totalEnemies : 1;
  // 收集完成度
  const collectPct = Game.totalItems > 0 ? Game.itemsCollected / Game.totalItems : 1;
  // 综合完成度
  const completionPct = (killPct + collectPct) / 2;

  // 2星：双指标均 ≥ 60%
  if(killPct >= 0.6 && collectPct >= 0.6) stars++;
  // 3星：双指标均 100% + 0死亡
  if(killPct >= 1.0 && collectPct >= 1.0 && Game.stats.deaths === 0) stars++;
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

  // v3: 首次通关提示设置昵称（取消弹窗，使用默认昵称）
  if(!Game.playerName){
    Game.playerName = '免疫战士';
    saveGame();
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
  $('stat-kills').textContent = Game.stats.kills + ' (' + Math.round(killPct*100) + '%)';
  $('stat-items').textContent = Game.stats.items + ' (' + Math.round(collectPct*100) + '%)';
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
  // 离开第2关对局时收起侧边对话
  Game._sceneInfoTimer = 0;
  hideSceneInfo();
  $('stat-energy').textContent = Math.round(Game.globalEnergy);
  $('stat-rating').textContent = '★'.repeat(stars) + '☆'.repeat(3-stars)
    + (Game._lastIsPerfect ? ' 👑' : '')
    + ' (' + Math.round(Game._lastCompletionPct * 100) + '%)';
  // v3: 排行
  if(rank && rank <= LB_MAX_ENTRIES){
    $('stat-rating').textContent += ' | 🏆 #' + rank;
  }
  // 底部 3 颗星：依据本局表现点亮（击杀/收集完成度 + 0 死亡）
  const csEl = document.getElementById('complete-stars');
  if(csEl){
    let sh = '';
    for(let s = 0; s < 3; s++) sh += '<span class="cstar ' + (s < stars ? 'lit' : '') + '">' + (s < stars ? '★' : '☆') + '</span>';
    csEl.innerHTML = sh;
  }
  $('stat-time').textContent = formatTime(Game.levelTime);
  $('stat-best-time').textContent = best > 0 ? formatTime(best) : '--:--.--';
  if(isNewRecord) $('stat-best-time').classList.add('new-record');
  else $('stat-best-time').classList.remove('new-record');
  // 记忆细胞状态
  const memEl = $('stat-memory');
  if(memEl) memEl.textContent = Game.stats.foundMemory ? '✓ 已收集' : '✗ 未找到';
  $('death-panel').classList.add('hidden');
  $('hud').classList.remove('active');
  // 通关先放彩带；随后结算面板（含3个按钮）跳出盖在彩带之上（彩带之后跳转）
  clearTimeout(Game._completeRevealTimer);
  const cs = document.getElementById('complete-screen');
  Game._completeRevealTimer = setTimeout(() => { if(cs) cs.classList.remove('hidden'); }, 1600);
}

// 通关后：挑战下一关（沿用当前出战队伍；无下一关则回大厅）
function goNextLevel(){
  const layer = document.getElementById('win-fx');
  if(layer){ layer.innerHTML = ''; layer.classList.add('hidden'); }
  clearTimeout(Game._completeRevealTimer);
  $('complete-screen').classList.add('hidden');
  const next = Game.levelIndex + 1;
  const configs = buildLevelConfigs();
  if(next < configs.length){
    // 统一走 startLevelOrLoading，确保第2关等带剧情加载页的关卡正常显示
    startLevelOrLoading(next + 1);
  } else {
    showToast('🏆 已通关全部关卡！');
    backToHub();
  }
}

// 通关后：再来一次（重玩本关，沿用当前出战队伍）
function replayLevel(){
  const layer = document.getElementById('win-fx');
  if(layer){ layer.innerHTML = ''; layer.classList.add('hidden'); }
  clearTimeout(Game._completeRevealTimer);
  $('complete-screen').classList.add('hidden');
  const cur = Game.levelIndex;
  // 统一走 startLevelOrLoading，确保第2关剧情加载页正常显示
  startLevelOrLoading(cur + 1);
}

function backToHub(){
  Game.state = 'hub';
  Sfx.stopBgm();
  Sfx.stopAlarm();
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
  const wfx = document.getElementById('win-fx');
  if(wfx){ wfx.innerHTML = ''; wfx.classList.add('hidden'); }
  clearTimeout(Game._bubbleTimer);
  $('dialogue-bubble').classList.remove('active');
  $('memory-card').classList.add('hidden');
  $('hud').classList.remove('active');
  Game._sceneInfoTimer = 0;
  hideSceneInfo();
  const fp = $('focus-prompt');
  if(fp){ fp.classList.remove('hidden'); fp.textContent = '点击此处开始游戏'; }
  showHub();
}

// ===== 关卡加载（通用入口函数） =====
function LoadLevel(n, cellTypeOverride){
  const idx = n - 1; // v3: 1-based → 0-based array index
  const configs = buildLevelConfigs();
  if(idx < 0 || idx >= configs.length) return false;
  // 全部关卡已解锁，移除顺序通关解锁限制（自定义关卡亦始终可玩）
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

  // v3: 单玩家使用出战队伍；双人模式/旧接口仍可用 cellTypeOverride
  let defaultCell;
  if(Game.twoPlayer){
    defaultCell = cellTypeOverride || cfg.cellType || 1;
  } else {
    if(!Game.party || Game.party.length < 2) Game.party = [1, 3];
    Game.partyIndex = 0;
    defaultCell = Game.party[Game.partyIndex];
  }
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
  // 第2关侧边对话状态重置
  Game._sceneInfoTimer = 0;
  hideSceneInfo();

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

  $('hub-screen').classList.add('hidden');
  $('complete-screen').classList.add('hidden');
  $('death-panel').classList.add('hidden');
  $('pause-menu').classList.add('hidden');
  clearTimeout(Game._bubbleTimer);
  $('dialogue-bubble').classList.remove('active');
  $('memory-card').classList.add('hidden');
  $('hud').classList.remove('active'); // 开场剧情期间隐藏 HUD，结束后恢复
  // 自动聚焦游戏容器
  const container = $('game-container');
  const fp = $('focus-prompt');
  if(fp) fp.classList.add('hidden');
  container.focus();
  updateHUD();

  // 进入关卡开场剧情；背景音乐在 finishIntro 后启动
  startLevelIntro();

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
  Sfx.stopBgm();
  Sfx.stopAlarm();

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

  // 调试模式：URL 带 ?debug / ?unlock / ?level=N 时解锁全部关卡，方便并行配置
  try{
    const params = new URLSearchParams(location.search);
    Game.debugMode = params.has('debug') || params.has('unlock') || params.has('level') || localStorage.getItem('cellQuest_debug_mode') === '1';
  }catch(e){ Game.debugMode = false; }
  if(Game.debugMode) showToast('调试模式已开启：全部关卡可进入');

  setupInput();

  // 进入即准备背景音乐（首次点击解锁音频后自动开始，菜单与关卡全程持续）
  Sfx.startBgm('menu');

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
  try{ $('btn-menu-back').onclick = ()=>{ showMenu(); }; }catch(e){}
  $('btn-hub-pedia').onclick = ()=>{ showPedia(); };
  $('btn-pedia-close').onclick = ()=>{ closePedia(); };
  $('btn-pedia-wbc').onclick = ()=>{ showCharDetail('wbc'); };
  $('btn-pedia-rbc').onclick = ()=>{ showCharDetail('rbc'); };
  $('btn-pedia-plt').onclick = ()=>{ showCharDetail('plt'); };
  $('btn-char-back').onclick = ()=>{ closeCharDetail(); };
  $('btn-resume').onclick = ()=>{ togglePause(); };
  $('btn-quit').onclick = ()=>{ backToHub(); };
  $('btn-next-level').onclick = ()=>{ goNextLevel(); };
  try{ $('btn-complete-menu').onclick = ()=>{ replayLevel(); }; }catch(e){}
  try{ $('btn-complete-home').onclick = ()=>{ backToHub(); }; }catch(e){}
  // 死亡面板按钮
  $('btn-retry').onclick = ()=>{ retryFromDeath(); };
  $('btn-death-quit').onclick = ()=>{ quitFromDeath(); };
  try{ $('btn-death-menu').onclick = ()=>{ $('death-panel').classList.add('hidden'); showMenu(); }; }catch(e){}
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
  $('home-btn').onclick=e=>{e.stopPropagation();if(Game.state!=='playing'&&Game.state!=='paused'&&Game.state!=='intro')return;backToHub();};

  // v3: AI 生成关卡按钮
  try{ $('btn-hub-ai').onclick = ()=>{ showAIGeneratePanel(); }; }catch(e){}

  // v3: 存档管理
  try{ $('btn-hub-slots').onclick = ()=>{ showSlotPanel(); }; }catch(e){}

  // v3: 排行榜
  try{ $('btn-hub-lb').onclick = ()=>{ showLeaderboard(); }; }catch(e){}

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

  // 深链接：URL 带 ?level=N（1..6）时直接进入第 N 关，自动选/建存档并套用默认出战队伍
  try{
    const _dp = new URLSearchParams(location.search);
    if(_dp.has('level')){
      const _lv = parseInt(_dp.get('level'), 10);
      if(_lv >= 1 && _lv <= 6){
        let _empty = -1;
        for(let i=0;i<MAX_SLOTS;i++){ if(!getSlotInfo(i).exists){ _empty=i; break; } }
        if(_empty >= 0) switchSlot(_empty);
        if(!Game.party || Game.party.length !== 2){ Game.party = [1,3]; Game.partyIndex = 0; }
        setTimeout(()=>{ startLevelOrLoading(_lv - 1); }, 0);
      } else {
        showToast('?level 参数无效，应为 1..6');
      }
    }
  }catch(e){ console.error('level deep-link failed', e); }

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

// 打开地图编辑器：优先新标签，被拦截时回退同标签跳转
function openEditor(){
  try{
    const w = window.open('editor.html','_blank');
    if(!w || w.closed) location.href = 'editor.html';
  }catch(e){
    location.href = 'editor.html';
  }
}

window.addEventListener('load', init);
