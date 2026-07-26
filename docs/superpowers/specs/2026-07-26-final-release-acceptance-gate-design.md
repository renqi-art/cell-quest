# 《细胞远征》最终发布与评委交付双验收门

## 1. 目的

本手册用于《细胞远征》全部获批架构迁移、功能优化、Phaser 迁移、质量打磨和评分材料完成后的最终验收。

验收分为两个独立门：

- **Gate A：发布候选技术验收**
  - 判断候选版本是否达到可发布的软件质量。
- **Gate B：评委交付验收**
  - 判断证据、在线/离线包和四分钟演示是否达到比赛交付要求。

只有两个 Gate 都为 `PASS`，最终结论才能是：

```text
RELEASE APPROVED
```

其它最终结论：

- `RELEASE REJECTED`：存在可复现缺陷，不允许发布。
- `RELEASE BLOCKED`：候选版本、环境或交接信息不足，无法完成验收。

计划文档、局部实现、模拟成功结果或“应该可用”都不能代替本手册要求的证据。

---

## 2. 权威资料

最终验收前必须完整阅读：

- `docs/superpowers/specs/2026-07-26-vue-phaser-typescript-migration-design.md`
- `docs/superpowers/specs/2026-07-26-migration-agent-orchestration-design.md`
- `docs/superpowers/plans/2026-07-26-score-improvement-roadmap.md`
- `docs/superpowers/plans/2026-07-26-quality-balance-release.md`
- `docs/superpowers/plans/2026-07-26-evidence-demo-scoring.md`
- `docs/superpowers/specs/2026-07-26-phase-1-acceptance-gate-design.md`
- 当前仓库中所有后续架构修订、替代声明和已批准实施计划。

旧计划中被 `Architecture amendment`、`Superseded` 或更新计划替代的文件路径不得作为最终实现标准。最终验收以实际 TypeScript、Vue、Phaser、Node 服务和最新测试为准。

---

## 3. 验收角色与职责隔离

建议至少分配：

1. **总验收智能体**
   - 管理候选版本、证据、结论和最终报告。
2. **技术验收子智能体**
   - 执行 Gate A 自动化与静态架构审查。
3. **人工 QA 子智能体**
   - 完成六关单人、双人、自定义关卡和可访问性矩阵。
4. **交付验收子智能体**
   - 执行 Gate B 证据、在线、离线和演示验收。
5. **独立审查子智能体**
   - 检查验收报告是否遗漏、夸大或引用错误证据。

子智能体可以复用，但实现者不能独自签发自己代码的最终 `PASS`。

### 验收智能体允许

- 读取代码、文档、Git、构建产物和测试结果。
- 在隔离的干净候选目录中安装依赖、构建、运行测试。
- 启动开发、预览、在线或离线演示。
- 记录截图、视频、性能指标和人工 QA 结果。
- 输出验收报告。

### 验收智能体禁止

- 在验收过程中修改生产代码或测试以让结果通过。
- 暂存、提交、打标签、推送或合并。
- 删除、还原或覆盖用户及其它线程的工作。
- 把无法验证的项目写成已实现。
- 把本地规则回退描述为在线 AI。
- 伪造、补写或改造成虚假原始 AI 对话。
- 用开发者工具、测试钩子或状态注入完成人工通关。

发现缺陷后，验收智能体只报告证据。修复必须交还实施智能体，并生成新的候选提交。

---

## 4. 候选版本交接

实施负责人必须提供：

- 候选提交 SHA。
- 候选版本号。
- 候选本地 tag。
- 本轮提交范围。
- 上一个候选或基准 SHA。
- 已完成的架构和功能阶段。
- 已运行的测试及退出码。
- 六关人工 QA 记录。
- 在线地址。
- 离线包路径和 SHA-256。
- 演示视频、截图和脚本。
- 已知限制。
- 当前工作区中需要保留的无关改动。

验收智能体首先运行：

```powershell
git rev-parse HEAD
git log -15 --oneline --decorate
git status --short
node --version
npm --version
```

### 直接判定 `BLOCKED`

- 没有稳定候选 SHA。
- 实施智能体仍在修改候选代码。
- 两个写入型智能体仍在修改相同文件。
- 候选 SHA 与交接内容不一致。
- 无法获得必需依赖或浏览器环境。
- 在线或离线验收环境完全不可用。
- 没有明确的无关工作区改动清单。

