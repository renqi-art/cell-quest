# 《细胞远征》Vue 3、TypeScript 与 Phaser 技术迁移设计

> 日期：2026-07-26
> 状态：方案已确认，待文档复核
> 迁移类型：构建系统迁移、界面框架迁移、语言迁移、游戏引擎迁移
> 核心原则：保持现有视觉、玩法、存档和关卡格式，分阶段替换，不进行一次性重写

## 1. 背景

当前前端由多个普通 `<script>` 按固定顺序加载：

```text
config.js
→ entities.js
→ levels/level*.js
→ levels.js
→ sprites.js
→ ai-levels.js
→ game.js
```

这些文件依赖共享全局变量。`game.js` 约 2,525 行，同时承担关卡模型、地图解析、输入、游戏循环、渲染、HUD、菜单、存档界面、排行榜、成就、自定义关卡、AI 生成、技能树和装备界面等职责。`editor.html` 仍包含大段内联 JavaScript，界面中也存在动态 HTML 和内联事件处理。

现状的主要问题：

1. 文件加载顺序就是依赖管理，缺少显式接口。
2. `Game` 全局对象同时保存运行时、界面和持久化状态。
3. 实体直接读取和修改全局状态，难以单元测试。
4. 高频游戏状态与 DOM 更新耦合。
5. UI 通过字符串拼接生成，事件处理分散。
6. 地图解析、碰撞、绘制对同一瓦片含义分别维护。
7. 自研引擎需要持续维护循环、相机、碰撞、资源、输入、粒子和音频等基础设施。
8. JavaScript 缺少可执行的跨模块契约，重构容易产生运行时错误。

本迁移将前端升级为 Vite、Vue 3 和 TypeScript，并以 Phaser 作为最终游戏运行时。迁移必须通过适配接口分阶段完成，不能让 Vue 组件直接依赖遗留引擎或 Phaser 具体类。

## 2. 目标

1. 所有可见页面和界面由 Vue 3 组件管理。
2. 所有业务、领域、服务和游戏代码使用 TypeScript ES Modules。
3. 使用 Vite 提供开发服务器、热更新、资源处理和生产构建。
4. 使用 Pinia管理界面、档案、进度和自定义关卡状态。
5. 使用 Phaser 管理场景、固定更新、实体、碰撞、相机、输入、资源、动画、音频和粒子。
6. 建立与具体引擎无关的 `GameEngine` 接口，使 Vue 与 Phaser 解耦。
7. 保持现有视觉布局、中文文案、键位、玩法手感、存档和关卡格式。
8. 保留 `/`、`/editor.html` 和 `/deck.html` 地址。
9. 为核心规则建立 Vitest 单元测试，为用户流程保留并扩充 Playwright 回归测试。
10. 最终删除传统脚本顺序、全局 `window` API、内联事件和遗留入口文件。

## 3. 非目标

本次迁移不包含：

- 重新设计游戏视觉。
- 修改现有关卡内容或故事。
- 重做玩家技能数值。
- 改变 P1/P2 默认键位。
- 改变自定义关卡分享码格式。
- 引入后端账号、云存档或在线联机。
- 使用 Vue 渲染玩家、敌人、子弹或粒子。
- 将每帧运行时状态放入 Pinia。
- 在同一次迁移中升级 Phaser 主版本。
- 为迁移方便而删除旧存档兼容逻辑。

## 4. 技术调研结论

### 4.1 Phaser

