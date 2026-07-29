// 细胞远征 · 音频管理器
// 统一管理「全局循环 BGM」与「角色动作音效」。
// 全部 mp3 素材位于项目 audio/ 目录，通过 Vite 资源导入获得带哈希的 URL。
//
// 设计要点：
//  - BGM：仅使用本次上传的音频（audio/bgm_loop.mp3）作为唯一背景音乐。
//    页面加载后由单一 Audio 实例无限循环播放，独立轨道、切换关卡不中断；
//    基础音量 BGM_VOLUME=0.25；浏览器自动播放策略可能拦截，故在首次用户
//    手势（点击/按键/触摸）时补播。
//  - 音效：每次触发都新建一个 HTMLAudioElement 实例并播放，天然支持高频
//    重复触发且不阻塞游戏主线程；音量 SFX_VOLUME 保持原参数不变，明显大于 BGM。
//  - 下压（duck）：任意动作音效播放时，BGM 平滑下压至 0.18；音效结束后
//    约 300ms 平滑恢复 0.25，全程禁止静音（音量恒 > 0）。
//    下压/恢复逻辑只作用于 BGM 轨道，不改动任何音效播放代码。

import bgmUrl from '../../../audio/bgm_loop.mp3'
import jumpUrl from '../../../audio/sfx_jump.mp3'
import attackUrl from '../../../audio/sfx_attack.mp3'
import skillUrl from '../../../audio/sfx_skill.mp3'
import hurtUrl from '../../../audio/sfx_hurt.mp3'
import pickupUrl from '../../../audio/sfx_pickup.mp3'
import deathUrl from '../../../audio/sfx_death.mp3'
import footstepUrl from '../../../audio/sfx_footstep.mp3'

export type SfxName = 'jump' | 'attack' | 'skill' | 'hurt' | 'pickup' | 'death'

/** BGM 基础音量（唯一背景音乐，底层铺垫，关卡切换不中断） */
const BGM_VOLUME = 0.25
/** BGM 被音效下压时的目标音量（禁止静音，最低 0.18） */
const BGM_DUCK_VOLUME = 0.18
/** 动作音效音量（保持原参数不变，明显高于 BGM） */
const SFX_VOLUME = 0.9
/** 脚步声音量（固定 0.4，明显低于动作音效；不改动 SFX_VOLUME 常量） */
const FOOTSTEP_VOLUME = 0.4
/** 脚步声使用专用音效文件（用户上传的 sfx_footstep.mp3），音量固定 0.4；不触发 BGM 下压、不受 BGM 静音按钮控制 */
const FOOTSTEP_URL = footstepUrl

/** 各动作音效时长（ms），用于 BGM 下压后精确恢复 */
const SFX_DURATION_MS: Record<SfxName, number> = {
  jump: 320,
  attack: 260,
  skill: 520,
  hurt: 260,
  pickup: 220,
  death: 820,
}

const SFX_URLS: Record<SfxName, string> = {
  jump: jumpUrl,
  attack: attackUrl,
  skill: skillUrl,
  hurt: hurtUrl,
  pickup: pickupUrl,
  death: deathUrl,
}

class AudioManager {
  private static _instance: AudioManager | null = null

  static get instance(): AudioManager {
    if (!this._instance) this._instance = new AudioManager()
    return this._instance
  }

  private bgm: HTMLAudioElement | null = null
  private bgmStarted = false
  private gestureBound = false

  // —— BGM 平滑音量控制（下压 / 恢复）——
  private bgmCurrentVol = BGM_VOLUME
  private bgmTargetVol = BGM_VOLUME
  private duckUntil = 0 // performance.now() 时间戳，在此之前保持下压
  private tickHandle: number | null = null
  private muted = false // 用户通过右上角按钮控制的 BGM 静音状态（true=静音，不影响任何音效）

  /** 页面加载后调用：单一实例无限循环播放 BGM；若被自动播放策略拦截，则在首次用户手势时补播。 */
  startBgm(): void {
    if (this.bgmStarted) return
    this.bgmStarted = true

    // 跨 HMR / 模块重载保护：若页面已存在一个正在播放的 BGM 元素，
    // 直接复用，绝不创建第二个实例，杜绝两段 BGM 叠加。
    const w = window as unknown as { __cqBgmEl?: HTMLAudioElement }
    if (w.__cqBgmEl && !w.__cqBgmEl.paused) {
      this.bgm = w.__cqBgmEl
      this.applyBgmVolume()
      this.startTick()
      return
    }

    const el = new Audio(bgmUrl)
    el.loop = true
    el.volume = this.muted ? 0 : this.bgmCurrentVol
    el.preload = 'auto'
    this.bgm = el
    w.__cqBgmEl = el

    const p = el.play()
    if (p && typeof p.catch === 'function') {
      // 自动播放被拦截：等待首次用户手势再补播
      p.catch(() => this.bindGestureResume())
    }
    this.startTick()
  }

