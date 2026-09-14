# 追剧清单跨设备拷贝

## 使用与边界

追番助手 →「跨设备拷贝」：发送端生成 10 位随机字母码，接收端输入码、预览并确认。二维码在浏览器内生成，不调用外部二维码服务。收件端默认保留本机冲突记录，可逐条选择使用收到的记录或两条都保留。相同 ID 优先匹配，其次是标准化标题与类型；多义匹配不允许自动覆盖。

这是一次性拷贝，不是账号同步。原设备的数据不删除；生成、领取、完成确认需要联网，本机已有追剧清单仍沿用原来的离线能力。包含清单、进度、状态、评分、备注、HTTP(S) 封面地址及兼容的未知 JSON 字段；不传输封面缓存、data/blob 图片、主题或游戏数据。

二维码使用 `/anime-tracker#transfer=…`，不把短码放进查询参数或服务器请求 URL。页面仅预填接收码，不自动领取，并立即清理地址片段。扫码通常会打开浏览器；需要导入安装版 PWA 时，应在目标 PWA 内手动输入短码，避免存入另一个浏览器容器。

短码是领取凭据，不应公开分享。数据会暂存在本应用已配置的 Upstash Redis，最多 10 分钟；本功能不宣称端到端加密。接收端领取后锁定到该标签页的接收标识，同一标签页可重试，其他接收标识不能再读取。首次生成的到期时间不会因重试延长。

领取和完成时使用 Redis `KEEPTTL` 保留键的原始过期时间，不依靠应用实例时钟重新计算 TTL，避免时钟偏差或网络延迟把临时数据的保留时间拉长。

## 持久化与失败保护

1. 领取后重新读取本机清单，生成预览；本机存储损坏或受保护时停止导入。
2. 确认时检查原始存储内容仍与预览一致，变化则要求重新检查，不覆盖较新的数据。
3. 先保存导入前的原始 JSON 备份，再写入合并结果并回读确认；任一步失败都不发送完成回执。
4. 只有本机保存成功后才发出完成回执。Redis 原子移除清单正文，仅保留到原到期时间的小型完成凭据供重试。
5. 回执网络失败时显示「重试完成确认」，不重复写入；到期后的回执视为云端临时数据已失效。关闭标签页会丢失页面的待确认状态，但已保存清单和备份不受影响，云端正文最迟原到期时间失效。

沿用主存储键 `xm-games-anime-tracker`；专用备份键 `xm-games-anime-transfer-backup-v1` 包含 `version / transferId / savedAt / before / after`。`before` 为完整原值（或 null），`after` 用于确认重试已落盘；一次成功导入只保留最近一份备份，未变更或相同传输重试不会覆盖它。备份写入同样占用本机配额，空间不足时停止导入。接收页可下载导入前 JSON；本阶段没有新增通用备份文件恢复入口。

同源其他标签页会通过原生 `storage` 事件刷新列表；这不提供两台设备的实时同步，也不替代跨标签页所有操作的数据库事务。

## 服务端协议与配额

入口为 `POST /api/anime-transfer`，仅接受同源 `application/json`，响应 `Cache-Control: no-store`。现有 Service Worker 不缓存 POST/API 数据。所有凭据仅在服务器读取，客户端不直连 Redis，不记录正文、短码或提供方错误详情。

| action | 输入 | 结果 |
| --- | --- | --- |
| create | UUID v4 requestId、version=1 payload | code、expiresAt |
| claim | code、UUID v4 receiverId | transferId、expiresAt、payload |
| complete | code、同一 receiverId | completed=true |

使用独立命名空间 `xm-games:{anime-transfer}:v1`，与游戏信令隔离。短码使用 23 字母表（排除 I/L/O）与加密安全随机数。Redis 数据键、请求标识、接收标识、限流来源经过 SHA-256；创建幂等凭据需保留返回码供同一请求重试。所有领取、完成和容量检查在单次 Lua 脚本中原子执行，清单作为原始 JSON 字符串存储，防止 Lua JSON 转换破坏扩展字段中的空数组。

- 单次最多 500 条、512 KiB JSON；HTTP 流式正文最多额外允许 2 KiB 协议包装。
- 已知字段严格校验；未知字段仅接受有界的安全 JSON，拒绝原型相关键，整体深度与字节数均受限。
- 最多 32 份活跃清单（最多约 16 MiB 正文，不含 Redis 元数据），TTL 为 10 分钟。
- 每 10 分钟来源额度：创建 5、领取 30、完成 60；全局额度分别为 60、300、180。超限返回 429 与 Retry-After。
- 仅在 Vercel 平台标识存在时信任平台覆盖的 `x-vercel-forwarded-for`；显式 Cloudflare Worker 模式信任 `cf-connecting-ip`。未知代理统一使用保守共享额度，不信任任意 `x-forwarded-for`。
- 同源检查使用协议及目的 Host，不信任 `x-forwarded-host`；反向代理需保留正确的目的 Host 与协议。

复用现有 `UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN`，或现有 KV REST 对应服务端配置。生产配置缺失、配置不完整或服务异常时返回 503，绝不悄悄降级到进程内存。仅纯本地 development 且无共享存储要求、无 Redis 配置时使用内存实现。开发内存测试不能证明生产多实例数据共享。

限流与容量限制只约束本功能，不代表能保护整个共享 Redis 套餐免受其他功能或分布式滥用消耗；线上需结合已有平台配额监控。

## 验证

自动化覆盖：数据兼容与限制、冲突合并、歧义匹配、备份/保存失败、过期与幂等、并发领取、生产 fail-closed、同源/限流/HTTP 边界和客户端错误恢复。

真实 Redis 脚本集成测试默认跳过，不连接生产数据库。若需要运行，启动仅用于测试的本机 Redis UNIX socket，再设置以下两个本地路径运行 Vitest：

```sh
XM_TRANSFER_TEST_REDIS_CLI=/path/to/redis-cli \
XM_TRANSFER_TEST_REDIS_SOCKET=/path/to/test-only.sock \
pnpm exec vitest run lib/server/anime-transfer-redis.integration.test.ts
```

测试使用随机隔离前缀，不执行 FLUSHDB。实测 Redis 7.4.11：跨实例领取、JSON 空数组保真、TTL 不延期、回执幂等、正文删除、过期和全局限流。

本轮浏览器验证使用两个独立 localhost 存储源与合成清单：生成短码/二维码、冲突预览、默认保留、手动替换、另一标签页更新后的过期预览拦截、导入后刷新保持、完成请求中断后重试。线上 Upstash REST、多台实体设备、iOS/Android 安装版 PWA 和真实摄像头扫码，仍需在部署后的 HTTPS 站点验收；未使用生产凭据或真实收藏数据测试。

2026-09-14 本地检查结果：`pnpm typecheck`、`pnpm lint`、`pnpm build` 通过；启用隔离真实 Redis 测试后的 Vitest 共 75 个测试文件、536 项测试全部通过。浏览器确认 390px 中文及 320px 泰语传输界面无横向溢出；不等同于真机 PWA 验收。构建仍有既有 3D 大包和纸张纹理运行时解析警告，本次未改动相关素材或引擎。

协议参考：[Upstash EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval)、[Upstash SET / keepTtl](https://upstash.com/docs/redis/sdks/ts/commands/string/set)、[Vercel 请求头](https://vercel.com/docs/headers/request-headers)。
