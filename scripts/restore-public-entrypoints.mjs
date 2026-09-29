import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const distDomain = join(root, "dist", "domain");
const entries = await readdir(distDomain, { recursive: true, encoding: "utf8" });
const barrelPattern = /^_(.+)\.js$/;
const barrels = entries.filter((entry) => barrelPattern.test(basename(entry)));
for (const entry of barrels) {
  const area = dirname(entry).split("/").at(-1);
  const targetName = basename(entry).replace(/^_/, "");
  const target = join(distDomain, targetName);
  const targetDeclaration = target.replace(/\.js$/, ".d.ts");
  const exportPath = "./" + area + "/" + basename(entry);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, "export * from \"" + exportPath + "\";\n");
  await writeFile(targetDeclaration, "export * from \"" + exportPath + "\";\n");
  console.log(relative(root, target));
}
