# Phaser 性能预算与测量

自动化入口：`npx playwright test tests/performance.spec.js`

预算：

- 普通病例 30 秒：median ≤ 16.7 ms，p99 ≤ 22.2 ms。
- 压力病例 30 秒：p99 ≤ 33.3 ms。
- 正式人工验收还需在指定参考机记录 1% low FPS，目标不低于 45 FPS。

2026-07-26 当前开发机自动化结果：

| 场景 | 样本 | median | p99 | 结果 |
|---|---:|---:|---:|---|
| 第一章普通病例 | 4297 | 6.90 ms | 10.80 ms | PASS |
| 第六章压力病例 | 4785 | 6.20 ms | 10.00 ms | PASS |

Playwright 的虚拟显示器默认把 `requestAnimationFrame` 限制在约 30 Hz，因此配置显式关闭无头虚拟显示限帧和垂直同步，测量渲染容量。该结果不是实体显示器上的手感签字，也不代替最终验收智能体在参考机上的 1% low、输入延迟与视觉检查。
