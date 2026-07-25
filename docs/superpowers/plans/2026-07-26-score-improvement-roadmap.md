# Cell Quest Score Improvement Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将《细胞远征》从“带细胞主题的平台闯关”升级为由 AI 推动病例危机、以红白细胞协作稳定患者指标为核心，并具备完整叙事、科普价值、产品闭环和比赛证据的可发布游戏。

**Architecture:** 保留原生 Canvas、现有实体和地图系统，引入独立 `CaseEngine` 管理确定性生理规则，服务端 AI 病情导演只从白名单事件中选择下一阶段危机。地图编辑器输出版本化病例配置，单人用脚本化友军，双人由红白细胞玩家共同执行同一病例。

**Tech Stack:** HTML5 Canvas、原生 JavaScript、Node.js HTTP server、Playwright 1.61.1、Node `node:test`、localStorage、服务端兼容 OpenAI Chat Completions 格式的模型接口。

## Global Constraints

- 三项患者指标统一为 `0–100` 的游戏化数值，不宣称等同于临床检测值。
- 单人每关固定红细胞或白细胞，不允许关内切换。
- 双人固定一红一白，不允许两个相同角色。
- 血小板代码和旧存档字段保留，但所有用户入口、病例目标和编辑器入口隐藏。
- 病例模式中终点、金币、问号砖块和管道不能参与核心循环。
- AI 只能返回白名单事件、现有节点 ID、`1–3` 严重度和 `30–60` 秒时限。
- AI Key 只能存在于服务器环境变量，禁止存入浏览器或关卡分享码。
- AI 不可用时必须使用相同结构的本地导演，不得阻塞游戏。
- 旧自定义地图和旧分享码必须继续以“经典模式”运行。
- 所有新增文本通过 `textContent` 或既有 `escapeHtml()` 输出。
- 每个任务先写失败测试，再实现最小代码，再运行相关回归，最后独立提交。
- 不修改或提交 `audit/` 与 `js/levels/backup/level2_alveoli.js` 中现有的用户改动。

---

## 1. 评分标准改进总表

| 评分模块 | 当前主要风险 | 必须改进 | 评委可见证据 | 完成判定 |
|---|---|---|---|---|
| AI方向 | AI生成地图、NPC文本和规则难度仍属外围 | AI选择病例危机、目标节点、严重度和下一阶段任务 | HUD显示“AI触发”、病例卡显示原因、结算显示决策记录 | 去掉AI后事件顺序退化为本地固定导演；联网时重复游玩事件计划可变化 |
| 玩法方向 | 金币、问号砖块、管道、终点与马里奥相似 | 供氧、感染控制、组织稳定；单人固定职责；双人红白协作 | 三指标、病例目标、地图任意位置稳定通关 | 六关都不能靠跑到右端通关 |
| 产品方向 | 本地功能较多但缺乏完整用户闭环 | 60秒引导、每日病例、版本化病例分享码、报告分享图、线上演示和内容包路线 | 从游玩到报告、编辑、分享、挑战的完整流程 | 新用户可创建/导入病例并完成一次挑战 |
| 玩家方向 | 故事因果弱，指标和反馈不够集中 | 同一患者六章故事、病例卡、阶段反馈、音画强化、难度透明、可访问性 | 患者状态随操作明显变化，失败原因可理解 | 5名首次玩家中至少4名能复述当前目标 |
| 行业方向 | 科普内容存在但与玩法割裂、来源不完整 | 每章学习目标、来源字段、知识影响决策、非医疗建议声明 | 结算知识卡、来源链接、病例中的正确生理因果 | 全部科学文本经过来源清单和人工复核 |
| 主题契合度 | 六关像场景集合，主题结论不突出 | 擦伤感染到康复的连续病例和最终免疫协作报告 | 序章、章节过渡、终章主题句 | 玩家能复述“运输、防御、免疫记忆协作” |
| AI使用情况 | CodeBuddy过程证据可能散落在聊天和提交中 | 建立可审计的需求、架构、生成、纠错、测试和人工决策记录 | `AI_DEVELOPMENT.md`、截图索引、提交与测试报告 | 每个主要模块都有“AI建议—人工判断—验证结果” |
| 游戏质量 | 六关未系统验收，画面、平衡、字体和比例仍有风险 | 自动化矩阵、六关人工通关、性能预算、视觉一致性、音效和线上冒烟 | 测试报告、平衡表、发布清单、线上地址 | 零阻塞错误，六关单人通过，双人病例通过 |

