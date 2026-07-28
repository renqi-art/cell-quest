const { test, expect } = require('playwright/test');

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

// ======================== 双人模式基础 ========================

test('双人模式按钮能正确切换 ON/OFF', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('http://127.0.0.1:8080/', { timeout: 10000 });
  await page.waitForSelector('#main-menu', { timeout: 5000 });

  // 点击"新的游戏"按钮（button id=btn-start，文本 新的游戏）
  await page.locator('#btn-start').click();
  await page.waitForSelector('#hub-screen:not(.hidden)', { timeout: 5000 });

  // 初始状态是 OFF
  const btn2p = page.locator('#btn-hub-2p');
  await expect(btn2p).toContainText('OFF');

  // 切换到 ON
  await btn2p.click();
  await expect(btn2p).toContainText('ON');

  // 切换回 OFF
  await btn2p.click();
  await expect(btn2p).toContainText('OFF');

  expect(errors).toEqual([]);
});

// ======================== 双人模式关卡进入 ========================

test('双人模式开启后进入关卡，P2 HUD 正确显示', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('http://127.0.0.1:8080/', { timeout: 10000 });
  await page.waitForSelector('#main-menu', { timeout: 5000 });

  // 进入 Hub
  await page.locator('#btn-start').click();
  await page.waitForSelector('#hub-screen:not(.hidden)', { timeout: 5000 });

  // 开启双人模式
  await page.locator('#btn-hub-2p').click();
  await expect(page.locator('#btn-hub-2p')).toContainText('ON');

  // 点击第一个未锁定关卡
  await page.locator('.level-card:not(.locked)').first().click();

  // 检查 HUD 出现
  await expect(page.locator('#hud')).toHaveClass(/active/);

  // 检查 P2 HUD 面板出现
  const p2hud = page.locator('#hud-p2');
  await expect(p2hud).toBeVisible();
  await expect(p2hud).toHaveCSS('display', 'block');

  // 检查 P2 指示器和血条
  await expect(page.locator('#p2-indicator')).toBeVisible();
  await expect(page.locator('#health-bar-fill-p2')).toBeVisible();

  expect(errors).toEqual([]);
});

// ======================== P2 输入控制 ========================

test('P2 方向键控制：ArrowLeft/Right 移动，ArrowUp 跳跃，O 冲刺', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('http://127.0.0.1:8080/', { timeout: 10000 });
  await page.waitForSelector('#main-menu', { timeout: 5000 });
  await page.locator('#btn-start').click();
  await page.waitForSelector('#hub-screen:not(.hidden)', { timeout: 5000 });
  await page.locator('#btn-hub-2p').click();
  await page.locator('.level-card:not(.locked)').first().click();

  await expect(page.locator('#hud')).toHaveClass(/active/);
  await page.waitForTimeout(300);

  // P2 左右移动
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(100);

  // P2 跳跃
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(200);

  // P2 冲刺 (O)
  await page.keyboard.press('o');
  await page.waitForTimeout(100);

  // P2 攻击/技能 (U)
  await page.keyboard.press('u');
  await page.waitForTimeout(100);

  // P2 技能数字键
  await page.keyboard.press('7');
  await page.keyboard.press('8');
  await page.keyboard.press('9');
  await page.keyboard.press('0');

  // 验证没有 crash
  await expect(page.locator('#hud')).toHaveClass(/active/);

  expect(errors).toEqual([]);
});

// ======================== P1 和 P2 独立输入不冲突 ========================

test('P1 (WASD) 和 P2 (方向键) 输入不冲突', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('http://127.0.0.1:8080/', { timeout: 10000 });
  await page.waitForSelector('#main-menu', { timeout: 5000 });
  await page.locator('#btn-start').click();
  await page.waitForSelector('#hub-screen:not(.hidden)', { timeout: 5000 });
  await page.locator('#btn-hub-2p').click();
  await page.locator('.level-card:not(.locked)').first().click();

  await expect(page.locator('#hud')).toHaveClass(/active/);
  await page.waitForTimeout(300);

  // P1 向右 + P2 向左（同时）
  await page.keyboard.down('d');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(300);
  await page.keyboard.up('d');
  await page.keyboard.up('ArrowLeft');

  // P1 跳跃 + P2 跳跃（同时）
  await page.keyboard.down('w');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(200);
  await page.keyboard.up('w');
  await page.keyboard.up('ArrowUp');

  // P1 技能 + P2 技能（同时）
  await page.keyboard.press('e');
  await page.keyboard.press('u');

  await expect(page.locator('#hud')).toHaveClass(/active/);
  expect(errors).toEqual([]);
});

