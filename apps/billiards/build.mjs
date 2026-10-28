import { build } from 'esbuild'
import { mkdir, rm, copyFile, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const output = path.join(root, 'dist')
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await build({
  absWorkingDir: root,
  entryPoints: { game: 'src/game.ts', worker: 'upstream/src/worker.ts' },
  outdir: output,
  bundle: true,
  minify: true,
  target: ['safari15', 'chrome100'],
  legalComments: 'eof',
  format: 'iife',
})
await Promise.all(['index.html', 'game.css'].map(file => copyFile(path.join(root, 'src', file), path.join(output, file))))
await copyFile(path.join(root, 'LICENSE'), path.join(output, 'LICENSE.txt'))
await copyFile(path.join(root, 'NOTICE.md'), path.join(output, 'NOTICE.txt'))
const notices = await Promise.all(['three', 'interactjs', 'fflate', 'jsoncrush'].map(async name => `${name}\n${await readFile(path.join(root,'node_modules',name,'LICENSE'),'utf8')}`))
await writeFile(path.join(output,'THIRD_PARTY_LICENSES.txt'),notices.join('\n\n---\n\n'))
console.log('Billiards engine built without remote assets or online services.')
