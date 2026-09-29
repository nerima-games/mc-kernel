import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const root = join(import.meta.dirname, "..");
const map = readFileSync(join(root, "docs/area-map.md"), "utf8");
const domainFiles = readdirSync(join(root, "src/domain"), { recursive: true, encoding: "utf8" })
  .filter(
    (file) =>
      file.endsWith(".ts") &&
      file.includes("/") &&
      !file.split("/").at(-1)?.startsWith("_") &&
      !file.endsWith("/index.ts"),
  )
  .map((file) => file.split("/").at(-1))
  .filter((file): file is string => file !== undefined)
  .sort();
const inventory = map;
const listedFiles = [...inventory.matchAll(/`([a-z0-9-]+\.ts)`/g)].flatMap(
  ([, file]) => (file === undefined ? [] : [file]),
);
const publicSubpaths = Object.keys(
  JSON.parse(readFileSync(join(root, "package.json"), "utf8")).exports,
).filter((subpath) => subpath !== ".");
const plannedBarrels = [
  ...map.matchAll(/\| `\.\/domain\/([^`]+)` \| `([^`]+)` \|/g),
].map(([, subpath, barrel]) => ({
  subpath: subpath ?? "",
  barrel: barrel ?? "",
}));

describe("R-K1 phase-1 area map", () => {
  test("lists every current domain file exactly once", () => {
    expect(listedFiles).toHaveLength(domainFiles.length);
    expect(new Set(listedFiles).size).toBe(domainFiles.length);
    expect([...listedFiles].sort()).toEqual(domainFiles);
  });

  test("maps every export subpath to one planned leaf barrel", () => {
    expect(plannedBarrels).toHaveLength(publicSubpaths.length);
    expect(new Set(plannedBarrels.map(({ subpath }) => `./domain/${subpath}`))).toEqual(
      new Set(publicSubpaths),
    );
    expect(new Set(plannedBarrels.map(({ barrel }) => barrel)).size).toBe(
      publicSubpaths.length,
    );
    expect(
      plannedBarrels.every(({ barrel }) => existsSync(join(root, "src/domain", barrel))),
    ).toBe(true);
  });
});
