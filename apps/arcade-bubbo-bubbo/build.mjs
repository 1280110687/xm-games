import {build} from 'esbuild';
import {mkdir,copyFile,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
const result=await build({entryPoints:['src/main.ts'],bundle:true,format:'esm',target:['safari16','chrome110'],minify:true,sourcemap:false,outfile:'dist/game.js',legalComments:'eof',metafile:true});
await Promise.all(['index.html','style.css'].map(f=>copyFile(f,`dist/${f}`)));
await copyFile('LICENSE','dist/LICENSE.txt');
await copyFile('NOTICE.md','dist/NOTICE.txt');
const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){
 if(!input.includes('node_modules'))continue;
 let dir=path.dirname(path.resolve(input));
 while(dir!==path.dirname(dir)){
  try{const pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));if(pkg.name&&pkg.version){packages.set(pkg.name,{dir,pkg});break;}}catch{}
  dir=path.dirname(dir);
 }
}
let licenses='Bundled third-party dependencies\n\n';
for(const {dir,pkg} of packages.values()){
 licenses+=`\n--- ${pkg.name} ${pkg.version} (${pkg.license??'see license below'}) ---\n`;
 const files=(await readdir(dir)).filter(name=>/^(licen[cs]e|copying|copyright)/i.test(name));
 if(!files.length&&pkg.name==='@pixi/colord'){licenses+=await readFile('upstream/LICENSE-colord.txt','utf8');continue;}
 for(const file of files)try{licenses+=await readFile(path.join(dir,file),'utf8');licenses+='\n';}catch{}
 if(!files.length){try{const readme=await readFile(path.join(dir,'README.md'),'utf8');const license=readme.match(/(?:^|\n)#{1,4} License\n([\s\S]*)/i);if(license)licenses+=license[1]+'\n';else throw new Error(`Missing runtime license for ${pkg.name}`);}catch{throw new Error(`Missing runtime license for ${pkg.name}`);}}
}
await writeFile('dist/THIRD_PARTY_LICENSES.txt',licenses);
