# Cell Quest (细胞远征)

**Cell Quest** 是一款采用 Vue 3、Vite、TypeScript 与 Phaser 3 构建的横版病例动作游戏（保留经典模式兼容层），背景设定在奇幻的人体微观世界中。玩家将扮演不同的血细胞，抵御病原体侵袭，完成细胞远征。

## 核心特性

*   **三大主角**：白细胞（WBC）、红细胞（RBC）、血小板（PLT），每种角色拥有独特的技能树、装备和战斗风格。
*   **ATP 能源系统**：创新性的能量管理机制，能量既是货币也是生命维持资源。低能量状态将带来速度惩罚，迫使玩家在战斗与资源管理间寻找平衡。
*   **丰富关卡**：包含 6+ 个主线关卡，涵盖血管、肺部、淋巴等场景。内置**地图编辑器**，支持 AI 地图生成和自定义关卡设计。
*   **移动端适配**：触控虚拟摇杆、手势操作、viewport 自适应，支持手机浏览器畅玩。
*   **BOSS 挑战**：面对巨大的病原体BOSS，体验多阶段的战斗机制。
*   **完整系统**：技能树系统、装备系统、背包系统、成就与知识卡片系统。

## 游戏角色

1.  **白细胞 (WBC - White Blood Cell)**
    *   **定位**：近战战士，团队的核心防御力量。
    *   **能力**：拥有免疫排斥（Elastase Lance）、杀菌冲刺（Bactericidal Dash）等主动技能。
    *   **机制**：高机动性，擅长切入战场进行切割输出。

2.  **红细胞 (RBC - Red Blood Cell)**
    *   **定位**：敏捷游侠，负责运输与辅助。
    *   **能力**：氧化爆发（Oxidative Burst）、噬菌咬噬（Phagocytic Bite）。
    *   **机制**：擅长在氧气场域中发挥优势，具备回血和续航能力。

3.  **血小板 (PLT - Platelet)**
    *   **定位**：策略支援者。
    *   **能力**：筑桥（Bridge）能力，可临时搭建平台跨越障碍。
    *   **机制**：消耗能量生成 fibrin bridge，为队友创造地形优势。

## 快速开始

### 环境准备

本项目依赖 Node.js 运行环境来启动本地开发服务器（为了正确加载资源，建议通过本地服务器运行而非直接打开文件）。

### 安装与运行

1.  克隆本仓库到本地：
    ```bash
    git clone https://github.com/renqi-art/cell-quest.git
    cd cell-quest
    ```

2.  安装开发依赖并启动服务器：
    ```bash
    npm install
    npx playwright install chromium  # 首次运行测试时安装浏览器
    npm run dev
    ```

3.  浏览器访问 `http://127.0.0.1:8080`。本地服务器默认只监听回环地址；关卡保存接口仅接受合法的 `level数字_名称.js` 文件名和 JSON 请求。

### AI 地图生成

- 启动正常的 `npm run dev` 开发服务。
- 打开 `/editor.html`，点击“🤖 AI生成”。
- 通过 `/ai-settings.html` 配置 API Key，或设置 `CELL_QUEST_AI_API_KEY` 环境变量。
- 通过运行时设置页面配置的 Key 仅保留到 Node 服务器重启。
- 浏览器不会直接联系模型提供商。
- AI 不可用时不会回退到本地模板，而会显示明确错误。

### 测试

```bash
npm install
npm run dev
npm run typecheck
npm run test:unit
npm test
npm run build
npm run preview
```

> 六章病例、每日病例和 Vue 设计器试玩默认使用 Phaser；经典关卡继续由 `LegacyGameEngineAdapter` 兼容，浏览器 AI 统一走同源服务端代理。

```bash
npm test             # 浏览器核心流程、编辑器与安全回归
npm run test:server  # 本地服务器安全边界
```

### 操作说明

*   **移动**：方向键 `←` `→` 或 `A` `D`
*   **跳跃**：`空格` (Space) 或 `↑` `W`
*   **下蹲**：`↓` `S`
*   **普通攻击**：`E`
*   **突进**：`Shift`
*   **切换细胞**：`Q`
*   **技能 1–4**：数字键 `1`–`4`
*   **暂停/继续**：`P` 或 `Esc`
*   **双人模式 P2**：`J`/`L` 移动、`I` 跳跃、`K` 下蹲、`U` 攻击、`O` 突进、`Y` 切换、`7`–`0` 技能

*(注：具体按键映射可在 `js/game.js` 中查看或自定义)*

## 目录结构

*   `index.html`: 游戏主入口。
*   `editor.html`: 关卡编辑器入口。
*   `ai-settings.html`: AI API Key 配置页。
*   `css/`: 游戏样式与 UI 界面（含移动端控制层样式）。
*   `js/`:
    *   `game.js`: 游戏主逻辑、循环与场景管理。
    *   `entities.js`: 实体类定义（玩家、敌人、Boss、道具）。
    *   `config.js`: 游戏数值配置（物理引擎、技能参数、掉落表）。
    *   `levels/`: 官方关卡数据定义。
    *   `mobile/`: 移动端适配（设备检测、触控输入、虚拟控件）。
*   `server/`: 后端模块（AI 地图生成器、AI director）。
*   `docs/design/`: 设计文档（瓦片参考手册、关卡设计原则）。
*   `images/`: 游戏素材图片与精灵图。
*   `audio/`: 背景音乐与音效。

## 开发与扩展

### 关卡设计

游戏内置了强大的关卡编辑器。在主菜单或通过 `editor.html` 访问，你可以：
*   使用瓦片（Tiles）绘制地形。
*   设置敌人分布与陷阱。
*   放置道具与出口。
*   导出/导入 JSON 关卡代码进行分享。

### Modding

游戏数据（如装备属性、技能数值）主要集中管理在 `js/config.js` 和 `js/levels.js` 中，开发者可以通过修改这些文件快速调整游戏平衡或添加新内容。

### 瓦片参考

关卡设计中所有可用瓦片的完整说明见 [瓦片参考手册](docs/design/tile-reference.md)，包含 30 种瓦片的渲染、碰撞、游戏效果、编辑器色值及设计模式。

## 技术栈

*   **前端框架**: Vue 3.5 (Composition API)
*   **游戏引擎**: Phaser 3
*   **构建工具**: Vite 8 + TypeScript
*   **状态管理**: Pinia 4
*   **动画库**: Motion (Framer Motion)
*   **后端服务**: Node.js (本地资源加载 + 关卡保存 + AI 地图生成代理)
*   **传统模式**: 原生 HTML5 Canvas API + JavaScript (ES6+) 兼容层

## 许可

本项目遵循 MIT License 开源协议。

---

*细胞远征 (Cell Quest) - 探索微观世界，守护人体健康。*