---

## 5. 隔离验收环境

最终验收不得直接在仍有其它智能体写入的共享工作区运行 `npm ci` 或发布打包。

推荐流程：

1. 冻结候选 SHA。
2. 创建独立、干净、detached 的 Git worktree 或等价候选目录。
3. 在隔离目录中执行 `npm ci`、构建、测试和打包。
4. 不从共享工作区复制 `node_modules`、`dist`、测试结果或未提交文件。
5. 验收结束后保留报告所需的提交、hash 和产物信息。

在隔离目录确认：

```powershell
git rev-parse HEAD
git status --short
```

预期：

- `HEAD` 等于候选 SHA。
- 首次测试前工作区干净。
- 验收过程中只出现明确的构建、报告和打包生成物。

如果候选依赖未提交文件才能运行，Gate A 为 `FAIL`。

---

# Gate A：发布候选技术验收

## A1. 提交范围与版本冻结

运行：

```powershell
git diff --stat $BaseSha..$CandidateSha
git diff --name-status $BaseSha..$CandidateSha
git log --oneline $BaseSha..$CandidateSha
git show --stat --oneline $CandidateSha
```

验收：

- 每个提交表达一个清晰目的。
- 架构、功能、测试、文档和发布改动可追踪。
- 没有 API Key、`.env`、个人文件、数据库、日志或整仓压缩包。
- 没有 `audit/`、关卡备份或其它线程未授权改动。
- 版本号、CHANGELOG 和候选 tag 一致。
- 候选 tag 指向候选 SHA。
- 候选发布后没有继续修改同一版本号。

范围污染或版本不一致判定 `FAIL`。

---

## A2. 依赖与可复现安装

在隔离候选目录运行：

```powershell
npm ci
```

预期：

- 退出码 `0`。
- `package-lock.json` 不发生变化。
- 不依赖共享工作区中的全局包或未提交文件。
- 所有直接依赖使用精确版本。

检查精确版本：

```powershell
node -e "const p=require('./package.json');const all={...(p.dependencies||{}),...(p.devDependencies||{})};const bad=Object.entries(all).filter(([,v])=>/^[~^*]|\bx\b/i.test(v));if(bad.length){console.error(bad);process.exit(1)}console.log('exact versions:',Object.keys(all).length)"
```

如果 `npm ci` 因网络不可用失败，但离线依赖包是正式交付的一部分，可记录为 `BLOCKED`，不能假定通过。

---

## A3. 强制自动化命令

