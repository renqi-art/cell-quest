# 八项评分证据映射

| 模块 | 主张与实现 | 演示时刻 | 源文件 / 测试 / 提交 | 限制 |
|---|---|---|---|---|
| AI 方向 | 白名单病例蓝图、两阶段病情导演、确定性回退 | 危机卡来源与 Vue AI 生成 | `CaseDirectorClient.ts`、`AiCaseDesignerClient.ts`、`tests/director.test.cjs`、`17f2d20` | 本地导演不是在线 AI |
| 玩法方向 | 患者指标、运输/清除、危机目标、稳定倒计时 | 第一章与第五章 | `CaseEngine.ts`、`PhaserGameEngineAdapter.ts`、`tests/unit/case-engine.spec.ts` | 经典模式仍经兼容适配器 |
| 产品方向 | 引导、六章旅程、每日病例、进度、结算 | 病例中心到报告 | `GameApp.vue`、`CaseProgressRepository.ts`、`tests/onboarding.spec.js`、`303df1f` | 排行榜与账号不是首发依赖 |
| 玩家方向 | RBC/WBC/双人职责、键盘入口、失败重试 | 第五章协作 | `PhaserGameEngineAdapter.ts`、`tests/phaser-lifecycle.spec.js` | 手工角色交换仍需独立签字 |
| 行业方向 | 可审查来源、免责声明、版本化内容包 | 病例来源链接 | `content/core-pack.json`、`tests/content-validation.test.cjs` | 不是诊断或治疗工具 |
| 主题契合度 | 以细胞职责稳定同一名患者 | 六章患者康复线 | `official-cases.ts`、`tests/unit/official-cases.spec.ts` | 所有指标均为游戏化抽象 |
| AI 使用情况 | 开发期和运行时 AI 分开披露 | 打开 AI 开发证据 | `AI_DEVELOPMENT.md`、`tests/security.spec.js` | 私有聊天原文未归档，不补写 |
| 游戏质量 | 类型、Lint、领域/组件/E2E、性能、离线包 | 测试报告 | `tests/performance.spec.js`、`tests/offline-demo.test.cjs` | 实体机与线上最终验收 PENDING |

截图与视频只作为快速导航，测试、源文件和提交才是可复现证据。每项提交均能用 `git show <sha>` 定位。
