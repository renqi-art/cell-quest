/* ====================================================================
 * game-ui.js — Toast / Pedia / Menu / Hub / Leaderboard / Slots / Sharing
 * ==================================================================== */

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
  const bgMap = { wbc: 'char-wbc.webp', rbc: 'char-rbc.webp', plt: 'char-plt.webp' };
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
  _notifyMobileState();
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
    <b style="color:#ffd700;">${escapeHtml(name)}</b>
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
      <b title="${escapeHtml(cfg.desc||'')}">${escapeHtml(cfg.icon||'')} ${escapeHtml(cfg.name)}</b>`;
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
          <span>${medal} <b style="color:#ffd700;">${escapeHtml(e.name||'???')}</b> <span style="color:${pctColor}">${pctStr}</span> | ${formatTime(e.time)} | Lv.${e.playerLevel}</span>
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
  const code = prompt('粘贴关卡代码 (CQ! 开头):');
  if(!code || !code.trim()) return;
  const result = importLevelCode(code.trim());
  if(result.error){ showToast('导入失败: '+result.error); return; }
  const idx = addCustomLevel(result, '📥');
  refreshCustomLevels();
  showToast('关卡 "'+(result.name||'导入关卡')+'" 已导入!');
  switchHubTab('custom');
  renderLevelGrid();
}

// ===== v3: 细胞选择(Level 3+自由选) =====
function selectCellAndLoad(n){
  const idx = n - 1;
  const configs = buildLevelConfigs();
  const cfg = configs[idx];
  if(!cfg){
    showToast('关卡不存在或尚未加载');
    return;
  }
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
  let html = '<h3>🤖 AI 生成关卡</h3>';

  html += '<p style="font-size:11px;color:#aaa;">经典模式仅提供本地安全模板；AI 病例生成请使用病例设计器。</p>';
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
  _notifyMobileState();
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
          <div style="font-size:28px;margin:4px 0;">${escapeHtml(cfg.icon)}</div>
          <div style="font-size:11px;color:#e8e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cfg.name)}</div>
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
        <div class="lv-icon-wrap"><div class="lv-icon">${escapeHtml(cfg.icon)}</div></div>
        <div class="lv-name">???</div>
      `;
      card.className = 'level-card locked';
    } else {
      innerHTML += `
        <div class="lv-header">第${levelNum}关: ${escapeHtml(cfg.name)} <small>${cellLabel}</small></div>
        <div class="lv-icon-wrap"><div class="lv-icon">${escapeHtml(cfg.icon)}</div></div>
        <div class="lv-name">${escapeHtml(cfg.name)}</div>
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