[Phaser 主仓库](https://github.com/phaserjs/phaser) 拥有成熟的 2D Web 游戏生态，提供场景、相机、输入、物理、资源、动画、音频和粒子系统。

[Phaser 官方 Vue TypeScript 模板](https://github.com/phaserjs/template-vue-ts) 已提供：

- Vue 3 + TypeScript + Vite 项目结构。
- `PhaserGame.vue` 桥接组件。
- Vue 与 Phaser 之间的事件总线。
- 当前活动 Scene 暴露方式。
- 静态资源和生产构建约定。

该模板验证了“Vue 负责 DOM UI，Phaser 负责游戏世界，二者通过桥接层通信”的架构方向。

### 4.2 Excalibur

[Excalibur](https://github.com/excaliburjs/Excalibur) 是 TypeScript 原生 2D 引擎，具有固定时间步、Actor、Scene、碰撞组、TileMap 和相机系统。其架构与本项目需要的类型化自研引擎接近。

未选择原因：官方仍标记为 `0.x`，后续版本可能出现破坏性 API 变化，生态规模小于 Phaser。

### 4.3 melonJS

[melonJS](https://github.com/melonjs/melonJS) 提供接近 Canvas2D 的绘制 API、TileMap、物理、场景、相机、输入和音频，迁移现有绘制代码的概念成本较低。

未选择原因：Vue 集成资料、团队人才储备和生态规模小于 Phaser。

### 4.4 LittleJS 与 KAPLAY

[LittleJS](https://github.com/KilledByAPixel/LittleJS) 和 [KAPLAY](https://github.com/kaplayjs/kaplay) 都支持 TypeScript、模块和 Vite，适合快速构建轻量 2D 游戏。

未选择原因：Cell Quest 已包含多存档、双人、技能树、装备、AI 关卡、编辑器、大量特殊地形和复杂 HUD，项目规模超过它们最合适的轻量使用场景。

### 4.5 最终选择

采用：

```text
Vite
├─ Vue 3 + TypeScript
├─ Pinia
├─ Phaser
├─ Vitest
└─ Playwright
```

Phaser 迁移以官方 Vue TypeScript 桥接模式为参考，但本项目的桥接接口必须使用自身领域类型，Vue 组件不能直接读取 Phaser Scene 或 Actor。

## 5. 版本策略

1. 实施开始时选择彼此兼容的稳定版本，并将精确版本写入 `package-lock.json`。
2. Vue、Vite、TypeScript、Pinia、Vitest 和 Phaser 不使用浮动版本范围。
3. Phaser 首个迁移版本采用官方 Vue TypeScript 模板已经验证的稳定主版本。
4. Phaser 主版本升级必须作为迁移完成后的独立工作处理。
5. 迁移期间只允许修复安全问题和明确阻塞问题，不进行无关依赖升级。
6. TypeScript 开启严格模式，不以大范围 `any` 绕过迁移错误。

建议 TypeScript 约束：

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "useUnknownInCatchVariables": true,
  "noFallthroughCasesInSwitch": true
}
```

## 6. 页面架构

采用 Vite 多页面应用，不使用 Vue Router：

```text
index.html
  └─ src/game/main.ts
      └─ GameApp.vue

editor.html
  └─ src/editor/main.ts
      └─ EditorApp.vue

deck.html
  └─ src/deck/main.ts
      └─ DeckApp.vue
```

选择多页面而不是单页路由的原因：

1. 游戏、编辑器和展示页生命周期不同。
2. 编辑器不需要加载 Phaser 游戏运行时。
3. 展示页不需要加载游戏和编辑器代码。
4. 保留现有 URL 和 Playwright 导航路径。
5. 单个页面故障不会阻止其他入口加载。
6. Vite 可以为三个入口分别生成按需资源。

三个 HTML 文件最终只保留页面元数据、挂载节点和模块入口，不包含业务脚本。

## 7. 目标目录

```text
src/
├─ shared/
│  ├─ types/
│  │  ├─ game.ts
│  │  ├─ level.ts
│  │  ├─ save.ts
│  │  ├─ progress.ts
│  │  └─ events.ts
│  ├─ constants/
│  ├─ models/
│  ├─ services/
│  │  ├─ SaveService.ts
│  │  ├─ AchievementService.ts
│  │  ├─ LeaderboardService.ts
│  │  ├─ CustomLevelService.ts
│  │  ├─ AiLevelService.ts
│  │  └─ LevelCodec.ts
│  ├─ storage/
│  │  ├─ StorageAdapter.ts
│  │  └─ LocalStorageAdapter.ts
│  └─ utils/
│     ├─ escape-html.ts
│     ├─ result.ts
│     └─ time.ts
├─ game/
│  ├─ main.ts
│  ├─ GameApp.vue
│  ├─ bridge/
│  │  ├─ GameEngine.ts
│  │  ├─ GameEngineEvents.ts
│  │  ├─ LegacyGameEngineAdapter.ts
│  │  └─ PhaserGameEngineAdapter.ts
│  ├─ engine/
│  │  ├─ create-phaser-game.ts
│  │  ├─ scenes/
│  │  │  ├─ BootScene.ts
│  │  │  ├─ PreloadScene.ts
│  │  │  └─ LevelScene.ts
│  │  ├─ actors/
│  │  │  ├─ PlayerActor.ts
│  │  │  ├─ EnemyActor.ts
│  │  │  ├─ BossActor.ts
│  │  │  ├─ ItemActor.ts
│  │  │  └─ ProjectileActor.ts
│  │  ├─ level/
│  │  │  ├─ LevelRepository.ts
│  │  │  ├─ LevelParser.ts
│  │  │  ├─ TileRegistry.ts
│  │  │  └─ LevelFactory.ts
│  │  ├─ systems/
│  │  │  ├─ CombatSystem.ts
│  │  │  ├─ SpawnSystem.ts
│  │  │  ├─ TideSystem.ts
│  │  │  ├─ CheckpointSystem.ts
│  │  │  ├─ ObjectiveSystem.ts
│  │  │  └─ DifficultySystem.ts
│  │  └─ audio/
│  │     └─ AudioController.ts
│  ├─ stores/
│  │  ├─ game-ui.ts
│  │  ├─ profile.ts
│  │  ├─ progress.ts
│  │  └─ custom-levels.ts
│  ├─ components/
│  │  ├─ canvas/
│  │  ├─ hud/
│  │  ├─ menu/
│  │  ├─ hub/
│  │  ├─ dialogs/
│  │  ├─ result/
│  │  ├─ progress/
│  │  └─ inventory/
│  └─ styles/
├─ editor/
│  ├─ main.ts
│  ├─ EditorApp.vue
│  ├─ stores/
│  ├─ components/
│  └─ services/
└─ deck/
   ├─ main.ts
   ├─ DeckApp.vue
   └─ components/
```

图片和音频迁入：

```text
public/images/
public/audio/
```

浏览器 URL 继续使用 `/images/...` 和 `/audio/...`，避免破坏关卡数据、CSS 和存档中的资源引用。

## 8. 分层职责

### 8.1 Vue 界面层

负责：

- 主菜单、主城和关卡列表。
- HUD、Buff、技能冷却和目标进度。
- 教程、知识卡、确认框和 Toast。
- 暂停、死亡和通关结算。
- 存档、排行榜、成就和图鉴。
- 技能树、装备和背包。
- 自定义关卡和 AI 生成界面。
- 地图编辑器和展示页。

不负责：

- 玩家和敌人位置。
- 每帧物理。
- 碰撞判定。
- 相机移动。
- 粒子和子弹。
- Phaser Actor 生命周期。

### 8.2 Pinia 状态层

Pinia 保存：

- 当前界面与弹窗状态。
- HUD 只读快照。
- 玩家档案、等级、经验和昵称。
- 关卡解锁、星级和成就。
- 存档栏位摘要。
- 自定义关卡列表。
- AI 请求的加载、成功和错误状态。

Pinia 不保存：

- Phaser Scene。
- Phaser Game。
- Phaser Actor。
- 敌人、子弹和粒子的逐帧坐标。
- 物理 Body。

### 8.3 TypeScript 领域层

领域层保存与渲染引擎无关的规则：

- 关卡格式和瓦片定义。
- 通关评分。
- 成就判断。
- 排行榜排序。
- 存档迁移。
- 记忆细胞加成。
- 自适应难度规则。
- 自定义关卡编解码和安全校验。

领域层不能导入 Vue、Pinia 或 Phaser，因此可以在 Node/Vitest 环境直接测试。

### 8.4 Phaser 游戏层

Phaser 负责：

- Scene 生命周期。
- 游戏时间步和暂停/恢复。
- Sprite、动画和显示顺序。
- 玩家、敌人、Boss、道具和子弹。
- Arcade Physics 碰撞。
- TileMap 或等价瓦片实体。
- 相机跟随、边界、缩放和震动。
- 键盘、手柄和触摸输入扩展点。
- 游戏音频、Tween 和粒子。

特殊业务规则继续放在本项目的系统类中，不直接堆进 `LevelScene.update()`。

## 9. 引擎抽象接口

Vue 只依赖 `GameEngine`：

```ts
export interface GameEngine {
  mount(host: HTMLElement): Promise<void>
  destroy(): void
  loadLevel(levelId: string, options: LoadLevelOptions): Promise<void>
  pause(): void
  resume(): void
  retry(): void
  quitLevel(): void
  setTwoPlayer(enabled: boolean): void
  dispatch(command: GameCommand): void
  subscribe<K extends keyof GameEngineEventMap>(
    event: K,
    listener: GameEngineEventMap[K]
  ): () => void
}
```

命令使用判别联合：

```ts
export type GameCommand =
  | { type: 'input'; player: 1 | 2; action: PlayerAction; pressed: boolean }
  | { type: 'select-cell'; player: 1 | 2; cell: CellType }
  | { type: 'close-tutorial' }
  | { type: 'close-knowledge-card' }
  | { type: 'pause' }
  | { type: 'resume' }
```

事件使用明确载荷：

```ts
export interface GameEngineEventMap {
  'state-changed': (state: GameScreenState) => void
  'hud-updated': (snapshot: HudSnapshot) => void
  'tutorial-opened': (tutorial: TutorialViewModel) => void
  'knowledge-opened': (card: KnowledgeCardViewModel) => void
  'level-completed': (result: LevelResult) => void
  'player-died': (result: DeathResult) => void
  'toast-requested': (toast: ToastViewModel) => void
  'fatal-error': (error: EngineFailure) => void
}
```

规则：

1. Vue 不能通过 `ref` 取得并修改 Phaser Scene。
2. 事件载荷必须是普通只读数据，不传 Phaser 对象。
3. `subscribe()` 必须返回取消订阅函数。
4. Vue 组件卸载时取消全部订阅并调用 `destroy()`。
5. 引擎事件必须在适配层转换为领域类型。

## 10. Vue 与 Phaser 数据流

```text
用户点击或键盘输入
→ Vue Action / Input Adapter
→ GameCommand
→ PhaserGameEngineAdapter
→ Phaser Scene / Actor / System
→ 引擎状态变化
→ 类型化 Engine Event
→ Pinia Action
→ Vue 组件重新渲染
```

高频状态处理：

- Phaser 内部保持 60 FPS 或其稳定时间步。
- HUD 沿用当前节奏，每 6 帧或在重要状态变化时发布快照。
- 玩家位置、敌人位置和粒子不发布给 Vue。
- 暂停、死亡、通关、教程和知识卡立即发布事件。
- Vue 更新延迟不能影响物理模拟。

## 11. Phaser 场景设计

### 11.1 `BootScene`

- 设置缩放、像素化渲染和全局引擎配置。
- 注册场景级服务。
- 不加载大型资源。

### 11.2 `PreloadScene`

- 加载 Sprite、头像、音频和关卡所需资源。
- 发布加载进度。
- 资源失败时返回结构化错误。
- 完成后进入 `LevelScene`。

### 11.3 `LevelScene`

- 接收已验证的 `LevelDefinition`。
- 通过 `LevelFactory` 创建瓦片、玩家、敌人、Boss、NPC 和道具。
- 安装游戏系统。
- 配置碰撞组和相机。
- 将 Phaser 事件转换成领域事件。
- 不读取 Pinia 或操作 DOM。

菜单、主城、排行榜和装备不创建 Phaser Scene，由 Vue 管理。

## 12. 瓦片与关卡迁移

当前字符地图格式继续作为稳定存储格式。

`TileRegistry` 成为字符语义的唯一来源：

```ts
export interface TileDefinition {
  code: string
  category: 'solid' | 'hazard' | 'spawn' | 'item' | 'trigger' | 'visual'
  collision: TileCollision
  create?: TileFactory
  render?: TileRenderer
}
```

它统一管理：

- `#`、`=`、`S`、`B` 等实体地形。
- `^`、`V`、`J` 等机关。
- `P`、`g`、`G`、`t`、`b` 等出生标记。
- `C`、`F`、`N` 等检查点、终点和 NPC。
- 道具、问号方块、碎裂平台和隐藏墙。

兼容规则：

1. 旧字符含义不变。
2. 未识别字符按空白处理并记录警告。
3. 编辑器和游戏共用同一个 `TileRegistry`。
4. 自定义关卡导入后先验证，再交给 Phaser。
5. 旧分享码解码结果必须与迁移前一致。

## 13. Vue 组件设计

游戏入口组件：

```text
GameApp.vue
├─ GameCanvas.vue
├─ MainMenu.vue
├─ HubScreen.vue
├─ GameHud.vue
├─ PauseMenu.vue
├─ TutorialDialog.vue
├─ KnowledgeCard.vue
├─ DeathPanel.vue
├─ CompleteScreen.vue
├─ ConfirmDialog.vue
└─ ToastHost.vue
```

进一步拆分：

```text
hud/
├─ PlayerStatus.vue
├─ EnergyBar.vue
├─ BuffList.vue
├─ SkillBar.vue
└─ ObjectiveProgress.vue

hub/
├─ LevelGrid.vue
├─ LevelCard.vue
├─ CellSelector.vue
└─ DualCellSelector.vue

progress/
├─ SaveSlotPanel.vue
├─ AchievementPanel.vue
├─ LeaderboardPanel.vue
└─ PediaPanel.vue

inventory/
├─ SkillTreePanel.vue
├─ SkillNode.vue
├─ EquipmentPanel.vue
├─ EquipmentSlot.vue
└─ InventoryGrid.vue
```

组件约束：

1. 保留现有关键 ID、CSS class 和中文文案，保障视觉和 Playwright 兼容。
2. 不使用 `v-html` 渲染用户数据。
3. 不生成内联 `onclick`。
4. 列表项使用稳定业务 ID 作为 `key`。
5. 弹窗通过组件事件和 Pinia action 管理。
6. 游戏命令通过注入的 `GameEngine` 发送。

## 14. 编辑器迁移

`editor.html` 迁移为 Vue 页面，并与游戏共享：

- `LevelDefinition`。
- `TileRegistry`。
- `LevelCodec`。
- 自定义关卡存储服务。
- 知识卡和教程类型。
- 安全校验器。

编辑器组件：

```text
EditorApp.vue
├─ EditorToolbar.vue
├─ TilePalette.vue
├─ MapCanvas.vue
├─ LevelMetadataForm.vue
├─ TutorialEditor.vue
├─ KnowledgeCardEditor.vue
├─ PipeSpawnerEditor.vue
├─ ValidationPanel.vue
└─ SaveLevelDialog.vue
```

地图编辑 Canvas 可以使用普通 Canvas API，不需要启动完整 Phaser 游戏。预览功能通过独立 `GameEngine` 实例运行，关闭预览时必须销毁。

## 15. 展示页迁移

`deck.html` 迁移为独立 `DeckApp.vue`：

- 不加载 Phaser。
- 不加载编辑器。
- 图片和文字使用静态 TypeScript 数据或 Vue props。
- 保持现有展示顺序和视觉效果。

## 16. 服务与持久化

服务层不导入 Vue 或 Phaser。

### 16.1 存档

`SaveService`：

- 读取和写入多栏位存档。
- 迁移旧单存档。
- 验证字段并补充默认值。
- 保存前生成当前 schema 版本。
- 解析失败时保留原始字符串并返回安全默认存档。

### 16.2 排行榜与成就

- 排序和成就判断是纯函数。
- Vue 只负责展示。
- Phaser 只发布通关统计。

### 16.3 自定义关卡

- 导入、导出和验证集中在 `LevelCodec`。
- 所有文本按纯文本处理。
- 不能通过动态执行解析关卡。
- 游戏与编辑器使用相同验证路径。

### 16.4 AI 关卡

- `AiLevelService` 封装请求、超时、取消和结果验证。
- API Key 的现有兼容行为在迁移阶段保持；安全升级作为独立产品决策处理。
- AI 输出必须转成 `Result<LevelDefinition, AiLevelError>`。
- Vue 根据结果显示成功或错误，不直接解析未知响应。

## 17. 分阶段迁移策略

### 阶段 0：行为基线

交付：

- 现有测试全部通过的基线记录。
- 关键页面截图。
- 核心移动、跳跃、碰撞、暂停、死亡、通关和存档行为清单。
- 关卡字符、存档和分享码的固定样本。

退出条件：

- 能在旧实现上重复运行核心 Playwright 流程。
- 核心纯规则拥有可重复的特征测试。

### 阶段 1：Vite、Vue 和 TypeScript 外壳

交付：

- Vite 多页面构建。
- 三个 Vue 入口。
- TypeScript 严格配置。
- Pinia、Vitest 和 Vue 测试环境。
- 遗留游戏通过 `LegacyGameEngineAdapter` 暂时挂载。

退出条件：

- `/`、`/editor.html`、`/deck.html` 都能通过 Vite 访问。
- 旧游戏行为没有改变。
- `npm run build` 成功。

### 阶段 2：共享领域和服务迁移

交付：

- 关卡、存档、排行榜、成就、自定义关卡和 AI 服务 TypeScript 化。
- 编辑器和游戏共用领域类型。
- 移除对应全局函数。

退出条件：

- 单元测试覆盖关键纯规则。
- 旧存档和分享码样本通过兼容测试。

### 阶段 3：Vue UI 迁移

交付：

- 主菜单、主城、HUD、弹窗、结算、进度和装备界面组件化。
- Pinia 接管界面状态。
- 移除动态 HTML 字符串和内联事件。
- Vue 仍通过 `LegacyGameEngineAdapter` 驱动旧 Canvas 引擎。

退出条件：

- 现有视觉和操作流程保持。
- Playwright 核心流程通过。
- Vue 组件不读取遗留 `Game` 全局对象。

### 阶段 4：Phaser 技术验证

只迁移一个代表性关卡垂直切片，必须包含：

- 玩家移动、跳跃、蹲下和冲刺。
- 地面、平台、尖刺和弹簧碰撞。
- 一种普通敌人。
- 一种道具。
- 相机跟随和震动。
- HUD 快照。
- 暂停、死亡和退出。

验证指标：

1. 移动速度、跳跃高度和落地响应与旧实现可接受地一致。
2. 关卡字符可直接解析，不修改存储格式。
3. Vue 与 Phaser 之间不存在逐帧响应式同步。
4. Scene 销毁后无键盘监听和动画帧泄漏。
5. Playwright 能完成进入、暂停、退出和重进。

退出条件：

- 上述指标全部通过。
- 未通过时保留 TypeScript 领域层和 Vue UI，停止 Phaser 全量迁移，并继续使用适配后的自研引擎。

### 阶段 5：Phaser 全量迁移

迁移顺序：

```text
关卡解析与瓦片
→ 玩家
→ 普通敌人
→ 道具和问号方块
→ 子弹和临时平台
→ 特殊地形与潮汐
→ Boss 和 NPC
→ 双人和动态相机
→ 粒子、音频和动画
→ 自适应难度与通关统计
```

每个子阶段：

1. 先补特征测试或行为测试。
2. 在旧适配器上验证测试会捕获差异。
3. 实现 Phaser 对应能力。
4. 在新适配器上运行同一测试。
5. 通过后再迁移下一项。

退出条件：

- 六个内置关卡可进入和完成。
- 自定义关卡可加载。
- 单人和双人核心流程通过。
- Vue 只使用 `PhaserGameEngineAdapter`。

### 阶段 6：编辑器与展示页迁移

交付：

- 编辑器 Vue 化并使用共享类型。
- 展示页 Vue 化。
- 编辑器保存的地图可由 Phaser 加载。

退出条件：

- 编辑器存储、安全和核心流程测试通过。
- 展示页生产构建可独立加载。

### 阶段 7：遗留清理和正式切换

删除：

- 旧 `<script>` 顺序加载。
- `window.*` 游戏接口。
- 内联事件处理。
- `js/game.js` 遗留入口。
- 已迁移的 `config.js`、`entities.js`、`levels.js`、`sprites.js` 和 `ai-levels.js`。
- `LegacyGameEngineAdapter`。

退出条件：

- 全仓库不再引用遗留脚本。
- 生产构建和完整测试通过。
- `dist/` 可由生产服务器托管。

## 18. 旧文件到新模块映射

| 旧文件/区域 | 新位置 |
|---|---|
| `js/config.js` 常量 | `src/shared/constants/` |
| `js/config.js` 存档和进度 | `src/shared/services/`、Pinia stores |
| `js/config.js` 运行时状态 | Phaser Scene 和领域快照 |
| `js/entities.js` | `src/game/engine/actors/` |
| `js/levels/level*.js` | `src/game/engine/level/data/` |
| `js/levels.js` | `LevelRepository`、领域服务 |
| `js/sprites.js` | `PreloadScene`、Actor 动画配置 |
| `js/ai-levels.js` | `AiLevelService`、`LevelCodec` |
| `game.js` 的 `Level` | `LevelParser`、`TileRegistry`、`LevelFactory` |
| `game.js` 输入 | Phaser Input Adapter |
| `game.js` 循环 | Phaser Scene 生命周期 |
| `game.js` 相机和渲染 | Phaser Camera、Actor 和 TileMap |
| `game.js` HUD/UI | Vue 组件和 Pinia |
| `game.js` 存档/排行/成就 | TypeScript 服务和 Vue 面板 |
| `editor.html` 内联脚本 | `src/editor/` |
| `deck.html` | `src/deck/` |

## 19. 测试设计

### 19.1 Vitest 领域测试

必须覆盖：

1. 地图字符解析。
2. 未知字符降级。
3. 关卡定义验证。
4. 碎裂平台状态转换。
5. 潮汐周期和预警。
6. 管道刷怪触发规则。
7. 通关星级和完美通关。
8. 记忆细胞加成。
9. 自适应难度。
10. 存档迁移和损坏恢复。
11. 排行榜排序。
12. 成就判定。
13. 自定义关卡导入、导出和安全校验。
14. AI 结果验证和错误映射。
15. `GameEngine` 事件订阅和取消订阅。

### 19.2 Vue 组件测试

必须覆盖：

- HUD 根据快照更新。
- 低生命和低能量样式。
- 菜单和弹窗状态转换。
- 关卡锁定和星级显示。
- 单人和双人细胞选择。
- 存档选择和删除确认。
- 排行榜与成就列表。
- 技能升级按钮状态。
- 装备和卸下操作。
- 用户输入按纯文本展示。

### 19.3 Phaser 集成测试

通过可控制时间或测试 Scene 覆盖：

- 玩家生成位置。
- 地形碰撞。
- 检查点激活。
- 死亡和重生。
- 敌人、Boss 和子弹碰撞组。
- 相机边界和双人缩放。
- Scene 暂停、恢复和销毁。
- 引擎事件转换。

### 19.4 Playwright 端到端测试

保留并扩展：

- 新游戏、主城、进入关卡。
- 暂停、恢复和退出。
- 图鉴、成就、排行和存档。
- 单人和双人模式。
- 死亡、重试和检查点。
- 通关和结算。
- 自定义关卡导入和运行。
- 地图编辑器创建、保存和重新载入。
- XSS 和恶意关卡数据回归。
- `/`、`/editor.html`、`/deck.html` 无未捕获异常。

### 19.5 构建验证

最终命令：

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:component
npm test
npm run build
npm run preview
```

`preview` 由 Playwright 冒烟测试访问，验证生产构建而非只验证开发服务器。

## 20. 错误处理

### 引擎错误

- Scene 创建或更新异常由适配器转换成 `EngineFailure`。
- 致命错误停止当前 Scene，Vue 显示错误面板和返回主城操作。
- 不允许错误循环每帧持续打印。

### 资源错误

- 必需资源失败时阻止进入关卡并显示资源名。
- 非必需音频失败时静音降级，不阻止游戏。
- 加载超时可重试或返回主城。

### 存储错误

- JSON 解析失败使用安全默认值。
- 原始损坏数据保留在独立备份键中。
- `localStorage` 不可用时允许本次会话运行，并提示无法保存。

### AI 错误

- 超时、网络、未授权、限流和格式错误使用不同错误码。
- Vue 只显示安全、可理解的错误文案。
- 未验证数据不进入关卡仓库。

## 21. 安全约束

1. 不使用 `eval`、`Function` 或脚本标签解析关卡。
2. 不使用 `v-html` 展示用户关卡、昵称、排行榜或 AI 文本。
3. 分享码导入后必须通过 schema 验证。
4. 剪贴板失败提供显式错误或安全降级。
5. DeepSeek Key 不记录到日志、错误事件或构建产物。
6. Vite 环境变量中的客户端变量不能被当作秘密。
7. Phaser 资源 URL 来自受控资源清单，不接受任意脚本 URL。

## 22. 性能约束

1. Phaser 按稳定时间步运行，Vue 不参与逐帧更新。
2. HUD 快照最多按现有每 6 帧频率发布。
3. 粒子、子弹和迷你敌人使用对象池或数量上限。
4. Vue 组件不保存 Phaser 对象为响应式状态。
5. 资源按场景加载，共享资源只加载一次。
6. Scene 销毁时清理输入、事件、计时器、Tween 和音频。
7. 双人动态缩放不能触发 DOM 布局计算。

## 23. 风险与回退

### 风险：物理手感变化

控制：

- 记录旧实现移动速度、跳跃高度、落地时间和冲刺距离。
- Phaser 参数以这些基线为验收目标。
- 必要时使用自定义速度控制，不完全依赖默认物理响应。

### 风险：一次迁移范围过大

控制：

- Vue 与引擎通过接口分离。
- 先完成领域和 UI，再验证 Phaser。
- Phaser 垂直切片未通过时停止全量迁移。

### 风险：双运行时长期共存

控制：

- `LegacyGameEngineAdapter` 只存在于迁移阶段。
- 阶段 7 必须删除它。
- 不允许新功能同时实现两份。

### 风险：存档或关卡不兼容

控制：

- 固定旧存档和分享码样本。
- 每个 schema 变化提供迁移函数。
- 保存新格式前完成往返测试。

### 风险：Vue 与 Phaser 状态重复

控制：

- Phaser 是游戏运行时唯一事实来源。
- Pinia 只保存界面和只读快照。
- 所有修改通过命令接口进入引擎。

### 回退策略

- 每个阶段形成独立可运行提交。
- Phaser 技术验证失败时，保留 Vite、Vue、TypeScript 和 `GameEngine` 接口，继续使用 TypeScript 化自研引擎。
- 正式切换前不删除遗留脚本。
- 删除遗留实现前生成可恢复 Git 提交。

## 24. 验收标准

迁移完成必须同时满足：

1. 三个页面均由 Vue 3 挂载。
2. 前端业务和游戏代码均为 TypeScript ES Modules 或 Vue SFC。
3. HTML 不包含业务脚本和内联事件。
4. 不再依赖全局 `Game`、全局类或 `window.*` 游戏函数。
5. Vue 组件不直接导入 Phaser Scene 或 Actor。
6. 六个内置关卡可加载。
7. 旧自定义关卡和分享码可继续使用。
8. 旧存档可自动迁移。
9. 单人和双人核心流程可运行。
10. 视觉布局、关键文案和操作流程基本不变。
11. 现有 Playwright 测试通过，并新增 Phaser 和 Vue 覆盖。
12. TypeScript 严格检查无错误。
13. 单元测试、组件测试、端到端测试和生产构建全部通过。
14. Scene 多次进入和退出后不存在重复循环或键盘监听。
15. 生产 `dist/` 可由服务器直接托管。
16. 遗留前端脚本和 `LegacyGameEngineAdapter` 已删除。

## 25. 迁移文档产物

除本设计文档外，实施阶段必须维护：

```text
docs/migration/
├─ behavior-baseline.md
├─ engine-contract.md
├─ level-format-compatibility.md
├─ save-schema-migration.md
├─ phaser-spike-results.md
├─ rollout-checklist.md
└─ rollback-guide.md
```

每个文档记录实际结果，不复制计划文本：

- 基线数据和截图。
- 真实接口和事件表。
- 旧数据兼容样本。
- Phaser 技术验证测量结果。
- 每阶段完成条件。
- 正式切换和回退操作。

## 26. 决策摘要

最终架构：

```text
Vue 3 + Pinia
  └─ 页面、HUD、菜单、弹窗、进度、编辑器

TypeScript 领域与服务
  └─ 关卡、存档、排行、成就、AI、安全校验

Typed GameEngine Bridge
  └─ 命令、事件、只读快照、生命周期

Phaser
  └─ Scene、Actor、碰撞、相机、输入、资源、动画、音频、粒子

Vite + Vitest + Playwright
  └─ 开发、构建、单元、组件和端到端验证
```

迁移顺序：

```text
行为基线
→ Vite/Vue/TypeScript 外壳
→ 领域与服务
→ Vue UI
→ Phaser 单关垂直切片
→ Phaser 全量迁移
→ 编辑器与展示页
→ 删除遗留实现
```

这是一次分阶段替换。任何阶段都必须先满足退出条件，再进入下一阶段；不能以“最终会迁移”为由长期保留两套状态源或两套游戏运行时。
