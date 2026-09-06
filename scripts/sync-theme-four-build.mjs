import { cp, mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { verifyExperienceAssets } from "./verify-experience-assets.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const world = join(root, "apps/theme-four-world/dist")
const arena = join(root, "apps/elemental-arena/dist")
const published = join(root, "public/theme-four-experience")

// Validate both builds before replacing the last working published package.
for (const source of [world, arena]) {
  if (!(await stat(join(source, "index.html"))).isFile()) {
    throw new Error(`Missing experience entry: ${source}`)
  }
}
await mkdir(join(root, "public"), { recursive: true })
const stage = await mkdtemp(join(root, "public/.experience-stage-"))
const next = join(stage, "next")
const previous = join(stage, "previous")
let backedUp = false
let retainBackup = false
try {
  await cp(world, next, { recursive: true })
  await cp(arena, join(next, "elemental-arena"), { recursive: true })
  await verifyExperienceAssets(next)
  try {
    await rename(published, previous)
    backedUp = true
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
  try {
    await rename(next, published)
  } catch (error) {
    if (backedUp) {
      retainBackup = true
      await rename(previous, published)
      retainBackup = false
    }
    throw error
  }
} finally {
  if (!retainBackup) await rm(stage, { recursive: true, force: true })
}
console.log("Both experience builds verified and published to public/theme-four-experience.")
