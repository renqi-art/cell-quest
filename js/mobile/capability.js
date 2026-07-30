/* ====================================================================
 * capability.js — 设备能力检测
 * 判断触控能力、屏幕方向、视口尺寸、安全区和全屏 API 可用性
 * ==================================================================== */

const MobileCapability = {
  hasTouch: false,
  isPortrait: true,
  isLandscape: false,
  viewportWidth: 0,
  viewportHeight: 0,
  safeAreaTop: 0,
  safeAreaBottom: 0,
  safeAreaLeft: 0,
  safeAreaRight: 0,
  fullscreenAvailable: false,
  _devicePixelRatio: 1,

  init() {
    this.hasTouch = ('ontouchstart' in window)
      || (navigator.maxTouchPoints > 0)
      || (navigator.msMaxTouchPoints > 0);
    this.fullscreenAvailable = !!(
      document.fullscreenEnabled || document.webkitFullscreenEnabled
    );
    this._devicePixelRatio = window.devicePixelRatio || 1;
    this.refresh();
    this._bindEvents();
  },

  /** 刷新视口、方向、安全区数据 */
  refresh() {
    const viewport = window.visualViewport;
    this.viewportWidth = Math.round(viewport ? viewport.width : window.innerWidth);
    this.viewportHeight = Math.round(viewport ? viewport.height : window.innerHeight);
    this.isPortrait = this.viewportHeight > this.viewportWidth;
    this.isLandscape = !this.isPortrait;
  },

  /** 是否应启用移动端控件 */
  isMobile() {
    return this.hasTouch;
  },

  /** 请求全屏，返回 Promise<boolean> */
  async requestFullscreen(el) {
    if (!this.fullscreenAvailable) return false;
    try {
      const target = el || document.documentElement;
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
      } else {
        return false;
      }
      return true;
    } catch (_err) {
      return false;
    }
  },

  /** 退出全屏 */
  async exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.webkitFullscreenElement) {
        await document.webkitExitFullscreen();
      }
    } catch (_err) { /* 忽略 */ }
  },

  /** 当前是否处于全屏状态 */
  isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  },

  /** 全屏状态变化回调列表 */
  _fsCallbacks: [],

  onFullscreenChange(cb) {
    this._fsCallbacks.push(cb);
  },

  _bindEvents() {
    window.addEventListener('resize', () => this.refresh());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.refresh(), 120);
    });

    const fsHandler = () => {
      const isFs = this.isFullscreen();
      for (const cb of this._fsCallbacks) cb(isFs);
    };
    document.addEventListener('fullscreenchange', fsHandler);
    document.addEventListener('webkitfullscreenchange', fsHandler);

    // visualViewport 变化时刷新安全区数据
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.refresh());
      window.visualViewport.addEventListener('scroll', () => this.refresh());
    }
  }
};
