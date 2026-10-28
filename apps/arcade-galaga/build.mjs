import {build} from 'esbuild'
import {mkdir,rm,copyFile,readFile,writeFile,readdir} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'dist')
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true})
const result=await build({absWorkingDir:root,entryPoints:['src/main.ts'],outfile:path.join(out,'game.js'),bundle:true,minify:true,format:'iife',target:['safari15','chrome100'],legalComments:'eof',metafile:true,tsconfigRaw:{compilerOptions:{alwaysStrict:true,useDefineForClassFields:false}}})
for(const file of ['index.html','game.css'])await copyFile(path.join(root,'src',file),path.join(out,file))
await copyFile(path.join(root,'LICENSE'),path.join(out,'LICENSE.txt'))
await copyFile(path.join(root,'NOTICE.md'),path.join(out,'NOTICE.txt'))
const packages=new Map()
for(const file of Object.keys(result.metafile.inputs).filter(file=>file.includes('node_modules'))){
  let dir=path.dirname(path.resolve(root,file))
  while(dir!==path.dirname(dir)){
    try{const pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));if(pkg.name){packages.set(dir,pkg);break}}catch{}
    dir=path.dirname(dir)
  }
}
const notices=[]
for(const [dir,pkg] of packages){
  const licenses=(await readdir(dir)).filter(name=>/^(licen[cs]e|copying)/i.test(name))
  const licenseText=licenses.length?(await Promise.all(licenses.map(name=>readFile(path.join(dir,name),'utf8')))).join('\n')
    :pkg.name==='@pixi/colord'?await readFile(path.join(root,'upstream/LICENSE-colord.txt'),'utf8'):null
  if(!licenseText)throw new Error(`Missing runtime license for ${pkg.name}`)
  notices.push(`${pkg.name} ${pkg.version} (${pkg.license??'see license'})\n${licenseText}`)
}
await writeFile(path.join(out,'THIRD_PARTY_LICENSES.txt'),notices.join('\n\n----------------------------------------\n\n'))