## 2. 计划分册与依赖

按以下顺序执行；每一册都必须产生可运行、可测试、可评审的软件：

1. [核心病例玩法与编辑器计划](2026-07-26-core-case-gameplay.md)
2. [AI病情导演与服务端安全计划](2026-07-26-ai-case-director.md)
3. [叙事、科普与玩家体验计划](2026-07-26-story-education-player-experience.md)
4. [产品化、UGC与运营计划](2026-07-26-product-ugc-operations.md)
5. [质量、平衡、可访问性与发布计划](2026-07-26-quality-balance-release.md)
6. [CodeBuddy证据、演示与评分材料计划](2026-07-26-evidence-demo-scoring.md)

依赖关系：

```text
核心病例玩法
├── AI病情导演
├── 叙事与科普
└── 产品化与UGC
        ↓
质量、平衡与发布
        ↓
证据、演示与评分材料
```

AI 服务端可以与编辑器 UI 并行开发，但 AI 事件执行器必须等待 `CaseEngine` 的接口稳定。

## 3. 建议代码边界

### 新增文件

| 文件 | 单一职责 |
|---|---|
| `js/case-engine.js` | 患者指标、目标、事件、稳定倒计时和胜负 |
| `js/case-entities.js` | 供氧点、目标组织、感染灶和自动友军视觉实体 |
| `js/case-director.js` | 浏览器导演客户端、本地回退和事件计划记录 |
| `js/case-content.js` | 六章病例文案、知识卡和来源元数据 |
| `server/director.js` | 服务端请求/响应校验、模型调用、超时和本地回退 |
| `tests/case-engine.spec.js` | 病例引擎与目标交互浏览器测试 |
| `tests/case-director.spec.js` | AI导演客户端、白名单和回退测试 |
| `tests/case-editor.spec.js` | 病例配置保存、导入和兼容测试 |
| `tests/story-flow.spec.js` | 病例卡、章节过渡和报告测试 |
| `tests/accessibility.spec.js` | 键盘、对比度设置、减少动画和字体测试 |
| `scripts/validate-content.cjs` | 检查知识来源、病例配置和文案完整性 |
| `scripts/generate-test-report.cjs` | 汇总自动化和人工验收结果 |

### 重点修改文件

| 文件 | 修改范围 |
|---|---|
| `index.html` | 新HUD、病例卡、AI提示、报告、设置与脚本加载顺序 |
| `css/style.css` | 病例HUD、指标状态、响应式、可访问性和统一视觉 |
| `js/config.js` | 状态持久化、分享格式v2、设置、内容版本 |
| `js/entities.js` | 删除可达的切换输入、上报供氧/感染/死亡事件、停用浏览器直连AI |
| `js/game.js` | 加载病例、更新引擎、角色锁定、双人协作、完成流程 |
| `js/levels.js` | 六关病例配置和经典模式兼容 |
| `js/levels/level*.js` | 放置 `L/T/i` 节点并移除马里奥式目标 |
| `editor.html` | 病例设置、节点瓦片、校验、导入导出 |
| `server.js` | `/api/director`、`/healthz`、安全响应头和测试注入点 |
| `deck.html` | 新核心循环、AI决策证据、病例报告和产品闭环 |
| `README.md` | 新玩法、环境变量、测试和演示说明 |
| `package.json` | 全量测试、内容校验和报告命令 |

## 4. 里程碑与评审门

### Gate A：病例闭环