按顺序执行并记录退出码、测试数量、通过、失败和跳过数量：

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run test:component
npm run test:server
npm test
npm run build
npm run validate:content
npm run validate:evidence
npm run report:tests
```

如项目提供 `npm run test:all`，额外运行：

```powershell
npm run test:all
```

规则：

- 任一强制命令非零退出即为 `FAIL`。
- 必需脚本不存在即为 `FAIL`。
- 不能通过删除断言、跳过测试或降低预算获得 `PASS`。
- `docs/evidence/TEST_REPORT.md` 必须记录当前候选 SHA。
- 测试报告必须列出实际跳过项；关键测试不允许跳过。

---

## A4. 开发、预览与生产入口

必须分别验证：

- Vite 开发服务器。
- Vite 生产构建和 `preview`。
- 最终 Node/托管服务器。
- 离线包中的启动方式。

页面：

```text
/
/editor.html
/deck.html
```

接口：

```text
/healthz
/levels
/save
/reset
AI导演接口
病例生成接口
排行榜或每日病例接口
```

验收：

- 页面与接口符合预期状态码。
- 所有引用的 JS、CSS、图片、字体和音频无 404。
- 浏览器无 `pageerror`、未处理 Promise rejection 或阻塞级控制台错误。
- 开发环境与生产环境路由一致。
- `/save`、`/reset` 保持文件名白名单、JSON 和路径安全约束。
- HTML 不包含业务脚本、动态业务 HTML 构造或内联事件。
- 三个页面都由 Vue 负责 DOM UI。

生产 `preview` 必须至少完成一轮 Playwright 冒烟，不能只验证开发服务器。

---

## A5. 架构终态

静态审查：

```powershell
rg -n "LegacyGameEngineAdapter|CellQuestLegacy|window\.Game|\bGame\." src index.html editor.html deck.html
rg -n "from.+(vue|pinia|phaser)" src/shared
rg -n "v-html|onclick=|onchange=|oninput=" src index.html editor.html deck.html
```

最终验收要求：

- 前端业务和游戏代码为 TypeScript ES Modules 或 Vue SFC。
- Vue 不导入 Phaser Scene 或具体游戏实体。
- Vue 与 Phaser 只通过稳定 `GameEngine` 通信。
- Phaser 负责场景、物理、渲染和逐帧状态。
- Pinia 只保存低频 UI、设置和会话展示状态。
- `src/shared` 不依赖 Vue、Pinia 或 Phaser。
- `LegacyGameEngineAdapter`、`window.CellQuestLegacy` 和经典业务脚本已无消费者并安全移除。
- 旧 `game.js` 不再作为运行时入口。
- HTML 只保留结构、挂载点和模块入口。
- 订阅、键盘、定时器和 Scene 生命周期有明确清理。

如果项目明确采用“停止 Phaser 全量迁移并保留适配后的自研引擎”回退决策，必须有用户批准和失败验收记录；不得同时宣称已完成 Phaser 终态。

---

## A6. 六个官方病例人工 QA

每个官方病例必须在没有开发者工具、测试钩子或状态注入的情况下完成单人通关。

记录矩阵：

| 病例 | 主控细胞 | AI在线阶段1/2 | 本地回退阶段1/2 | 目标可达 | 失败可恢复 | 报告正确 | 时间 | 死亡 | 分数 | 控制台错误 | 视觉问题 | 结果 |
|---|---|---|---|---|---|---|---:|---:|---:|---|---|---|
| 1 | | | | | | | | | | | | |
| 2 | | | | | | | | | | | | |
| 3 | | | | | | | | | | | | |
| 4 | | | | | | | | | | | | |
| 5 | | | | | | | | | | | | |
| 6 | | | | | | | | | | | | |

每关验收：

- 病例目标和患者指标正确。
- 终点不会绕过病例目标直接通关。
- 红细胞、白细胞职责符合设计。
- AI 危机的阶段、来源标识和回退正确。
- 失败后可以重试或退出。
- 通关报告与实际事件一致。
- 知识卡和文案无乱码。
- 没有软锁、不可达目标、错误状态或资源缺失。

发布要求六关全部 `PASS`。

---

## A7. 双人和角色交换

至少选择一个代表性病例完成：

- 双人进入。
- 红白细胞职责分离。
- 完整病例目标。
- 角色交换后重新通关。
- 动态相机。
- 双方伤害、死亡和重试。
- 暂停、退出和重进。
- 最终协作报告。

记录：

| 病例 | 初始P1/P2 | 交换后P1/P2 | 目标 | 相机 | 死亡/重试 | 报告 | 结果 |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

任一核心双人流程失败为 `FAIL`。

---

## A8. 病例设计器和 UGC 闭环

人工执行完整流程：

```text
新建病例
→ 手动编辑
→ 撤销/重做
→ 保存草稿
→ 校验和可达性检查
→ 试玩
→ 返回诊断
→ 修复
→ 发布
→ 导出 CQ2
→ 新存档导入
→ 再次试玩并通关
```

额外验证：

- 模板、手动、AI 和导入都生成同一 `CaseDraft`。
- 无效草稿可以本地保存，但不能发布或分享。
- AI 补丁需要用户确认并可撤销。
- `CQ!` 安全导入经典模式。
- `CQ2!` 往返保持允许字段一致。
- 用户文本不通过 `v-html` 渲染。
- 导入不能注入 JS、HTML、路径或未知对象。
- 编辑器保存的地图可由 Phaser 加载。

---

## A9. 旧数据兼容

使用固定样本验证：

- 旧存档自动迁移。
- 原 localStorage key 兼容或有明确迁移。
- 六个旧关卡可解析。
- 旧自定义关卡可加载。
- 旧 `CQ!` 分享码可导入。
- 新 `CQ2!` 可导出、导入和重放。
- 旧成就、排行榜、牌组、难度和进度不会静默丢失。

兼容测试必须是自动化固定样本，不得只口头确认。

数据丢失、错误覆盖或无法回退为 P0。

---

## A10. AI 安全与回退

验证在线与本地两条路径：

### 在线

- 服务端校验输入。
- 客户端不直接持有 API Key。
- 超时、限流和错误有明确状态。
- 模型输出再次通过 schema 和白名单。
- AI 只返回病例蓝图、危机或允许的病例补丁。
- AI 不能返回可执行 JavaScript、HTML 或未经验证的最终地图。

### 本地回退

- 在线超时后自动或明确切换。
- UI 显示“本地导演”或等价来源。
- 同一病例可以继续。
- 固定 seed 可复现演示。
- 本地回退不被描述为在线 AI。

### 对抗输入

- 超长文本。
- HTML/脚本。
- 路径片段。
- 未知节点。
- 越权病例补丁。
- 非法数值。
- 提示注入式内容。

任何秘密泄漏、代码执行、路径越界或未经确认的破坏性补丁为 P0。

---

## A11. Phaser 手感、稳定性与资源清理

验证：

- 移动速度、跳跃高度、落地响应和冲刺手感符合已批准标准。
- 地面、平台、尖刺、弹簧、敌人、道具、子弹和特殊地形碰撞正确。
- 相机跟随、震动和双人动态相机正确。
- 资源加载失败有可见错误。
- 暂停时游戏循环、输入和计时一致。
- Scene 连续进入、退出和重进至少 20 次。
- 销毁后没有重复键盘监听、计时器、事件订阅、动画帧或音频实例。
- 实体集合、粒子、子弹和临时对象不会无限增长。
- Vue 与 Phaser 不进行逐帧响应式同步。

相同 Playwright 行为测试必须能运行在最终 `PhaserGameEngineAdapter` 上。

---

## A12. 性能预算

记录验收机器：

- CPU。
- 内存。
- 操作系统。
- 浏览器及版本。
- 分辨率。
- 当前 Phaser 版本。
- 候选 SHA。

场景：

- 普通病例运行 30 秒。
- 最大支持感染点。
- 活跃 AI 危机。
- 自动粒子。
- 20 个敌人。
- 双人动态相机。

预算：

- 正常场景目标 60 FPS。
- 压力场景 1% 低帧不低于 45 FPS。
- median frame `<= 16.7ms`。
- 正常场景 p99 `<= 22.2ms`。
- 压力场景 p99 `<= 33.3ms`。
- 没有无界实体集合增长。

运行：

```powershell
npx playwright test tests/performance.spec.js
```

性能报告必须注明机器和运行时，不能拿 legacy 与 Phaser 结果混合作为同一基线。

---

## A13. 可访问性、视觉和音频

验收：

- 逻辑画布 `800×480`，CSS 保持 `5:3`。
- 主菜单、病例中心、简报、游戏、危机、暂停、失败、报告、编辑器和设置无溢出。
- 所有菜单可用键盘完成。
- 焦点清晰可见。
- 核心状态不只依赖颜色。
- 中文文本没有 `�` 或乱码。
- 字体、间距、按钮状态、图标和面板语言一致。
- `prefers-reduced-motion: reduce` 时取消震动、闪烁和非必要过渡。
- 首屏交互前不自动播放音频。
- 音效、语音和音乐有独立可理解的设置。
- 关键提示时间足够阅读。

建议在 `1920×1080`、目标比赛设备和至少一种较低性能设备上检查。

---

## A14. 安全与隐私

运行现有安全测试，并人工检查：

- `.git`、`.env`、API Key、个人路径、邮箱和本地数据库不暴露。
- 路径穿越和非法文件名被拒绝。
- 请求体大小和 Content-Type 被限制。
- 分享码和导入数据先解析后使用。
- 用户文本使用安全插值。
- AI 请求最小化病例上下文。
- 排行榜只保存批准字段。
- 截图、视频和报告完成隐私脱敏。
- 离线包不含开发日志、测试结果、缓存或秘密。

任何秘密暴露或任意文件写入为 P0。

---

## A15. 缺陷等级

- **P0**
  - 崩溃、数据丢失、秘密泄漏、任意代码执行、任意文件写入、无法完成病例。
- **P1**
  - 错误病例目标、误导患者状态、核心控制失效、存档或分享不兼容、双人主流程失败、AI 来源错误。
- **P2**
  - 不影响进度的视觉、音频、文案或轻微性能问题。

Gate A 要求：

- P0：`0`
- P1：`0`
- P2：有明确记录、影响、回避方式和处理计划。

---

## A16. Gate A 结论

`PASS` 条件：

1. 隔离环境可复现安装。
2. 所有强制命令退出码为 `0`。
3. 开发、生产预览、在线和离线路径可用。
4. 架构达到最终边界。
5. 六关单人全部通过。
6. 至少一个病例双人和角色交换通过。
7. 病例设计器与 UGC 闭环通过。
8. 旧数据兼容通过。
9. AI 在线、安全和本地回退通过。
10. Phaser 手感、生命周期和性能通过。
11. 可访问性、视觉、音频和隐私通过。
12. P0/P1 为零。

Gate A 结论只能是：

```text
GATE A: PASS
GATE A: FAIL
GATE A: BLOCKED
```

Gate A 未通过时不得开始 Gate B 最终签发；可以提前准备证据，但不得宣称发布候选合格。

---

# Gate B：评委交付验收

## B1. Gate A 前置

记录：

- Gate A 报告路径。
- Gate A 签发者。
- 候选 SHA。
- 候选 tag。
- 签发时间。

Gate A 不是 `PASS` 时，Gate B 最终结论必须为 `BLOCKED`。

---

## B2. 证据真实性

必须存在：

```text
AI_DEVELOPMENT.md
docs/evidence/README.md
docs/evidence/evidence-index.json
docs/evidence/TEST_REPORT.md
docs/evidence/SCORING_CROSSWALK.md
docs/evidence/case-studies/
docs/evidence/screenshots/
docs/evidence/RELEASE_EVIDENCE.md
```

运行：

```powershell
node --test tests/evidence-validation.test.cjs
npm run validate:evidence
npm run report:tests
```

验收：

- 每条证据 ID 唯一。
- artifact 真实存在。
- commit 至少七位十六进制且可由 Git 定位。
- claim、人工判断和验证方式不为空。
- 证据路径不离开仓库。
- 测试报告记录候选 SHA。
- 无法导出的对话标记“未归档”。
- 不补写、不伪造历史原文。
- 运行时 AI 与开发协作 AI 分开说明。
- 不把计划文档写成已经实现。

证据失真为 P0 交付问题。

---

## B3. 八项评分映射

`docs/evidence/SCORING_CROSSWALK.md` 必须为每个评分模块提供：

- 一句话主张。
- 已实现功能。
- 现场演示时刻。
- 源文件。
- 测试。
- 提交。
- 截图或视频备用。
- 诚实说明的已知限制。

模块：

1. AI 方向。
2. 玩法方向。
3. 产品方向。
4. 玩家方向。
5. 行业方向。
6. 主题契合度。
7. AI 使用情况。
8. 游戏质量。

每条证据必须能在 60 秒内打开。

禁止夸大：

- 本地回退不是在线 AI。
- AI 生成蓝图，不是未经验证即可执行的代码。
- 分享码不是云社区。
- 分数不是临床指标。
- 哈希证明不是反作弊。

---

## B4. 最终测试报告

`docs/evidence/TEST_REPORT.md` 必须包含：

- 生成时间。
- 候选 SHA 和 tag。
- Node、浏览器和操作系统。
- TypeScript 结果。
- ESLint 结果。
- Vitest 领域测试。
- Vue 组件测试。
- Node 服务端测试。
- Playwright 测试。
- 内容验证。
- 证据验证。
- 生产构建。
- 六关人工 QA。
- 性能指标。
- 总数、通过、失败和跳过。
- 精确复现命令。

报告中的 SHA 与 Gate A 不一致为 `FAIL`。

---

## B5. 在线演示

记录：

- 正式 URL。
- `/healthz` 结果。
- 部署时间。
- 候选 SHA/tag。
- 浏览器和设备。

冒烟：

- 首页。
- 病例中心。
- 一个代表性病例。
- AI 在线路径。
- 本地回退。
- 病例报告。
- 病例设计器。
- CQ2 导出。
- 展示页。
- 所有演示资源。

在线版本必须与候选 SHA 对应。无法证明部署版本时为 `FAIL`。

---

## B6. 离线包

离线包必须由白名单打包器生成，不得递归压缩整个工作区。

必须包含：

- 应用文件。
- 启动所需生产依赖。
- 本地 AI 导演或确定性回退。
- 演示存档导入说明。
- 启动脚本。
- manifest。
- 文件 SHA-256。

不得包含：

- `.git`。
- `.env`。
- API Key。
- 用户数据库。
- 开发日志。
- 测试缓存。
- `audit/` 私有材料。
- 无关工作区文件。

运行：

```powershell
node --test tests/offline-demo.test.cjs
```

记录：

```powershell
Get-FileHash -Algorithm SHA256 $OfflinePackage
```

在未安装开发依赖的干净环境解压、启动并完成代表性病例。

---

## B7. 故障切换

`docs/demo/FAILOVER_RUNBOOK.md` 必须覆盖：

```text
在线 AI 正常
→ 继续现场演示

