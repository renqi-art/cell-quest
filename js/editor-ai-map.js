(() => {
  let pendingLevel = null;
  let activeController = null;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.testid = 'open-ai-map';
  button.textContent = '🤖 AI生成';
  button.style.cssText = 'background:#6a2a8a;border-color:#9a4aba';
  document.querySelector('.toolbar button').insertAdjacentElement('afterend', button);

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'aiMapModal';
  modal.innerHTML = [
    '<div class="modal-box" role="dialog" aria-label="AI生成地图">',
    '<h2>🤖 AI生成地图</h2>',
    '<p id="aiMapTarget"></p>',
    '<label for="aiMapPrompt">描述地图主题与玩法</label>',
    '<textarea id="aiMapPrompt" data-testid="ai-map-prompt" maxlength="1000"></textarea>',
    '<p id="aiMapError" role="alert"></p>',
    '<section id="aiMapResult" hidden>',
    '<strong id="aiMapName"></strong><span id="aiMapSummary"></span>',
    '<canvas data-testid="ai-map-preview" width="560" height="300"></canvas>',
    '</section>',
    '<button type="button" data-testid="generate-ai-map">生成</button>',
    '<button type="button" data-testid="apply-ai-map" hidden>应用到编辑器</button>',
    '<button type="button" data-testid="cancel-ai-map">取消</button>',
    '</div>',
  ].join('');
  document.body.appendChild(modal);

  const promptNode = modal.querySelector('#aiMapPrompt');
  const errorNode = modal.querySelector('#aiMapError');
  const resultNode = modal.querySelector('#aiMapResult');
  const applyButton = modal.querySelector('[data-testid="apply-ai-map"]');
  const generateButton = modal.querySelector('[data-testid="generate-ai-map"]');

  function showError(message) {
    errorNode.textContent = message;
  }

  function closeDialog() {
    activeController?.abort();
    activeController = null;
    pendingLevel = null;
    resultNode.hidden = true;
    applyButton.hidden = true;
    modal.classList.remove('show');
  }

  function drawPreview(level) {
    const canvas = modal.querySelector('[data-testid="ai-map-preview"]');
    const context = canvas.getContext('2d');
    const cellWidth = canvas.width / level.width;
    const cellHeight = canvas.height / level.height;
    context.fillStyle = '#0a0a18';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < level.height; row += 1) {
      for (let col = 0; col < level.width; col += 1) {
        const tile = level.map[row][col];
        if (tile === ' ') continue;
        context.fillStyle = colorMap[tile] || '#555';
        context.fillRect(
          col * cellWidth,
          row * cellHeight,
          Math.ceil(cellWidth),
          Math.ceil(cellHeight),
        );
      }
    }
  }

  function applyPendingLevel() {
    if (!pendingLevel || !Array.isArray(pendingLevel.map)) return;
    const rows = pendingLevel.map.map(row => String(row));
    if (rows.length !== pendingLevel.height || rows.some(row => row.length !== pendingLevel.width)) {
      showError('生成地图尺寸无效');
      return;
    }
    snapshotEditorState = {
      name: document.getElementById('levelName').value,
      cellType: editorCellType,
      winCondition: editorWinCondition,
      pipeSpawners: editorPipeSpawners.map(item => ({ ...item })),
      knowledgeCards: editorKnowledgeCards.map(item => ({ ...item })),
      tutorials: editorTutorials.map(item => ({ ...item })),
      currentCustomIdx,
      customActions: document.getElementById('customActions').style.display,
    };
    snapshot = grid.map(row => [...row]);
    mapWidth = pendingLevel.width;
    mapHeight = pendingLevel.height;
    grid = rows.map(row => row.split(''));
    editorCellType = pendingLevel.cellType;
    editorWinCondition = pendingLevel.winCondition;
    editorPipeSpawners = [];
    editorKnowledgeCards = [];
    editorTutorials = [];
    currentCustomIdx = -1;
    document.getElementById('mapWidth').value = String(mapWidth);
    document.getElementById('mapHeight').value = String(mapHeight);
    document.getElementById('levelName').value = pendingLevel.name;
    document.getElementById('customActions').style.display = 'none';
    renderPalette();
    draw();
    closeDialog();
  }

  async function openDialog() {
    pendingLevel = null;
    errorNode.textContent = '';
    resultNode.hidden = true;
    applyButton.hidden = true;
    modal.querySelector('#aiMapTarget').textContent =
      `目标尺寸：${document.getElementById('mapWidth').value}×${document.getElementById('mapHeight').value}`;
    modal.classList.add('show');
    try {
      const response = await fetch('/api/ai-config');
      const status = await response.json();
      if (!response.ok || !status.configured) {
        alert('请先配置 AI API Key');
        location.href = '/ai-settings.html?return=%2Feditor.html';
        return;
      }
      promptNode.focus();
    } catch {
      showError('无法检查 AI 配置状态');
    }
  }

  async function generate() {
    const prompt = promptNode.value.trim();
    const width = Number(document.getElementById('mapWidth').value);
    const height = Number(document.getElementById('mapHeight').value);
    if (!prompt || prompt.length > 1000) return showError('请输入 1–1000 字的地图描述');
    if (!Number.isInteger(width) || width < 20 || width > 200) {
      return showError('宽度必须为 20–200');
    }
    if (!Number.isInteger(height) || height < 10 || height > 80) {
      return showError('高度必须为 10–80');
    }
    activeController?.abort();
    activeController = new AbortController();
    pendingLevel = null;
    resultNode.hidden = true;
    applyButton.hidden = true;
    generateButton.disabled = true;
    showError('正在生成…');
    try {
      const response = await fetch('/api/generate-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width, height }),
        signal: activeController.signal,
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'AI 地图生成失败');
      }
      pendingLevel = payload.level;
      modal.querySelector('#aiMapName').textContent = pendingLevel.name;
      modal.querySelector('#aiMapSummary').textContent =
        ` ${pendingLevel.width}×${pendingLevel.height} · ${payload.blueprint.theme}`;
      drawPreview(pendingLevel);
      showError('');
      resultNode.hidden = false;
      applyButton.hidden = false;
    } catch (error) {
      if (error.name !== 'AbortError') showError(error.message);
    } finally {
      generateButton.disabled = false;
      activeController = null;
    }
  }

  button.addEventListener('click', openDialog);
  generateButton.addEventListener('click', generate);
  applyButton.addEventListener('click', applyPendingLevel);
  modal.querySelector('[data-testid="cancel-ai-map"]').addEventListener('click', closeDialog);
})();