- 红细胞能装载和交付氧气。
- 白细胞能清除感染灶。
- 三项指标相互影响。
- 终点不再完成病例。
- 稳定5秒完成、组织活性归零失败。
- 至少一个病例模式关卡可单人和双人完成。

### Gate B：六关与编辑器

- 六关均有 `caseConfig` 与病例节点。
- 编辑器可创建病例、保存、导出、导入并再次通关。
- 旧地图仍以经典模式运行。
- 单人固定主控，双人一红一白。

### Gate C：AI核心玩法

- 联网时AI在两阶段选择事件。
- AI输出无法越过白名单校验。
- 断网时本地导演完整运行。
- AI决策会改变目标、节点或指标，而非只改变台词。
- 结算页能复述AI为何做出选择。

### Gate D：叙事与社会价值

- 六章连贯讲述一个患者。
- 每章有学习目标、来源与结算知识。
- 知识内容至少一次影响玩家决策。
- 最终报告表达协作主题。

### Gate E：产品与质量

- 新手引导、每日病例、UGC分享和报告图片形成闭环。
- 六关单人、至少一关双人通过人工验收。
- 测试、性能、可访问性和线上冒烟全部通过。

### Gate F：比赛交付

- AI开发证据可追溯。
- 4分钟演示脚本完成三次无故障彩排。
- 在线和离线演示包均可用。
- 评分表每一行都有现场证据与备用截图。

## 5. 风险与缓解

| 风险 | 预防措施 | 触发后的降级 |
|---|---|---|
| AI延迟影响节奏 | 两阶段、2.5秒超时、异步预取 | 本地导演立即接管 |
| AI输出不可执行 | 服务端和客户端双重白名单 | 整体拒绝响应 |
| 自动友军寻路失控 | 使用脚本化路线和动画 | 用保底速率更新指标 |
| 双人分离导致不可见 | 动态缩放加柔性边界 | 阻止领先玩家继续前进 |
| 六关数值无法统一 | 每关配置化指标和目标 | 使用标准/辅助两个预设 |
| 医学表述不准确 | 来源字段、内容校验和人工复核 | 移除未复核统计数字 |
| 旧分享码损坏 | 版本化解码与经典模式 | 保留旧解码器 |
| 视觉打磨压过玩法 | Gate A–C完成前不做装饰性重构 | 只保留关键反馈 |
| AI开发证据失真 | 只记录真实对话、提交和测试 | 明确标注缺失，不补造 |

## 6. 全局完成定义

- [ ] 八个评分模块的改进项均有实现和证据。
- [ ] `npm run test:all` 退出码为0。
- [ ] `npm run validate:content` 退出码为0。
- [ ] 六个内置病例单人通关。
- [ ] 至少一个病例双人通关。
- [ ] 断网状态可完成病例并显示“本地导演”。
- [ ] 联网状态可看到AI生成第二阶段危机。
- [ ] 旧自定义地图和旧分享码兼容。
- [ ] 浏览器中不存在 AI Key 的 localStorage 项。
- [ ] 病例模式不显示金币、问号砖块、管道或终点通关。
- [ ] 所有知识卡包含来源和复核状态。
- [ ] 在线地址通过桌面和移动浏览器冒烟。
- [ ] 演示视频、备用截图和离线包已生成。
- [ ] `AI_DEVELOPMENT.md` 中的每条证据可定位到真实文件、提交或测试。

## 7. 推荐提交序列

```text
test: specify case engine behavior
feat: add deterministic case engine
feat: add oxygen and infection objectives
feat: lock single-player cell roles
feat: add red-white co-op cases
feat: add case editor schema
content: migrate six official cases
test: specify AI director contract
feat: add secure AI director proxy
feat: execute whitelisted AI crises
feat: add local director fallback
feat: add patient story and reports
feat: add sourced learning cards
feat: add onboarding and daily cases
feat: version case sharing
feat: add report sharing
test: expand quality and accessibility coverage
fix: balance and polish all official cases
docs: add AI development evidence
docs: update competition deck and runbook
chore: prepare release candidate
```