在线 AI 超时
→ 指出“本地导演”来源
→ 继续同一病例

公共站点不可用
→ 启动离线包
→ 打开 localhost

本地运行时不可用
→ 播放 90 秒录制演示
→ 使用编辑器和证据备用截图
```

要求：

- 公共站点失败后 30 秒内切换离线包。
- 离线包失败后可以立即切换视频。
- 讲解者明确说明当前 AI 来源。
- 切换不会暴露 API Key 或私人路径。

---

## B8. 四分钟演示

必须存在：

- `docs/demo/LIVE_DEMO_SCRIPT.md`
- `docs/demo/DEMO_STATE.md`
- 展示页。
- 演示视频。
- 备用截图。
- 确定性演示存档。

推荐时间：

| 环节 | 时间 |
|---|---:|
| 患者与问题 | 20s |
| 核心病例循环 | 25s |
| AI 病情导演 | 35s |
| 玩法与双人协作 | 100s |
| 病例报告和知识 | 30s |
| AI 生成、编辑、CQ2 分享 | 25s |
| AI 开发协作证据 | 25s |
| 社会价值、质量与总结 | 20s |

目标：

- 正常演示约 4 分钟。
- 硬上限 4 分 30 秒。
- 脚本注明点击、按键、画面状态和讲解词。
- 到 3:30 时有明确可跳过内容。
- 不在生产环境嵌入假在线 AI 结果。

---

## B9. 三次彩排

至少连续完成三次。

| 次数 | 模式 | 总时间 | 在线AI | 是否切换 | 切换时间 | 卡顿/犹豫 | 错误 | 结果 |
|---|---|---:|---|---|---:|---|---|---|
| 1 | 正常在线 | | | | | | | |
| 2 | AI超时回退 | | | | | | | |
| 3 | 公网站点失败/离线 | | | | | | | |

每次必须：

- 小于 4 分 30 秒。
- 完成关键价值证明。
- 正确说明 AI 来源。
- 没有阻塞故障。
- 证据能在 60 秒内打开。

任一次失败都必须重新开始连续三次计数。

---

## B10. 评委交付目录

提供单一入口，建议为：

```text
docs/evidence/README.md
```

从该入口在 60 秒内可以找到：

- 游戏一句话介绍。
- 在线 URL。
- 离线包及 hash。
- 90 秒视频。
- 四分钟脚本。
- 八项评分映射。
- 测试报告。
- 六关 QA。
- 性能报告。
- AI 开发证据。
- Git 提交和 tag。
- 已知限制。
- 故障切换手册。

不得要求评委浏览聊天记录、Git 全历史或整个仓库才能理解证据。

---

## B11. 隐私和展示安全

检查所有：

- 截图。
- 视频。
- 演示存档。
- HTML 展示页。
- Markdown。
- JSON 证据索引。
- 离线包。

必须隐藏：

- API Key。
- 个人绝对路径。
- 邮箱。
- 用户 ID。
- 私人聊天。
- 不相关项目。
- 本地服务凭据。

只能脱敏秘密和隐私，不得修改技术结果或测试结论。

---

## B12. Gate B 结论

`PASS` 条件：

1. Gate A 已 `PASS`。
2. 证据真实且验证脚本通过。
3. 八项评分都有可见、可追溯证据。
4. 测试报告对应候选 SHA。
5. 在线演示对应候选版本。
6. 离线包在干净环境运行且 hash 已记录。
7. 故障切换 30 秒内完成。
8. 三次彩排都小于 4 分 30 秒。
9. 评委从单一入口可快速找到全部材料。
10. 没有隐私或秘密泄露。

Gate B 结论只能是：

```text
GATE B: PASS
GATE B: FAIL
GATE B: BLOCKED
```

---

# 最终发布决策

## 6. 决策矩阵

| Gate A | Gate B | 最终结论 |
|---|---|---|
| PASS | PASS | RELEASE APPROVED |
| FAIL | 任意 | RELEASE REJECTED |
| 任意 | FAIL | RELEASE REJECTED |
| BLOCKED | 任意 | RELEASE BLOCKED |
| 任意 | BLOCKED | RELEASE BLOCKED |

`RELEASE APPROVED` 后：

1. 冻结候选 SHA。
2. 由发布负责人确认正式版本号和 tag。
3. 未经用户授权不得推送或部署。
4. 正式发布内容必须与已验收 SHA 完全一致。
5. 保存最终报告、测试报告、离线 hash 和演示记录。

如果批准后需要修改任何源代码、配置、内容或构建输入：

1. 原批准失效。
2. 创建新的候选 SHA。
3. 版本递增，例如 `rc.1` 到 `rc.2`。
4. Gate A 和 Gate B 全量重跑。

---

# 固定最终验收报告模板

## 7. 报告

```markdown
# 《细胞远征》最终发布验收报告

