# 病例研究：Phaser 迁移

官方病例和每日病例默认进入懒加载 Phaser Arcade Physics 适配器；Vue 负责战役、危机卡、HUD 和结算。经典关卡继续通过 Legacy 适配器保持兼容。生命周期测试重复进入/退出二十次，并检查单一画布；性能测试覆盖普通与压力病例各 30 秒。

复现：`npx playwright test tests/phaser-lifecycle.spec.js tests/performance.spec.js`。
