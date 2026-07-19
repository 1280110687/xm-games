# XM-Games

XM-Games 是一个基于 Next.js 的多语言浏览器小游戏合集，支持中文、英文和泰文。

## 功能概览

- 棋盘游戏：中国象棋、国际象棋、围棋、五子棋、黑白棋
- 益智游戏：扫雷、2048、数独
- 街机游戏：俄罗斯方块、贪吃蛇
- Bingo：号码抽取、语音播报、卡片管理与语音录入
- 工具：动漫追踪器

## 本地开发

环境要求：

- Node.js `>= 20.9.0`
- pnpm `10.30.2`（建议通过 Corepack 使用项目声明的版本）

```bash
corepack enable
pnpm install
pnpm dev
```

开发服务默认运行在 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```bash
pnpm dev        # 启动开发服务器
pnpm build      # 生成生产构建
pnpm start      # 启动生产服务器（需先 build）
pnpm lint       # 执行 ESLint 检查
pnpm typecheck  # 执行 TypeScript 类型检查
pnpm test       # 运行 Vitest 测试
pnpm test:watch # 监听模式运行测试
```

## 主要目录

```text
app/         页面、路由、布局与全局样式
components/  游戏界面及通用 UI 组件
features/    可独立测试的游戏规则与逻辑引擎
lib/         国际化、页面元数据与通用工具
```

## 语音功能

Bingo 使用浏览器的 Web Speech API：号码抽取支持语音合成播报，Bingo 卡片支持语音识别录入。语音识别的可用性取决于浏览器，建议使用支持该能力的最新版 Chromium 浏览器（如 Chrome 或 Edge）；首次使用时需要允许麦克风权限。不支持或拒绝授权时，仍可使用手动输入等非语音功能。

## 本地数据

语言偏好、动漫追踪记录与图片缓存、贪吃蛇最高分、2048 最高分保存在当前浏览器的 `localStorage` 中。这些数据不会自动同步到其他浏览器或设备；清除站点数据、使用隐私模式或浏览器限制存储时，记录可能丢失或无法持久化。