## 最终结论

Final Verdict: RELEASE APPROVED | RELEASE REJECTED | RELEASE BLOCKED

Candidate SHA:
Base SHA:
Candidate Tag:
Version:
验收日期:
总验收智能体:

## 候选交接

- [ ] 候选 SHA 稳定
- [ ] 实施智能体停止写入
- [ ] 隔离验收目录干净
- [ ] 提交范围明确
- [ ] 无关工作区改动未包含

# Gate A：技术验收

Gate A Verdict: PASS | FAIL | BLOCKED

## 自动化命令

| 验收项 | 命令 | 退出码 | 通过 | 失败 | 跳过 | 证据 |
|---|---|---:|---:|---:|---:|---|
| 安装 | `npm ci` | | | | | |
| 类型 | `npm run typecheck` | | | | | |
| Lint | `npm run lint` | | | | | |
| 单元 | `npm run test:unit` | | | | | |
| 组件 | `npm run test:component` | | | | | |
| 服务端 | `npm run test:server` | | | | | |
| E2E | `npm test` | | | | | |
| 构建 | `npm run build` | | | | | |
| 内容 | `npm run validate:content` | | | | | |
| 证据 | `npm run validate:evidence` | | | | | |
| 报告 | `npm run report:tests` | | | | | |

## 运行入口

