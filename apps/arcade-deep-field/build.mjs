import { build } from 'esbuild';
import { mkdir, rm, copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
const result=await build({metafile:true,legalComments:'eof',entryPoints:['src/entry.ts'],bundle:true,format:'esm',target:['safari16','chrome110'],outfile:'dist/game.js',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.MODE':'"production"'}});
for(const f of ['index.html','style.css','adapter.css','LICENSE','NOTICE.md'])await copyFile(f,`dist/${f}`);

await copyFile('LICENSE','dist/LICENSE.txt');await copyFile('NOTICE.md','dist/NOTICE.txt');

const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){
 if(!input.includes('node_modules'))continue;
 let directory=path.dirname(path.resolve(input));
 while(directory!==path.dirname(directory)){
  try{const manifest=JSON.parse(await readFile(path.join(directory,'package.json'),'utf8'));if(manifest.name){packages.set(manifest.name,{directory,manifest});break;}}catch{}
  directory=path.dirname(directory);
 }
}
let notices='Third-party runtime licenses\n\n';
for(const [name,{directory,manifest}] of packages){
 notices+=`${name} ${manifest.version} (${manifest.license??'see notice'})\n`;
 const filenames=(await readdir(directory)).filter(f=>/^(licen[cs]e|copying|notice)(\.|$)/i.test(f));
 for(const filename of filenames)notices+=await readFile(path.join(directory,filename),'utf8')+'\n';
 if(!filenames.length){if(name==='@pixi/colord')notices+=await readFile('licenses/pixi-colord-MIT.txt','utf8');else throw new Error(`Missing dependency license: ${name}`);}
 notices+='\n';
}
await writeFile('dist/THIRD_PARTY_LICENSES.txt',notices);
