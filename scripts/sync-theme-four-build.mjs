import { copyFile, cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(projectRoot, "vendor/theme-four-experience/dist");
const destinationRoot = resolve(projectRoot, "public/theme-four-experience");
const sourceAssets = resolve(sourceRoot, "assets");
const sourceIndex = resolve(sourceRoot, "index.html");
const destinationAssets = resolve(destinationRoot, "assets");
const destinationIndex = resolve(destinationRoot, "index.html");

const [assetsStats, indexStats] = await Promise.all([
  stat(sourceAssets),
  stat(sourceIndex),
]);

if (!assetsStats.isDirectory()) {
  throw new Error(`Theme Four assets directory is missing: ${sourceAssets}`);
}

if (!indexStats.isFile()) {
  throw new Error(`Theme Four entry file is missing: ${sourceIndex}`);
}

await mkdir(destinationRoot, { recursive: true });
await rm(destinationAssets, { recursive: true, force: true });
await cp(sourceAssets, destinationAssets, { recursive: true });
await copyFile(sourceIndex, destinationIndex);

console.log("Theme Four build artifacts synced to public/theme-four-experience.");
