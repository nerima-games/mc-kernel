/** Generates and verifies the committed public API snapshot. */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

/** Repository-specific API snapshot settings. */
export const REPOSITORY_POLICY = {
  tsconfigFile: 'tsconfig.build.json',
  entryPoints: ['src/index.ts'],
  snapshotFile: 'api-lock.md',
} as const

/** Snapshot renderer format version. */
export const FORMAT_VERSION = 1

/**
 * The in-memory destination for declaration emit. This path is never created:
 * `emitDeclarations` intercepts every write. It is inside the repository so
 * that module resolution from the emitted files finds the repository's own
 * `node_modules` (that is how `effect` resolves), and it starts with a dot so
 * that it would be invisible even if some future change did touch the disk.
 */
const VIRTUAL_DTS_DIRECTORY = '.api-lock-dts'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/** One rendered declaration. `name` is what the snapshot sorts by. */
export type Entry = {
  readonly name: string
  readonly kind: string
  readonly text: string
}

export type Snapshot = {
  readonly packageName: string
  readonly exported: ReadonlyArray<Entry>
  readonly supporting: ReadonlyArray<Entry>
}

/**
 * Code-unit ordering. Deliberately not `localeCompare`: its result depends on
 * the host's locale and ICU build, so two developers could produce two
 * different orderings of the same API and each would see the other's as a diff.
 */
export const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const compareEntries = (a: Entry, b: Entry): number =>
  compareStrings(a.name, b.name) || compareStrings(a.kind, b.kind) || compareStrings(a.text, b.text)

// ---------------------------------------------------------------------------
// Step 1-2: build the program and emit declarations into memory
// ---------------------------------------------------------------------------

export type LoadedProject = {
  readonly fileNames: ReadonlyArray<string>
  readonly options: ts.CompilerOptions
}

/** Read `tsconfig.build.json` exactly as `tsc -p` would, comments and all. */
export const loadProject = (tsconfigPath: string): LoadedProject => {
  const readResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  if (readResult.error !== undefined) {
    throw new Error(`api-lock: cannot read ${tsconfigPath}: ${describeDiagnostics([readResult.error])}`)
  }
  const parsed = ts.parseJsonConfigFileContent(
    readResult.config as unknown,
    ts.sys,
    path.dirname(tsconfigPath),
    undefined,
    tsconfigPath,
  )
  if (parsed.errors.length > 0) {
    throw new Error(`api-lock: cannot parse ${tsconfigPath}: ${describeDiagnostics(parsed.errors)}`)
  }
  return { fileNames: parsed.fileNames, options: parsed.options }
}

/**
 * Options forced on top of the repository's own.
 *
 * `noEmit: false` + `emitDeclarationOnly` is the whole trick: the repository
 * keeps `noEmit: true` on disk and still gets a declaration surface here.
 * `removeComments` strips the doc essays. `newLine: LineFeed` is forced so that
 * the snapshot is byte-identical on Windows. `declarationMap`/`sourceMap` are
 * forced off because both embed paths.
 */
const emitOverrides = (outDir: string): ts.CompilerOptions => ({
  noEmit: false,
  declaration: true,
  emitDeclarationOnly: true,
  declarationMap: false,
  sourceMap: false,
  inlineSourceMap: false,
  inlineSources: false,
  removeComments: true,
  stripInternal: true,
  newLine: ts.NewLineKind.LineFeed,
  outDir,
  // A composite/incremental project would try to read and write a build info
  // file; there is nothing to be incremental about in a one-shot report.
  // `tsBuildInfoFile` is not set to `undefined` because
  // `exactOptionalPropertyTypes` rejects that;
  // `composite: false` + `incremental: false` already stops it being consulted.
  composite: false,
  incremental: false,
})

const normalizePath = (value: string): string => path.resolve(value).replace(/\\/gu, '/')

