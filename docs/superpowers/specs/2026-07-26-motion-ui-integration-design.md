# 《细胞远征》动效 UI 接入设计与操作手册

> 日期：2026-07-26
> 状态：方案已批准
> 适用范围：游戏主入口、菜单、关卡选择、弹窗、HUD 与后续 Vue UI
> 推荐方案：Legacy DOM 使用 Motion JavaScript 过渡，Vue 终态使用 Motion for Vue，按需复制 Vue Bits 组件

## 1. 文档目的

本文说明如何在不破坏现有游戏逻辑、Canvas 渲染和 Vue/Phaser 迁移边界的前提下，为《细胞远征》接入统一的动效 UI。

本文既是设计说明，也是操作手册。开发者应能据此完成依赖安装、目录创建、Legacy DOM 过渡接入、Vue 组件接入、Vue Bits 组件适配、性能控制、可访问性处理和验收。

本文不要求一次性重写现有界面。接入过程分为两个阶段：

1. 当前阶段：现有 `index.html` 和 `js/game.js` 继续管理 Legacy DOM 的显示状态，Motion 仅提供表现层动画。
2. Vue 终态：菜单、弹窗和 HUD 迁移为 Vue 组件后，使用 `motion-v` 管理进入、退出、布局和交互动效。

## 2. 接入收益

### 2.1 玩家体验

- 主菜单获得符合微观生物世界主题的视觉氛围。
- 关卡卡片通过悬浮、聚光和选中反馈明确当前操作目标。
- 暂停、死亡、通关、知识卡和确认弹窗具有清晰的层级变化。
- 生命、ATP、经验、Buff 和技能冷却变化更容易被感知。
- 获得装备、解锁成就和列表增删不再突然跳变。
- 动效持续时间和缓动风格一致，减少界面割裂感。

### 2.2 工程收益

- 将分散在 `css/style.css` 中的关键帧和过渡参数集中为动效 Token。
- 通过组件生命周期或显式清理函数取消动画，降低计时器和动画实例泄漏风险。
- 为 `prefers-reduced-motion` 提供统一入口。
- Vue 迁移后可以删除 Legacy 动效适配层，不形成永久双轨架构。
- Vue Bits 采用“复制源码、按项目修改”的方式，不把视觉设计锁死在第三方组件包中。

### 2.3 不会自动改善的内容

接入 Motion 不会自动改善战斗手感、碰撞、角色动画、相机或游戏帧循环。这些能力仍由当前 Canvas 引擎或最终 Phaser 运行时负责。

WebGL、模糊和粒子效果如果使用过量，反而可能降低帧率。因此重动效只能用于菜单等低负载场景。

## 3. 当前项目状态

项目当前使用：

- Vue 3.5
- Vite 8
- TypeScript 6
- Pinia 4
- 原生 Canvas 游戏画面
- Legacy JavaScript 游戏逻辑

关键入口如下：

```text
index.html
├─ #game-container
│  ├─ #canvas
│  ├─ #main-menu
│  ├─ #hub-screen
│  ├─ #pause-menu
│  ├─ #complete-screen
│  ├─ #death-panel
│  └─ 其他 Legacy DOM
├─ js/game.js
│  └─ 通过 hidden class 控制界面
└─ #vue-game-root
   └─ src/game/main.ts
      └─ src/game/GameApp.vue
         └─ LegacyGameEngineAdapter
```

当前 `GameApp.vue` 主要承担桥接职责，绝大部分游戏 UI 仍由 `index.html` 和 `js/game.js` 管理。动效接入不能让 Vue 和 Legacy JavaScript 同时控制同一个节点的业务状态。

既有技术迁移设计规定：

- Vue 负责最终 DOM UI。
- Phaser 或当前游戏引擎负责游戏世界、逐帧状态和渲染。
- Vue 与游戏引擎通过 `GameEngine` 和只读事件数据通信。
- Vue 不直接操作 Phaser Scene、Actor 或 Legacy `window.Game`。
- 不进行逐帧 Vue 响应式同步。

