import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { bundle, transform } from "lightningcss"
import sharp from "sharp"

const root = fileURLToPath(new URL("../", import.meta.url))
const themes = ["theme-arcade", "theme-pocket", "theme-three", "theme-four", "theme-retro"]
const targets = { safari: (15 << 16) | (4 << 8), chrome: 111 << 16, firefox: 128 << 16 }

async function writeChanged(path, data) {
  const previous = await readFile(path).catch(() => null)
  const next = Buffer.from(data)
  if (!previous?.equals(next)) await writeFile(path, next)
}

export async function buildThemeAssets() {
  const cssDirectory = resolve(root, "public/theme-styles")
  await mkdir(cssDirectory, { recursive: true })
  await mkdir(resolve(root, "lib/generated"), { recursive: true })
  const manifest = {}
  const safeArea = bundle({ filename: resolve(root, "app/pwa-safe-area.css"), targets }).code
  for (const theme of themes) {
    const themed = bundle({
      filename: resolve(root, `styles/themes/${theme}/index.css`),
      targets,
    }).code
    // Dynamic links follow the global CSS. Keep safe-area overrides last just
    // as they were in RootLayout, including iOS standalone dialog positioning.
    const { code } = transform({ code: Buffer.concat([themed, safeArea]), minify: true, targets })
    const hash = createHash("sha256").update(code).digest("hex").slice(0, 12)
    const name = `${theme}.${hash}.css`
    await writeChanged(resolve(cssDirectory, name), code)
    manifest[theme] = `/theme-styles/${name}`
  }
  await writeChanged(resolve(root, "lib/generated/theme-styles.json"), JSON.stringify(manifest, null, 2) + "\n")

  const artDirectory = resolve(root, "public/images/theme-pocket")
  const responsiveDirectory = resolve(artDirectory, "responsive")
  await mkdir(responsiveDirectory, { recursive: true })
  for (const name of (await readdir(artDirectory)).filter(name => name.endsWith(".webp"))) {
    const source = resolve(artDirectory, name)
    const sourceStat = await stat(source)
    for (const size of name === "documents.webp" ? [96, 160, 240, 256] : [96, 160, 240]) {
      const destination = resolve(responsiveDirectory, `${name.slice(0, -5)}-${size}.webp`)
      const outputStat = await stat(destination).catch(() => null)
      if (outputStat && outputStat.mtimeMs >= sourceStat.mtimeMs) continue
      await sharp(source).resize(size, size, { withoutEnlargement: true }).webp({ quality: 85 }).toFile(destination)
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildThemeAssets()
}
