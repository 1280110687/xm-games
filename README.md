# XM-Games

XM-Games 是一个基于 Next.js 的多语言浏览器小游戏合集，支持中文、英文和泰文。

## 功能概览

- 棋盘游戏：中国象棋、国际象棋、围棋、五子棋、黑白棋
- H5 联机：五子棋支持房间码 / 二维码加入、双方公平掷骰决定黑方、断线重连与棋盘一致性校验
- 益智游戏：扫雷、2048、数独、记忆翻牌
- 街机游戏：俄罗斯方块、贪吃蛇、霓虹打砖块（PixiJS）
- Bingo：号码抽取、语音播报、卡片管理与语音录入
- 工具：追番助手、AES-GCM 文本加解密、文字二维码、JSON 格式化、UTF-8 Base64 编解码、文本整理与统计
- 三套主题：霓虹深色大厅、iOS 灵感浅色应用、曜石绿玻璃工作台

## 主题与布局

- 三套主题共用游戏规则、对局状态与本地数据，但分别拥有独立的颜色、组件外观、页面间距、排版和响应式布局。
- 主题一保留页头主题与语言工具；主题二通过独立设置页集中管理，并在移动端使用“首页 / 游戏 / 追番 / 设置”四栏底部导航。设置保存在 `xm-games-theme:v1`，刷新、路由跳转和重新打开页面后会继续使用上次选择。
- 主题三采用纯黑画布、银灰玻璃边缘和荧光绿状态色：桌面端使用独立固定侧栏与高密度控制台，移动端重排为单列工作台和悬浮玻璃底栏。
- 主题切换只改变展示壳层，不会重新挂载游戏控制器，因此不会重置棋盘、分数、计时器、语音实例或 PixiJS 画布。
- `app/theme-one.css`、`app/theme-two.css` 和 `app/theme-three.css` 分别维护三套视觉与布局；经典 2048 / Tetris 也拥有对应的独立主题文件，`data-page` 为每个路由提供布局接入点。

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

## H5 局域网对战

- 五子棋、国际象棋、中国象棋、围棋和黑白棋都支持局域网对战。创建者和加入者直接使用手机 H5；邀请链接只包含 6 位房间码，不包含鉴权令牌。
- Next.js 信令接口只转发 WebRTC 的 Offer、Answer 和 ICE Candidate；落子、骰子随机数及棋盘状态通过加密的可靠有序 `RTCDataChannel` 在两台设备间传输。
- 先手骰子使用 commit-reveal：双方先锁定随机数，再共同公开和复算结果；两端确认同一 proof 后，点数较大的一方取得该棋种先手（国际象棋执白、中国象棋执红，其余棋类执黑）。同点会使用新的随机数重掷。
- 每个房间都绑定棋种与规则引擎版本，输错其他棋种的房间码不会占用对方客席。每次行动都要经过对端规则校验与 ACK 后才提交；重连时会从紧凑行动历史重放棋盘并核对 revision 和状态哈希，非法快照不会覆盖本机状态。
- 默认不配置公网 STUN / TURN，优先面向同一局域网内的设备。若部署环境需要额外 ICE Server，可设置逗号分隔的 `NEXT_PUBLIC_LAN_ICE_SERVERS`。真实手机访问应使用 HTTPS。
- 房间有效期只由创建者心跳续期；加入者失联约 45 秒后会自动释放席位并清理旧协商信令，新的玩家可使用同一房间码加入。
- Vercel 部署使用 Upstash Redis 共享房间、租约和 WebRTC 信令，避免不同 Function 实例之间出现房间丢失。Redis 只保存短期建连信息，对局操作仍通过两台设备间的 `RTCDataChannel` 传输。
- 本地开发和测试未配置 Redis 时使用进程内存实现；若同时配置 `UPSTASH_REDIS_REST_URL` 与 `UPSTASH_REDIS_REST_TOKEN`，本地也会使用 Redis。Vercel 环境缺少其中任一变量时接口会明确返回 `503`，不会静默回退到不可靠的进程内存。
- PWA 离线缓存可以打开已缓存的页面和本机玩法，但创建或加入联机房间仍需要能够访问同一信令服务。

### Vercel Hobby 免费部署

本项目不要求升级 Vercel 套餐。Vercel Marketplace Storage 对 Hobby 计划开放，低频熟人对局可选择 Upstash Redis 的 Free 计划：