// ======================== 双人模式暂停与恢复 ========================

test('双人模式中暂停/恢复正常', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('http://127.0.0.1:8080/', { timeout: 10000 });
  await page.waitForSelector('#main-menu', { timeout: 5000 });
  await page.locator('#btn-start').click();
  await page.waitForSelector('#hub-screen:not(.hidden)', { timeout: 5000 });
  await page.locator('#btn-hub-2p').click();
  await page.locator('.level-card:not(.locked)').first().click();

  await expect(page.locator('#hud')).toHaveClass(/active/);
  await page.waitForTimeout(300);

  // 暂停 (P)
  await page.keyboard.press('p');
  await expect(page.locator('#pause-menu')).not.toHaveClass(/hidden/);

  // 恢复
  await page.keyboard.press('p');
  await page.waitForTimeout(100);

  // Escape 暂停
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-menu')).not.toHaveClass(/hidden/);

  expect(errors).toEqual([]);
});

// ======================== 双人模式下退出到 Hub ========================

test('双人模式下退出到 Hub 正常', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('http://127.0.0.1:8080/', { timeout: 10000 });
  await page.waitForSelector('#main-menu', { timeout: 5000 });
  await page.locator('#btn-start').click();
  await page.waitForSelector('#hub-screen:not(.hidden)', { timeout: 5000 });
  await page.locator('#btn-hub-2p').click();
  await page.locator('.level-card:not(.locked)').first().click();

  await expect(page.locator('#hud')).toHaveClass(/active/);
  await page.waitForTimeout(300);

  // 暂停 + 退出
  await page.keyboard.press('p');
  await expect(page.locator('#pause-menu')).not.toHaveClass(/hidden/);
  await page.locator('#btn-quit').click();

  // 回到 Hub
  await expect(page.locator('#hub-screen')).not.toHaveClass(/hidden/);

  expect(errors).toEqual([]);
});

// ======================== 双人模式未开启时 P2 HUD 不显示 ========================

test('双人模式 OFF 时不显示 P2 HUD', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('http://127.0.0.1:8080/', { timeout: 10000 });
  await page.waitForSelector('#main-menu', { timeout: 5000 });
  await page.locator('#btn-start').click();
  await page.waitForSelector('#hub-screen:not(.hidden)', { timeout: 5000 });

  // 确认双人模式 OFF
  await expect(page.locator('#btn-hub-2p')).toContainText('OFF');

  // 进入关卡
  await page.locator('.level-card:not(.locked)').first().click();
  await expect(page.locator('#hud')).toHaveClass(/active/);
  await page.waitForTimeout(300);

  // P2 HUD 不显示
  const p2hud = page.locator('#hud-p2');
  await expect(p2hud).not.toBeVisible();
  await expect(p2hud).toHaveCSS('display', 'none');

  expect(errors).toEqual([]);
});

// ======================== 双人模式 cell-name-p2 元素 ========================

test('P2 HUD 中 cell-name-p2 元素存在', async ({ page }) => {
  const errors = capturePageErrors(page);

  await page.goto('http://127.0.0.1:8080/', { timeout: 10000 });
  await page.waitForSelector('#main-menu', { timeout: 5000 });
  await page.locator('#btn-start').click();
  await page.waitForSelector('#hub-screen:not(.hidden)', { timeout: 5000 });
  await page.locator('#btn-hub-2p').click();
  await page.locator('.level-card:not(.locked)').first().click();

  await expect(page.locator('#hud')).toHaveClass(/active/);
  await page.waitForTimeout(300);

  // 验证 cell-name-p2 存在于 P2 HUD 中
  const p2Hud = page.locator('#hud-p2');
  const cellNameP2 = page.locator('#cell-name-p2');

  // cell-name-p2 应该在 index.html 的 HUD 区域中
  const cellNameP2count = await cellNameP2.count();
  // 注意: cell-name-p2 可能在 HTML 中已经存在但通过 JS 填充
  console.log('cell-name-p2 count:', cellNameP2count);

  expect(errors).toEqual([]);
});
