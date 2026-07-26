# 4.0 发布候选检查表

## 自动化

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npm run test:component`
- [ ] `npm run test:director`
- [ ] `npm run test:server`
- [ ] `npm run test:content`
- [ ] `npm run test:offline`
- [ ] `npm test`
- [ ] `npm run validate:content`
- [ ] `npm run validate:evidence`
- [ ] `npm run build`
- [ ] `npm run package:offline`

## 手工 Gate A

- [ ] 六章分别真实单人通关并生成报告
- [ ] 至少一个病例双人通关和角色交换
- [ ] Vue 设计器手动/模板/AI/导入、撤销重做、校验、试玩、CQ2 往返
- [ ] 旧存档、旧关卡、自定义关卡和分享码兼容
- [ ] AI 在线、安全、本地回退与来源标识
- [ ] Phaser 手感、暂停/恢复/重试/退出、20 次生命周期
- [ ] 参考机性能、键盘、焦点、对比度、缩放、减少动态、音频
- [ ] P0 = 0，P1 = 0；P2 有记录

## 已知代码门禁

- [ ] 将经典敌人、尖刺、弹簧、道具、子弹、冲刺、动态相机和音频迁入最终 Phaser adapter
- [ ] 在最终 Phaser adapter 上复跑对应的经典行为基线

## Gate B

- [ ] 在线 URL、健康响应、部署 SHA 和时间
- [ ] 离线包、manifest、SHA-256 和干净机器启动
- [ ] 30 秒内故障切换
- [ ] 90 秒视频、备份截图和四分钟脚本
- [ ] 连续三次小于 4 分 30 秒彩排
- [ ] 证据索引、测试报告和评分映射对应候选 SHA

实现线程只准备候选和证据；Gate A/B PASS 必须由隔离、只读的独立验收智能体签发。
