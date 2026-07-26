# 第一阶段架构验收与第二阶段放行手册

## 1. 用途

本手册交给独立验收智能体执行，用于判断《细胞远征》第一阶段 Vue 3、Vite、TypeScript、Pinia 基础迁移是否真正完成，以及是否允许开始第二阶段“共享领域和服务迁移”。

验收结论只能是：

- `PASS`：所有强制项通过，允许开始第二阶段实施计划。
- `FAIL`：候选实现存在可复现缺陷，不允许开始第二阶段。
- `BLOCKED`：实施仍在进行、交接信息缺失或环境无法完成验收，不允许开始第二阶段。

`PASS` 不是“看起来没问题”，必须有命令输出、代码审查结果和兼容性证据。

---

## 2. 权威资料

验收前完整阅读：

- `docs/superpowers/specs/2026-07-26-vue-phaser-typescript-migration-design.md`
- `docs/superpowers/plans/2026-07-26-vue-typescript-foundation.md`
- `docs/superpowers/specs/2026-07-26-migration-agent-orchestration-design.md`

第一阶段必须满足实施计划的 `Plan Completion Gate`。本手册补充如何收集证据，但不得降低原计划标准。

---

## 3. 验收智能体权限

### 允许

- 读取代码、配置、测试、文档和 Git 历史。
- 运行类型检查、Lint、单元测试、服务端测试、Playwright 和生产构建。
- 启动本地开发或预览服务器执行只读、无副作用的冒烟检查。
- 读取浏览器控制台和页面错误。
- 在最终回复中输出验收报告。

### 禁止

- 修改生产代码、测试、配置或文档。
- 为了让测试通过而补丁修复。
- 暂存、提交、推送、合并或重写 Git 历史。
- 删除或还原其他线程、用户或实施智能体的改动。
- 对真实关卡执行有效 `/save` 或 `/reset` 请求。
- 把失败项降级为警告后签发 `PASS`。

发现缺陷后，记录证据并返回实施智能体修复。收到新候选提交后，从头重新执行全部强制验收。

---

## 4. 开始验收的前置条件

实施智能体必须明确交接：

1. 候选提交 SHA。
2. 第一阶段包含的提交范围。
3. 已完成的六个计划任务。
4. 已运行的测试及结果。
5. 已知限制。
6. 需要保留的无关工作区改动。

验收智能体执行：

```powershell
git rev-parse HEAD
git log -10 --oneline
git status --short
node --version
npm --version
```

满足以下条件才开始：

- `HEAD` 与交接的候选提交一致。
- 第一阶段实施智能体已经停止写入。
- 没有其他智能体正在修改第一阶段高冲突文件。
- `package.json`、锁文件和依赖已准备好。
- 无关工作区改动已列明且不会被验收操作修改。

以下情况直接判定 `BLOCKED`：

- 没有候选提交 SHA。
- 实施智能体仍在持续写入。
- 候选提交与当前 `HEAD` 不一致且无法解释。
- 依赖未安装，而安装依赖可能覆盖正在进行的工作。
- 端口、运行环境或权限导致强制测试无法执行。

---

## 5. 工作区与提交范围验收

### 5.1 记录候选范围

使用实施智能体提供的起止提交：

```powershell
git diff --stat <base-sha>..<candidate-sha>
git diff --name-status <base-sha>..<candidate-sha>
git log --oneline <base-sha>..<candidate-sha>
```

验收：

- 每个提交只有一个清晰目的。
- 第一阶段变更集中在计划列出的配置、测试、`src/`、HTML 入口和迁移文档。
- 没有夹带关卡内容、玩法数值、视觉重设计或功能优化代码。
- 没有夹带 `audit/`、`js/levels/backup/` 或其它已声明无关改动。

发现范围污染判定 `FAIL`。

### 5.2 检查未提交改动

```powershell
git status --short
```

允许存在交接时明确声明的用户或其它线程改动。必须逐项核对这些文件没有被候选提交包含，也没有被验收过程改变。

不得为了获得“干净工作区”而还原、删除或暂存它们。

---

## 6. 工具链和依赖验收

