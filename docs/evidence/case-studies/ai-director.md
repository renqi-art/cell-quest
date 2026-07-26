# 病例研究：安全 AI 导演

输入只包含病例 ID、模式、阶段、运行 ID、游戏化指标、死亡/时间、允许事件和有效节点。服务端计划通过精确键集合、范围、节点白名单和文本安全校验；任何失败进入本地确定性导演。Vue 危机卡始终显示来源、阶段、理由和目标。

复现：`npm run test:director`、`npx playwright test tests/campaign.spec.js`。