本文遵守上述边界。

## 4. 目标与非目标

### 4.1 目标

1. 建立统一的动效 Token。
2. 让现有 Legacy 菜单和弹窗获得低风险的进入动效。
3. 为 Vue UI 提供可复用的 Motion 接入模式。
4. 允许从 Vue Bits 精选背景、文本和卡片效果。
5. 所有非必要动效可以被 reduced-motion 关闭或降级。
6. 隐藏或卸载界面时取消动画和渲染循环。
7. 不影响现有存档、关卡、输入、Canvas 和 Playwright 关键选择器。

### 4.2 非目标

- 不在本次接入中重做完整视觉设计。
- 不把角色、敌人、子弹、碰撞或相机交给 Motion。
- 不为了第三方组件引入完整 Tailwind 体系。
- 不把 React Bits、Magic UI 或 Aceternity UI 的 React 代码直接塞入 Vue。
- 不让 Motion 负责游戏业务状态。
- 不为每个按钮设计完全不同的动画。
- 不允许无限运行的菜单背景在战斗场景继续渲染。

## 5. 方案比较与决策

### 5.1 方案 A：渐进式双阶段接入

当前使用 Motion JavaScript API 动画 Legacy DOM；界面迁移到 Vue 后改用 Motion for Vue。

优点：

- 可以立即改善现有界面。
- 不要求先完成完整 Vue 迁移。
- Legacy 适配层职责单一，后续可删除。
- 最符合现有渐进式迁移设计。

缺点：

- 迁移期间同时存在 `motion` 和 `motion-v` 两种调用方式。
- Legacy 阶段为了不改写显示逻辑，只提供可靠的进入动效；完整退出动效留到 Vue 阶段。

### 5.2 方案 B：立即建立 Vue 动效覆盖层

在 `#vue-game-root` 内创建绝对定位 Vue 图层，覆盖现有 Legacy 菜单。

优点：

- 可以立刻使用 Vue Bits 和 `motion-v`。

缺点：

- Legacy DOM 与 Vue 容易同时接管点击、焦点和可见性。
- 需要重复维护菜单内容。
- Playwright 选择器和键盘焦点更容易失效。

不采用。

### 5.3 方案 C：完成全部 Vue UI 迁移后再加动效

优点：

- 最终架构最干净。

缺点：

- 短期没有体验收益。
- 动效需求无法提前验证。

不作为当前接入方式，但它是方案 A 的最终状态。

### 5.4 最终决策

采用方案 A：

```text
当前
Legacy DOM + motion
        ↓
菜单/弹窗逐步迁移为 Vue
        ↓
Vue DOM + motion-v
        ↓
删除 Legacy Motion Adapter
```

Vue Bits 不是全局 UI 框架，只作为可复制的视觉组件来源。

## 6. 依赖策略

版本以 2026-07-26 的 npm `latest` 为准。项目现有依赖均使用精确版本，因此新增依赖也必须使用 `--save-exact`。

