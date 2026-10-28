import { cp, mkdir, rename, rm, access } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.join(root, "apps/billiards")
const target = path.join(root, "public/billiards-game")
const stage = path.join(root, "public/.billiards-stage-build")
const backup = path.join(root, "public/.billiards-stage-backup")
await access(path.join(source, "dist/game.js"))
await rm(stage, {recursive:true, force:true})
await mkdir(stage, {recursive:true})
try {
  await cp(path.join(source,"dist"),stage,{recursive:true})
  // Ship the modified engine AND source for the four bundled MIT libraries.
  // Build binaries and installed build tools are not corresponding game code.
  const sourceStage = path.join(stage,".source")
  await mkdir(sourceStage,{recursive:true})
  await cp(source,path.join(sourceStage,"billiards"),{recursive:true,filter:file => !["node_modules","dist"].some(name => file === path.join(source,name))})
  for (const dependency of ["three","interactjs","fflate","jsoncrush"]) {
    await cp(path.join(source,"node_modules",dependency),path.join(sourceStage,"third-party",dependency),{recursive:true,dereference:true})
  }
  execFileSync("tar",["-czf",path.join(stage,"source.tar.gz"),"-C",sourceStage,"billiards","third-party"],{stdio:"pipe"})
  await rm(sourceStage,{recursive:true,force:true})
  await rm(backup,{recursive:true,force:true})
  let hadPrevious = false
  try { await rename(target,backup); hadPrevious = true } catch (error) { if (error.code !== "ENOENT") throw error }
  try { await rename(stage,target) } catch (error) {
    if (hadPrevious) await rename(backup,target)
    throw error
  }
  await rm(backup,{recursive:true,force:true})
} catch (error) {
  await rm(stage,{recursive:true,force:true})
  throw error
}
console.log("Published local billiards engine, license and corresponding source.")