const describeDiagnostics = (diagnostics: ReadonlyArray<ts.Diagnostic>): string =>
  ts.formatDiagnostics([...diagnostics], {
    getCanonicalFileName: (fileName) => fileName,
    // Relative to the repository root, so a diagnostic printed by CI never
    // carries a machine-specific prefix.
    getCurrentDirectory: () => rootDir,
    getNewLine: () => '\n',
  })

/**
 * Run declaration emit, capturing every file into a Map instead of writing it.
 *
 * Emit diagnostics are a HARD FAILURE. TS4023 and friends ("exported variable
 * has or is using name X from external module but cannot be named") mean tsc
 * could not produce a portable declaration — i.e. the public API cannot be
 * expressed to a consumer. That is exactly the class of bug this gate exists to
 * catch, so it must not be swallowed.
 */
export const emitDeclarations = (project: LoadedProject, outDir: string): ReadonlyMap<string, string> => {
  const options = { ...project.options, ...emitOverrides(outDir) }
  const program = ts.createProgram({ rootNames: [...project.fileNames], options })

  const emitted = new Map<string, string>()
  const result = program.emit(
    undefined,
    (fileName, text) => {
      emitted.set(normalizePath(fileName), text)
    },
    undefined,
    true,
  )

  const fatal = [...result.diagnostics, ...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics()].filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  )
  if (fatal.length > 0) {
    throw new Error(`api-lock: declaration emit failed.\n${describeDiagnostics(fatal)}`)
  }
  if (emitted.size === 0) {
    throw new Error('api-lock: declaration emit produced no files. Check REPOSITORY_POLICY.tsconfigFile.')
  }
  return emitted
}

// ---------------------------------------------------------------------------
// Step 3: a second program, over the in-memory declarations
// ---------------------------------------------------------------------------

/**
 * A compiler host that serves the emitted `.d.ts` from memory and everything
 * else (notably `effect`'s own declarations under `node_modules`) from disk.
 *
 * `directoryExists` and `realpath` matter as much as `readFile` here. Module
 * resolution probes the directory before it probes the file, so a host that
 * knows the CONTENTS of `<virtual>/src/domain/clock.d.ts` but reports that
 * `<virtual>/src/domain` does not exist resolves nothing at all and yields an
 * entry point with zero exports — which, since an empty report is a valid
 * report, would fail silently rather than loudly. Hence the explicit
 * `expectedFileCount` check in `generate`.
 */
export const createVirtualHost = (
  emitted: ReadonlyMap<string, string>,
  options: ts.CompilerOptions,
): ts.CompilerHost => {
  const host = ts.createCompilerHost(options, true)
  const base = {
    getSourceFile: host.getSourceFile.bind(host),
    fileExists: host.fileExists.bind(host),
    readFile: host.readFile.bind(host),
    directoryExists: host.directoryExists?.bind(host),
    realpath: host.realpath?.bind(host),
    getDirectories: host.getDirectories?.bind(host),
  }

  const directories = new Set<string>()
  for (const fileName of emitted.keys()) {
    let directory = path.dirname(fileName)
    while (!directories.has(directory)) {
      directories.add(directory)
      const parent = path.dirname(directory)
      if (parent === directory) {
        break
      }
      directory = parent
    }
  }

  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const text = emitted.get(normalizePath(fileName))
    if (text === undefined) {
      return base.getSourceFile(fileName, languageVersion, onError, shouldCreate)
    }
    // setParentNodes: true — `renderDeclaration` walks upwards from a symbol's
    // declaration to its enclosing statement.
    return ts.createSourceFile(fileName, text, languageVersion, true, ts.ScriptKind.TS)
  }
  host.fileExists = (fileName) => emitted.has(normalizePath(fileName)) || base.fileExists(fileName)
  host.readFile = (fileName) => emitted.get(normalizePath(fileName)) ?? base.readFile(fileName)
  host.directoryExists = (directoryName) =>
    directories.has(normalizePath(directoryName)) || (base.directoryExists?.(directoryName) ?? false)
  host.realpath = (fileName) =>
    emitted.has(normalizePath(fileName)) ? normalizePath(fileName) : (base.realpath?.(fileName) ?? fileName)
  host.getDirectories = (directoryName) => {
    const normalized = normalizePath(directoryName)
    const virtual = [...directories]
      .filter((candidate) => path.dirname(candidate) === normalized && candidate !== normalized)
      .map((candidate) => path.basename(candidate))
    return [...new Set([...(base.getDirectories?.(directoryName) ?? []), ...virtual])]
  }
  host.writeFile = () => undefined

  return host
}

