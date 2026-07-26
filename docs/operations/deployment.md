# 部署与回滚

《细胞远征》4.0 使用 Node.js 24、Vite 8、Vue 3、TypeScript 与 Phaser 3。浏览器不得持有 AI 密钥；在线 AI 只通过同源 `/api` 服务访问。

## 本地与生产预览

```powershell
npm ci
npx playwright install chromium
npm run test:all
npm run build
npm run preview
```

浏览器入口为 `http://127.0.0.1:8080`，受限 API 服务默认监听 `127.0.0.1:8081`。健康检查为 `GET /healthz`，只返回服务名、版本和 AI 是否配置，不返回密钥、上游地址或本地路径。

生产环境通过环境变量注入 `.env.example` 中列出的名称。`CELL_QUEST_AI_API_KEY` 只能存在于服务端进程环境。反向代理必须保持 `/api/*` 和 `/healthz` 同源，并启用 HTTPS。

## 发布检查

1. 冻结候选 SHA，使用 `npm ci` 在干净目录安装。
2. 执行 `npm run test:all` 和 `npm run package:offline`。
3. 在线部署必须记录候选 SHA、URL、健康检查响应和部署时间。
4. 冒烟检查首页、病例中心、一个 Phaser 病例、本地导演回退、结算报告、Vue 病例设计器和 CQ2 往返。
5. 公开写接口保持正文大小、类型和频率限制。

## 离线演示

`npm run package:offline` 只从 `dist/` 和白名单启动器生成 `release/cell-quest-offline-4.0.0/`。包内不含 `.git`、`.env`、API Key、测试缓存、用户数据或 `audit/`。在包目录运行：

```powershell
node server.cjs
```

然后访问 `http://127.0.0.1:4173`。在线 AI 不可用时，浏览器会明确显示“本地导演”并继续同一病例。

## 回滚

保留前一个已验收 tag 和对应离线包 hash。若线上冒烟失败，先将流量切回前一 tag，再保存失败响应、部署 SHA 和时间；不得在已验收构建上直接热改文件。任何源码、配置、内容或构建输入变化都产生新候选并重跑 Gate A/B。
