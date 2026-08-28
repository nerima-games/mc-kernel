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
import { join, relative, resolve } from "node:path";
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
const starDomainEntryPoints = [
  ...sourceIndex.matchAll(
    /^\s*export \* from ['"]\.\/domain\/([^'"]+)\.js['"]\s*;?\s*$/gm,
  ),
].map(([, entryPoint]) => entryPoint);
// A module re-exported by name is as public as one re-exported wholesale; the
// named form is what a module uses when a star export would collide, and it
// legitimately appears twice when values and types are listed separately.
// Counting only star exports reports such a module as an undeclared extra.
const namedDomainEntryPoints = [
  ...sourceIndex.matchAll(
    /^\s*\}\s*from ['"]\.\/domain\/([^'"]+)\.js['"]\s*;?\s*$/gm,
  ),
].map(([, entryPoint]) => entryPoint);
if (starDomainEntryPoints.length === 0) {
  throw new Error("src/index.ts must declare at least one domain entrypoint");
}
if (new Set(starDomainEntryPoints).size !== starDomainEntryPoints.length) {
  throw new Error("src/index.ts contains duplicate domain entrypoints");
}
const sourceDomainEntryPoints = [
  ...new Set([...starDomainEntryPoints, ...namedDomainEntryPoints]),
];

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
const extraDomainEntryPoints = declaredDomainEntryPoints.filter(
  (entryPoint) => !sourceDomainEntryPoints.includes(entryPoint),
);
if (missingDomainEntryPoints.length > 0 || extraDomainEntryPoints.length > 0) {
  throw new Error(
    [
      missingDomainEntryPoints.length > 0
        ? `missing ${missingDomainEntryPoints.join(", ")}`
        : undefined,
      extraDomainEntryPoints.length > 0
        ? `extra ${extraDomainEntryPoints.join(", ")}`
        : undefined,
    ]
      .filter((message) => message !== undefined)
      .join("; "),
  );
}

