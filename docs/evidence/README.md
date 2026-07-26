# 《细胞远征》4.0 评委证据入口

一句话：玩家以红细胞和白细胞协作稳定同一名患者，AI 导演在安全白名单内调整病情，并可在 Vue 病例设计器中生成、校验、试玩和分享新病例。

## 60 秒导航

- 测试与候选 SHA：[TEST_REPORT.md](TEST_REPORT.md)
- 八项评分映射：[SCORING_CROSSWALK.md](SCORING_CROSSWALK.md)
- 六章人工 QA：[../qa/manual-case-results.md](../qa/manual-case-results.md)
- 性能预算与结果：[../qa/performance-budget.md](../qa/performance-budget.md)
- AI 开发与运行时边界：[../../AI_DEVELOPMENT.md](../../AI_DEVELOPMENT.md)
- 四分钟脚本：[../demo/LIVE_DEMO_SCRIPT.md](../demo/LIVE_DEMO_SCRIPT.md)
- 故障切换：[../demo/FAILOVER_RUNBOOK.md](../demo/FAILOVER_RUNBOOK.md)
- 结构化证据索引：[evidence-index.json](evidence-index.json)
- 发布状态：[RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md)

## 当前状态

- 本地自动化、生产构建和白名单离线打包工具：已实现。
- 在线正式 URL、部署 SHA、90 秒视频、实体参考机签字、六章真实手工通关、三次彩排：`PENDING`。
- 因此实现线程不会宣称 `GATE A: PASS`、`GATE B: PASS` 或 `RELEASE APPROVED`。
