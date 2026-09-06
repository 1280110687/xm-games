import { afterEach, describe, expect, it } from "vitest"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { verifyExperienceAssets } from "./verify-experience-assets.mjs"

const temporaryDirectories: string[] = []
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "xm-experience-assets-"))
  temporaryDirectories.push(root)
  await mkdir(join(root, "elemental-arena"))
  for (const entry of ["", "elemental-arena/"]) {
    await writeFile(join(root, entry, "index.html"), `<script src="/theme-four-experience/${entry}entry.js"></script>`)
    await writeFile(join(root, entry, "entry.js"), "export {}")
  }
  return root
}

describe("experience publish validation", () => {
  it("accepts both apps with their stable public paths", async () => {
    await expect(verifyExperienceAssets(await fixture())).resolves.toBeUndefined()
  })
  it("rejects an incomplete nested app before publication", async () => {
    const root = await fixture()
    await rm(join(root, "elemental-arena/entry.js"))
    await expect(verifyExperienceAssets(root)).rejects.toThrow()
  })
  it("rejects unbuilt HTML and assets outside the experience package", async () => {
    const root = await fixture()
    await writeFile(join(root, "index.html"), "<div>not built</div>")
    await expect(verifyExperienceAssets(root)).rejects.toThrow("No compiled JavaScript")
    await writeFile(join(root, "index.html"), '<script src="/wrong/entry.js"></script>')
    await expect(verifyExperienceAssets(root)).rejects.toThrow("Asset escapes")
  })
})