| 环境 | 首页 | 编辑器 | 展示页 | API | 资源404 | 控制台 | 结果 |
|---|---|---|---|---|---|---|---|
| dev | | | | | | | |
| preview | | | | | | | |
| online | | | | | | | |
| offline | | | | | | | |

## 六关单人

| 病例 | 角色 | 在线AI | 本地回退 | 可达 | 可恢复 | 报告 | 时间 | 分数 | 问题 | 结果 |
|---|---|---|---|---|---|---|---:|---:|---|---|
| 1 | | | | | | | | | | |
| 2 | | | | | | | | | | |
| 3 | | | | | | | | | | |
| 4 | | | | | | | | | | |
| 5 | | | | | | | | | | |
| 6 | | | | | | | | | | |

## 双人

病例:
初始职责:
交换职责:
动态相机:
死亡/重试:
最终报告:
结果:

## 编辑器与UGC

- [ ] 手动
- [ ] 模板
- [ ] AI
- [ ] 导入
- [ ] 撤销/重做
- [ ] 校验
- [ ] 试玩
- [ ] 发布
- [ ] CQ兼容
- [ ] CQ2往返

## 兼容、安全和架构

- [ ] 旧存档
- [ ] 旧关卡
- [ ] 自定义关卡
- [ ] 分享码
- [ ] AI白名单
- [ ] 无秘密暴露
- [ ] Phaser生命周期清理
- [ ] Vue/Phaser边界
- [ ] 无遗留运行时消费者

