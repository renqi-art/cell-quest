# 病例研究：Vue 病例设计器

设计器覆盖手动、模板、受限 AI 蓝图、节点检查器、撤销重做、实时校验、真实试玩、CQ2 导出/导入和旧存档迁移。AI 输出不能直接执行，必须通过 TypeScript 编译器和共享 schema。

复现：`npm run test:component`、`npx playwright test tests/case-preview.spec.js tests/editor-storage.spec.js`。
