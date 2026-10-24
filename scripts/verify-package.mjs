import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const packageName = manifest.name;
const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const typeScriptCompiler = join(
  root,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);

const commandLabel = (command, args) => command + " " + args.join(" ");

const run = (
  command,
  args,
  { timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS, ...options } = {},
) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    timeout: timeoutMs,
    killSignal: "SIGTERM",
    ...options,
  });
  if (result.error) {
    throw new Error(
      commandLabel(command, args) + " failed: " + result.error.message,
    );
  }
  if (result.signal) {
    throw new Error(
      commandLabel(command, args) + " terminated by " + result.signal,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      commandLabel(command, args) + " exited with status " + result.status,
    );
  }
  return result;
};

const capture = (
  command,
  args,
  { timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS, ...options } = {},
) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: timeoutMs,
    killSignal: "SIGTERM",
    ...options,
  });
  if (result.error) {
    throw new Error(
      commandLabel(command, args) + " failed: " + result.error.message,
    );
  }
  if (result.signal) {
    throw new Error(
      commandLabel(command, args) + " terminated by " + result.signal,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      commandLabel(command, args) +
        " exited with status " +
        result.status +
        "\n" +
        (result.stdout ?? "") +
        (result.stderr ?? ""),
    );
  }
  return result.stdout;
};

const exportEntries = Object.entries(manifest.exports ?? {});
if (exportEntries.length === 0) {
  throw new Error("package.json must declare at least one export");
}