### 6.1 npm 命令

`package.json` 必须提供：

```text
dev
build
preview
typecheck
lint
test
test:unit
test:server
```

### 6.2 精确版本

运行：

```powershell
node -e "const p=require('./package.json');const all={...(p.dependencies||{}),...(p.devDependencies||{})};const bad=Object.entries(all).filter(([,v])=>/^[~^*]|\bx\b/i.test(v));if(bad.length){console.error(bad);process.exit(1)}console.log('exact dependency versions:',Object.keys(all).length)"
```

预期：

- 退出码为 `0`。
- Vue、Pinia、Vite、TypeScript、Vitest、Playwright 等版本均为精确版本。
- `package-lock.json` 与 `package.json` 一致。

### 6.3 配置文件

必须存在：

```text
vite.config.ts
vitest.config.ts
eslint.config.mjs
tsconfig.json
tsconfig.node.json
src/vite-env.d.ts
```

检查：

- TypeScript 启用 `strict`。
- 启用 `noUncheckedIndexedAccess`。
- 启用 `noImplicitOverride`。
- 启用 `useUnknownInCatchVariables`。
- 启用 `noFallthroughCasesInSwitch`。
- Vite 配置三个 HTML 构建入口。
- Vitest 使用 `jsdom` 并识别单元测试。
- ESLint 检查新 TypeScript 和 Vue 文件。

缺少任意强制配置判定 `FAIL`。

---

## 7. 自动化验收命令

按顺序执行。任一命令非零退出，都记录完整命令、退出码和首个有效错误，并判定 `FAIL`。不要跳过后续无依赖的测试；继续收集证据以形成完整报告。

### 7.1 工具链契约

```powershell
node --test tests/tooling/vite-foundation.test.cjs
```

预期：全部通过。

### 7.2 TypeScript 严格检查

```powershell
npm run typecheck
```

预期：退出码 `0`，无 TypeScript 或 Vue 类型错误。

### 7.3 Lint

```powershell
npm run lint
```

预期：退出码 `0`，没有错误。

### 7.4 单元测试

```powershell
npm run test:unit
```

预期：

- 类型事件总线测试通过。
- LegacyGameEngineAdapter 测试通过。
- Pinia UI store 测试通过。
- 没有被跳过的第一阶段关键测试。

### 7.5 服务端测试

```powershell
npm run test:server
```

预期：

- Git 元数据不可访问。
- 路径穿越被拒绝。
- 写接口要求 JSON。
- 测试没有在关卡目录外写文件。

### 7.6 迁移行为基线

```powershell
npm test -- tests/migration-baseline.spec.js
```

预期：

- `/` 主菜单和关卡选择可用。
- 能进入关卡。
- HUD 正常激活。
- 暂停、继续、退出流程正常。
- `/editor.html` 可用。
- `/deck.html` 可用。
- `/levels` 能通过 Vite 到达旧服务。
- 没有 `pageerror`。

### 7.7 全部 Playwright 回归

```powershell
npm test
```

预期：现有核心流程、编辑器存储、安全测试和迁移基线全部通过。

### 7.8 生产构建

```powershell
npm run build
```

预期：

- 退出码 `0`。
- 生成 `dist/index.html`。
- 生成 `dist/editor.html`。
- 生成 `dist/deck.html`。
- 构建没有 unresolved import、循环入口或资源缺失错误。

检查：

```powershell
Get-ChildItem dist -Recurse -File | Select-Object FullName,Length
```

`dist/` 是生成物，不得因为验收而提交。

---

## 8. Vite 与旧 Node 服务兼容验收

第一阶段不能用 Vite 静态服务器破坏 `server.js` 提供的：

- `GET /levels`
- `POST /save`
- `POST /reset`

### 8.1 配置检查

检查 `vite.config.ts`：

- 开发服务器使用公开端口 `8080`。
- 旧 Node API 使用独立端口。
- `/levels`、`/save`、`/reset` 都有代理。
- `preview` 与 `dev` 的接口行为约定一致。

### 8.2 安全冒烟

启动 `npm run dev` 后，只执行无副作用请求：

