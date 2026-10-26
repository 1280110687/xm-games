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

const crop = await sharp(emblem).raw().toBuffer({ resolveWithObject: true })
let sourceRadius = 0
for (let y = 0; y < crop.info.height; y++) {
  for (let x = 0; x < crop.info.width; x++) {
    if (crop.data[(y * crop.info.width + x) * 4 + 3] <= 10) continue
    sourceRadius = Math.max(sourceRadius, Math.hypot(
      x + 0.5 - crop.info.width / 2,
      y + 0.5 - crop.info.height / 2,
    ))
  }
}

const paper = '#f8fafc'
const roundedMask = (size) => Buffer.from(
  `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${size * 0.2}" fill="white"/></svg>`,
)

async function render(size, coverage, { rounded = false, even = false } = {}) {
  let width = Math.round(size * coverage)
  if (even) width = Math.floor(width / 2) * 2
  const { data: tile, info: tileInfo } = await sharp(emblem)
    .resize({ width })
    .png()
    .toBuffer({ resolveWithObject: true })
  let output = await sharp({ create: { width: size, height: size, channels: 4, background: paper } })
    .composite([{
      input: tile,
      left: Math.floor((size - tileInfo.width) / 2),
      top: Math.floor((size - tileInfo.height) / 2),
    }])
    .png()
    .toBuffer()
  if (rounded) {
    output = await sharp(output)
      .composite([{ input: roundedMask(size), blend: 'dest-in' }])
      .png()
      .toBuffer()
  } else {
    output = await sharp(output).removeAlpha().png().toBuffer()
  }
  return output
}

const publicRoot = resolve(root, 'public')
await mkdir(resolve(publicRoot, 'icons'), { recursive: true })
await mkdir(resolve(publicRoot, 'images/brand'), { recursive: true })
// Header and 3D sign share a tightly cropped version of the approved artwork.
await sharp(emblem).resize({ width: 256 }).png()
  .toFile(resolve(publicRoot, 'images/brand/xm-controller-mark.png'))
for (const size of [192, 512]) {
  await writeFile(resolve(publicRoot, `icons/xm-controller-${size}.png`), await render(size, 0.84))
}
// Keep the complete controller inside the maskable safe circle, with extra margin.
const maskableCoverage = Math.min(0.74, 0.38 * crop.info.width / sourceRadius)
await writeFile(resolve(publicRoot, 'icons/xm-controller-maskable-512.png'), await render(512, maskableCoverage))
await writeFile(resolve(publicRoot, 'icons/xm-controller-apple-180.png'), await render(180, 0.84))

// ICO directory entries point to PNG frames, preserving alpha at every size.
const sizes = [16, 32, 48]
const frames = await Promise.all(sizes.map((size) => render(size, 0.94, { rounded: true, even: true })))
await writeFile(resolve(publicRoot, 'icons/xm-controller-32.png'), frames[1])
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
const ico = Buffer.concat([directory, ...frames])
await writeFile(resolve(publicRoot, 'icons/xm-controller.ico'), ico)
// Retain the conventional fallback URL for clients that request it directly.
await writeFile(resolve(publicRoot, 'favicon.ico'), ico)
console.log('Generated favicon, PWA, maskable and Apple icons from the XM master.')
