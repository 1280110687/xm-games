import {build} from 'esbuild'
import {mkdir,rm,copyFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'dist')
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true})
await build({absWorkingDir:root,entryPoints:['src/main.ts'],outfile:path.join(out,'game.js'),bundle:true,minify:true,format:'iife',target:['safari15','chrome100'],legalComments:'eof',tsconfigRaw:{compilerOptions:{alwaysStrict:true,useDefineForClassFields:false}}})
for(const file of ['index.html','game.css'])await copyFile(path.join(root,'src',file),path.join(out,file))
await copyFile(path.join(root,'LICENSE'),path.join(out,'LICENSE.txt'))
await copyFile(path.join(root,'NOTICE.md'),path.join(out,'NOTICE.txt'))
await writeFile(path.join(out,'THIRD_PARTY_LICENSES.txt'),'No third-party runtime libraries are bundled. Howler and recorded audio are omitted.\n')