```text
GET /levels
  预期：200，返回 JSON 文件列表。

POST /save，Content-Type: text/plain
  预期：415，不写入文件。

POST /reset，JSON filename 为不符合白名单的 invalid.js
  预期：400，不修改文件。
```

禁止使用真实合法关卡文件名测试 `/save` 或 `/reset`。

请求前后比较：

```powershell
git status --short
```

若冒烟请求改变关卡或其它源文件，判定 `FAIL` 并立即记录变化。

---

## 9. 三页面入口验收

### 9.1 HTML 和模块入口

检查：

- `index.html` 只新增非侵入式 Vue 根和模块入口。
- `editor.html` 只新增非侵入式 Vue 根和模块入口。
- `deck.html` 只新增非侵入式 Vue 根和模块入口。
- 第一阶段没有删除经典脚本。
- 现有页面地址保持不变。

### 9.2 浏览器行为

在开发服务器下确认：

```text
/
/editor.html
/deck.html
```

每页检查：

- HTTP 状态为 200。
- Vue 根成功挂载。
- 原有页面仍然可见和可操作。
- 浏览器控制台无模块加载错误。
- 没有未处理 Promise rejection。
- 没有重复初始化导致的事件触发。

第一阶段不要求 Vue 替换原 UI；若出现视觉或行为重写，属于范围越界。

---

## 10. 架构边界静态验收

### 10.1 GameEngine 契约

必须存在明确的：

- `GameEngine`
- `GameCommand`
- `GameEngineEventMap`
- `GameEngineEvents` 或等价类型事件机制
- `LegacyGameEngineAdapter`

检查命令：

```powershell
rg -n "GameEngine|GameCommand|GameEngineEventMap|LegacyGameEngineAdapter" src
```

验收：

- Vue 通过命令和类型事件与运行时通信。
- 订阅返回取消订阅函数。
- 错误通过类型事件或明确错误结果传播。
- 接口不暴露旧 `Game` 对象。

### 10.2 遗留全局访问

运行：

```powershell
rg -n "window\.Game|window\.CellQuestLegacy|\bGame\." src --glob "*.ts" --glob "*.vue"
```

逐条审查：

- 旧全局访问只能存在于明确的 bridge/adapter 边界及其类型声明。
- Vue 组件、Pinia store、共享类型和共享工具不得直接读取或修改旧 `Game`。
- 如果 Vue 入口负责创建 adapter，必须通过 bridge 工厂取得实例，不能把旧全局扩散到组件逻辑。

发现边界外直接访问判定 `FAIL`。

### 10.3 单一旧桥

运行：

```powershell
rg -n "CellQuestLegacy" js index.html editor.html deck.html src
```

验收：

- 旧运行时只发布一个最小 `CellQuestLegacy` 桥。
- 桥只暴露适配器所需能力。
- 没有为了迁移而新增多个全局入口。
- 不暴露完整 `Game` 对象。

### 10.4 Pinia 边界

审查所有 store：

```powershell
rg -n "defineStore|requestAnimationFrame|velocity|position|entities|enemies|projectiles" src
```

验收：

- Pinia 只保存屏幕、HUD 快照、错误等低频 UI 状态。
- 不保存玩家逐帧位置、速度、敌人数组、子弹数组或碰撞状态。
- 不在 store 中运行游戏循环。

### 10.5 共享模块纯度

运行：

```powershell
rg -n "from.+(vue|pinia|phaser)" src/shared
```

预期：无结果。

共享类型、事件和工具不得依赖 Vue、Pinia 或 Phaser。

### 10.6 生命周期清理

审查 Vue 根和 adapter：

- Vue 卸载时取消全部事件订阅。
- adapter `destroy()` 可重复调用且不抛错。
- 没有遗留键盘、定时器或窗口监听。
- 多次进入页面不会重复挂载旧引擎。

### 10.7 Vue 安全约束

运行：

```powershell
rg -n "v-html|onclick=|onchange=|oninput=" src --glob "*.vue" --glob "*.ts"
```

预期：新 Vue/TypeScript 代码中无结果。

---

## 11. 兼容性验收

