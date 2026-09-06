import { readFile, stat } from "node:fs/promises"
import { resolve, sep } from "node:path"

/** Validate entry references inside a staged or published experience package. */
export async function verifyExperienceAssets(directory) {
  const root = resolve(directory)
  for (const entry of ["index.html", "elemental-arena/index.html"]) {
    const html = await readFile(resolve(root, entry), "utf8")
    const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((url) => !/^(?:https?:|data:|#)/.test(url))
    if (!references.some((url) => url.endsWith(".js"))) {
      throw new Error(`No compiled JavaScript in ${entry}`)
    }
    for (const reference of references) {
      const url = new URL(reference, `https://experience.invalid/theme-four-experience/${entry}`)
      if (!url.pathname.startsWith("/theme-four-experience/")) {
        throw new Error(`Asset escapes experience URL: ${entry}`)
      }
      const target = resolve(root, decodeURIComponent(url.pathname.slice("/theme-four-experience/".length)))
      if (!target.startsWith(root + sep) || !(await stat(target)).isFile()) {
        throw new Error(`Missing or invalid experience asset in ${entry}`)
      }
    }
  }
}
