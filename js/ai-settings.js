const statusNode = document.querySelector('[data-testid="ai-config-status"]');
const keyInput = document.querySelector('[data-testid="ai-api-key"]');
const saveButton = document.querySelector('[data-testid="save-ai-key"]');
const clearButton = document.querySelector('[data-testid="clear-ai-key"]');
const returnLink = document.querySelector('[data-testid="return-to-editor"]');
const candidate = new URLSearchParams(location.search).get('return') || '/editor.html';
returnLink.href = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/editor.html';

function renderStatus(configured, source) {
  statusNode.textContent = configured
    ? source === 'environment' ? '已通过环境变量配置' : '已配置运行时 API Key'
    : '尚未配置 API Key';
}

async function refreshStatus() {
  const response = await fetch('/api/ai-config', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('无法读取 AI 配置状态');
  const payload = await response.json();
  renderStatus(payload.configured === true, payload.source);
}

async function writeKey(apiKey) {
  saveButton.disabled = true;
  clearButton.disabled = true;
  try {
    const response = await fetch('/api/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '保存失败');
    renderStatus(payload.configured, payload.source);
  } finally {
    keyInput.value = '';
    saveButton.disabled = false;
    clearButton.disabled = false;
  }
}

saveButton.addEventListener('click', async () => {
  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    statusNode.textContent = '请输入 API Key';
    return;
  }
  try { await writeKey(apiKey); }
  catch (error) { statusNode.textContent = error.message; }
});

clearButton.addEventListener('click', async () => {
  try { await writeKey(''); }
  catch (error) { statusNode.textContent = error.message; }
});

refreshStatus().catch(error => { statusNode.textContent = error.message; });
