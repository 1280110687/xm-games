# Theme Four iOS startup repair

## Confirmed defects

- The host dismissed “正在装配 3D 走廊…” only on iframe `load`, ignored application readiness, and had no timeout/retry. An iframe load event is not proof of successful application startup.
- WebKit iPhone emulation reproduced `FetchEvent.respondWith ... Response is a 206 partial` for the initial audio requests. The service worker attempted to store partial media responses in Cache Storage. A cached complete file also lacked Range slicing.
- These are verified defects, not proof of the exact cause on the reported physical iPhone. Device/OS, Safari versus installed PWA, and live deployment state remain unconfirmed.

## Changes

- Same-origin, source-checked `booted` / `ready` / `failed` messages drive host startup. Iframe `load` now only synchronizes context.
- A 45-second watchdog exposes retry and the existing game map. Retry remounts only the iframe. A timed-out scene may finish late; a runtime failure requires retry and cannot be hidden by a stale ready message.
- React runtime errors and WebGL context loss reach the host recovery UI.
- Network Range responses pass through without caching partial files. Complete cached files serve single byte ranges (206) and unsatisfiable ranges (416), preserving offline media support. Unsupported multiple ranges return the full response.
- Service worker cache version v17 → v18. No automatic activation of waiting workers; normal update acceptance remains required.
- No changes to the 3D design, room content, Themes One–Three, or mobile quality heuristics.

## Verification

- `pnpm build` (both Vite apps and Next.js), followed by final `pnpm exec next build`: passed. Existing large-chunk and runtime texture-path build warnings remain.
- Final `pnpm lint`, `pnpm typecheck`, `pnpm exec vitest run`: passed, 68 files / 453 tests. Range tests first reproduced eight failures against the old worker; all nine now pass. Four startup-state tests cover timeout, retry and stale messages.
- Production WebKit / iPhone 15 emulation: real canvas reaches `ready`, with no audio Range errors on normal startup.
- Controlled pending image: iframe document remains `interactive` (load not finished), while the real scene reaches `ready` and the host loading overlay is absent.
- Triggered real `WEBGL_lose_context`: recovery actions appear; clicking “重新加载 3D” creates a working new scene.
- Final production build on a fresh origin again reached `ready`. Suppressing the child boot/readiness messages then produced the recovery UI after the real 45-second watchdog, without relying on iframe `load`.
- From that timed-out state, “游戏地图” opened the catalog and its text-tool link navigated to `/text-tool` successfully.
- Full package reported 24 routes / 349 resources. With the source server stopped, an uncached API probe failed, while cached audio returned `206`, `Content-Range: bytes 0-1/148690`, and two bytes. A fresh homepage navigation reopened the real scene from cache.
- Playwright WebKit `setOffline` produced an internal navigation error; this was not counted as a pass. The source-server shutdown test above is the verified offline evidence (prewarmed package, not first-ever offline use).
- Screenshots are local ignored artifacts under `output/playwright/theme-four-ios-startup/`.

## Remaining boundary

Physical iPhone GPU/memory constraints, installed-PWA lifecycle, and the reported production deployment still require device verification. This change is not a claim that every iOS-specific failure has been reproduced or resolved. No commit, push or deployment was requested in this turn.
