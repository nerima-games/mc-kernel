import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const packageName = manifest.name
const DEFAULT_COMMAND_TIMEOUT_MS = 120_000
const typeScriptCompiler = join(root, 'node_modules', 'typescript', 'bin', 'tsc')

const commandLabel = (command, args) => command + ' ' + args.join(' ')

const run = (command, args, { timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS, ...options } = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    timeout: timeoutMs,
    killSignal: 'SIGTERM',
    ...options,
  })
  if (result.error) {
    throw new Error(commandLabel(command, args) + ' failed: ' + result.error.message)
  }
  if (result.signal) {
    throw new Error(commandLabel(command, args) + ' terminated by ' + result.signal)
  }
  if (result.status !== 0) {
    throw new Error(commandLabel(command, args) + ' exited with status ' + result.status)
  }
  return result
}

const capture = (command, args, { timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS, ...options } = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: timeoutMs,
    killSignal: 'SIGTERM',
    ...options,
  })
  if (result.error) {
    throw new Error(commandLabel(command, args) + ' failed: ' + result.error.message)
  }
  if (result.signal) {
    throw new Error(commandLabel(command, args) + ' terminated by ' + result.signal)
  }
  if (result.status !== 0) {
    throw new Error(commandLabel(command, args) + ' exited with status ' + result.status + '\n' + (result.stdout ?? '') + (result.stderr ?? ''))
  }
  return result.stdout
}

const exportEntries = Object.entries(manifest.exports ?? {})
if (exportEntries.length === 0) {
  throw new Error('package.json must declare at least one export')
}

const targetPaths = new Set()
for (const [subpath, target] of exportEntries) {
  if (typeof target === 'string') {
    targetPaths.add(target)
    continue
  }
  if (typeof target !== 'object' || target === null) {
    throw new Error(`Unsupported export declaration for ${subpath}`)
  }
  for (const field of ['types', 'import', 'default']) {
    if (typeof target[field] === 'string') {
      targetPaths.add(target[field])
    }
  }
}

if (targetPaths.size === 0) {
  throw new Error('package.json exports do not contain any target paths')
}

const archiveEntryFor = (targetPath) => `package/${targetPath.replace(/^\.\//, '')}`
const importSpecifiers = exportEntries.map(([subpath]) =>
  subpath === '.' ? packageName : `${packageName}${subpath.slice(1)}`,
)
const peerDependencies = manifest.peerDependencies ?? {}

const workspace = await mkdtemp(join(tmpdir(), 'mc-kernel-package-'))
const packDirectory = join(workspace, 'pack')
const consumerDirectory = join(workspace, 'consumer')
await mkdir(packDirectory)
await mkdir(consumerDirectory)

try {
  run('pnpm', ['pack', '--pack-destination', packDirectory], { timeoutMs: 60_000 })

  const archives = (await readdir(packDirectory)).filter((entry) => entry.endsWith('.tgz'))
  if (archives.length !== 1) {
    throw new Error(`Expected exactly one package archive, found ${archives.length}`)
  }

  const archivePath = join(packDirectory, archives[0])
  const archiveStat = await stat(archivePath)
  if (archiveStat.size === 0) {
    throw new Error('Package archive is empty')
  }

  const archiveEntries = new Set(
    capture('tar', ['-tzf', archivePath], { cwd: root, timeoutMs: 30_000 })
      .trim()
      .split('\n')
      .filter(Boolean),
  )
  for (const targetPath of targetPaths) {
    const archiveEntry = archiveEntryFor(targetPath)
    if (!archiveEntries.has(archiveEntry)) {
      throw new Error(`Package archive is missing export target ${archiveEntry}`)
    }
  }

  await writeFile(
    join(consumerDirectory, 'package.json'),
    JSON.stringify(
      {
        name: 'mc-kernel-package-consumer',
        private: true,
        type: 'module',
        dependencies: peerDependencies,
      },
      null,
      2,
    ) + '\n',
  )
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', archivePath], {
    cwd: consumerDirectory,
    timeoutMs: 180_000,
  })

  const probe = `
    const packageName = ${JSON.stringify(packageName)};
    const specifiers = ${JSON.stringify(importSpecifiers)};
    const modules = await Promise.all(specifiers.map((specifier) => import(specifier)));
    if (modules.some((module) => Object.keys(module).length === 0)) {
      throw new Error('An exported package module has no runtime exports');
    }
    const { Effect } = await import('effect');
    const rootModule = modules[0];
    if (typeof rootModule.fixedClock !== 'function') {
      throw new Error('The root export does not expose fixedClock');
    }
    if (
      typeof rootModule.computeBreakTicks !== 'function' ||
      typeof rootModule.blockHardnessOf !== 'function' ||
      typeof rootModule.miningSpeedOf !== 'function' ||
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
      JSON.stringify({ miningSpeed: 6, correctForDrops: true, damagePerBlock: 1 })
    ) {
      throw new Error('The root export returned invalid tool-component rule resolution');
    }
    const clock = rootModule.fixedClock({ monotonicSecs: 1, wallClockEpochMillis: 2 });
    const monotonic = await Effect.runPromise(clock.monotonicSecs);
    if (monotonic !== 1) {
      throw new Error('fixedClock returned ' + monotonic + ' instead of 1');
    }
    console.log('verified ' + packageName + ' exports: ' + specifiers.join(', '));
  `
  run('node', ['--input-type=module', '--eval', probe], { cwd: consumerDirectory, timeoutMs: 30_000 })

  const typeConsumerSource = `
import {
  blockHardnessOf,
  computeBreakTicks,
  miningSpeedOf,
  resolveToolMiningProperties,
  type BlockType,
  type ItemType,
  type ToolComponent,
} from ${JSON.stringify(packageName)}

const block: BlockType = 'stone'
const tool: ItemType = 'gold_pickaxe'
const hardness = blockHardnessOf(block)
const ticks = computeBreakTicks({ correctForDrops: true, hardness, miningSpeed: miningSpeedOf(tool) })
const component: ToolComponent = { rules: [{ blocks: [block], speed: 2 }], damagePerBlock: 1 }
const resolved = resolveToolMiningProperties(component, block)
if (ticks < 0) {
  throw new Error('Break ticks must be non-negative')
}
if (resolved.miningSpeed !== 2 || resolved.damagePerBlock !== 1) {
  throw new Error('Tool component declaration consumer returned an invalid result')
}
`
  if (typeConsumerSource.trim().length === 0) {
    throw new Error('TypeScript consumer source must not be empty')
  }
  await writeFile(join(consumerDirectory, 'consumer.ts'), typeConsumerSource.trimStart())
  await writeFile(
    join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: false,
        },
        files: ['consumer.ts'],
      },
      null,
      2,
    ) + '\n',
  )
  run(process.execPath, [
    typeScriptCompiler,
    '--project',
    join(consumerDirectory, 'tsconfig.json'),
    '--pretty',
    'false',
  ], { cwd: consumerDirectory, timeoutMs: 30_000 })
  console.log(`verified ${packageName} declaration consumer typecheck`)

  console.log(`verified package archive ${relative(root, archivePath)}`)
} finally {
  await rm(workspace, { recursive: true, force: true })
}