第一阶段原则是“增加外壳，不改变业务行为”。

### 11.1 旧运行时代码

检查候选提交范围：

```powershell
git diff <base-sha>..<candidate-sha> -- js/game.js js/entities.js js/levels editor.html deck.html index.html
```

验收：

- `js/game.js` 和实体运行时只允许增加最小旧桥，不允许重写玩法。
- 关卡内容和关卡格式没有变化。
- 键位、移动、跳跃、暂停、死亡和通关逻辑没有变化。
- HTML 改动仅服务于 Vue 挂载和 Vite 模块入口。

### 11.2 存档和分享

由于第一阶段不迁移存档领域，必须确认：

- 原 localStorage key 未更名。
- 存档 schema 未改变。
- 自定义关卡格式未改变。
- `CQ!`、`CQ2!` 或现有分享码逻辑未改变。
- 旧数据读写代码没有被无测试地修改。

如果相关逻辑发生变化但没有固定样本兼容测试，判定 `FAIL`。

---

## 12. 文档一致性验收

必须存在并与实际代码一致：

- 行为基线记录。
- GameEngine 契约记录。
- 第一阶段 rollout gate。
- README 和 README.en.md 中的新命令。

检查：

- 文档列出的文件真实存在。
- 文档中的 npm 命令与 `package.json` 一致。
- 文档描述的接口与 TypeScript 定义一致。
- 文档明确 `LegacyGameEngineAdapter` 是临时方案。
- 文档没有宣称 Phaser 或完整 Vue UI 已经迁移。

文档与实现不一致判定 `FAIL`。

---

## 13. 失败、阻塞与复验

### `FAIL`

适用于：

- 测试或构建失败。
- 架构边界违规。
- 页面、API 或旧行为退化。
- 候选提交夹带无关功能。
- 文档与实现不一致。

报告必须包含：

- 失败验收项。
- 复现命令。
- 退出码。
- 关键错误摘要。
- 影响范围。
- 建议由哪类实施任务修复。

验收智能体不得自己修复。

### `BLOCKED`

适用于：

- 没有稳定候选提交。
- 实施仍在进行。
- 环境或权限导致必测项无法执行。
- 交接缺少提交范围或已知改动说明。

报告必须写明解除阻塞需要什么。

### 复验

实施智能体修复并提交后：

1. 记录新的候选 SHA。
2. 检查修复 diff。
3. 重新执行本手册全部强制项。
4. 不得只重跑之前失败的命令后签发 `PASS`。

---

## 14. 第二阶段放行规则

只有以下全部成立才能签发 `PASS`：

1. 前置条件完整。
2. 提交范围干净。
3. 工具链契约通过。
4. TypeScript 严格检查通过。
5. Lint 通过。
6. 单元测试通过。
7. 服务端测试通过。
8. 迁移行为基线通过。
9. 全部 Playwright 回归通过。
10. 生产构建产生三个页面。
11. Vite 代理保留旧 Node 接口。
12. Vue、Pinia、共享领域和旧运行时边界符合设计。
13. 旧行为、存档和分享格式没有退化。
14. 迁移文档与实际接口一致。
15. 没有未处理的阻塞级或重要级问题。

`PASS` 仅授权：

- 根据第一阶段真实文件和接口编写第二阶段实施计划。
- 开始迁移共享领域类型、编解码、存储和服务。

`PASS` 不授权：

- 直接全面迁移 Phaser。
- 删除旧引擎。
- 跳过第二阶段实施计划。
- 同时实施尚未完成架构适配的功能文档。

---

## 15. 固定验收报告模板