/** Map a source entry point to its declaration, preserving its path below rootDir. */
const declarationPathFor = (entryPoint: string, outDir: string, sourceRoot: string): string => {
  const sourcePath = path.resolve(rootDir, entryPoint)
  const relativePath = path.relative(sourceRoot, sourcePath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`api-lock: entry point ${JSON.stringify(entryPoint)} is outside compilerOptions.rootDir.`)
  }
  return normalizePath(path.join(outDir, relativePath.replace(/\.tsx?$/u, '.d.ts')))
}

// ---------------------------------------------------------------------------
// Step 4-5: render
// ---------------------------------------------------------------------------

const KIND_BY_SYNTAX: ReadonlyArray<readonly [ts.SyntaxKind, string]> = [
  [ts.SyntaxKind.VariableStatement, 'const'],
  [ts.SyntaxKind.VariableDeclaration, 'const'],
  [ts.SyntaxKind.FunctionDeclaration, 'function'],
  [ts.SyntaxKind.ClassDeclaration, 'class'],
  [ts.SyntaxKind.InterfaceDeclaration, 'interface'],
  [ts.SyntaxKind.TypeAliasDeclaration, 'type'],
  [ts.SyntaxKind.EnumDeclaration, 'enum'],
  [ts.SyntaxKind.ModuleDeclaration, 'namespace'],
]

const kindOf = (node: ts.Node): string =>
  KIND_BY_SYNTAX.find(([syntax]) => syntax === node.kind)?.[1] ?? ts.SyntaxKind[node.kind]

/**
 * The statement that owns a declaration. A symbol for `const x` points at the
 * `VariableDeclaration`, whose text is `x: T` — the `const` and the modifiers
 * live on the enclosing `VariableStatement`.
 */
const owningStatement = (declaration: ts.Declaration): ts.Node =>
  ts.isVariableDeclaration(declaration) && declaration.parent.parent !== undefined
    ? declaration.parent.parent
    : declaration

/**
 * The declaration's text with its `export` / `declare` modifiers removed.
 *
 * Both are noise: everything in the "public surface" section is exported by
 * definition, and everything in a `.d.ts` is `declare` by definition. Removing
 * them is done by slicing from the first non-modifier token rather than by a
 * regex, so a type named `declareSomething` cannot be mangled.
 */
const renderDeclaration = (node: ts.Node): string => {
  const source = node.getSourceFile()
  const modifiers = ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : []
  const dropped = modifiers.filter(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DeclareKeyword,
  )
  const last = dropped[dropped.length - 1]
  const start = last === undefined ? node.getStart(source) : last.end
  return source.text.slice(start, node.end).trim()
}

const isTopLevelStatement = (node: ts.Node): boolean =>
  node.parent !== undefined && (ts.isSourceFile(node.parent) || ts.isModuleBlock(node.parent))

