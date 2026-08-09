import { mkdir, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const packageName = manifest.name

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    ...options,
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`)
  }
  return result
}

const capture = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with status ${result.status}\n${result.stdout ?? ''}${result.stderr ?? ''}`,
    )
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

const workspace = await mkdtemp(join(tmpdir(), 'mc-kernel-package-'))
const packDirectory = join(workspace, 'pack')
const consumerDirectory = join(workspace, 'consumer')
await mkdir(packDirectory)
await mkdir(consumerDirectory)

try {
  run('pnpm', ['pack', '--pack-destination', packDirectory])

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
    capture('tar', ['-tzf', archivePath], { cwd: root })
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

  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', archivePath], {
    cwd: consumerDirectory,
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
    const clock = rootModule.fixedClock({ monotonicSecs: 1, wallClockEpochMillis: 2 });
    const monotonic = await Effect.runPromise(clock.monotonicSecs);
    if (monotonic !== 1) {
      throw new Error('fixedClock returned ' + monotonic + ' instead of 1');
    }
    console.log('verified ' + packageName + ' exports: ' + specifiers.join(', '));
  `
  run('node', ['--input-type=module', '--eval', probe], { cwd: consumerDirectory })

  console.log(`verified package archive ${relative(root, archivePath)}`)
} finally {
  await rm(workspace, { recursive: true, force: true })
}
