import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'assets/branding/xm-mark-master.png'))
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
// Ignore nearly invisible generation fringe when centering the actual emblem.
let left = info.width
let top = info.height
let right = 0
let bottom = 0
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 10) continue
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x)
    bottom = Math.max(bottom, y)
  }
}
const emblem = await sharp(source)
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .png()
  .toBuffer()

async function render(size, coverage, background = '#00000000') {
  const { data: tile, info: tileInfo } = await sharp(emblem)
    .resize(Math.round(size * coverage), Math.round(size * coverage), { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true })
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{
      input: tile,
      left: Math.round((size - tileInfo.width) / 2),
      top: Math.round((size - tileInfo.height) / 2),
    }])
    .png()
    .toBuffer()
}

const publicRoot = resolve(root, 'public')
await mkdir(resolve(publicRoot, 'icons'), { recursive: true })
for (const size of [192, 512]) {
  await writeFile(resolve(publicRoot, `icons/xm-${size}.png`), await render(size, 0.94))
}
// The glyph stays inside the central 80%-diameter circle used by maskable icons.
await writeFile(resolve(publicRoot, 'icons/xm-maskable-512.png'), await render(512, 0.8, '#2860ed'))
await writeFile(resolve(publicRoot, 'icons/xm-apple-180.png'), await render(180, 0.94, '#f3f6fa'))
await writeFile(resolve(publicRoot, 'favicon-32.png'), await render(32, 1))

// ICO directory entries point to PNG frames, preserving alpha at every size.
const sizes = [16, 32, 48]
const frames = await Promise.all(sizes.map((size) => render(size, 1)))
const directory = Buffer.alloc(6 + sizes.length * 16)
directory.writeUInt16LE(1, 2)
directory.writeUInt16LE(sizes.length, 4)
let offset = directory.length
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + i * 16
  directory[entry] = sizes[i]
  directory[entry + 1] = sizes[i]
  directory.writeUInt16LE(1, entry + 4)
  directory.writeUInt16LE(32, entry + 6)
  directory.writeUInt32LE(frames[i].length, entry + 8)
  directory.writeUInt32LE(offset, entry + 12)
  offset += frames[i].length
}
await writeFile(resolve(publicRoot, 'favicon.ico'), Buffer.concat([directory, ...frames]))
console.log('Generated favicon, PWA, maskable and Apple icons from the XM master.')