| 依赖 | 固定版本 | 用途 | 接入阶段 | 许可 |
|---|---:|---|---|---|
| [`motion`](https://www.npmjs.com/package/motion) | `12.42.2` | Legacy DOM 动画 | 当前 | MIT |
| [`motion-v`](https://www.npmjs.com/package/motion-v) | `2.3.0` | Vue 组件动画 | Vue UI 迁移时 | MIT |
| [`@formkit/auto-animate`](https://www.npmjs.com/package/@formkit/auto-animate) | `0.10.0` | 列表增删和重排 | 可选 | MIT |
| [Vue Bits](https://github.com/DavidHDev/vue-bits) | 不作为包整体安装 | 精选视觉组件源码 | 按需 | MIT + Commons Clause |

### 6.1 当前阶段安装

```powershell
npm install --save-exact motion@12.42.2
```

不要在尚未使用时提前安装 `motion-v` 和 AutoAnimate。

### 6.2 Vue UI 阶段安装

```powershell
npm install --save-exact motion-v@2.3.0
```

### 6.3 列表确有需求时安装

```powershell
npm install --save-exact @formkit/auto-animate@0.10.0
```

AutoAnimate 只用于关卡列表、Buff、背包和排行榜等子节点增删或排序。普通弹窗进入和按钮反馈仍使用 Motion。

### 6.4 不允许的依赖方式

- 不安装 React Bits。
- 不安装 React、Framer Motion 或 Next.js。
- 不因为一个组件安装完整 shadcn-vue。
- 不在没有审核组件依赖的情况下执行远程 registry 安装命令。
- 不使用浮动版本号。

## 7. 目标目录

当前阶段建议创建：

```text
src/game/motion/
├─ motion-tokens.ts
├─ reduced-motion.ts
└─ legacy-motion.ts

src/game/styles/
└─ motion.css
```

Vue UI 迁移后扩展：

```text
src/game/components/motion/
├─ MotionOverlay.vue
├─ MotionPanel.vue
├─ MotionButton.vue
└─ vendor/
   ├─ CellFieldBackground.vue
   └─ SpotlightLevelCard.vue
```

职责：

| 文件 | 职责 |
|---|---|
| `motion-tokens.ts` | 持续时间、缓动、弹簧、位移和层级预设 |
| `reduced-motion.ts` | 读取和订阅 reduced-motion |
| `legacy-motion.ts` | 仅观察 Legacy overlay 可见性并播放进入动画 |
| `motion.css` | 静态状态、焦点样式和 reduced-motion CSS 兜底 |
| `MotionOverlay.vue` | Vue 弹窗进入、退出和焦点层级 |
| `MotionPanel.vue` | 可复用面板动效 |
| `MotionButton.vue` | 统一 hover、tap 和 focus 反馈 |
| `vendor/` | 经过审查和本地化的 Vue Bits 源码 |

第三方复制代码必须放在 `vendor/`，项目自己编写的通用组件不得放入该目录。

## 8. 动效 Token

所有业务界面使用统一 Token，不在组件中散落任意时长。

建议建立 `src/game/motion/motion-tokens.ts`：

```ts
export const motionDuration = {
  instant: 0.08,
  fast: 0.14,
  normal: 0.22,
  panel: 0.3,
  cinematic: 0.48,
} as const

export const motionDistance = {
  control: 4,
  panel: 16,
  hero: 28,
} as const

export const motionEase = {
  standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
} as const

export const motionSpring = {
  control: {
    type: 'spring',
    stiffness: 420,
    damping: 30,
    mass: 0.7,
  },
  panel: {
    type: 'spring',
    stiffness: 260,
    damping: 26,
    mass: 0.9,
  },
} as const
```

规则：

- 按钮反馈使用 `fast`。
- 普通面板使用 `normal` 或 `panel`。
- `cinematic` 只用于主菜单标题或通关展示。
- 控件位移不超过 4px。
- 普通面板位移不超过 16px。
- 禁止在 HUD 上使用大幅弹跳。

## 9. Reduced Motion

建议建立 `src/game/motion/reduced-motion.ts`：

```ts
export interface ReducedMotionPreference {
  readonly current: boolean
  destroy(): void
}

export function observeReducedMotion(
  onChange: (reduced: boolean) => void,
): ReducedMotionPreference {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  const notify = (): void => onChange(query.matches)

  query.addEventListener('change', notify)
  notify()

  return {
    get current() {
      return query.matches
    },
    destroy() {
      query.removeEventListener('change', notify)
    },
  }
}
```

reduced-motion 开启时：

- 取消屏幕震动、闪烁、旋转、视差和粒子背景。
- 面板只允许 80ms 以内的淡入淡出。
- 不使用模糊到清晰的长时间文字动画。
- 不使用循环呼吸、漂浮或无限旋转。
- 关键状态仍通过颜色、图标、文字或边框表达。

CSS 兜底：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }

  .motion-decorative {
    display: none !important;
  }
}
```

不要只依靠 CSS。由 JavaScript、Canvas 或 WebGL 创建的循环也必须主动停止。

## 10. Legacy DOM 接入

### 10.1 设计原则

Legacy Motion Adapter 只观察 overlay 的 `hidden` class：

- `hidden` 被移除时播放进入动画。
- 不修改 `Game.state`。
- 不触发菜单切换。
- 不修改文本或业务 class。
- 不阻止现有点击事件。
- 不观察整个 document 子树。
- 销毁时断开 observer 并取消动画。

当前 Legacy 显示逻辑会立即添加 `hidden`，因此本阶段不强行实现退出动画。完整退出动画在 Vue 阶段通过 `AnimatePresence` 实现。

### 10.2 观察范围

只观察这些稳定节点：

```ts
const overlayIds = [
  'main-menu',
  'hub-screen',
  'pedia-screen',
  'char-detail-screen',
  'pause-menu',
  'complete-screen',
  'death-panel',
  'memory-card',
  'confirm-dialog',
  'skill-tree-screen',
  'equipment-screen',
] as const
```

动态列表、Canvas、HUD 数值和整个 `body` 不使用 MutationObserver。

### 10.3 Adapter 示例

建议建立 `src/game/motion/legacy-motion.ts`：

```ts
import { animate, stagger } from 'motion'
import {
  motionDistance,
  motionDuration,
  motionEase,
} from './motion-tokens'

const overlayIds = [
  'main-menu',
  'hub-screen',
  'pedia-screen',
  'char-detail-screen',
  'pause-menu',
  'complete-screen',
  'death-panel',
  'memory-card',
  'confirm-dialog',
  'skill-tree-screen',
  'equipment-screen',
] as const

const itemSelector = [
  'h1',
  'h2',
  'h3',
  '.btn',
  '.btn-small',
  '.level-card',
  '.stats',
].join(',')

type MotionControl = ReturnType<typeof animate>

function playOverlayEntrance(
  overlay: HTMLElement,
  reducedMotion: boolean,
): MotionControl[] {
  if (reducedMotion) {
    return [
      animate(
        overlay,
        { opacity: [0, 1] },
        { duration: motionDuration.instant },
      ),
    ]
  }

  const controls: MotionControl[] = [
    animate(
      overlay,
      {
        opacity: [0, 1],
        y: [motionDistance.panel, 0],
        scale: [0.985, 1],
      },
      {
        duration: motionDuration.panel,
        ease: motionEase.standard,
      },
    ),
  ]

  const items = overlay.querySelectorAll<HTMLElement>(itemSelector)
  if (items.length > 0) {
    controls.push(
      animate(
        items,
        {
          opacity: [0, 1],
          y: [motionDistance.control, 0],
        },
        {
          duration: motionDuration.normal,
          delay: stagger(0.035, { startDelay: 0.04 }),
          ease: motionEase.standard,
        },
      ),
    )
  }

  return controls
}

export interface LegacyMotionBinding {
  destroy(): void
}

export function bindLegacyMotion(
  reducedMotion: () => boolean,
): LegacyMotionBinding {
  const observers: MutationObserver[] = []
  const activeControls = new Set<MotionControl>()

  const play = (overlay: HTMLElement): void => {
    for (const control of playOverlayEntrance(overlay, reducedMotion())) {
      activeControls.add(control)
      void control.then(
        () => activeControls.delete(control),
        () => activeControls.delete(control),
      )
    }
  }

  for (const id of overlayIds) {
    const overlay = document.getElementById(id)
    if (!overlay) continue

    const observer = new MutationObserver(() => {
      if (!overlay.classList.contains('hidden')) play(overlay)
    })

    observer.observe(overlay, {
      attributes: true,
      attributeFilter: ['class'],
    })
    observers.push(observer)

    if (!overlay.classList.contains('hidden')) play(overlay)
  }

  return {
    destroy() {
      observers.forEach(observer => observer.disconnect())
      activeControls.forEach(control => control.cancel())
      activeControls.clear()
    },
  }
}
```

### 10.4 在 `GameApp.vue` 中绑定

绑定必须跟随 Vue 根组件生命周期：

```ts
import { onBeforeUnmount, onMounted } from 'vue'
import { bindLegacyMotion } from './motion/legacy-motion'
import { observeReducedMotion } from './motion/reduced-motion'

let motionBinding: ReturnType<typeof bindLegacyMotion> | null = null
let motionPreference: ReturnType<typeof observeReducedMotion> | null = null
let reducedMotion = false

onMounted(async () => {
  const host = document.querySelector<HTMLElement>('#game-container')
  await engine.mount(host ?? document.body)

  motionPreference = observeReducedMotion(value => {
    reducedMotion = value
  })
  motionBinding = bindLegacyMotion(() => reducedMotion)

  // 保留现有事件订阅。
})

onBeforeUnmount(() => {
  motionBinding?.destroy()
  motionPreference?.destroy()
  motionBinding = null
  motionPreference = null

  // 保留现有 unsubscribe 和 engine.destroy()。
})
```

不要重复创建第二个 `onMounted` 和 `onBeforeUnmount` 块来掩盖生命周期顺序。实际实施时应合并到现有钩子中。

### 10.5 CSS 要求

Motion 动画的元素必须优先使用：

- `transform`
- `opacity`

谨慎使用：

- `filter`
- `box-shadow`
- `backdrop-filter`

禁止对高频动画使用：

- `width`
- `height`
- `top`
- `left`
- 大范围 `filter: blur(...)`

生命条和 ATP 条当前通过 `width` 表达数值，可以暂时保留；新增的反馈动画应作用于外层容器的 `transform` 或伪元素。

## 11. Vue UI 接入

### 11.1 Vue 接管原则

当某个 Legacy overlay 迁移为 Vue 组件后：

1. 从 `index.html` 删除该 overlay 的业务 DOM。
2. 从 `js/game.js` 删除对该 overlay 的直接查询和 class 操作。
3. 由 Pinia 或组件 props 决定是否显示。
4. 从 `legacy-motion.ts` 的 `overlayIds` 删除对应 ID。
5. 用 `motion-v` 实现进入和退出。
6. 保留必要的稳定 ID 或 `data-testid`，避免回归测试失效。

不能让 Legacy 节点和 Vue 节点以同一 ID 同时存在。

### 11.2 Vue Overlay 示例

```vue
<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import {
  motionDistance,
  motionDuration,
  motionEase,
} from '@/game/motion/motion-tokens'

defineProps<{
  open: boolean
  labelledBy: string
}>()
</script>

<template>
  <AnimatePresence>
    <motion.section
      v-if="open"
      class="motion-overlay"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledBy"
      :initial="{
        opacity: 0,
        y: motionDistance.panel,
        scale: 0.985,
      }"
      :animate="{
        opacity: 1,
        y: 0,
        scale: 1,
      }"
      :exit="{
        opacity: 0,
        y: motionDistance.control,
        scale: 0.99,
      }"
      :transition="{
        duration: motionDuration.panel,
        ease: motionEase.standard,
      }"
    >
      <slot />
    </motion.section>
  </AnimatePresence>