const sourceIndex = await readFile(join(root, "src/index.ts"), "utf8");
const areaNames = [
  ...sourceIndex.matchAll(
    /^\s*export \* from ['"]\.\/domain\/([^/]+)\/index\.js['"]\s*;?\s*$/gm,
  ),
].map(([, area]) => area);
if (areaNames.length === 0) {
  throw new Error("src/index.ts must declare at least one area barrel");
}
if (new Set(areaNames).size !== areaNames.length) {
  throw new Error("src/index.ts contains duplicate area barrels");
}
const sourceDomainEntryPoints = (
  await Promise.all(
    areaNames.map(async (area) => {
      const areaIndex = await readFile(
        join(root, "src", "domain", area, "index.ts"),
        "utf8",
      );
      return [...areaIndex.matchAll(/from ['"]\.\/(_[^'"]+)\.js['"]/g)].map(
        ([, barrel]) => barrel.replace(/^_/, ""),
      );
    }),
  )
).flat();
const sourceDomainFacadeEntryPoints = (
  await readdir(join(root, "src", "domain"), {
    recursive: true,
    encoding: "utf8",
  })
)
  .map((entry) => basename(entry).match(/^_(.+)\.ts$/)?.[1])
  .filter((entryPoint) => entryPoint !== undefined);
const uniqueSourceDomainFacadeEntryPoints = new Set(
  sourceDomainFacadeEntryPoints,
);

const declaredDomainEntryPoints = exportEntries
  .map(([subpath]) => subpath.match(/^\.\/domain\/(.+)$/)?.[1])
  .filter((entryPoint) => entryPoint !== undefined);
if (
  new Set(declaredDomainEntryPoints).size !== declaredDomainEntryPoints.length
) {
  throw new Error("package.json contains duplicate domain export subpaths");
}
const missingDomainEntryPoints = sourceDomainEntryPoints.filter(
  (entryPoint) => !declaredDomainEntryPoints.includes(entryPoint),
);
const unsupportedDomainEntryPoints = declaredDomainEntryPoints.filter(
  (entryPoint) => !uniqueSourceDomainFacadeEntryPoints.has(entryPoint),
);
if (
  missingDomainEntryPoints.length > 0 ||
  unsupportedDomainEntryPoints.length > 0
) {
  throw new Error(
    [
      missingDomainEntryPoints.length > 0
        ? `missing ${missingDomainEntryPoints.join(", ")}`
        : undefined,
      unsupportedDomainEntryPoints.length > 0
        ? `unsupported ${unsupportedDomainEntryPoints.join(", ")}`
        : undefined,
    ]
      .filter((message) => message !== undefined)
      .join("; "),
  );
}

for (const entryPoint of declaredDomainEntryPoints) {
  const subpath = `./domain/${entryPoint}`;
  const target = manifest.exports[subpath];
  const expectedTargets = {
    types: `./dist/domain/${entryPoint}.d.ts`,
    import: `./dist/domain/${entryPoint}.js`,
    default: `./dist/domain/${entryPoint}.js`,
  };
  if (typeof target !== "object" || target === null) {
    throw new Error(`Domain export ${subpath} must use conditional targets`);
  }
  for (const [field, expectedTarget] of Object.entries(expectedTargets)) {
    if (target[field] !== expectedTarget) {
      throw new Error(
        `Domain export ${subpath}.${field} must target ${expectedTarget}`,
      );
    }
  }
}

const targetPaths = new Set();
for (const [subpath, target] of exportEntries) {
  if (typeof target === "string") {
    targetPaths.add(target);
    continue;
  }
  if (typeof target !== "object" || target === null) {
    throw new Error(`Unsupported export declaration for ${subpath}`);
  }
  for (const field of ["types", "import", "default"]) {
    if (typeof target[field] === "string") {
      targetPaths.add(target[field]);
    }
  }
}

if (targetPaths.size === 0) {
  throw new Error("package.json exports do not contain any target paths");
}

const archiveEntryFor = (targetPath) =>
  `package/${targetPath.replace(/^\.\//, "")}`;
const importSpecifiers = exportEntries.map(([subpath]) =>
  subpath === "." ? packageName : `${packageName}${subpath.slice(1)}`,
);
const typeOnlyDomainEntryPoints = new Set(["frame"]);
for (const entryPoint of typeOnlyDomainEntryPoints) {
  if (!sourceDomainEntryPoints.includes(entryPoint)) {
    throw new Error(
      `Type-only domain entry point ${entryPoint} is not public in src/index.ts`,
    );
  }
}
const typeOnlySpecifiers = new Set(
  [...typeOnlyDomainEntryPoints].map(
    (entryPoint) => `${packageName}/domain/${entryPoint}`,
  ),
);
const rootSpecifierIndex = importSpecifiers.indexOf(packageName);
if (rootSpecifierIndex === -1) {
  throw new Error(`Package exports must include the root entry ${packageName}`);
}
const typeConsumerSubpathImports = importSpecifiers
  .map(
    (specifier, index) =>
      `import * as packageExport${index} from ${JSON.stringify(specifier)}`,
  )
  .join("\n");
const typeConsumerSubpathUses = importSpecifiers
  .map((_, index) => `  packageExport${index}`)
  .join(",\n");
const peerDependencies = manifest.peerDependencies ?? {};

const workspace = await mkdtemp(join(tmpdir(), "mc-kernel-package-"));
const packDirectory = join(workspace, "pack");
const consumerDirectory = join(workspace, "consumer");
await mkdir(packDirectory);
await mkdir(consumerDirectory);

try {
  run("pnpm", ["pack", "--pack-destination", packDirectory], {
    timeoutMs: 60_000,
  });

  const archives = (await readdir(packDirectory)).filter((entry) =>
    entry.endsWith(".tgz"),
  );
  if (archives.length !== 1) {
    throw new Error(
      `Expected exactly one package archive, found ${archives.length}`,
    );
  }

  const archivePath = join(packDirectory, archives[0]);
  const archiveStat = await stat(archivePath);
  if (archiveStat.size === 0) {
    throw new Error("Package archive is empty");
  }

  const archiveEntries = new Set(
    capture("tar", ["-tzf", archivePath], { cwd: root, timeoutMs: 30_000 })
      .trim()
      .split("\n")
      .filter(Boolean),
  );
  for (const targetPath of targetPaths) {
    const archiveEntry = archiveEntryFor(targetPath);
    if (!archiveEntries.has(archiveEntry)) {
      throw new Error(
        `Package archive is missing export target ${archiveEntry}`,
      );
    }
  }

  await writeFile(
    join(consumerDirectory, "package.json"),
    JSON.stringify(
      {
        name: "mc-kernel-package-consumer",
        private: true,
        type: "module",
        dependencies: peerDependencies,
      },
      null,
      2,
    ) + "\n",
  );
  run(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", archivePath],
    {
      cwd: consumerDirectory,
      timeoutMs: 180_000,
    },
  );

  const probe = `
    const packageName = ${JSON.stringify(packageName)};
    const specifiers = ${JSON.stringify(importSpecifiers)};
    const typeOnlySpecifiers = ${JSON.stringify([...typeOnlySpecifiers])};
    const modules = await Promise.all(specifiers.map((specifier) => import(specifier)));
    if (
      modules.some(
        (module, index) =>
          !typeOnlySpecifiers.includes(specifiers[index]) && Object.keys(module).length === 0,
      )
    ) {
      throw new Error('An exported package module has no runtime exports');
    }
    const { Effect } = await import('effect');
    const rootModule = modules[${rootSpecifierIndex}];
    if (typeof rootModule.fixedClock !== 'function') {
      throw new Error('The root export does not expose fixedClock');
    }
    const cameraModule = modules[specifiers.indexOf(packageName + '/domain/camera')];
    const cameraSnapshot = {
      position: { x: 0, y: 0, z: 0 },
      yawRadians: 0,
      pitchRadians: 0,
      capturedAtSecs: rootModule.MonotonicTimeSecs(1),
    };
    if (
      typeof rootModule.snapshotAgeSecs !== 'function' ||
      cameraModule.snapshotAgeSecs !== rootModule.snapshotAgeSecs ||
      rootModule.snapshotAgeSecs(cameraSnapshot, rootModule.MonotonicTimeSecs(3)) !== 2
    ) {
      throw new Error('The camera package export returned an invalid snapshot age');
    }
    if (typeof rootModule.normaliseSettings !== 'function') {
      throw new Error('The root export does not expose normaliseSettings');
    }
    const normalisedSettings = rootModule.normaliseSettings({
      renderDistance: rootModule.MAX_RENDER_DISTANCE + 1,
      keyBindings: { jump: 'Space' },
    });
    if (
      normalisedSettings.renderDistance !== rootModule.MAX_RENDER_DISTANCE ||
      normalisedSettings.keyBindings.jump !== 'Space'
    ) {
      throw new Error('The root export returned invalid normalised settings');
    }
    const harvestedDrop = rootModule.resolveDrop(
      rootModule.DEFAULT_HARVEST_TOOL,
      rootModule.DEFAULT_BLOCK_DROP,
      'stone',
    );
    if (harvestedDrop?.item !== 'stone' || harvestedDrop.count !== 1) {
      throw new Error('The root export returned an invalid block-harvest result');
    }
    if (
      typeof rootModule.resistsExplosion !== 'function' ||
      rootModule.DEFAULT_EXPLOSION_LIMITS?.maxRaySteps !== 128
    ) {
      throw new Error('The root export returned an invalid explosion-resistance result');
    }
    const stoneId = rootModule.blockIdOf('stone');
    const zeroPower = rootModule.BlockBlastResistance.result(0);
    const extremePower = rootModule.BlockBlastResistance.result(Number.MAX_SAFE_INTEGER);
    const resistsZeroPower = stoneId?._tag === 'Some' && zeroPower._tag === 'Success'
      ? rootModule.resistsExplosion(stoneId.value, zeroPower.success)
      : undefined;
    const resistsExtremePower = stoneId?._tag === 'Some' && extremePower._tag === 'Success'
      ? rootModule.resistsExplosion(stoneId.value, extremePower.success)
      : undefined;
    if (
      resistsZeroPower?._tag !== 'Success' ||
      resistsZeroPower.success !== true ||
      resistsExtremePower?._tag !== 'Success' ||
      resistsExtremePower.success !== false
    ) {
      throw new Error('The root export returned an invalid explosion-resistance result');
    }
    const stackResult = rootModule.itemStack('stone', 2);
    const stack = stackResult?._tag === 'Success' ? stackResult.success : undefined;
    if (stack?.item !== 'stone' || stack.count !== 2 || rootModule.maxStackCountForItem('stone') !== 64) {
      throw new Error('The root export returned an invalid item-stack result');
    }
    const stickResult = rootModule.itemStack('stick', 1);
    const stick = stickResult?._tag === 'Success' ? stickResult.success : undefined;
    const recipeResult = rootModule.shapedRecipe(
      'minecraft:package-probe',
      ['S'],
      { S: 'stone' },
      stick,
      { tags: ['crafting_table'] },
    );
    if (recipeResult?._tag !== 'Success' || recipeResult.success._tag !== 'Shaped' || recipeResult.success.output.item !== 'stick') {
      throw new Error('The root export returned an invalid shaped recipe');
    }
    if (!Array.isArray(rootModule.VANILLA_CRAFTING_RECIPES) || rootModule.VANILLA_CRAFTING_RECIPES.length === 0) {
      throw new Error('The root export returned no vanilla crafting recipes');
    }
    if (!Array.isArray(rootModule.VANILLA_BREWING_RECIPES) || rootModule.VANILLA_BREWING_RECIPES.length === 0) {
      throw new Error('The root export returned no vanilla brewing recipes');
    }
    if (!Array.isArray(rootModule.VANILLA_SMELTING_RECIPES) || rootModule.VANILLA_SMELTING_RECIPES.length === 0) {
      throw new Error('The root export returned no vanilla smelting recipes');
    }
    const clock = rootModule.fixedClock({ monotonicSecs: 1, wallClockEpochMillis: 2 });
    const monotonic = await Effect.runPromise(clock.monotonicSecs);
    if (monotonic !== 1) {
      throw new Error('fixedClock returned ' + monotonic + ' instead of 1');
    }
    if (
      rootModule.MIN_FRAME_DELTA_SECS !== 0.001 ||
      rootModule.MAX_FRAME_DELTA_SECS !== 0.05 ||
      rootModule.FIRST_FRAME_DELTA_SECS !== 0.016 ||
      typeof rootModule.clampFrameDelta !== 'function' ||
      typeof rootModule.frameDeltaBetween !== 'function' ||
      typeof rootModule.frameDeltaLossSecs !== 'function' ||
      typeof rootModule.frameDeltaLossBetween !== 'function'
    ) {
      throw new Error('The root export does not expose frame-timing APIs');
    }
    if (
      rootModule.clampFrameDelta(1) !== 0.05 ||
      rootModule.frameDeltaBetween(undefined, 100) !== 0.016 ||
      Math.abs(rootModule.frameDeltaLossSecs(0.051) - 0.001) > 1e-12 ||
      Math.abs(rootModule.frameDeltaLossBetween(1, 1.051) - 0.001) > 1e-12
    ) {
      throw new Error('The root export returned invalid frame-timing results');
    }
    console.log('verified ' + packageName + ' exports: ' + specifiers.join(', '));
  `;
  run("node", ["--input-type=module", "--eval", probe], {
    cwd: consumerDirectory,
    timeoutMs: 30_000,
  });

  const typeConsumerSource = `
${typeConsumerSubpathImports}

import {
  AngleRadians,
  blockIdOf,
  BlockBlastResistance,
  BrewingFuelCharges,
  DEFAULT_EXPLOSION_LIMITS,
  DEFAULT_BLOCK_DROP,
  DEFAULT_HARVEST_TOOL,
  FixedDurationSecs,
  InputAction,
  KeyCode,
  MAX_RENDER_DISTANCE,
  normaliseSettings,
  PositionAxis,
  RecipeId,
  RecipePatternRow,
  RecipePatternSymbol,
  RecipeStationTag,
  resistsExplosion,
  resolveDrop,
  snapshotAgeSecs,
  MonotonicTimeSecs,
  itemStack,
  maxStackCountForItem,
  StackCount,
  shapedRecipe,
  type BlockType,
  type BrewingState,
  type FurnaceState,
  type ItemStack,
  type Recipe,
  type Settings,
  type CameraPoseSnapshot,
} from ${JSON.stringify(packageName)}

const declaredPackageExports: readonly object[] = [
${typeConsumerSubpathUses}
]
if (declaredPackageExports.length !== ${importSpecifiers.length}) {
  throw new Error('The TypeScript consumer did not load every declared package export')
}

const itemStackValue = (
  item: Parameters<typeof itemStack>[0],
  count: Parameters<typeof itemStack>[1],
): ItemStack => {
  const result = itemStack(item, count)
  if (result._tag !== 'Success') throw new Error('Package consumer could not construct an item stack')
  return result.success
}
const shapedRecipeValue = (
  id: Parameters<typeof shapedRecipe>[0],
  rows: Parameters<typeof shapedRecipe>[1],
  key: Parameters<typeof shapedRecipe>[2],
  output: ItemStack,
  options?: Parameters<typeof shapedRecipe>[4],
): Recipe => {
  const result = shapedRecipe(id, rows, key, output, options)
  if (result._tag !== 'Success') throw new Error('Package consumer could not construct a shaped recipe')
  return result.success
}

const block: BlockType = 'stone'
const stack: ItemStack = itemStackValue('stone', StackCount(2))
const recipe: Recipe = shapedRecipeValue(
  RecipeId('minecraft:declaration-probe'),
  [RecipePatternRow('S')],
  { [RecipePatternSymbol('S')]: 'stone' },
  itemStackValue('stick', StackCount(1)),
  { tags: [RecipeStationTag('crafting_table')] },
)
const furnace: FurnaceState = {
  station: 'furnace',
  input: itemStackValue('sand', StackCount(1)),
  fuel: itemStackValue('coal', StackCount(1)),
  output: undefined,
  fuelTimeRemainingSecs: FixedDurationSecs(0),
  fuelTimeTotalSecs: FixedDurationSecs(0),
  cookProgressSecs: FixedDurationSecs(0),
}
const brewing: BrewingState = {
  bottles: [itemStackValue('water_bottle', StackCount(1)), undefined, undefined],
  ingredient: itemStackValue('nether_wart', StackCount(1)),
  fuel: undefined,
  fuelCharges: BrewingFuelCharges(1),
  brewProgressSecs: FixedDurationSecs(0),
}
const cameraSnapshot: CameraPoseSnapshot = {
  position: { x: PositionAxis(0), y: PositionAxis(0), z: PositionAxis(0) },
  yawRadians: AngleRadians(0),
  pitchRadians: AngleRadians(0),
  capturedAtSecs: MonotonicTimeSecs(1),
}
const snapshotAge = snapshotAgeSecs(cameraSnapshot, MonotonicTimeSecs(3))
const settings: Settings = normaliseSettings({
  renderDistance: 1_000,
  keyBindings: { jump: 'Space' },
})
const drop = resolveDrop(DEFAULT_HARVEST_TOOL, DEFAULT_BLOCK_DROP, block)
const maxExplosionRaySteps = DEFAULT_EXPLOSION_LIMITS.maxRaySteps
const blockId = blockIdOf(block)
const zeroPower = BlockBlastResistance.result(0)
const extremePower = BlockBlastResistance.result(Number.MAX_SAFE_INTEGER)
if (blockId._tag !== 'Some' || zeroPower._tag !== 'Success' || extremePower._tag !== 'Success') {
  throw new Error('The block registry declaration consumer could not resolve stone')
}
const resistsZeroPower = resistsExplosion(blockId.value, zeroPower.success)
const resistsExtremePower = resistsExplosion(blockId.value, extremePower.success)
if (stack.count !== 2 || maxStackCountForItem(stack.item) !== 64 || recipe._tag !== 'Shaped') {
  throw new Error('Recipe declaration consumer returned an invalid result')
}
if (furnace.station !== 'furnace' || brewing.bottles[0]?.item !== 'water_bottle') {
  throw new Error('Recipe data declaration consumer returned an invalid result')
}
if (snapshotAge !== 2) {
  throw new Error('Camera snapshot declaration consumer returned an invalid result')
}
if (
  settings.renderDistance !== MAX_RENDER_DISTANCE ||
  settings.keyBindings[InputAction('jump')] !== KeyCode('Space')
) {
  throw new Error('Settings declaration consumer returned an invalid result')
}
if (drop?.item !== 'stone' || drop.count !== 1) {
  throw new Error('Block-harvest declaration consumer returned an invalid result')
}
if (maxExplosionRaySteps !== 128) {
  throw new Error('Explosion data declaration consumer returned an invalid result')
}
if (
  resistsZeroPower._tag !== 'Success' ||
  !resistsZeroPower.success ||
  resistsExtremePower._tag !== 'Success' ||
  resistsExtremePower.success
) {
  throw new Error('Explosion-resistance declaration consumer returned an invalid result')
}
`;
  if (typeConsumerSource.trim().length === 0) {
    throw new Error("TypeScript consumer source must not be empty");
  }
  await writeFile(
    join(consumerDirectory, "consumer.ts"),
    typeConsumerSource.trimStart(),
  );
  await writeFile(
    join(consumerDirectory, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: "ES2022",
          lib: ["ES2022", "ESNext.Disposable", "DOM", "DOM.Iterable"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          skipLibCheck: false,
        },
        files: ["consumer.ts"],
      },
      null,
      2,
    ) + "\n",
  );
  run(
    process.execPath,
    [
      typeScriptCompiler,
      "--project",
      join(consumerDirectory, "tsconfig.json"),
      "--pretty",
      "false",
    ],
    { cwd: consumerDirectory, timeoutMs: 30_000 },
  );
  console.log(`verified ${packageName} declaration consumer typecheck`);

  console.log(`verified package archive ${relative(root, archivePath)}`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
