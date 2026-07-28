/* ====================================================================
 * viewport-coordinator.js — 移动端视口协调器
 * 管理竖屏提示、横屏战斗门槛、可选全屏、CSS 自定义属性更新
 *
 * 行为：
 *   - 竖屏浏览大厅正常（仅提示建议横屏以获得更好体验）
 *   - 竖屏点击"开始关卡"时弹出旋转提示，不启动战斗
 *   - 切到横屏后提示自动消失，可继续进入战斗
 *   - 全屏为可选项（需要用户手势触发），失败不阻塞游戏
 * ==================================================================== */

const MobileViewportCoordinator = {
  /** 竖屏提示是否因"试图进入战斗"而触发 */
  _battleGateActive: false,

  /** 竖屏提示 DOM */
  _portraitOverlay: null,
  /** 横屏战斗控制层 DOM */
  _landscapeControls: null,
  /** 全屏按钮 DOM */
  _fullscreenBtn: null,

  init() {
    this._portraitOverlay = document.getElementById('mobile-portrait-overlay');
    this._landscapeControls = document.getElementById('mobile-landscape-controls');
    this._fullscreenBtn = document.getElementById('btn-mobile-fullscreen');

    MobileCapability.refresh();
    this._updateCSSProps();
    this._render();

    MobileCapability.onFullscreenChange((isFs) => {
      this._updateFullscreenButton(isFs);
    });

    this._bindEvents();
  },

  // ---- 战斗门槛 ----

  /**
   * 在进入战斗前调用。如果是竖屏，显示旋转提示并返回 false。
   * 如果是横屏，返回 true（可以进入战斗）。
   */
  requestBattleStart() {
    MobileCapability.refresh();
    if (MobileCapability.isPortrait) {
      this._battleGateActive = true;
      this._render();
      return false;
    }
    this._battleGateActive = false;
    this._render();
    return true;
  },

  /** 清除战斗门槛（玩家从战斗返回大厅等） */
  clearBattleGate() {
    this._battleGateActive = false;
    this._render();
  },

  // ---- 渲染 ----

  _render() {
    if (!this._portraitOverlay || !this._landscapeControls) return;

    const isPortrait = MobileCapability.isPortrait;
    const isPlaying = (window.Game && window.Game.state === 'playing');
    const hasTouch = MobileCapability.hasTouch;

    // 竖屏提示：仅在战斗门槛激活或战斗中处于竖屏时显示
    const showPortraitOverlay = hasTouch && isPortrait && (this._battleGateActive || isPlaying);

    // 横屏控制层：仅在横屏 + 战斗中显示
    const showLandscapeControls = hasTouch && !isPortrait && isPlaying;

    this._portraitOverlay.classList.toggle('active', showPortraitOverlay);
    this._landscapeControls.classList.toggle('active', showLandscapeControls);

    this._updateCSSProps();
  },

  /**
   * 由外部（game.js）在游戏状态变化时调用。
   * 状态变化包括：'playing', 'paused', 'dead', 'menu', 'hub'...
   */
  onGameStateChange() {
    this._render();
  },

  /** 由外部在 resize/orientationchange 时调用 */
  onViewportChange() {
    MobileCapability.refresh();
    this._updateCSSProps();
    this._render();
  },

  // ---- 全屏 ----

  _updateFullscreenButton(isFs) {
    if (!this._fullscreenBtn) return;
    this._fullscreenBtn.textContent = isFs ? '退出全屏' : '全屏游玩';
    this._fullscreenBtn.classList.toggle('active', isFs);
  },

  async _requestFullscreen() {
    const container = document.getElementById('game-container');
    const ok = await MobileCapability.requestFullscreen(container);
    if (!ok) {
      // 全屏失败：静默降级，游戏继续在普通浏览器模式运行
      this._updateFullscreenButton(false);
    }
  },

  async _exitFullscreen() {
    await MobileCapability.exitFullscreen();
    this._updateFullscreenButton(false);
  },

  /** 全屏按钮点击处理 */
  _onFullscreenClick() {
    if (MobileCapability.isFullscreen()) {
      this._exitFullscreen();
    } else {
      this._requestFullscreen();
    }
  },

  // ---- CSS 自定义属性 ----

  _updateCSSProps() {
    const root = document.documentElement;
    const cap = MobileCapability;

    root.style.setProperty('--mobile-safe-top', cap.safeAreaTop + 'px');
    root.style.setProperty('--mobile-safe-bottom', cap.safeAreaBottom + 'px');
    root.style.setProperty('--mobile-safe-left', cap.safeAreaLeft + 'px');
    root.style.setProperty('--mobile-safe-right', cap.safeAreaRight + 'px');
    root.style.setProperty('--mobile-vp-width', cap.viewportWidth + 'px');
    root.style.setProperty('--mobile-vp-height', cap.viewportHeight + 'px');
    root.style.setProperty('--mobile-is-portrait', cap.isPortrait ? '1' : '0');
  },

  // ---- 事件绑定 ----

  _bindEvents() {
    if (this._fullscreenBtn) {
      this._fullscreenBtn.addEventListener('click', () => this._onFullscreenClick());
    }

    // 方向变化
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onViewportChange(), 150);
    });

    // resize（包含浏览器工具栏收起/展开）
    let _resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => this.onViewportChange(), 100);
    });

    // visualViewport（处理移动端浏览器工具栏动态变化）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => this.onViewportChange(), 100);
      });
    }
  }
};