## 性能

机器:
浏览器:
normal median:
normal p99:
stress p99:
1% low FPS:
集合增长:
结果:

## 缺陷

### P0

### P1

### P2

# Gate B：评委交付

Gate B Verdict: PASS | FAIL | BLOCKED

## 证据

| 证据 | 路径/URL | 候选SHA一致 | 验证结果 |
|---|---|---|---|
| AI开发记录 | | | |
| 证据索引 | | | |
| 测试报告 | | | |
| 评分映射 | | | |
| 六关QA | | | |
| 性能报告 | | | |

## 在线与离线

Online URL:
Health:
Deploy SHA:
Offline package:
SHA-256:
Clean-machine result:
Failover time:

## 三次彩排

| 次数 | 模式 | 总时间 | 切换时间 | 错误 | 结果 |
|---|---|---:|---:|---|---|
| 1 | 正常在线 | | | | |
| 2 | AI超时 | | | | |
| 3 | 公网站点失败 | | | | |

## 隐私

- [ ] 截图
- [ ] 视频
- [ ] 文档
- [ ] JSON索引
- [ ] 离线包

## 最终决策

只有 Gate A 和 Gate B 均为 PASS 时填写：

候选提交已经通过技术、内容、安全、性能、人工通关、
证据真实性、在线/离线和演示验收。

