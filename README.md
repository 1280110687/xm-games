# XM-Games

XM-Games 是一个基于 Next.js 的多语言浏览器小游戏合集，支持中文、英文和泰文。

## 功能概览

- 棋盘游戏：中国象棋、国际象棋、围棋、五子棋、黑白棋
- 益智游戏：扫雷、2048、数独、记忆翻牌
- 街机游戏：俄罗斯方块、贪吃蛇、霓虹打砖块（PixiJS）
- Bingo：号码抽取、语音播报、卡片管理与语音录入
- 工具：追番助手（中文资料库搜索、进度管理和离线缓存）
- 双主题：主题一保留霓虹深色界面，主题二提供 iOS 灵感浅色界面

## 主题与布局

- 主题一和主题二共用游戏规则、对局状态与本地数据，但分别拥有独立的颜色、组件外观、页面间距、排版和响应式布局。
- 主题一保留页头主题与语言工具；主题二通过独立设置页集中管理，并在移动端使用“首页 / 游戏 / 追番 / 设置”四栏底部导航。设置保存在 `xm-games-theme:v1`，刷新、路由跳转和重新打开页面后会继续使用上次选择。
- 主题切换只改变展示壳层，不会重新挂载游戏控制器，因此不会重置棋盘、分数、计时器、语音实例或 PixiJS 画布。
- `app/theme-one.css` 和 `app/theme-two.css` 分别维护两套视觉与布局；`data-page` 为每个路由提供独立的布局接入点。

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

主题与语言偏好、动漫追踪记录、旧版封面 URL 索引、贪吃蛇最高分、2048 最高分、记忆翻牌最佳记录和霓虹打砖块最高分保存在当前浏览器的 `localStorage` 中；可下载的封面文件会优先写入 Cache Storage 或 IndexedDB。这些数据不会自动同步到其他浏览器或设备；清除站点数据、使用隐私模式或浏览器限制存储时，记录可能丢失或无法持久化。

### 追番助手兼容与离线策略

- 原有追番记录继续使用 `xm-games-anime-tracker`，顶层仍是数组，已有的 `id`、`title`、`totalEpisodes`、`currentEpisode`、`status`、`type`、`rating`、`notes`、`imageUrl`、`addedAt` 和 `updatedAt` 字段保持兼容。
- 读取旧数据时按记录逐条恢复；遇到损坏内容会先创建原始备份，并阻止空数据覆盖原记录。
- 手动添加、编辑、筛选和进度管理不依赖网络。在线搜索以 Bangumi 中文资料库为主、Jikan 为兜底；查询结果会缓存在本地，断网后可继续查看已经搜索过的结果。
- 选中的封面会尝试写入 Cache Storage 或 IndexedDB。第三方图片服务器不允许跨域缓存时仍会保留原始 `imageUrl`，联网状态下正常显示；未来打包原生 App 时可通过现有搜索和封面适配层接入原生下载能力。
- 搜索逻辑完全运行在客户端，不依赖 Next.js 服务端 API，方便后续静态导出或封装为离线 App。