for (const entryPoint of sourceDomainEntryPoints) {
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
    if (
      typeof rootModule.applyLook !== 'function' ||
      typeof rootModule.cameraPoseOf !== 'function' ||
      typeof rootModule.forwardVector !== 'function' ||
      rootModule.EYE_LEVEL_OFFSET !== 1.62
    ) {
      throw new Error('The root export does not expose camera-pose APIs');
    }
    const initialCameraSnapshot = rootModule.cameraPoseOf(
      rootModule.INITIAL_PLAYER_POSE,
      rootModule.MonotonicTimeSecs(0),
    );
    const initialCameraDirection = rootModule.forwardVector(initialCameraSnapshot);
    if (
      initialCameraSnapshot.position.y !== 1.62 ||
      initialCameraDirection.x !== 0 ||
      initialCameraDirection.y !== 0 ||
      initialCameraDirection.z !== -1
    ) {
      throw new Error('The root export returned invalid camera-pose results');
    }
    if (
      typeof rootModule.launchArrow !== 'function' ||
      typeof rootModule.stepArrow !== 'function' ||
      rootModule.ARROW_GRAVITY !== 9.81
    ) {
      throw new Error('The root export does not expose projectile APIs');
    }
    const packageArrow = rootModule.launchArrow({
      position: { x: 0, y: 0, z: 0 },
      yawRadians: 0,
      pitchRadians: 0,
      speed: 1,
    });
    const packageProjectileWorld = {
      blockBounds: () => [],
      entities: [],
      isInWater: () => false,
      bounds: { min: { x: -10, y: -10, z: -10 }, max: { x: 10, y: 10, z: 10 } },
    };
    const steppedArrow = rootModule.stepArrow(packageArrow, 0.01, packageProjectileWorld);
    if (steppedArrow.arrow.state !== 'flying' || steppedArrow.arrow.ageSeconds <= 0) {
      throw new Error('The root export returned invalid projectile results');
    }
    if (
      typeof rootModule.planExplosion !== 'function' ||
      typeof rootModule.applyExplosionPlan !== 'function' ||
      rootModule.DEFAULT_EXPLOSION_LIMITS?.maxRaySteps !== 128 ||
      typeof rootModule.primeTnt !== 'function' ||
      typeof rootModule.planPrimedTnt !== 'function' ||
      typeof rootModule.applyPrimedTntPlan !== 'function' ||
      rootModule.DEFAULT_TNT_FUSE_SECS !== 4
    ) {
      throw new Error('The root export does not expose explosion and primed-TNT APIs');
    }
    const packageExplosion = rootModule.planExplosion({
      center: { x: 0.5, y: 0.5, z: 0.5 },
      radius: 0,
      seed: 0,
      blocks: () => undefined,
      entities: [],
    });
    const packageTnt = rootModule.planPrimedTnt({
      center: { x: 0.5, y: 0.5, z: 0.5 },
      radius: 0,
      seed: 0,
      blocks: () => undefined,
      entities: [],
      state: rootModule.primeTnt(),
      deltaTimeSecs: 4,
    });
    if (
      packageExplosion.radius !== 0 ||
      packageExplosion.destroyedBlocks.length !== 0 ||
      packageTnt.after.kind !== 'detonated' ||
      packageTnt.explosion === undefined
    ) {
      throw new Error('The root export returned invalid explosion and primed-TNT results');
    }
    if (
      typeof rootModule.applyDamage !== 'function' ||
      typeof rootModule.normaliseVitals !== 'function' ||
      typeof rootModule.vitalsView !== 'function' ||
      rootModule.SPAWN_VITALS?.healthPoints !== 20
    ) {
      throw new Error('The root export does not expose vitals APIs');
    }
    const damagedVitals = rootModule.applyDamage(rootModule.SPAWN_VITALS, {
      amount: 20,
      cause: 'package-probe',
    });
    const spawnVitalsView = rootModule.vitalsView(rootModule.normaliseVitals(rootModule.SPAWN_VITALS));
    if (
      damagedVitals.healthPoints !== 0 ||
      damagedVitals.lastDamageCause !== 'package-probe' ||
      spawnVitalsView.experienceLevel !== 0 ||
      spawnVitalsView.experienceProgress !== 0
    ) {
      throw new Error('The root export returned invalid vitals results');
    }
    if (
      typeof rootModule.computeBreakTicks !== 'function' ||
      typeof rootModule.blockHardnessOf !== 'function' ||
      typeof rootModule.miningSpeedOf !== 'function' ||
      typeof rootModule.compileToolComponent !== 'function' ||
      typeof rootModule.resolveToolMiningProperties !== 'function' ||
      rootModule.DEFAULT_MINING_SPEED !== 1 ||
      rootModule.TOOL_BREAK_SPEED === null ||
      typeof rootModule.TOOL_BREAK_SPEED !== 'object'
    ) {
      throw new Error('The root export does not expose block break-speed APIs');
    }
    if (rootModule.blockHardnessOf('stone') !== 25) {
      throw new Error('The root export returned an invalid stone hardness');
    }
    if (rootModule.miningSpeedOf('gold_pickaxe') !== 12) {
      throw new Error('The root export returned an invalid resolved mining speed');
    }
    if (rootModule.computeBreakTicks({ correctForDrops: false, hardness: 1, miningSpeed: 1 }) !== 3) {
      throw new Error('The root export returned an invalid break tick result');
    }
    const resolvedTool = rootModule.resolveToolMiningProperties(
      { rules: [{ blocks: ['stone'], speed: 6, correctForDrops: true }], damagePerBlock: 1 },
      'stone',
    );
    if (
      JSON.stringify(resolvedTool) !==
      JSON.stringify({
        miningSpeed: 6,
        correctForDrops: true,
        damagePerBlock: 1,
        canDestroyBlocksInCreative: true,
      })
    ) {
      throw new Error('The root export returned invalid tool-component rule resolution');
    }
    const compiledTool = rootModule.compileToolComponent({
      rules: [{ blocks: ['stone'], speed: 6, correctForDrops: true }],
      damagePerBlock: 1,
    });
    if (rootModule.resolveToolMiningProperties(compiledTool, 'stone').miningSpeed !== 6) {
      throw new Error('The root export returned invalid compiled tool-component resolution');
    }
    if (
      rootModule.BEDROCK_DIGGER_MIN_FORMAT_VERSION !== '1.20.30' ||
      typeof rootModule.resolveBedrockDiggerSpeed !== 'function' ||
      typeof rootModule.resolveBedrockDestructionSeconds !== 'function' ||
      typeof rootModule.resolveBedrockItemSpecificDestroySpeed !== 'function'
    ) {
      throw new Error('The root export does not expose Bedrock mining APIs');
    }
    const bedrockBlock = {
      name: 'minecraft:oak_log',
      states: {},
      tags: new Set(['minecraft:wood']),
    };
    const bedrockDiggerSpeed = rootModule.resolveBedrockDiggerSpeed(
      { destroy_speeds: [{ block: { tags: "query.any_tag('minecraft:wood')" }, speed: 7 }] },
      bedrockBlock,
    );
    if (bedrockDiggerSpeed !== 7 || rootModule.bedrockDiggerUsesEfficiency(undefined) !== false) {
      throw new Error('The root export returned invalid Bedrock digger resolution');
    }
    if (rootModule.resolveBedrockDestructionSeconds(false, 5) !== Infinity) {
      throw new Error('The root export returned invalid Bedrock indestructible resolution');
    }
    const bedrockItemSpeed = rootModule.resolveBedrockItemSpecificDestroySpeed(
      { item_specific_speeds: [{ item: 'minecraft:diamond_axe', destroy_speed: 0.25 }] },
      { name: 'minecraft:diamond_axe', tags: new Set() },
    );
    if (bedrockItemSpeed !== 0.25) {
      throw new Error('The root export returned invalid Bedrock item-specific speed resolution');
    }
    const stack = rootModule.itemStack('stone', 2);
    if (stack.item !== 'stone' || stack.count !== 2 || rootModule.maxStackCountForItem('stone') !== 64) {
      throw new Error('The root export returned an invalid item-stack result');
    }
    const recipe = rootModule.shapedRecipe(
      'minecraft:package-probe',
      ['S'],
      { S: 'stone' },
      rootModule.itemStack('stick', 1),
      { tags: ['crafting_table'] },
    );
    const recipeMatch = rootModule.matchRecipe(
      [recipe],
      rootModule.craftGrid(3, 3, ['stone']),
      { station: 'crafting_table' },
    );
    if (recipeMatch._tag !== 'Match' || recipeMatch.recipe.id !== 'minecraft:package-probe') {
      throw new Error('The root export returned an invalid recipe match');
    }
    if (!Array.isArray(rootModule.VANILLA_CRAFTING_RECIPES) || rootModule.VANILLA_CRAFTING_RECIPES.length === 0) {
      throw new Error('The root export returned no vanilla crafting recipes');
    }
    const cooked = rootModule.advanceFurnace(
      rootModule.furnaceState({ input: rootModule.itemStack('sand', 1), fuel: rootModule.itemStack('coal', 1) }),
      10,
    );
    if (cooked.smeltedCount !== 1 || cooked.state.output?.item !== 'glass') {
      throw new Error('The root export returned an invalid furnace result');
    }
    const brewed = rootModule.advanceBrewing(
      rootModule.brewingState({
        bottles: [rootModule.itemStack('water_bottle', 1), undefined, undefined],
        ingredient: rootModule.itemStack('nether_wart', 1),
        fuelCharges: 1,
      }),
      20,
    );
    if (brewed.brewedCount !== 1 || brewed.state.bottles[0]?.item !== 'awkward_potion') {
      throw new Error('The root export returned an invalid brewing result');
    }
    const smithing = rootModule.applySmithing(rootModule.smithingInput({
      template: rootModule.itemStack('netherite_upgrade_smithing_template', 1),
      base: rootModule.itemStack('diamond_sword', 1),
      addition: rootModule.itemStack('netherite_ingot', 1),
    }));
    if (smithing._tag !== 'Transform' || smithing.output.item !== 'netherite_sword') {
      throw new Error('The root export returned an invalid smithing result');
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
  blockHardnessOf,
  computeBreakTicks,
  miningSpeedOf,
  compileToolComponent,
  resolveToolMiningProperties,
  advanceBrewing,
  advanceFurnace,
  applySmithing,
  applyDamage,
  normaliseVitals,
  vitalsView,
  cameraPoseOf,
  forwardVector,
  launchArrow,
  stepArrow,
  planExplosion,
  planPrimedTnt,
  primeTnt,
  INITIAL_PLAYER_POSE,
  MonotonicTimeSecs,
  brewingState,
  craftGrid,
  furnaceState,
  itemStack,
  matchRecipe,
  maxStackCountForItem,
  shapedRecipe,
  smithingInput,
  resolveBedrockDiggerSpeed,
  resolveBedrockDestructionSeconds,
  resolveBedrockItemSpecificDestroySpeed,
  BEDROCK_DIGGER_MIN_FORMAT_VERSION,
  type BedrockBlock,
  type BedrockDiggerComponent,
  type BedrockItem,
  type BlockType,
  type BrewingState,
  type FurnaceState,
  type ItemStack,
  type ItemType,
  type Recipe,
  type SmithingInput,
  type SmithingOperation,
  type ToolComponent,
  type CompiledToolComponent,
  type CameraPoseSnapshot,
  type Arrow,
  type ProjectileHit,
  type ProjectileWorld,
  type ExplosionPlan,
  type PrimedTntPlan,
  type Vitals,
} from ${JSON.stringify(packageName)}

const declaredPackageExports: readonly object[] = [
${typeConsumerSubpathUses}
]
if (declaredPackageExports.length !== ${importSpecifiers.length}) {
  throw new Error('The TypeScript consumer did not load every declared package export')
}

const block: BlockType = 'stone'
const tool: ItemType = 'gold_pickaxe'
const stack: ItemStack = itemStack('stone', 2)
const recipe: Recipe = shapedRecipe(
  'minecraft:declaration-probe',
  ['S'],
  { S: 'stone' },
  itemStack('stick', 1),
  { tags: ['crafting_table'] },
)
const recipeMatch = matchRecipe([recipe], craftGrid(3, 3, ['stone']), { station: 'crafting_table' })
const furnace: FurnaceState = furnaceState({ input: itemStack('sand', 1), fuel: itemStack('coal', 1) })
const cooked = advanceFurnace(furnace, 10)
const brewing: BrewingState = brewingState({
  bottles: [itemStack('water_bottle', 1), undefined, undefined],
  ingredient: itemStack('nether_wart', 1),
  fuelCharges: 1,
})
const brewed = advanceBrewing(brewing, 20)
const smithingInputValue: SmithingInput = smithingInput({
  template: itemStack('netherite_upgrade_smithing_template', 1),
  base: itemStack('diamond_sword', 1),
  addition: itemStack('netherite_ingot', 1),
})
const smithing: SmithingOperation = applySmithing(smithingInputValue)
const vitals: Vitals = normaliseVitals({ healthPoints: 20, hungerPoints: 20 })
const vitalsAfterDamage = applyDamage(vitals, { amount: 1, cause: 'declaration-probe' })
const vitalsDisplay = vitalsView(vitalsAfterDamage)
const cameraSnapshot: CameraPoseSnapshot = cameraPoseOf(INITIAL_PLAYER_POSE, MonotonicTimeSecs(0))
const cameraDirection = forwardVector(cameraSnapshot)
const projectileWorld: ProjectileWorld = {
  blockBounds: () => [],
  entities: [],
  isInWater: () => false,
  bounds: { min: { x: -10, y: -10, z: -10 }, max: { x: 10, y: 10, z: 10 } },
}
const launchedArrow: Arrow = launchArrow({
  position: { x: 0, y: 0, z: 0 },
  yawRadians: 0,
  pitchRadians: 0,
  speed: 1,
})
const projectileStep = stepArrow(launchedArrow, 0.01, projectileWorld)
const projectileHit: ProjectileHit | undefined = projectileStep.hit
const explosionPlan: ExplosionPlan = planExplosion({
  center: { x: 0.5, y: 0.5, z: 0.5 },
  radius: 0,
  seed: 0,
  blocks: () => undefined,
  entities: [],
})
const primedTntPlan: PrimedTntPlan = planPrimedTnt({
  center: { x: 0.5, y: 0.5, z: 0.5 },
  radius: 0,
  seed: 0,
  blocks: () => undefined,
  entities: [],
  state: primeTnt(),
  deltaTimeSecs: 4,
})
const hardness = blockHardnessOf(block)
const ticks = computeBreakTicks({ correctForDrops: true, hardness, miningSpeed: miningSpeedOf(tool) })
const component: ToolComponent = { rules: [{ blocks: [block], speed: 2 }], damagePerBlock: 1 }
const compiledComponent: CompiledToolComponent = compileToolComponent(component)
const resolved = resolveToolMiningProperties(compiledComponent, block)
const bedrockBlock: BedrockBlock = { name: 'minecraft:oak_log', states: {}, tags: new Set(['minecraft:wood']) }
const digger: BedrockDiggerComponent = {
  destroy_speeds: [{ block: { tags: "query.any_tag('minecraft:wood')" }, speed: 7 }],
}
const bedrockItem: BedrockItem = { name: 'minecraft:diamond_axe', tags: new Set() }
const bedrockSpeed = resolveBedrockDiggerSpeed(digger, bedrockBlock)
const bedrockSeconds = resolveBedrockDestructionSeconds({ seconds_to_destroy: 2 }, 5)
const itemSpecificSpeed = resolveBedrockItemSpecificDestroySpeed(
  { item_specific_speeds: [{ item: 'minecraft:diamond_axe', destroy_speed: 0.25 }] },
  bedrockItem,
)
if (BEDROCK_DIGGER_MIN_FORMAT_VERSION !== '1.20.30' || bedrockSpeed !== 7 || bedrockSeconds !== 2 || itemSpecificSpeed !== 0.25) {
  throw new Error('Bedrock mining declaration consumer returned an invalid result')
}
if (ticks < 0) {
  throw new Error('Break ticks must be non-negative')
}
if (resolved.miningSpeed !== 2 || resolved.damagePerBlock !== 1) {
  throw new Error('Tool component declaration consumer returned an invalid result')
}
if (stack.count !== 2 || maxStackCountForItem(stack.item) !== 64 || recipeMatch._tag !== 'Match') {
  throw new Error('Recipe declaration consumer returned an invalid result')
}
if (cooked.smeltedCount !== 1 || brewed.brewedCount !== 1) {
  throw new Error('Cooking declaration consumer returned an invalid result')
}
if (smithing._tag !== 'Transform' || smithing.output.item !== 'netherite_sword') {
  throw new Error('Smithing declaration consumer returned an invalid result')
}
if (vitalsDisplay.healthPoints !== 19 || vitalsDisplay.experienceLevel !== 0) {
  throw new Error('Vitals declaration consumer returned an invalid result')
}
if (cameraSnapshot.position.y !== 1.62 || cameraDirection.z !== -1) {
  throw new Error('Camera-pose declaration consumer returned an invalid result')
}
if (projectileStep.arrow.state !== 'flying' || projectileStep.arrow.ageSeconds <= 0) {
  throw new Error('Projectile declaration consumer returned an invalid result')
}
if (explosionPlan.radius !== 0 || primedTntPlan.after.kind !== 'detonated' || primedTntPlan.explosion === undefined) {
  throw new Error('Explosion declaration consumer returned an invalid result')
}
void projectileHit
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