const resolveAlias = (checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol =>
  (symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol)

export type Collected = {
  readonly exported: ReadonlyArray<Entry>
  readonly supporting: ReadonlyArray<Entry>
}

/**
 * Walk the public surface, then close over the non-exported declarations it
 * refers to.
 *
 * The closure step is what api-extractor reports as `ae-forgotten-export` and
 * then omits. For Effect code it is not an edge case: `Context.Tag` always
 * emits its real type onto a synthesised `X_base` const that the barrel does
 * not export, so without this step every service Tag in the organisation would
 * render as an empty `class X extends X_base {}`.
 */
export const collectEntries = (
  checker: ts.TypeChecker,
  entrySourceFiles: ReadonlyArray<ts.SourceFile>,
  virtualFiles: ReadonlySet<string>,
): Collected => {
  const exported = new Map<string, Entry>()
  const supporting = new Map<string, Entry>()
  const publicSymbols = new Set<ts.Symbol>()
  const pending: Array<ts.Node> = []

  const declarationsOf = (symbol: ts.Symbol): ReadonlyArray<ts.Node> =>
    (symbol.declarations ?? [])
      .map(owningStatement)
      .filter((node) => virtualFiles.has(normalizePath(node.getSourceFile().fileName)))
      .filter(isTopLevelStatement)

  for (const sourceFile of entrySourceFiles) {
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
    if (moduleSymbol === undefined) {
      throw new Error(`api-lock: ${path.basename(sourceFile.fileName)} is not a module (it exports nothing).`)
    }
    for (const exportSymbol of checker.getExportsOfModule(moduleSymbol)) {
      const name = exportSymbol.getName()
      const target = resolveAlias(checker, exportSymbol)
      publicSymbols.add(target)
      publicSymbols.add(exportSymbol)
      for (const node of declarationsOf(target)) {
        const text = renderDeclaration(node)
        // A name can carry two declarations (the declaration-merged `type X` +
        // `const X` that every branded type in this organisation uses); both
        // belong in the report, keyed by name AND text so neither is lost.
        exported.set(JSON.stringify([name, text]), { name, kind: kindOf(node), text })
        pending.push(node)
      }
    }
  }

  const seen = new Set<ts.Node>()
  while (pending.length > 0) {
    const node = pending.pop()
    if (node === undefined || seen.has(node)) {
      continue
    }
    seen.add(node)
    for (const referenced of referencedLocalSymbols(checker, node, virtualFiles, publicSymbols)) {
      for (const declaration of declarationsOf(referenced)) {
        if (seen.has(declaration)) {
          continue
        }
        const text = renderDeclaration(declaration)
        supporting.set(JSON.stringify([referenced.getName(), text]), {
          name: referenced.getName(),
          kind: kindOf(declaration),
          text,
        })
        pending.push(declaration)
      }
    }
  }

  return {
    exported: [...exported.values()].sort(compareEntries),
    supporting: [...supporting.values()].sort(compareEntries),
  }
}

/**
 * Every identifier inside `node` that resolves to a top-level declaration in
 * this package which the barrel does NOT export.
 *
 * The `isTopLevelStatement` filter in `declarationsOf` is what keeps this from
 * over-collecting: an identifier like `monotonicSecs` inside a type literal
 * resolves to a property symbol whose declaration is a `PropertySignature`, not
 * a statement, so it is discarded.
 */
const referencedLocalSymbols = (
  checker: ts.TypeChecker,
  node: ts.Node,
  virtualFiles: ReadonlySet<string>,
  publicSymbols: ReadonlySet<ts.Symbol>,
): ReadonlyArray<ts.Symbol> => {
  const found: Array<ts.Symbol> = []
  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current)) {
      const symbol = checker.getSymbolAtLocation(current)
      if (symbol !== undefined) {
        const target = resolveAlias(checker, symbol)
        const inPackage = (target.declarations ?? []).some((declaration) =>
          virtualFiles.has(normalizePath(declaration.getSourceFile().fileName)),
        )
        if (inPackage && !publicSymbols.has(target) && !publicSymbols.has(symbol)) {
          found.push(target)
        }
      }
    }
    ts.forEachChild(current, visit)
  }
  visit(node)
  return found
}

const renderSection = (entries: ReadonlyArray<Entry>): string =>
  entries.map((entry) => `### ${entry.name}  \`${entry.kind}\`\n\n\`\`\`ts\n${entry.text}\n\`\`\``).join('\n\n')