Final Verdict: RELEASE APPROVED

若未通过：

Final Verdict: RELEASE REJECTED | RELEASE BLOCKED

解除条件:
```

---

# 可直接发送给总验收智能体的话

## 8. 指令

```text
你是《细胞远征》最终发布与评委交付的总验收智能体。

请完整阅读并严格执行：

docs/superpowers/specs/2026-07-26-final-release-acceptance-gate-design.md

你负责拆分和调度独立验收子智能体，分别完成：

1. Gate A发布候选技术验收。
2. 六关单人、双人和病例设计器人工QA。
3. Gate B证据、在线、离线和四分钟演示验收。
4. 对最终报告进行独立复核。

开始前必须要求实施负责人提供候选SHA、版本、tag、提交范围、
测试结果、六关QA、在线地址、离线包hash、演示材料、已知限制
和无关工作区改动。

如果实施仍在写入、没有稳定候选SHA或无法建立隔离验收环境，
直接返回RELEASE BLOCKED。

验收要求：

- 只能验收，不能修改生产代码、测试或配置。
- 不暂存、不提交、不打tag、不推送、不部署。
- 在隔离的干净候选目录中执行npm ci、全部测试、构建和打包验证。
- 记录每条命令的退出码、测试数量和证据。
- 六个官方病例必须分别完成真实单人通关。
- 至少一个病例必须完成双人和角色交换。
- 必须验证病例设计器创建、试玩、发布、CQ2导出和新存档导入闭环。
- 必须验证旧存档、旧关卡、自定义关卡和分享码兼容。
- 必须验证AI在线安全、本地回退和来源标识。
- 必须验证Phaser手感、性能、Scene重复进入退出和资源清理。
- 必须验证在线版本、离线包、SHA-256和30秒故障切换。
- 必须验证所有证据真实、可追溯且对应候选SHA。
- 必须连续完成三次小于4分30秒的演示彩排。
- 不得把失败降级后签发PASS。
- 不得把计划、模拟结果、未归档对话或局部实现写成已完成。

Gate A结论只能是PASS、FAIL或BLOCKED。
Gate B结论只能是PASS、FAIL或BLOCKED。

只有Gate A和Gate B都为PASS时，最终结论才能是：

RELEASE APPROVED

如果任一Gate失败：

RELEASE REJECTED

如果任一Gate阻塞：

RELEASE BLOCKED

发现问题后只报告复现命令、证据、等级和影响范围，
交还实施智能体修复。收到新候选SHA后，Gate A和Gate B必须全量重跑。

最终严格使用文档中的固定模板输出完整验收报告。
```

---

## 9. 文档自检

- 技术质量与评委交付分为两个独立 Gate。
- 验收必须在隔离候选目录完成。
- 自动化、人工 QA、性能、安全和兼容都有客观证据要求。
- 六关单人和至少一关双人是强制项。
- AI 在线与本地回退明确区分。
- Phaser 生命周期和性能有明确预算。
- 证据真实性、隐私和候选 SHA 一致性是强制项。
- 在线失败后离线切换不超过 30 秒。
- 三次彩排均受 4 分 30 秒硬上限约束。
- 源代码变化会使原批准失效并触发全量复验。
- 最终结论只能由两个 Gate 的结果决定。
