import { readdir, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const publicRoot = resolve(projectRoot, "public")
const outputPath = resolve(publicRoot, "offline-assets.json")
const offlineDirectories = ["theme-four", "theme-four-experience"]

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath))
      continue
    }

    if (entry.isFile() && !entry.name.endsWith(".gz") && entry.name !== "README.md") {
      files.push(`/${relative(publicRoot, entryPath).split(sep).join("/")}`)
    }
  }

  return files
}

const assets = (
  await Promise.all(
    offlineDirectories.map((directory) => collectFiles(resolve(publicRoot, directory))),
  )
).flat().sort()

await writeFile(
  outputPath,
  `${JSON.stringify({ version: 1, assets }, null, 2)}\n`,
  "utf8",
)

console.log(`Offline asset manifest generated with ${assets.length} files.`)
