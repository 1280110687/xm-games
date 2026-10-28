import { access, cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ids = ["galaga", "bubbo-bubbo", "puzzling-potions", "deep-field", "pinball-schminball", "radius-raid"]
const stage = path.join(root, "public/.arcade-stage-build")
const target = path.join(root, "public/arcade-games")
const backup = path.join(root, "public/.arcade-stage-backup")
await rm(stage, { recursive: true, force: true })
await mkdir(stage, { recursive: true })
try {
  for (const id of ids) {
    const source = path.join(root, `apps/arcade-${id}`)
    const dist = path.join(source, "dist")
    await access(path.join(dist, "index.html"))
    await access(path.join(dist, "LICENSE.txt"))
    await access(path.join(dist, "NOTICE.txt"))
    await access(path.join(dist, "THIRD_PARTY_LICENSES.txt"))
    const html = await readFile(path.join(dist, "index.html"), "utf8")
    if (/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(html)) throw new Error(`${id} still loads remote startup resources`)
    const destination = path.join(stage, id)
    await cp(dist, destination, { recursive: true })
    const sourceStage = path.join(stage, ".source")
    await mkdir(sourceStage, { recursive: true })
    await mkdir(path.join(sourceStage, "apps"), { recursive: true })
    await mkdir(path.join(sourceStage, "packages"), { recursive: true })
    await cp(source, path.join(sourceStage, `apps/arcade-${id}`), { recursive: true, filter: file => !["node_modules", "dist", ".git"].some(name => file === path.join(source, name)) })
    await cp(path.join(root, "packages/arcade-bridge"), path.join(sourceStage, "packages/arcade-bridge"), { recursive: true, filter: file => file !== path.join(root, "packages/arcade-bridge/node_modules") })
    await cp(path.join(root, "pnpm-lock.yaml"), path.join(sourceStage, "pnpm-lock.yaml"))
    await writeFile(path.join(sourceStage, "package.json"), JSON.stringify({ name: `xm-${id}-source`, private: true, packageManager: "pnpm@10.30.2", pnpm: { overrides: { postcss: "8.5.19" } } }, null, 2) + "\n")
    await writeFile(path.join(sourceStage, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n  - "packages/*"\n')
    await writeFile(path.join(sourceStage, "README.txt"), `Modified XM Games source for ${id}.\nRequires Node.js 22+ and pnpm 10.30.2.\nRun pnpm install --ignore-scripts --no-frozen-lockfile, then pnpm --dir apps/arcade-${id} build.\nServe apps/arcade-${id}/dist over HTTP. See app NOTICE.md and LICENSE for origin and changes.\n`)
    execFileSync("tar", ["-czf", path.join(destination, "source.tar.gz"), "-C", sourceStage, "."], { stdio: "pipe" })
    await rm(sourceStage, { recursive: true, force: true })
  }
  await writeFile(path.join(stage, "SOURCES.txt"), ids.map(id => `${id}: ./${id}/NOTICE.txt | ./${id}/LICENSE.txt | ./${id}/source.tar.gz`).join("\n") + "\n")
  await rm(backup, { recursive: true, force: true })
  let hadPrevious = false
  try { await rename(target, backup); hadPrevious = true } catch (error) { if (error.code !== "ENOENT") throw error }
  try { await rename(stage, target) } catch (error) { if (hadPrevious) await rename(backup, target); throw error }
  await rm(backup, { recursive: true, force: true })
} catch (error) {
  await rm(stage, { recursive: true, force: true })
  throw error
}
console.log(`Published ${ids.length} local arcade games with notices and modified source.`)