</template>
```

reduced-motion 开启时应通过 composable 返回更小的 transition 和零位移，而不是在每个组件里重复调用 `matchMedia`。

### 11.3 控件反馈

按钮只使用轻量反馈：

```vue
<motion.button
  :while-hover="{ y: -2, scale: 1.015 }"
  :while-press="{ y: 0, scale: 0.975 }"
  :transition="motionSpring.control"
>
  <slot />
</motion.button>
```

要求：

- 键盘 `:focus-visible` 样式必须独立存在。
- hover 不是传达状态的唯一方式。
- disabled 按钮不播放 hover 和 tap 动画。
- 触屏设备不能依赖 hover 才显示重要信息。

## 12. Vue Bits 接入方法

### 12.1 使用方式

Vue Bits 只作为源码参考和组件来源。每次只复制一个经过评审的组件。

操作顺序：

1. 在 Vue Bits 文档中选择组件。
2. 打开对应 registry JSON。
3. 检查 `dependencies` 和 `registryDependencies`。
4. 拒绝不符合当前性能预算的依赖。
5. 将 `.vue` 源码复制到 `src/game/components/motion/vendor/`。
6. 把 Tailwind utility class 转换为 scoped CSS 或项目 class。
7. 将颜色、半径、字体和动效参数替换为本项目 Token。
8. 增加 reduced-motion 降级。
9. 增加可见性暂停和卸载清理。
10. 记录来源 URL、原始组件名和许可证。

### 12.2 去 Tailwind 示例

原始：

```vue
<p class="flex flex-wrap text-white">
```

本地化：

```vue
<p class="cell-quest-blur-text">
```

```css
.cell-quest-blur-text {
  display: flex;
  flex-wrap: wrap;
  color: var(--cq-text-primary, #e8e8f0);
}
```

不要为了几个 utility class 引入 Tailwind。

### 12.3 依赖审核

推荐优先接受：

- `motion-v`
- 原生 Canvas
- 原生 SVG
- 无依赖 CSS

需要专项性能验证：

- Three.js
- OGL
- Matter.js
- WebGL Shader
- 高频 pointermove
- 持续 `requestAnimationFrame`

如果组件只用于主菜单，必须提供 `active` 或 `paused` 控制；进入游戏后停止循环。

### 12.4 许可记录

Vue Bits 当前使用 MIT + Commons Clause。复制组件前必须确认项目使用方式符合许可证，并在组件头部或相邻 `SOURCE.md` 中记录：

```text
Source: https://github.com/DavidHDev/vue-bits
Original component: <component-name>
Retrieved: 2026-07-26
Local changes: removed Tailwind, added reduced-motion, added visibility pause
License: MIT + Commons Clause
```

不要把“可免费用于项目”等同于“无条件 MIT”。

## 13. 推荐动效映射

| 界面 | 推荐效果 | 强度 | 实现 |
|---|---|---:|---|
| 主菜单 | 轻量细胞场背景、标题淡入、按钮 stagger | 中 | Vue Bits 本地化组件 + Motion |
| 关卡选择 | 卡片聚光、悬浮 2px、选中缩放 | 低 | Motion |
| 角色图鉴 | 图片与信息交叉淡入 | 低 | Motion |
| 暂停菜单 | 背景淡入、面板短距离上移 | 低 | Motion |
| 死亡面板 | 红色短闪、面板进入、计数强调 | 中 | Motion + CSS |
| 通关面板 | 标题进入、统计逐项出现、星级弹簧 | 中 | Motion |
| 知识卡 | 面板进入、正文普通显示 | 低 | Motion |
| 确认弹窗 | 透明度和缩放 | 低 | Motion |
| 生命/ATP | 数值变化后外层轻微脉冲 | 低 | Motion |
| 技能冷却 | 冷却结束时描边和缩放反馈 | 低 | Motion |
| Buff 列表 | 增删和重排 | 低 | AutoAnimate |
| 背包/排行榜 | 子节点增删和排序 | 低 | AutoAnimate |

不推荐：

- 每个 HUD 数值持续漂浮。
- 战斗时运行全屏 WebGL 菜单背景。
- 对所有文字使用逐字动画。
- 每次普通点击都触发屏幕震动。
- 频繁使用大面积模糊。

## 14. 生命周期和数据流

### 14.1 Legacy 阶段

```text
用户操作
→ js/game.js 更新 Game 状态
→ js/game.js 添加或移除 hidden
→ Legacy Motion Adapter 观察到界面进入
→ Motion 播放表现层动画
```

Motion 不回写游戏状态。

### 14.2 Vue 阶段

```text
用户操作
→ Vue action / GameEngine command
→ Pinia 或只读事件更新 UI 状态
→ v-if 改变组件存在性
→ AnimatePresence 播放退出/进入
```

### 14.3 游戏运行时

```text
GameEngine / Phaser
→ 发布低频领域事件
→ Pinia 更新 UI 快照
→ Motion 对可见 DOM 反馈
```

位置、速度、子弹、敌人和粒子不得逐帧同步到 Vue。

## 15. 性能预算

### 15.1 基本预算

- 菜单目标：常见桌面环境稳定 60 FPS。
- 战斗时：不得因 DOM 动效使既有 Canvas 基线出现明显下降。
- 同一时刻最多运行一个全屏 WebGL 或 Canvas 装饰背景。
- 控件反馈持续时间不超过 220ms。
- 普通面板不超过 300ms。
- 电影化标题不超过 480ms。
- 无限动画必须能暂停和销毁。
- 隐藏页面不得继续处理 pointermove 或 `requestAnimationFrame`。

### 15.2 GPU 友好属性

优先：

- `transform`
- `opacity`

限制：

- `filter`
- `backdrop-filter`
- 大阴影
- 混合模式

避免：

- 动画布局尺寸
- 动画大范围渐变背景位置
- 同时运行多个高分辨率 Canvas

### 15.3 可见性暂停

装饰背景至少在以下情况暂停：

- 主菜单已隐藏。
- 页面进入战斗状态。
- `document.visibilityState !== 'visible'`。
- reduced-motion 开启。
- 组件卸载。

## 16. 可访问性

动效不得破坏：

- 键盘焦点顺序。
- `role="dialog"` 和 `aria-modal`。
- 标题与 `aria-labelledby` 的关联。
- Escape 关闭行为。
- 按钮可访问名称。
- 对比度。

退出动画期间应避免焦点落到即将消失的元素上。对话框关闭后，焦点应返回打开它的控件。

闪烁要求：

- 不创建高频全屏闪烁。
- 死亡闪光保持短暂且低透明度。
- 关键提示不能只通过闪烁表达。

## 17. 测试策略

### 17.1 单元测试

测试：

- reduced-motion 初始值。
- media query 改变时更新。
- `destroy()` 后不再触发回调。
- Legacy binding 销毁后 observer 断开。
- overlay 从 hidden 变为可见时只启动一次预期动画。

### 17.2 Vue 组件测试

测试：

- `open=false` 时不渲染 dialog。
- `open=true` 时渲染正确 ARIA。
- reduced-motion 时使用零位移和短时长。
- disabled 按钮不注册交互动效。
- 卸载后没有残留动画控制器。

### 17.3 Playwright

至少覆盖：

1. 主菜单仍可点击“新的游戏”。
2. 关卡选择仍可通过鼠标和键盘操作。
3. 暂停和恢复不受动画阻塞。
4. 死亡、通关和确认弹窗焦点正确。
5. reduced-motion 模拟下流程仍正常。
6. 页面重复进入和退出后控制台无错误。
7. 关键 ID 或测试选择器保持稳定。

### 17.4 视觉检查

在以下分辨率检查：

- 1280×720
- 1920×1080
- 窄屏布局

检查：

- 面板没有因 transform 被裁切。
- 动画结束后没有残留内联 opacity。
- 按钮 hover 不改变布局。
- 文本动画不会导致换行跳动。
- Canvas 和 DOM 层级正确。

## 18. 验收标准

接入完成必须满足：

- [ ] `motion` 使用精确版本。
- [ ] 所有持续时间和缓动来自 Token。
- [ ] Motion 不修改游戏业务状态。
- [ ] Legacy overlay 只观察自身 class。
- [ ] Adapter 销毁时断开 observer 和动画。
- [ ] reduced-motion 关闭非必要位移、闪烁和循环。
- [ ] 战斗时没有菜单 WebGL 背景运行。
- [ ] 主菜单、关卡选择、暂停、死亡和通关流程可操作。
- [ ] 键盘焦点和 Escape 行为正常。
- [ ] 关键 Playwright 流程通过。
- [ ] `npm run typecheck` 通过。
- [ ] `npm run lint` 通过。
- [ ] `npm run test:unit` 通过。
- [ ] `npm test` 通过。
- [ ] `npm run build` 通过。

## 19. 回滚策略

### 19.1 Legacy 阶段

如果出现兼容性或性能问题：

1. 从 `GameApp.vue` 移除 `bindLegacyMotion`。
2. 保留原 CSS transition。
3. 删除 `motion` 依赖。
4. 重新生成 lockfile。
5. 运行完整测试。

Legacy 业务逻辑不依赖 Motion，因此回滚不应影响游戏状态。

### 19.2 Vue 阶段

如果单个 Vue Bits 组件出现问题：

1. 用静态项目组件替换 vendor 组件。
2. 保留外层 `MotionOverlay` 或 `MotionPanel`。
3. 删除该组件独有依赖。
4. 运行视觉和性能回归。

不要为了保留一个视觉效果破坏整体帧率或可访问性。

## 20. 常见问题

### 为什么不直接使用 Vue Bits 全家桶？

当前项目没有 Tailwind，而且 Vue Bits 不同组件的依赖差异较大。精选复制可以控制包体、性能、样式和许可风险。

### 为什么 Legacy 阶段只有进入动画？

Legacy 代码会立即添加 `hidden`，节点随即 `display:none`。为强行播放退出动画，需要把大量同步显示函数改为异步，这会扩大回归范围。完整退出动画应在 Vue `v-if` 和 `AnimatePresence` 阶段实现。

### 为什么不使用纯 CSS？

简单 hover 和状态颜色继续使用 CSS。Motion 用于需要取消、编排、弹簧、布局或 Vue 生命周期管理的动效。两者各司其职。

### 为什么不让 Motion 动画生命条宽度？

生命条宽度表达数值，可暂时保留现状；额外强调反馈应放在外层 transform 或光效上，避免新增布局抖动。

### AutoAnimate 是否必须？

不是。只有列表增删或排序确实需要平滑过渡时再安装。

### 能否使用 Three.js 或 Shader 背景？

可以，但只能选择一个主菜单背景，必须按可见性暂停、支持 reduced-motion，并通过性能验收。战斗场景禁止继续运行。

## 21. 推荐实施顺序

1. 安装固定版本 `motion`。
2. 添加 Token 和 reduced-motion。
3. 添加 Legacy Motion Adapter。
4. 只为主菜单、关卡选择和弹窗启用进入动画。
5. 验证测试、焦点和性能。
6. 选择一个主菜单 Vue Bits 背景进行本地化验证。
7. 菜单迁移为 Vue 时安装 `motion-v`。
8. 每迁移一个 overlay，就从 Legacy Adapter 删除一个 ID。
9. Legacy UI 全部迁移后删除 `legacy-motion.ts` 和 `motion` JavaScript 接入。
10. 评估是否仍需要 AutoAnimate。

最终期望状态：

```text
Vue 负责 DOM UI 和 Motion
GameEngine 负责稳定领域事件
Phaser/Canvas 负责游戏世界
动效 Token 统一体验
reduced-motion 统一降级
```

## 22. 参考资料

- [Motion GitHub](https://github.com/motiondivision/motion)
- [Motion npm](https://www.npmjs.com/package/motion)
- [Motion for Vue npm](https://www.npmjs.com/package/motion-v)
- [Vue Bits GitHub](https://github.com/DavidHDev/vue-bits)
- [AutoAnimate GitHub](https://github.com/formkit/auto-animate)
- [现有 Vue/Phaser 技术迁移设计](./2026-07-26-vue-phaser-typescript-migration-design.md)
- [最终发布验收门槛](./2026-07-26-final-release-acceptance-gate-design.md)
