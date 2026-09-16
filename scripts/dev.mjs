import { spawn } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { watch } from "node:fs"
import { buildThemeAssets } from "./build-theme-assets.mjs"

await buildThemeAssets()
let themeBuild = Promise.resolve()
const themeWatcher = watch(new URL("../styles/themes", import.meta.url), { recursive: true }, () => {
  themeBuild = themeBuild.then(buildThemeAssets).catch(error => console.error(error.message))
})
const safeAreaWatcher = watch(new URL("../app/pwa-safe-area.css", import.meta.url), () => {
  themeBuild = themeBuild.then(buildThemeAssets).catch(error => console.error(error.message))
})

// Next proxies both Vite servers so iframe messages retain same-origin checks.
const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  themeWatcher.close()
  safeAreaWatcher.close()
  for (const child of children) {
    if (!child.pid) continue
    try {
      if (process.platform === "win32") child.kill("SIGTERM")
      else process.kill(-child.pid, "SIGTERM")
    } catch (error) {
      if (error.code !== "ESRCH") console.error("Unable to stop a development server")
    }
  }
  process.exitCode = code
}
function start(args, extraEnv = {}) {
  const child = spawn("pnpm", args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    detached: process.platform !== "win32",
  })
  children.push(child)
  child.once("error", () => stop(1))
  child.once("exit", (code) => { if (!stopping) stop(code ?? 1) })
}
process.once("SIGINT", () => stop())
process.once("SIGTERM", () => stop())

start(["--filter", "@xm-games/theme-four-experience", "dev"])
start(["--filter", "@xm-games/elemental-arena", "dev"])
try {
  for (const url of [
    "http://127.0.0.1:4174/theme-four-experience/index.html",
    "http://127.0.0.1:4175/theme-four-experience/elemental-arena/index.html",
  ]) {
    let ready = false
    for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(500) })
        ready = response.ok
        await response.body?.cancel()
      } catch { /* Vite is still starting. */ }
      if (ready) break
      await delay(250)
    }
    if (!ready) throw new Error("A 3D development server did not become ready")
  }
  if (!stopping) start(["exec", "next", "dev", ...process.argv.slice(2)], { XM_EXPERIENCE_DEV: "1" })
} catch (error) {
  console.error(error.message)
  stop(1)
}
