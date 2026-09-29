import { copyFile, mkdir, readdir } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const distDomain = join(root, "dist", "domain");
const entries = await readdir(distDomain, { recursive: true, encoding: "utf8" });
const barrelPattern = /^_(.+)\.(js|d\.ts|js\.map|d\.ts\.map)$/;
const barrels = entries.filter((entry) => barrelPattern.test(basename(entry)));
for (const entry of barrels) {
  const source = join(distDomain, entry);
  const targetName = basename(entry).replace(/^_/, "");
  const target = join(distDomain, targetName);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(relative(root, source) + " -> " + relative(root, target));
}
