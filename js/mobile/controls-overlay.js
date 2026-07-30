/* ====================================================================
 * controls-overlay.js — 移动端虚拟控制层
 *
 * 左侧：圆形虚拟摇杆（左右移动 + 下蹲）
 * 右侧：动作按钮（跳跃、攻击、突进、切换细胞、技能1-4）
 *
 * 摇杆方向映射：
 *   - 水平位移超过死区 → left / right
 *   - 向下位移超过死区 → down（下蹲）
 *   - 左/右与下蹲可同时触发（斜向蹲走）
 *
 * 按钮布局（横屏，右拇指操作区）：
 *          [跳跃]        [技能4]
 *   [攻击]  [突进]      [技能1]
 *   [切换]              [技能2]
 *                       [技能3]
 * ==================================================================== */

const JOYSTICK_DEAD_ZONE = 0.18;   // 死区比例（半径的 18%）
const JOYSTICK_MAX_RADIUS = 56;    // 摇杆最大拖动半径（px）

const BUTTON_DEFS = [
  { action: 'jump',       id: 'mb-jump',       label: '跳', cls: 'mb-lg mb-jump' },
  { action: 'skill',      id: 'mb-skill',      label: '攻', cls: 'mb-lg mb-skill' },
  { action: 'dash',       id: 'mb-dash',       label: '冲', cls: 'mb-md mb-dash' },
  { action: 'switchCell', id: 'mb-switch',     label: '换', cls: 'mb-md mb-switch' },
  { action: 'skill1',     id: 'mb-skill1',     label: '1',  cls: 'mb-sm mb-s1' },
  { action: 'skill2',     id: 'mb-skill2',     label: '2',  cls: 'mb-sm mb-s2' },
  { action: 'skill3',     id: 'mb-skill3',     label: '3',  cls: 'mb-sm mb-s3' },
  { action: 'skill4',     id: 'mb-skill4',     label: '4',  cls: 'mb-sm mb-s4' },
];

