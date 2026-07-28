/* ====================================================================
 * index.js — 移动端适配系统入口
 *
 * 初始化顺序：
 *   1. MobileCapability.init()     → 设备能力检测
 *   2. MobileInputController.init() → 输入状态初始化
 *   3. MobileControlsOverlay.init() → 创建控制层 DOM + 绑定事件
 *   4. MobileViewportCoordinator.init() → 视口协调 + 竖屏提示
 *   5. 挂载到 Game.mobile 供 js/game.js 消费
 *
 * 所有模块通过 window.Game.mobile 暴露给游戏运行时：
 *   Game.mobile.input.getActions()     → 获取本帧动作快照
 *   Game.mobile.input.releaseAll()     → 异常释放所有输入
 *   Game.mobile.viewport.requestBattleStart() → 战斗门槛检查
 *   Game.mobile.viewport.onGameStateChange()  → 游戏状态变化通知
 *   Game.mobile.overlay.setDisabled(bool)     → 暂停/弹窗禁用控制
 *   Game.mobile.overlay.setVisible(bool)      → 控制层显隐
 * ==================================================================== */

(function () {
  'use strict';

  // ---- 等待 Game 对象就绪 ----
  function waitForGame(retries, cb) {
    if (window.Game) { cb(); return; }
    if (retries <= 0) {
      console.warn('[Mobile] Game object not ready, mobile controls disabled');
      return;
    }
    setTimeout(() => waitForGame(retries - 1, cb), 50);
  }

  function initMobile() {
    MobileCapability.init();

    // 非触控设备 → 不启用移动控件
    if (!MobileCapability.isMobile()) return;

    MobileInputController.init();
    MobileControlsOverlay.init();
    MobileViewportCoordinator.init();

    // ---- 挂载到 Game 对象 ----
    const gm = {
      capability: MobileCapability,
      input: MobileInputController,
      overlay: MobileControlsOverlay,
      viewport: MobileViewportCoordinator
    };

    window.Game.mobile = gm;

    // ---- 全局异常恢复 ----
    // visibilitychange → releaseAll
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        MobileInputController.releaseAll();
        MobileControlsOverlay.forceReleaseAll();
      }
    });

    // window blur → releaseAll（与 js/game.js 的 Game.keys = {} 保持一致）
    window.addEventListener('blur', () => {
      MobileInputController.releaseAll();
      MobileControlsOverlay.forceReleaseAll();
    });

    // pagehide（iOS Safari 切后台/关闭标签页）
    window.addEventListener('pagehide', () => {
      MobileInputController.releaseAll();
      MobileControlsOverlay.forceReleaseAll();
    });
  }

  // 等待 DOM 和 Game 对象就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForGame(20, initMobile));
  } else {
    waitForGame(20, initMobile);
  }
})();
