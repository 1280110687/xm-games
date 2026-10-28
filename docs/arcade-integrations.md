# 六款全屏街机

六款游戏分别保存在 `apps/arcade-*`，`upstream/` 是固定上游版本的选取源码，`src/` 是本站适配。原作者、提交版本、保留玩法及修改范围见各应用的 `NOTICE.md`。不在主站首屏导入六个游戏包。

| 路由 | 原作 | 手机操作 |
| --- | --- | --- |
| `/galaga` | Retro Pocket Games / Galaga | 拖动移动并开火，或使用左右与射击按钮 |
| `/bubbo-bubbo` | PixiJS Open Games / Bubbo Bubbo | 按住瞄准，松手发射 |
| `/puzzling-potions` | PixiJS Open Games / Puzzling Potions | 滑动交换材料，点击特殊魔药 |
| `/deep-field` | Deep Field | 选择防御塔，点按或长按空地建造，点塔升级 |
| `/pinball-schminball` | Pinball Schminball | 左右挡板支持同时按住，轻推按钮可推球桌 |
| `/radius-raid` | Radius Raid | 左侧摇杆移动，自动瞄准或手动开火 |

`ImmersiveGame` 将同源 iframe 放入覆盖可用视口的宿主，隐藏网站壳层并隔离背景焦点。宿主只提供一个 44px 退出按钮，支持拖动避让、旋转后限位及键盘操作。全屏采用 `100dvh`，不依赖浏览器要求用户手势的 Fullscreen API；Safari 地址栏由浏览器管理，PWA 独立窗口没有该地址栏。

`packages/arcade-bridge` 校验同源父窗口、游戏标识和主题颜色，传递主题、语言、暂停及就绪状态。主题变化不重建规则控制器。后台暂停和页面缓存恢复需要分别处理，`pagehide.persisted` 不应销毁游戏。`window.xmArcadeState` 仅提供只读诊断快照。

`pnpm build:arcade` 构建六款游戏，检查本地启动入口及许可文件，暂存后整体替换 `public/arcade-games/`。每款发布目录包含许可证、依赖说明和保持工作区目录结构的修改后源码归档。此目录是生成物，不应手工维护。

离线清单收录游戏运行文件，源码压缩包不加入离线预取。增加路由、资源或修改发布内容时同步维护 Service Worker 版本。Bubbo、Puzzling Potions 和 Pinball 的原站美术、字体及音乐没有随项目分发，使用本地程序绘制和合成资源；Deep Field 仅开放单人战役。