```markdown
# 第一阶段架构验收报告

## 结论

Verdict: PASS | FAIL | BLOCKED

Candidate SHA:
Base SHA:
验收时间:
Node:
npm:
验收智能体:

## 交接检查

- [ ] 候选提交稳定
- [ ] 实施智能体停止写入
- [ ] 提交范围明确
- [ ] 无关工作区改动已记录

## 命令证据

| 验收项 | 命令 | 退出码 | 结果 | 证据摘要 |
|---|---|---:|---|---|
| 工具链 | `node --test tests/tooling/vite-foundation.test.cjs` | | | |
| 类型 | `npm run typecheck` | | | |
| Lint | `npm run lint` | | | |
| 单元测试 | `npm run test:unit` | | | |
| 服务端 | `npm run test:server` | | | |
| 行为基线 | `npm test -- tests/migration-baseline.spec.js` | | | |
| 全部 E2E | `npm test` | | | |
| 构建 | `npm run build` | | | |

## 页面与接口

| 对象 | 预期 | 实际 | 结果 |
|---|---|---|---|
| `/` | 200，旧游戏可用，Vue 根挂载 | | |
| `/editor.html` | 200，旧编辑器可用，Vue 根挂载 | | |
| `/deck.html` | 200，旧展示页可用，Vue 根挂载 | | |
| `/levels` | 200，JSON | | |
| `/save` 非 JSON | 415，无写入 | | |
| `/reset` 非法文件名 | 400，无修改 | | |

## 架构审查

- [ ] GameEngine 契约类型化
- [ ] LegacyGameEngineAdapter 是唯一旧边界
- [ ] Vue 不直接访问旧 Game
- [ ] Pinia 不保存逐帧状态
- [ ] `src/shared` 不依赖 Vue、Pinia、Phaser
- [ ] 生命周期订阅和监听已清理
- [ ] 没有新增 `v-html` 或内联事件

## 兼容性

- [ ] 键位和核心游戏流程未改变
- [ ] 存档 key 和 schema 未改变
- [ ] 自定义关卡格式未改变
- [ ] 分享码格式未改变
- [ ] 关卡内容未改变

## 提交范围

候选提交:

未包含的无关工作区改动:

范围审查结论:

## 问题

### 阻塞

### 重要

### 建议

## 放行声明

仅当 Verdict 为 PASS 时填写：

第一阶段架构验收通过。允许基于候选提交中的真实 GameEngine、
LegacyGameEngineAdapter、Vue/Pinia 入口和测试结构编写第二阶段实施计划。
不授权直接进行 Phaser 全量迁移或删除旧引擎。

若 Verdict 为 FAIL 或 BLOCKED：

不允许开始第二阶段。解除条件：
```

---

## 16. 可直接发送给验收智能体的指令

```text
你是《细胞远征》第一阶段架构迁移的独立验收智能体。

请完整阅读并严格执行：
docs/superpowers/specs/2026-07-26-phase-1-acceptance-gate-design.md

你的职责是收集证据并判断是否允许开始第二阶段，不是修复实现。

开始前：

1. 要求实施智能体提供候选 SHA、提交范围、完成项、测试结果和无关工作区改动。
2. 确认实施智能体已经停止写入。
3. 如果候选提交不稳定或仍有并发写入，直接给出 BLOCKED。

执行中：

1. 不修改任何代码、配置、测试或文档。
2. 不暂存、不提交、不推送。
3. 按手册顺序执行全部强制命令。
4. 对三个页面、旧 Node API、GameEngine 边界、Pinia 边界、旧全局访问和兼容性进行审查。
5. 记录每条命令的退出码和证据摘要。
6. 不得把失败项降级后签发 PASS。

最终使用手册中的固定模板输出验收报告，结论只能是：

- PASS：全部强制项通过，允许编写并执行第二阶段共享领域和服务迁移计划。
- FAIL：存在可复现缺陷，不允许进入第二阶段。
- BLOCKED：候选提交或环境不具备验收条件，不允许进入第二阶段。

如果 FAIL，请只报告复现命令、根因证据和影响范围，交还实施智能体修复；不要自行修改。
```

---

## 17. 文档自检

- 验收者与实施者职责分离。
- 第一阶段仍在实施时只能返回 `BLOCKED`。
- 每个强制门都有命令或明确静态审查方式。
- API 冒烟请求不会修改真实关卡。
- 验收过程不会覆盖无关工作区改动。
- `PASS` 只放行第二阶段计划和共享领域迁移，不提前放行 Phaser。
- 失败后必须全量复验。
- 报告格式固定且证据可追溯。