const MobileControlsOverlay = {
  /** @type {HTMLElement} */
  _container: null,
  /** @type {HTMLElement} */
  _joystickZone: null,
  /** @type {HTMLElement} */
  _joystickBase: null,
  /** @type {HTMLElement} */
  _joystickThumb: null,

  /** 摇杆捕获的 pointerId */
  _joystickPointerId: null,
  /** 摇杆基准中心（相对于视口） */
  _joystickCenterX: 0,
  _joystickCenterY: 0,

  /** 按钮元素索引 */
  _buttons: {},
  /** 按钮当前捕获的 pointerId */
  _buttonPointers: {},

  /** 是否已禁用（暂停/弹窗期间） */
  _disabled: false,

  // ---- 生命周期 ----

  /** 创建 DOM 并绑定事件。在 mobile/index.js 初始化时调用。 */
  init() {
    if (!MobileCapability.hasTouch) return;

    this._buildDOM();
    this._bindJoystick();
    this._bindButtons();
  },

  /**
   * 由 viewport-coordinator / game.js 调用，控制控制层显隐。
   * visible: 是否显示控制层
   */
  setVisible(visible) {
    if (!this._container) return;
    this._container.classList.toggle('active', visible);
  },

  /**
   * 禁用/启用控制层（暂停、弹窗出现时禁用）。
   * 禁用时会释放所有动作。
   */
  setDisabled(disabled) {
    if (this._disabled === disabled) return;
    this._disabled = disabled;

    if (disabled) {
      this.forceReleaseAll();
    }

    if (this._container) {
      this._container.classList.toggle('disabled', disabled);
    }
  },

  /** 是否显示中 */
  isVisible() {
    return this._container && this._container.classList.contains('active');
  },

  // ---- DOM 构建 ----

  _buildDOM() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const html = `
<div id="mobile-controls">
  <!-- 竖屏提示层 -->
  <div id="mobile-portrait-overlay">
    <div class="mp-rotate-icon">📱</div>
    <p class="mp-rotate-text">请旋转设备至横屏</p>
    <p class="mp-rotate-sub">以获得最佳游戏体验</p>
    <button id="btn-mobile-fullscreen" class="mp-fullscreen-btn">全屏游玩</button>
  </div>

  <!-- 横屏战斗控制层 -->
  <div id="mobile-landscape-controls">
    <div id="mobile-utility-controls" aria-label="游戏快捷控制">
      <button id="btn-mobile-pause" class="mobile-utility-btn" aria-label="暂停游戏">Ⅱ</button>
      <button id="btn-mobile-fullscreen-landscape" class="mobile-utility-btn" aria-label="全屏游戏">⛶</button>
      <span id="mobile-fullscreen-status" role="status" aria-live="polite"></span>
    </div>
    <div id="mobile-joystick-zone">
      <div id="mobile-joystick-base" aria-label="移动摇杆">
        <div id="mobile-joystick-thumb"></div>
      </div>
    </div>
    <div id="mobile-action-buttons">
      ${BUTTON_DEFS.map(b =>
        `<button id="${b.id}" class="mobile-btn ${b.cls}" data-action="${b.action}" aria-label="${b.label}">${b.label}</button>`
      ).join('')}
    </div>
  </div>
</div>`;

    container.insertAdjacentHTML('beforeend', html);

    this._container = document.getElementById('mobile-controls');
    this._joystickZone = document.getElementById('mobile-joystick-zone');
    this._joystickBase = document.getElementById('mobile-joystick-base');
    this._joystickThumb = document.getElementById('mobile-joystick-thumb');

    for (const def of BUTTON_DEFS) {
      this._buttons[def.action] = document.getElementById(def.id);
    }

    // 初始状态
    this._container.classList.add('touch-device');
  },

  // ---- 摇杆 ----

  _bindJoystick() {
    const zone = this._joystickZone;
    if (!zone) return;

    zone.addEventListener('pointerdown', (e) => {
      if (this._disabled) return;
      if (this._joystickPointerId !== null) return; // 已经捕获了一个触点

      this._joystickPointerId = e.pointerId;
      zone.setPointerCapture(e.pointerId);

      const rect = this._joystickBase.getBoundingClientRect();
      this._joystickCenterX = rect.left + rect.width / 2;
      this._joystickCenterY = rect.top + rect.height / 2;

      this._updateJoystick(e.clientX, e.clientY);
      e.preventDefault();
    });

    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._joystickPointerId) return;
      this._updateJoystick(e.clientX, e.clientY);
      e.preventDefault();
    });

    const releaseJoystick = (e) => {
      if (e.pointerId !== this._joystickPointerId) return;
      this._joystickPointerId = null;
      MobileInputController.release('left');
      MobileInputController.release('right');
      MobileInputController.release('down');
      this._resetJoystickVisual();
    };

    zone.addEventListener('pointerup', releaseJoystick);
    zone.addEventListener('pointercancel', releaseJoystick);
    zone.addEventListener('pointerleave', releaseJoystick);
    zone.addEventListener('lostpointercapture', releaseJoystick);
  },

  _updateJoystick(clientX, clientY) {
    const dx = clientX - this._joystickCenterX;
    const dy = clientY - this._joystickCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = JOYSTICK_MAX_RADIUS;

    // 钳制位移
    const clampedDist = Math.min(dist, maxR);
    const scale = dist > 0 ? clampedDist / dist : 0;
    const cx = dx * scale;
    const cy = dy * scale;

    // 更新视觉
    if (this._joystickThumb) {
      this._joystickThumb.style.transform = `translate(${cx}px, ${cy}px)`;
    }

    // 死区判断
    const ratio = clampedDist / maxR;
    if (ratio < JOYSTICK_DEAD_ZONE) {
      MobileInputController.release('left');
      MobileInputController.release('right');
      MobileInputController.release('down');
      return;
    }

    // 水平方向（灵敏度：死区以上线性映射，20% 开始生效）
    const hThresh = JOYSTICK_DEAD_ZONE;
    if (dx < -hThresh * maxR) {
      MobileInputController.press('left');
      MobileInputController.release('right');
    } else if (dx > hThresh * maxR) {
      MobileInputController.press('right');
      MobileInputController.release('left');
    } else {
      MobileInputController.release('left');
      MobileInputController.release('right');
    }

    // 向下（下蹲）：dy 向下为正
    const vThresh = JOYSTICK_DEAD_ZONE;
    if (dy > vThresh * maxR) {
      MobileInputController.press('down');
    } else {
      MobileInputController.release('down');
    }
  },

  _resetJoystickVisual() {
    if (this._joystickThumb) {
      this._joystickThumb.style.transform = 'translate(0px, 0px)';
    }
  },

  // ---- 动作按钮 ----

  _bindButtons() {
    for (const def of BUTTON_DEFS) {
      const btn = this._buttons[def.action];
      if (!btn) continue;

      btn.addEventListener('pointerdown', (e) => {
        if (this._disabled) return;
        if (this._buttonPointers[def.action] != null) return;
        this._buttonPointers[def.action] = e.pointerId;
        btn.setPointerCapture(e.pointerId);
        MobileInputController.press(def.action);
        btn.classList.add('pressed');
        e.preventDefault();
      });

      const releaseBtn = (e) => {
        if (this._buttonPointers[def.action] !== e.pointerId) return;
        this._buttonPointers[def.action] = null;
        MobileInputController.release(def.action);
        btn.classList.remove('pressed');
      };

      btn.addEventListener('pointerup', releaseBtn);
      btn.addEventListener('pointercancel', releaseBtn);
      btn.addEventListener('pointerleave', releaseBtn);
      btn.addEventListener('lostpointercapture', releaseBtn);
    }
  },

  /** 强制释放所有按钮和摇杆（外部异常恢复） */
  forceReleaseAll() {
    // 释放指针捕获，防止浏览器侧残留
    if (this._joystickZone && this._joystickZone.hasPointerCapture && this._joystickPointerId != null) {
      try { this._joystickZone.releasePointerCapture(this._joystickPointerId); } catch (_) { /* ignore */ }
    }
    this._joystickPointerId = null;

    for (const def of BUTTON_DEFS) {
      const btn = this._buttons[def.action];
      const pid = this._buttonPointers[def.action];
      if (btn && pid != null) {
        try { btn.releasePointerCapture(pid); } catch (_) { /* ignore */ }
      }
    }
    this._buttonPointers = {};

    this._resetJoystickVisual();

    for (const def of BUTTON_DEFS) {
      const btn = this._buttons[def.action];
      if (btn) btn.classList.remove('pressed');
    }

    MobileInputController.releaseAll();
  }
};
