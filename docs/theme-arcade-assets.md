# 主题一：街机编辑部插画

2026-09-14。用户选择的第三张视觉样稿：
`/Users/mimi/.codex/generated_images/019feb77-4fc5-7a12-9663-08490176993a/exec-9df62f15-109c-4600-aac0-984e2af2323e.png`。

使用内置 ImageGen 独立生成、逐张检查；没有用 CSS／自绘 SVG 替代插画。
部署文件位于 `public/images/theme-arcade/`；原始 PNG 移到被忽略的
`output/theme-arcade-2026-09-14/sources/`，没有删除原稿。
通过 cwebp 进行尺寸与编码优化，五张资源合计约 61 KB。
页面使用同源静态 WebP，不依赖在线图片转换接口；完整离线包包含这五张图。

| 资源 | 成品尺寸 | 最终生成提示词摘要 |
| --- | --- | --- |
| bingo.webp | 600×638 | 从所选样稿重建宾果球笼，粗黑漫画描边，薄荷色 3、黄色 7、珊瑚色 5；珊瑚底；没有页面文字或按钮 |
| tiles.webp | 400×400 | 倾斜的四个 2048 方块：白色 2、黄色 4、珊瑚色 8、薄荷色 16；黑色边线与硬阴影；黄色底 |
| snake.webp | 400×400 | 珊瑚色分节小蛇、大白眼睛、粗黑轮廓、三个黄色食物点、薄荷底；无 UI 文字 |
| tetris.webp | 144×144 | 黑底俄罗斯方块缩略图，薄荷／珊瑚／黄色积木，清晰粗黑网格；没有文字 |
| gomoku.webp | 144×144 | 暖橙棋盘、黑色粗网格与外框，两颗白子、两颗黑子；无 UI 文字 |

所有提示都附上所选第三张样稿作为风格与构图参考。原始生成结果约 1254px，
不是提示中请求尺寸；生产尺寸以实际 WebP 为准。插画背景有轻微颜色变化，非透明图。

文字沿用项目已托管的 Geist Sans／Mono 与系统中泰文回退，不新增字体请求。
参考：[Geist 官方仓库](https://github.com/vercel/geist-font)。
常规界面图标经比对沿用项目的 Lucide，以较粗轮廓匹配样稿：
[Gamepad2](https://lucide.dev/icons/gamepad-2)、[Lucide 授权](https://lucide.dev/license)。
