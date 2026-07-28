/* ====================================================================
 * input-controller.js — 移动端触控输入控制器
 * 将触控事件转换为统一的 PlayerAction 状态，供运行时代理消费
 *
 * 动作分类：
 *   持续动作（按住期间持续生效）：left, right, down, jump
 *   边沿动作（按下瞬间触发，每帧只生效一次）：
 *     dash, skill, switchCell, skill1, skill2, skill3, skill4
 *
 * 边沿动作采用 "读后即焚" 机制：getActions() 返回 true 后立即清零，
 * 配合 js/game.js 已有的 k.X && !pk.X 边沿检测，保证每帧只触发一次。
 * ==================================================================== */

const CONTINUOUS_ACTIONS = ['left', 'right', 'down', 'jump'];
const EDGE_ACTIONS = ['dash', 'skill', 'switchCell', 'skill1', 'skill2', 'skill3', 'skill4'];
const ALL_ACTIONS = [...CONTINUOUS_ACTIONS, ...EDGE_ACTIONS];

const MobileInputController = {
  /** @type {Record<string, boolean>} */
  _actions: {},

  init() {
    this.releaseAll();
  },

  // ---- 触控层调用 ----

  /** 按下某个动作 */
  press(action) {
    if (this._actions[action] !== undefined) {
      this._actions[action] = true;
    }
  },

  /** 释放某个动作（持续动作）或标记可再次触发（边沿动作） */
  release(action) {
    if (this._actions[action] !== undefined) {
      this._actions[action] = false;
    }
  },

  // ---- 运行时代理调用 ----

  /**
   * 获取当前帧的动作快照，边沿动作读后即焚。
   * 每帧在 Player.update() 之前调用一次，结果合并到 Game.keys。
   */
  getActions() {
    const snapshot = {};

    for (const action of ALL_ACTIONS) {
      snapshot[action] = !!this._actions[action];
    }

    // 边沿动作：读后即焚，保证只触发一次
    for (const action of EDGE_ACTIONS) {
      if (this._actions[action]) {
        this._actions[action] = false;
      }
    }

    return snapshot;
  },

  // ---- 异常处理 ----

  /** 释放所有动作（暂停、弹窗、失焦、切后台时调用） */
  releaseAll() {
    this._actions = {};
    for (const action of ALL_ACTIONS) {
      this._actions[action] = false;
    }
  },

  /** 检查是否有任何动作正在按下 */
  hasAnyAction() {
    return ALL_ACTIONS.some(a => this._actions[a]);
  }
};