1. 打开 Vercel 项目，在 **Storage / Create Database** 中选择 **Upstash Redis**；也可从 [Vercel Marketplace 的 Upstash 页面](https://vercel.com/marketplace/upstash)安装。
2. 创建 Redis 数据库时明确选择 **Free**，并连接到当前 XM-Games 项目。数据库区域尽量选择接近 Vercel Function 的区域。
3. 在项目的环境变量页面确认已自动注入 `UPSTASH_REDIS_REST_URL` 与 `UPSTASH_REDIS_REST_TOKEN`。这两个变量必须只存在于服务端环境，禁止改成 `NEXT_PUBLIC_*` 或写入代码。
4. 环境变量只会对新部署生效；连接完成后重新部署一次，再用两个手机创建一个全新房间测试。部署前创建的内存房间不能迁移。

需要在本地连接同一个 Redis 时，可将 `.env.example` 复制为 `.env.local` 后填写两项服务端变量，也可以在已关联 Vercel 项目的目录运行 `vercel env pull .env.local`。`.env.local` 已被 Git 忽略，不得提交或在日志中输出其内容。

Upstash 当前 Free 计划包含每月 500,000 条命令、256 MB 数据和 10 GB 带宽，额度可能调整，请以 [Upstash Redis 实时价格页](https://upstash.com/pricing/redis)为准。信令客户端会在协商阶段快速轮询，并在空闲或连接稳定后降低频率；因此免费方案面向个人、测试和低频熟人对局，不适合大量房间长期同时在线。请在 Upstash 控制台查看 Commands 与 Bandwidth，用量接近上限时减少并发或结束闲置房间，而不是启用付费自动升级。

部署后若加入或心跳返回 `503`，优先检查两项 Redis 环境变量是否同时存在并已重新部署；若返回 `404 ROOM_NOT_FOUND`，确认测试使用的是重新部署后新建的房间，并检查 Upstash 请求日志。所有信令接口为 `200` 但 WebRTC 仍无法连接时，再检查手机热点的客户端隔离以及 STUN/TURN 配置。

## 语音功能

Bingo 使用浏览器的 Web Speech API：号码抽取支持语音合成播报，Bingo 卡片支持语音识别录入。语音识别的可用性取决于浏览器，建议使用支持该能力的最新版 Chromium 浏览器（如 Chrome 或 Edge）；首次使用时需要允许麦克风权限。不支持或拒绝授权时，仍可使用手动输入等非语音功能。

## 本地数据

主题与语言偏好、动漫追踪记录、旧版封面 URL 索引、贪吃蛇最高分、2048 最高分、记忆翻牌最佳记录和霓虹打砖块最高分保存在当前浏览器的 `localStorage` 中；可下载的封面文件会优先写入 Cache Storage 或 IndexedDB。这些数据不会自动同步到其他浏览器或设备；清除站点数据、使用隐私模式或浏览器限制存储时，记录可能丢失或无法持久化。

文本加解密、二维码、JSON、Base64 和文本整理工具不会把输入内容、密码或处理历史写入本地存储，也不会发送到服务器。文本加密使用 Web Crypto 的 PBKDF2-HMAC-SHA-256 与 AES-256-GCM；二维码由随应用打包的本地生成器完成；JSON 格式化会保留超大整数字面量与重复键，Base64 按 UTF-8 字节处理多语言和 Emoji。H5 已提供 Web App Manifest 与 Service Worker，可安装到桌面并缓存首页、五子棋页面及版本化静态资源；首次加载、更新缓存以及未访问过的页面仍需要网络。局域网信令接口、SDP、ICE Candidate 和房间令牌不会写入离线缓存。Base64 只是一种编码格式，不提供加密保护。

### 追番助手兼容与离线策略

- 原有追番记录继续使用 `xm-games-anime-tracker`，顶层仍是数组，已有的 `id`、`title`、`totalEpisodes`、`currentEpisode`、`status`、`type`、`rating`、`notes`、`imageUrl`、`addedAt` 和 `updatedAt` 字段保持兼容。
- 读取旧数据时按记录逐条恢复；遇到损坏内容会先创建原始备份，并阻止空数据覆盖原记录。
- 手动添加、编辑、筛选和进度管理不依赖网络。在线搜索以 Bangumi 中文资料库为主、Jikan 为兜底；查询结果会缓存在本地，断网后可继续查看已经搜索过的结果。
- 选中的封面会尝试写入 Cache Storage 或 IndexedDB。第三方图片服务器不允许跨域缓存时仍会保留原始 `imageUrl`，联网状态下正常显示；未来打包原生 App 时可通过现有搜索和封面适配层接入原生下载能力。
- 搜索逻辑完全运行在客户端，不依赖 Next.js 服务端 API，方便后续静态导出或封装为离线 App。