export const renderSnapshot = (snapshot: Snapshot): string => {
  const lines = [
    `# API lock — ${snapshot.packageName}`,
    '',
    '<!-- Generated by `pnpm api:update`; checked by `pnpm api:check`. -->',
    '',
    `format: ${String(FORMAT_VERSION)}`,
    `exported declarations: ${String(snapshot.exported.length)}`,
    `supporting declarations: ${String(snapshot.supporting.length)}`,
    '',
    '## Exported',
    '',
  ]

  const body =
    snapshot.exported.length === 0 ? '_(this package exports nothing)_' : renderSection(snapshot.exported)

  const tail =
    snapshot.supporting.length === 0
      ? []
      : [
          '',
          '## Supporting declarations',
          '',
          'Not exported from the barrel, but named by the signatures above, so a',
          'consumer is exposed to them. `Context.Tag` service classes emit their real',
          'type onto one of these.',
          '',
          renderSection(snapshot.supporting),
        ]

  return `${[...lines, body, ...tail].join('\n')}\n`
}

/**
 * Refuse to write a snapshot that is not portable.
 *
 * These repositories are public and a previous sweep removed every `/Users/...`
 * path from them. Rather than trust that declaration emit will not reintroduce
 * one, this asserts it on every run. `import("...")` is checked for the same
 * reason plus a second one: its presence would mean tsc fell back to a
 * path-based reference instead of a named one, which is exactly the unstable
 * rendering that makes a lock file useless.
 */
