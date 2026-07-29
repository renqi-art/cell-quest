/* ====================================================================
 * game-level.js — Level class (map loading, tiles, spawners, crumble)
 * ==================================================================== */

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
    this.height = (mapData.map && mapData.map.length) || 15;
    this.tutorials = mapData.tutorials || [];
    this.bg = mapData.sky || [C.sky1, C.sky3];
    this.miniSpawnArea = mapData.miniSpawnArea || null;
    this.miniSpawnTimer = 0;
    this.knowledgeCards = mapData.knowledgeCards || [];
    this.pipeSpawners = mapData.pipeSpawners || [];
    this.pipeTimers = this.pipeSpawners.map(() => 0);
    this.pipeCooldowns = this.pipeSpawners.map(() => 0);
    this.pipeTriggered = this.pipeSpawners.map(() => false);
    // 碎裂平台
    this.crumblePlatforms = [];
    // 吞噬体传送点
    this.phagosomes = [];
    // 抗体炮台
    this.turrets = [];
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
          case '~': case '%': case '+':
            arr.push(ch); break;
          case '>': case '<':
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
          case '@':
            this.phagosomes.push({x:c*TILE, y:r*TILE, col:c, row:r, active:true, cooldown:0});
            arr.push(' '); break;
          case '!':
            this.turrets.push(new AntibodyTurret(c*TILE, r*TILE));
            arr.push(' '); break;
          default:
            arr.push(' ');
        }
      }
      this.grid.push(arr);
    }
  }

  solidTile(ch){ return ch==='#'||ch==='='||ch==='S'||ch==='B'||ch==='p'||ch==='_'||ch==='H'||ch==='~'||ch==='>'||ch==='<'; }

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

  updatePhagosomes(){
    for(const ph of this.phagosomes){
      if(ph.cooldown > 0) ph.cooldown--;
    }
  }

  updateTurrets(player){
    for(const t of this.turrets){
      t.update(this, player);
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
    // ===== 通用贴图渲染 helper（= / S / # / B 共用，横向无缝 + 同色块顶面定位） =====
    // 仅当本关 groundTex 已声明且贴图已加载成功时返回 true；否则返回 false 让调用方走原美术兜底。
    const drawTexBlock = () => {
      const texPath = (this.mapData && this.mapData.groundTex) ? this.mapData.groundTex : null;
      const tex = (Game.getTex && texPath) ? Game.getTex(texPath) : null;
      if (!tex || !tex.complete || tex.naturalWidth === 0) return false;
      let sr = row;
      while (sr > 0 && this.grid[sr - 1] && this.grid[sr - 1][col] === ch) sr--;
      const depth = row - sr;                                  // 0 = 块顶面（站立/踩踏面）
      const TILE_SRC = 32;
      // 顶面所在行：不同贴图的顶面位置不同（冷蓝森林贴图顶面在 ~24，第一关粉色贴图顶面在 80）。
      // 关卡可在 mapData.groundTexTop 覆写；默认 80 保持原有兼容。不影响砖块大小/布局/碰撞/轮廓。
      const TOP_SRC  = (this.mapData && this.mapData.groundTexTop != null) ? this.mapData.groundTexTop : 80;
      let srcX = (col * TILE_SRC) % tex.naturalWidth;          // 横向：整张 tile 宽 = 16 个 32，循环无缝
      let srcY = TOP_SRC + depth * TILE_SRC;
      if (srcY + TILE_SRC > tex.naturalHeight) srcY = tex.naturalHeight - TILE_SRC;
      ctx.drawImage(tex, srcX, srcY, TILE_SRC, TILE_SRC, x, y, TILE, TILE);
      return true;
    };
    switch(ch){
      // ===== 地面 — 细胞组织纹理 =====
      case '#': {
        // 仅当本关卡数据声明了 groundTex 时才使用新地面贴图（第一关）
        if (drawTexBlock()) break;
        // 主体（细胞质纹理：微妙的圆点矩阵）
        ctx.fillStyle=C.ground; ctx.fillRect(x,y,TILE,TILE);
        // 顶边高光（细胞膜）
        ctx.fillStyle=C.groundTop; ctx.fillRect(x,y,TILE,5);
        // 核斑点（模拟细胞核与细胞器分布）
        ctx.fillStyle=C.groundDark;
        ctx.fillRect(x+4,y+10,4,4); ctx.fillRect(x+22,y+16,4,4);
        ctx.fillRect(x+13,y+22,3,3); ctx.fillRect(x+8,y+26,3,3);
        // 膜褶皱（横向纹理线）
        ctx.globalAlpha=0.12;
        ctx.fillStyle='#000'; ctx.fillRect(x,y+14,TILE,1);
        ctx.fillRect(x+2,y+20,28,1);
        ctx.globalAlpha=1;
        break;
      }
      // ===== 平台 — 悬浮细胞膜 =====
      case '=': {
        // 优先用本关 groundTex（粉暖像素平台贴图）
        if (drawTexBlock()) break;
        ctx.fillStyle=C.platform; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=C.platformTop; ctx.fillRect(x,y,TILE,6);
        // 底边阴影
        ctx.fillStyle='rgba(0,0,0,0.25)';
        ctx.fillRect(x,y+TILE-3,TILE,3);
        // 微孔纹理
        ctx.globalAlpha=0.15;
        ctx.fillStyle='#000';
        ctx.fillRect(x+6,y+10,3,3); ctx.fillRect(x+22,y+18,3,3);
        ctx.globalAlpha=1;
        break;
      }
      // ===== 痂皮平台 — 粗糙纹理 + 裂纹 =====
      case 'S': {
        // 优先用本关 groundTex（粉暖像素平台贴图）
        if (drawTexBlock()) break;
        ctx.fillStyle=C.scab; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=C.scabTop; ctx.fillRect(x,y,TILE,5);
        // 暗斑（痂皮特征）
        ctx.fillStyle=C.scabDark;
        ctx.fillRect(x+4,y+10,5,5); ctx.fillRect(x+20,y+17,4,4);
        ctx.fillRect(x+10,y+23,4,3);
        // 裂纹
        ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x+6,y+6); ctx.lineTo(x+14,y+16);
        ctx.lineTo(x+10,y+28); ctx.stroke();
        break;
      }
      // ===== 失血区 — 动态血液 =====
      case 'B':
        // 按用户要求：把红色砖块的美术贴图替换为粉暖像素平台贴图
        // 注：B 是游戏内的失血区 hazard，碰撞与扣血逻辑由其他代码独立判定（按 tile char 'B'），不受此处纯美术替换影响
        if (drawTexBlock()) break;
        // 贴图未就绪时临时走原红色美术（避免出现透明洞）
        if(this.isTideSurge()){
          ctx.fillStyle=C.tideSurge;
        } else if(this.isTideWarn()){
          ctx.fillStyle = (Math.floor(Game.frame/4)%2===0) ? C.tideWarn : C.bloodLoss;
        } else {
          ctx.fillStyle=C.bloodLoss;
        }
        ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle = this.isTideSurge() ? '#ff4050' : C.bloodLossTop;
        ctx.fillRect(x,y,TILE,4);
        break;
      // ===== 尖刺 — 金属锐刺 =====
      case '^':
        // 底色
        ctx.fillStyle='#4a4a5a'; ctx.fillRect(x,y,TILE,TILE);
        // 5 根尖刺（渐变高度 + 金属光泽）
        for(let i=0;i<5;i++){
          const spikeH = 14 + (i%2)*4;
          const grad = ctx.createLinearGradient(x+i*6.4,y+TILE-spikeH,x+i*6.4,y+TILE);
          grad.addColorStop(0,'#aaaabb');
          grad.addColorStop(0.4,'#9999aa');
          grad.addColorStop(1,'#555566');
          ctx.fillStyle=grad;
          ctx.beginPath();
          ctx.moveTo(x+i*6.4+1,y+TILE-spikeH);
          ctx.lineTo(x+i*6.4+3.2,y+TILE);
          ctx.lineTo(x+i*6.4+5.4,y+TILE-spikeH);
          ctx.closePath(); ctx.fill();
        }
        break;
      // ===== 弹簧 — 机械弹跳垫 =====
      case 'V':
        // 底座
        ctx.fillStyle='#1a4a2a'; ctx.fillRect(x,y,TILE,TILE);
        // 弹簧线圈
        const coilY = y+4+Math.sin(Game.frame*0.06+col)*1.5;
        ctx.strokeStyle='#4acd6a'; ctx.lineWidth=2;
        for(let i=0;i<5;i++){
          ctx.beginPath(); ctx.arc(x+TILE/2,coilY+i*5,5,0,Math.PI);
          ctx.stroke();
        }
        // 顶板
        ctx.fillStyle='#3a8a4a'; ctx.fillRect(x+2,y+TILE-6,TILE-4,6);
        ctx.fillStyle='#5ad06a'; ctx.fillRect(x+2,y+TILE-6,TILE-4,2);
        // 箭头
        ctx.fillStyle='#fff'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
        ctx.fillText('⬆',x+TILE/2,y+TILE-8);
        break;
      // ===== 血液泵 — 心室推流器 =====
      case 'J':
        // 泵体
        ctx.fillStyle='#5a2020'; ctx.fillRect(x,y,TILE,TILE);
        // 脉动环
        const pulse = 1+Math.sin(Game.frame*0.08+col)*0.12;
        ctx.fillStyle='#c04040';
        ctx.beginPath(); ctx.arc(x+TILE/2,y+TILE/2,TILE*0.35*pulse,0,Math.PI*2); ctx.fill();
        // 内环
        ctx.fillStyle='#ff6060';
        ctx.beginPath(); ctx.arc(x+TILE/2,y+TILE/2,TILE*0.18*pulse,0,Math.PI*2); ctx.fill();
        // 箭头
        ctx.fillStyle='#fff'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
        ctx.fillText('⇧',x+TILE/2,y+TILE/2+4);
        break;
      // ===== 管道 — 血管导管 =====
      case 'p':
        ctx.fillStyle='#0d2d12'; ctx.fillRect(x,y,TILE,TILE);
        // 管体
        ctx.fillStyle='#1a5c2a';
        ctx.fillRect(x+3,y,TILE-6,TILE);
        // 左边缘高光
        ctx.fillStyle='#2a8c3a'; ctx.fillRect(x+3,y,4,TILE);
        // 右边缘阴影
        ctx.fillStyle='#0d3d15'; ctx.fillRect(x+TILE-7,y,4,TILE);
        // 管道接头环
        ctx.fillStyle='#3a9a3a';
        ctx.fillRect(x+4,y+12,24,3);
        ctx.fillRect(x+4,y+22,24,3);
        break;
      // ===== 隐藏墙 — 半透明膜 =====
      case 'H':
        ctx.globalAlpha=0.3;
        ctx.fillStyle=C.hiddenWall;
        ctx.fillRect(x,y,TILE,TILE);
        ctx.globalAlpha=0.12;
        ctx.fillStyle=C.hiddenWallHint;
        ctx.fillRect(x+3,y+3,TILE-6,TILE-6);
        ctx.globalAlpha=1;
        // 微弱边框提示
        ctx.strokeStyle='rgba(120,80,160,0.2)'; ctx.lineWidth=1;
        ctx.setLineDash([2,6]);
        ctx.strokeRect(x+1,y+1,TILE-2,TILE-2);
        ctx.setLineDash([]);
        break;
      // ===== 碎裂平台 =====
      case '_':
        { const cp = this.crumblePlatforms.find(p => p.col===col && p.row===row);
          if(cp && cp.state==='gone') break;
          const shaking = cp && cp.state==='shaking';
          const shakeX = shaking ? Math.sin(cp.timer*0.8)*3 : 0;
          ctx.fillStyle = shaking ? C.crumbleShake : C.crumble;
          ctx.fillRect(x+shakeX,y,TILE,TILE);
          // 表面纹理
          ctx.fillStyle = shaking ? '#ffcc66' : C.crumbleTop;
          ctx.fillRect(x+shakeX,y,TILE,5);
          // 正常状态：微小裂纹
          if(!shaking){
            ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(x+8,y+8); ctx.lineTo(x+14,y+16);
            ctx.lineTo(x+22,y+12); ctx.stroke();
          }
          // 抖动状态：大裂纹 + 碎片
          if(shaking){
            ctx.strokeStyle='#000'; ctx.lineWidth=1.8; ctx.globalAlpha=0.8;
            ctx.beginPath(); ctx.moveTo(x+3,y+3); ctx.lineTo(x+12,y+18);
            ctx.lineTo(x+20,y+7); ctx.lineTo(x+28,y+22); ctx.stroke();
            // 碎片粒子
            ctx.fillStyle=C.crumbleShake;
            ctx.fillRect(x+16+shakeX,y+24,3,3);
            ctx.fillRect(x+24-shakeX,y+10,2,2);
            ctx.globalAlpha=1;
          }
        }
        break;
      // ===== [新] 纤毛 ~ — 传送带 =====
      case '~':
        // 基底
        ctx.fillStyle=C.cilia; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=C.ciliaDark; ctx.fillRect(x,y,TILE,3);
        // 纤毛波浪动画
        const wave = Math.sin(Game.frame*0.08+col*0.7)*2;
        for(let i=0;i<6;i++){
          const cx = x+3+i*5;
          const cy = y+8+Math.sin(Game.frame*0.1+col*0.5+i*0.8)*3;
          ctx.fillStyle=C.ciliaLight;
          ctx.beginPath(); ctx.arc(cx,cy+wave,2.5,Math.PI,0); ctx.fill();
          ctx.fillStyle=C.ciliaDark;
          ctx.fillRect(cx-1,cy+wave,2,12);
        }
        // 方向箭头
        ctx.fillStyle=C.ciliaArrow; ctx.globalAlpha=0.6+Math.sin(Game.frame*0.05)*0.2;
        ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
        ctx.fillText('▶▶',x+TILE/2,y+28);
        ctx.globalAlpha=1;
        break;
      // ===== [新] 黏液网 % — 减速区 =====
      case '%':
        // 黏性基底
        ctx.fillStyle=C.mucus; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=C.mucusDark; ctx.fillRect(x,y,TILE,2);
        // 黏丝网
        ctx.strokeStyle=C.mucusLight; ctx.lineWidth=1.2; ctx.globalAlpha=0.6;
        for(let i=0;i<3;i++){
          ctx.beginPath(); ctx.moveTo(x+3,y+6+i*8); ctx.lineTo(x+28,y+10+i*8);
          ctx.quadraticCurveTo(x+16,y+2+i*8,x+8,y+16+i*8);
          ctx.stroke();
        }
        // 气泡
        ctx.fillStyle=C.mucusLight; ctx.globalAlpha=0.4;
        ctx.beginPath(); ctx.arc(x+20,y+14,4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+8,y+22,3,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        // 减速标识
        ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
        ctx.fillText('🐌',x+TILE/2,y+22);
        break;
      // ===== [新] 趋化因子 + — 加速区 =====
      case '+':
        // 激活性基底（蓝白闪烁）
        const glowPulse = 0.5+Math.sin(Game.frame*0.1+col)*0.2;
        ctx.fillStyle=C.chemokine; ctx.fillRect(x,y,TILE,TILE);
        // 发光粒子
        ctx.fillStyle=C.chemokineGlow; ctx.globalAlpha=glowPulse*0.4;
        ctx.fillRect(x+2,y+2,TILE-4,TILE-4);
        ctx.globalAlpha=1;
        // 闪烁星点
        for(let i=0;i<6;i++){
          const sx = x+4+(i*5+col*7)%28;
          const sy = y+4+(i*9+row*3)%24;
          const sa = 0.5+Math.sin(Game.frame*0.15+i*1.2)*0.4;
          ctx.fillStyle=C.chemokineGlow; ctx.globalAlpha=sa;
          ctx.fillRect(sx,sy,2,2);
        }
        ctx.globalAlpha=1;
        // 加速箭头
        ctx.fillStyle='#fff'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
        ctx.fillText('⚡',x+TILE/2,y+20);
        break;
      // ===== [新] 血管瓣膜 > — 单向门（右通） =====
      case '>':
        ctx.fillStyle=C.valve; ctx.fillRect(x,y,TILE,TILE);
        // 瓣膜叶片
        ctx.fillStyle=C.valveArrow;
        ctx.beginPath(); ctx.moveTo(x+22,y+6); ctx.lineTo(x+28,y+TILE/2);
        ctx.lineTo(x+22,y+TILE-6); ctx.closePath(); ctx.fill();
        // 铰链
        ctx.fillStyle='rgba(255,255,255,0.3)';
        ctx.fillRect(x+20,y+6,3,TILE-12);
        // 箭头
        ctx.fillStyle='#fff'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center';
        ctx.fillText('→',x+TILE/2-2,y+TILE/2+5);
        break;
      // ===== [新] 血管瓣膜 < — 单向门（左通） =====
      case '<':
        ctx.fillStyle=C.valve; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=C.valveArrow;
        ctx.beginPath(); ctx.moveTo(x+10,y+6); ctx.lineTo(x+4,y+TILE/2);
        ctx.lineTo(x+10,y+TILE-6); ctx.closePath(); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.3)';
        ctx.fillRect(x+9,y+6,3,TILE-12);
        ctx.fillStyle='#fff'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center';
        ctx.fillText('←',x+TILE/2+2,y+TILE/2+5);
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
      const hint = '抵达通关·击杀+收集双评分';
      ctx.fillText(hint, x+TILE/2, y-6);
    }
    ctx.restore();
  }
}