  private startTick(): void {
    if (this.tickHandle !== null) return
    this.tickHandle = window.setInterval(() => this.tick(), 30)
  }

  private stopTick(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle)
      this.tickHandle = null
    }
  }

  // —— BGM 静音开关（仅影响 BGM 轨道，绝不触碰任何动作音效）——
  /** 当前是否静音（true=已关闭 BGM） */
  get isMuted(): boolean {
    return this.muted
  }
  /** 设置 BGM 静音状态：true=静音（音量 0），false=恢复（回到下压/基础音量）。 */
  setMuted(value: boolean): void {
    this.muted = value
    this.applyBgmVolume()
  }
  /** 切换 BGM 静音，返回切换后的状态（true=已静音）。 */
  toggleMuted(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }
  /** 立即把 BGM 元素音量设为「静音=0」或「当前目标音量」（受下压影响）。 */
  private applyBgmVolume(): void {
    if (!this.bgm) return
    this.bgm.volume = this.muted ? 0 : (this.bgmCurrentVol > 0 ? this.bgmCurrentVol : BGM_VOLUME)
  }

  /** 每 30ms 平滑逼近目标音量：下压快(~60ms)、恢复约 300ms，全程 > 0（禁止静音）。 */
  private tick(): void {
    if (!this.bgm) {
      this.stopTick()
      return
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const ducking = now < this.duckUntil
    this.bgmTargetVol = ducking ? BGM_DUCK_VOLUME : BGM_VOLUME
    const k = ducking ? 0.35 : 0.18 // 下压快、恢复约 300ms
    this.bgmCurrentVol += (this.bgmTargetVol - this.bgmCurrentVol) * k
    if (Math.abs(this.bgmTargetVol - this.bgmCurrentVol) < 0.002) {
      this.bgmCurrentVol = this.bgmTargetVol
    }
    // 静音按钮优先：muted 时直接 0；否则按平滑后的当前音量（下压期间也 > 0，禁止静音）
    this.bgm.volume = this.muted ? 0 : (this.bgmCurrentVol > 0 ? this.bgmCurrentVol : BGM_DUCK_VOLUME)

    // 已恢复且无待下压 → 停止定时器，省资源
    if (!ducking && Math.abs(this.bgmCurrentVol - BGM_VOLUME) < 0.002) {
      this.stopTick()
    }
  }

  private bindGestureResume(): void {
    if (this.gestureBound) return
    this.gestureBound = true
    const resume = (): void => {
      if (this.bgm) {
        this.applyBgmVolume() // 先按「静音/当前」复位音量再播
        this.bgm.play().catch(() => {})
      }
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      window.removeEventListener('touchstart', resume)
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    window.addEventListener('touchstart', resume)
  }

  /**
   * 播放角色动作音效（原逻辑完全不动）。
   * 每次触发都新建一个 Audio 实例，支持高频重复触发且不阻塞游戏主线程。
   * 文末仅新增 BGM 侧下压触发，不改变任何音效播放行为。
   */
  /** 复用同一套播放内核（每次新建 Audio 实例、非阻塞、高频可重复触发） */
  private playRaw(url: string, volume: number): void {
    try {
      const el = new Audio(url)
      el.volume = volume
      const p = el.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch {
      // 忽略个别播放失败，绝不阻断游戏
    }
  }

  play(name: SfxName): void {
    const url = SFX_URLS[name]
    if (!url) return
    this.playRaw(url, SFX_VOLUME)
    // —— 仅新增：触发 BGM 平滑下压（不影响音效本身）——
    this.duckBgm(name)
  }

  /**
   * 走路脚步声：复用项目现有音效体系与已有音频文件（pickup.mp3），不新增文件。
   * - 音量固定 0.4，明显低于动作音效（SFX_VOLUME=0.9）
   * - 不触发 BGM 下压（脚步频繁，避免 BGM 反复抽吸）
   * - 不受 BGM 静音按钮控制（属于游戏特效音效，独立 Audio 实例）
   */
  playFootstep(): void {
    this.playRaw(FOOTSTEP_URL, FOOTSTEP_VOLUME)
  }

  /** 任意音效播放时，BGM 平滑下压至 0.18，并在该音效结束后恢复 0.25（禁止静音）。 */
  private duckBgm(name: SfxName): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const dur = SFX_DURATION_MS[name] ?? 300
    // 多音效叠加时，以下压最晚结束者为准
    this.duckUntil = Math.max(this.duckUntil, now + dur)
    this.bgmTargetVol = BGM_DUCK_VOLUME
    this.startTick()
  }
}

export const audio = AudioManager.instance
export default AudioManager