export const assertPortable = (text: string): void => {
  const offences: Array<string> = []
  const forbidden: ReadonlyArray<readonly [RegExp, string]> = [
    [/\/(?:Users|home)\//u, 'an absolute home-directory path'],
    [/[A-Za-z]:\\/u, 'an absolute Windows path'],
    // A PATH-BASED `import("...")` only. A BARE one — `import("effect/Cause")`
    // — is fine and is unavoidable: `Data.TaggedError` synthesises a base class
    // whose type names `effect` internals that the barrel does not re-export,
    // so tsc has nothing to refer to them by except the package specifier. That
    // form is portable (it resolves the same way on every machine) and stable
    // (it is a package name, not a location), which is all this check is for.
    // A path-based one is neither, and means the report has leaked the shape of
    // somebody's disk.
    [/\bimport\s*\(\s*["'][./]|\bimport\s*\(\s*["'][A-Za-z]:/u, 'a path-based `import("...")` type reference'],
    [/node_modules/u, 'a node_modules path'],
    [new RegExp(VIRTUAL_DTS_DIRECTORY.replace('.', '\\.'), 'u'), 'the virtual emit directory'],
  ]
  const allLines = text.split('\n')
  for (const [pattern, what] of forbidden) {
    const match = pattern.exec(text)
    if (match !== null) {
      const lineNumber = text.slice(0, match.index).split('\n').length
      // Show the offending line. A bare line number sends the reader looking
      // for a file that was never written.
      offences.push(`line ${String(lineNumber)}: ${what}\n      ${(allLines[lineNumber - 1] ?? '').trim()}`)
    }
  }
  if (offences.length > 0) {
    throw new Error(
      `api-lock: refusing to write a non-portable snapshot:\n${offences.map((o) => `  ${o}`).join('\n')}\n\n` +
        'These repositories are public, and a snapshot containing a machine-specific\n' +
        'path or an inlined `import("...")` is not reviewable as a diff. This almost\n' +
        'always means a public signature names a type that cannot be referred to by\n' +
        'name from the entry point — export the type, or give the value an explicit\n' +
        'type annotation that only names exported types. See the "Determinism" note\n' +
        'in scripts/api-lock.ts.',
    )
  }
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export const generate = async (): Promise<string> => {
  const manifest = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
    readonly name?: string
  }
  const packageName = manifest.name ?? '(unnamed package)'

  const project = loadProject(path.join(rootDir, REPOSITORY_POLICY.tsconfigFile))
  const outDir = path.join(rootDir, VIRTUAL_DTS_DIRECTORY)
  const emitted = emitDeclarations(project, outDir)

  const virtualFiles = new Set(emitted.keys())
  const sourceRoot = project.options.rootDir ?? rootDir
  const entryDeclarations = REPOSITORY_POLICY.entryPoints.map((entry) => declarationPathFor(entry, outDir, sourceRoot))
  for (const declaration of entryDeclarations) {
    if (!virtualFiles.has(declaration)) {
      throw new Error(
        `api-lock: no declaration was emitted for entry point ` +
          `${JSON.stringify(path.relative(outDir, declaration))}. ` +
          'Check REPOSITORY_POLICY.entryPoints against package.json#exports.',
      )
    }
  }

  const dtsOptions: ts.CompilerOptions = {
    ...project.options,
    ...emitOverrides(outDir),
    noEmit: true,
    emitDeclarationOnly: false,
    declaration: false,
  }
  const host = createVirtualHost(emitted, dtsOptions)
  const dtsProgram = ts.createProgram({ rootNames: entryDeclarations, options: dtsOptions, host })
  const checker = dtsProgram.getTypeChecker()

  const entrySourceFiles = entryDeclarations.map((declaration) => {
    const sourceFile = dtsProgram.getSourceFile(declaration)
    if (sourceFile === undefined) {
      throw new Error(`api-lock: could not load the emitted declaration for ${path.relative(outDir, declaration)}.`)
    }
    return sourceFile
  })

  const collected = collectEntries(checker, entrySourceFiles, virtualFiles)

  // Fail loudly rather than write an empty report. An empty report is a valid
  // report (mc-dev-meta could legitimately export nothing), so the only way to
  // tell "this package exports nothing" from "module resolution silently
  // returned nothing" is to look at whether the entry point has export syntax.
  const entryHasExports = entrySourceFiles.some((sourceFile) => /^\s*export\b/mu.test(sourceFile.text))
  if (collected.exported.length === 0 && entryHasExports) {
    throw new Error(
      'api-lock: the entry point declares exports but none resolved. This is a bug in the ' +
        'virtual compiler host, not in the repository — see createVirtualHost.',
    )
  }

  const text = renderSnapshot({ packageName, exported: collected.exported, supporting: collected.supporting })
  assertPortable(text)
  return text
}

// ---------------------------------------------------------------------------
// Diffing
// ---------------------------------------------------------------------------

/**
 * Parse a rendered snapshot back into entries.
 *
 * `api:check` diffs at the ENTRY level rather than the line level, because
 * "`ClockPort` changed" plus three lines of context is a reviewable message and
 * a 900-line unified diff of a sorted file is not. The full text is still
 * compared byte-for-byte; the entry diff only explains the difference.
 */
export const parseEntries = (text: string): ReadonlyMap<string, string> => {
  const entries = new Map<string, string>()
  const pattern = /^### (?<name>\S+) {2}`(?<kind>[^`]+)`\n\n```ts\n(?<body>[\s\S]*?)\n```$/gmu
  let match = pattern.exec(text)
  while (match !== null) {
    const groups = match.groups ?? {}
    const name = groups['name'] ?? ''
    const kind = groups['kind'] ?? ''
    const body = groups['body'] ?? ''
    // Keyed by name AND kind. Every branded type in this organisation is a
    // declaration-merged `type X` plus a `const X`; keying by name alone would
    // report deleting the constructor as "X changed from a const into a type"
    // rather than as "the const X was removed", which is the thing that
    // actually broke the consumer. Showing the kind is worth it on its own
    // account too.
    const key = `${name} (${kind})`
    entries.set(entries.has(key) ? `${key} ${String(entries.size)}` : key, body)
    match = pattern.exec(text)
  }
  return entries
}

/** Longest-common-subsequence line diff. Entries are small; this is not hot. */
export const diffLines = (before: ReadonlyArray<string>, after: ReadonlyArray<string>): ReadonlyArray<string> => {
  const rows = before.length
  const cols = after.length
  const table: Array<Array<number>> = Array.from({ length: rows + 1 }, () =>
    Array.from({ length: cols + 1 }, () => 0),
  )
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      const row = table[i]
      const next = table[i + 1]
      if (row === undefined || next === undefined) {
        continue
      }
      row[j] = before[i] === after[j] ? (next[j + 1] ?? 0) + 1 : Math.max(next[j] ?? 0, row[j + 1] ?? 0)
    }
  }

  const out: Array<string> = []
  let i = 0
  let j = 0
  while (i < rows && j < cols) {
    if (before[i] === after[j]) {
      out.push(`      ${before[i] ?? ''}`)
      i += 1
      j += 1
    } else if ((table[i + 1]?.[j] ?? 0) >= (table[i]?.[j + 1] ?? 0)) {
      out.push(`    - ${before[i] ?? ''}`)
      i += 1
    } else {
      out.push(`    + ${after[j] ?? ''}`)
      j += 1
    }
  }
  while (i < rows) {
    out.push(`    - ${before[i] ?? ''}`)
    i += 1
  }
  while (j < cols) {
    out.push(`    + ${after[j] ?? ''}`)
    j += 1
  }
  return out
}

export const describeDifference = (committed: string, generated: string): ReadonlyArray<string> => {
  const before = parseEntries(committed)
  const after = parseEntries(generated)
  const names = [...new Set([...before.keys(), ...after.keys()])].sort(compareStrings)

  const lines: Array<string> = []
  for (const name of names) {
    const oldText = before.get(name)
    const newText = after.get(name)
    const label = name
    if (oldText === undefined && newText !== undefined) {
      lines.push(`  + ADDED    ${label}`)
      lines.push(...newText.split('\n').map((line) => `    + ${line}`))
    } else if (oldText !== undefined && newText === undefined) {
      lines.push(`  - REMOVED  ${label}`)
      lines.push(...oldText.split('\n').map((line) => `    - ${line}`))
    } else if (oldText !== newText && oldText !== undefined && newText !== undefined) {
      lines.push(`  ~ CHANGED  ${label}`)
      lines.push(...diffLines(oldText.split('\n'), newText.split('\n')))
    }
  }

  if (lines.length === 0) {
    lines.push(
      '  (no entry changed — the difference is in the header or the formatting.',
      '   This is what a FORMAT_VERSION bump or a `typescript` upgrade looks like.)',
    )
  }
  return lines
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const write = argv.includes('--write')
  const snapshotPath = path.join(rootDir, REPOSITORY_POLICY.snapshotFile)
  const generated = await generate()

  if (write) {
    await writeFile(snapshotPath, generated, 'utf8')
    console.log(`api-lock: wrote ${REPOSITORY_POLICY.snapshotFile}.`)
    return 0
  }

  const committed = await readFile(snapshotPath, 'utf8').catch(() => undefined)

  if (committed === undefined) {
    console.error(`api-lock: ${REPOSITORY_POLICY.snapshotFile} is missing.`)
    console.error('')
    console.error('The API lock file is required in every commit.')
    console.error('Create it with `pnpm api:update` and commit it.')
    return 1
  }

  if (committed === generated) {
    const count = parseEntries(generated).size
    console.log(`api-lock: OK — ${REPOSITORY_POLICY.snapshotFile} matches the public API (${String(count)} entries).`)
    return 0
  }

  console.error(`api-lock: ${REPOSITORY_POLICY.snapshotFile} is STALE. The public API has changed:`)
  console.error('')
  for (const line of describeDifference(committed, generated)) {
    console.error(line)
  }
  console.error('')
  console.error('If the change above is intended, run `pnpm api:update` and commit the result')
  console.error('AS PART OF THE SAME PULL REQUEST, so that a reviewer sees the surface change.')
  console.error('If it is not intended, you have just found a breaking change you did not mean')
  console.error('to make — which is the entire reason this gate exists.')
  return 1
}

const isDirectRun = (): boolean => {
  const entry = process.argv[1]
  return entry !== undefined && path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url))
}

if (isDirectRun()) {
  process.exit(await main(process.argv.slice(2)))
}
