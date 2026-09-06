# 工程结构与构建约定

## 边界

Next.js 主站仍位于仓库根目录，不为目录整齐额外迁移应用入口。`app/` 负责路由组装，业务界面与对应规则、控制器放在 `features/<功能>/`；通用组件保留在 `components/`，基础 UI 保留在 `components/ui/`。四套主题宿主统一在 `features/themes/`，主题样式统一在 `styles/themes/`。全局重置与 PWA 安全区仍在 `app/`，不改变原有样式加载顺序。

主题四的 `index.css` 聚合 `utilities.css`、`settings.css` 和 `pwa.css`，分别负责宿主工具工作台、设置页与安装提示的结构样式；这些文件均限定在 `data-theme='theme-four'`，不进入 3D iframe，也不覆盖前三个主题。新增主题不能只换配色，必须补齐工具工作区、输入/结果区域及共享提示的布局契约。

两个 3D 应用是维护中的产品源码，不是不可改动的 vendor 快照：

| 工作区 | 责任 | 稳定发布 URL |
| --- | --- | --- |
| `apps/theme-four-world` | React Three Fiber 世界、镜头、房间、场景 UI | `/theme-four-experience/` |
| `apps/elemental-arena` | Three.js 技能、动画、瞄准、特效与编辑器 | `/theme-four-experience/elemental-arena/` |
| `packages/experience-bridge` | 主站与世界场景的消息类型、上下文校验 | 无独立入口 |

主站拥有主题、语言、游戏目录和路由；世界只向父窗口请求允许的游戏路由。世界与竞技场继续通过 iframe 隔离生命周期及不同版本的 Three.js，不合并渲染器或强制统一依赖。收到消息必须检查来源窗口及同源条件。不要在主站直接导入 3D 应用源码。

## 素材只有一个维护位置

每个 3D 应用的 `public/` 保存该应用的原始素材和需要随包发布的许可证。Vite 构建各自产生 `dist/`，根脚本组装到 `public/theme-four-experience/`。主站自有的 `public/theme-four/` 仍由主站维护，不能把它与生成目录混淆。

`dist/`、`public/theme-four-experience/` 和 `public/offline-assets.json` 均不提交。不要修改输出中的哈希文件，也不要把发布目录当成素材源。上游来源和许可证保留在应用目录内；世界应用 README 中关于上游个人素材的额外使用限制仍然有效，本次整理不代表取得额外授权。

## 开发与生产

`pnpm dev` 启动两个仅监听本机的 Vite 服务（4174、4175），就绪后启动 Next.js。仅该命令启用开发代理，优先匹配竞技场，再匹配世界，让浏览器继续通过主站的相同 URL 访问 iframe。`pnpm dev:host` 是只开发主站的可选入口，使用预先构建的静态 3D 包。

生产顺序固定为：两个 Vite 构建 → 暂存组装 → 校验入口引用 → 替换发布目录 → 生成离线清单 → Next.js 构建。任一 Vite 构建或暂存校验失败，都不会覆盖上一次发布目录；替换失败会尝试恢复原目录。清单必须在素材同步之后生成，不能拿旧清单部署新资源。

`pnpm build` 和 `pnpm cf:build` 都通过这条链路，可从没有生成物的检出目录重建。不要直接运行 `next build` 或裸 `wrangler deploy` 绕过它。部署根目录继续选择仓库根目录。

## 检查与离线

- `pnpm lint`：主站规则加两个应用的 JavaScript 正确性检查。旧 JSX 应用暂不强制未使用变量检查，避免把引擎回调参数与 JSX 标识符误判为错误。
- `pnpm typecheck`：主站及共享协议；不宣称覆盖 JavaScript 3D 应用。
- `pnpm test`：先生成离线素材，再运行测试，避免依赖仓库中预存的发布产物。
- `pnpm verify`：静态检查、完整生产构建及测试。

变更后还需检查四套主题的主站页面、主题四双层 iframe、场景退出清理和 PWA 离线进入二级页面。开发模式不验证生产 Service Worker；离线回归必须在生产构建服务上执行。更新离线资源组织时同步调整 `public/sw.js` 的缓存版本。联机信令、第三方搜索和未完成下载的资源不具备离线保证。
