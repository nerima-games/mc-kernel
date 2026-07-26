import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import {
  allowedDirectDependencies,
  checkDeclaredDependencies,
  checkPolicyConfiguration,
  classifyImport,
  extractOrgPackageName,
  findBannedTimeSources,
  findCycles,
  findTransitivePath,
  isToolingOrTestPath,
  maskSource,
  parseImports,
  REPOSITORY_POLICY,
  type DeclaredDependencies,
} from '../scripts/check-dependency-whitelist'

const NOTHING_DECLARED: DeclaredDependencies = {
  dependencies: new Set<string>(),
  devDependencies: new Set<string>(),
}

const graph = (entries: ReadonlyArray<readonly [string, ReadonlyArray<string>]>): Map<string, ReadonlySet<string>> =>
  new Map(entries.map(([node, targets]) => [node, new Set(targets)]))

describe('mc-kernel dependency policy', () => {
  it.effect('declares no direct dependencies at all, which is what lets every other repository import it', () =>
    Effect.sync(() => {
      expect(REPOSITORY_POLICY.thisPackage).toBe('@nerima-games/mc-kernel')
      expect([...allowedDirectDependencies()]).toStrictEqual([])
    }),
  )

  it.effect('has an internally consistent configuration, so the gate itself cannot be quietly broken', () =>
    Effect.sync(() => {
      expect(checkPolicyConfiguration()).toStrictEqual([])
    }),
  )
})

describe('the 16-repository roster (plan.md §2.1)', () => {
  const roster = REPOSITORY_POLICY.dependencyGraph

  it.effect('records all 16 repositories, so cycle detection has the whole organisation to work with', () =>
    Effect.sync(() => {
      expect([...roster.keys()].sort()).toStrictEqual(
        [
          '@nerima-games/mc-audio',
          '@nerima-games/mc-compose',
          '@nerima-games/mc-dev-meta',
          '@nerima-games/mc-kernel',
          '@nerima-games/mc-meshing',
          '@nerima-games/mc-noise',
          '@nerima-games/mc-physics',
          '@nerima-games/mc-playground-kit',
          '@nerima-games/mc-render',
          '@nerima-games/mc-save',
          '@nerima-games/mc-sim',
          '@nerima-games/mc-worldgen',
          '@nerima-games/mx-gameplay',
          '@nerima-games/mx-multiplayer',
          '@nerima-games/mx-redstone',
          '@nerima-games/mx-ui',
        ].sort(),
      )
      expect(roster.size).toBe(16)
    }),
  )

  it.effect('the full roster is acyclic — the property that made recording it worth doing', () =>
    Effect.sync(() => {
      expect(findCycles(roster)).toStrictEqual([])
    }),
  )

  it.effect('every edge points at a package that has its own row, so no cycle can hide behind a gap', () =>
    Effect.sync(() => {
      for (const [source, targets] of roster) {
        for (const target of targets) {
          expect({ source, target, known: roster.has(target) }).toStrictEqual({
            source,
            target,
            known: true,
          })
        }
      }
    }),
  )

  it.effect('mc-kernel appears as a target nowhere, because it is universally importable (rule 4)', () =>
    Effect.sync(() => {
      for (const [, targets] of roster) {
        expect([...targets]).not.toContain('@nerima-games/mc-kernel')
      }
      // ...and it depends on nothing, which is what makes that safe.
      expect([...(roster.get('@nerima-games/mc-kernel') ?? [])]).toStrictEqual([])
    }),
  )

  it.effect('mc-playground-kit is a target of nobody, because it is a devDependency edge only', () =>
    Effect.sync(() => {
      // plan.md §2.3-2: mx-gameplay and mx-redstone use the kit, but only to
      // launch previews. Modelling that as a runtime edge would make the graph
      // look cyclic (gameplay -> kit -> render -> sim, gameplay -> sim) and
      // would legitimise shipping it.
      for (const [, targets] of roster) {
        expect([...targets]).not.toContain('@nerima-games/mc-playground-kit')
      }
      // It still has a row, because its OWN dependencies are real runtime edges.
      expect([...(roster.get('@nerima-games/mc-playground-kit') ?? [])].sort()).toStrictEqual([
        '@nerima-games/mc-render',
        '@nerima-games/mc-sim',
        '@nerima-games/mc-worldgen',
      ])
    }),
  )

  it.effect('the six stable libraries depend on nothing, so they can be built in parallel', () =>
    Effect.sync(() => {
      for (const library of [
        '@nerima-games/mc-kernel',
        '@nerima-games/mc-noise',
        '@nerima-games/mc-meshing',
        '@nerima-games/mc-physics',
        '@nerima-games/mc-save',
        '@nerima-games/mc-audio',
      ]) {
        expect([...(roster.get(library) ?? ['MISSING'])]).toStrictEqual([])
      }
    }),
  )

  it.effect('no experience module depends on another experience module (plan.md §2.3-1)', () =>
    Effect.sync(() => {
      const experience = [
        '@nerima-games/mx-gameplay',
        '@nerima-games/mx-redstone',
        '@nerima-games/mx-ui',
        '@nerima-games/mx-multiplayer',
      ]
      for (const module of experience) {
        for (const target of roster.get(module) ?? []) {
          expect(experience).not.toContain(target)
        }
      }
    }),
  )
})

describe('transitive closure against the real roster', () => {
  const roster = REPOSITORY_POLICY.dependencyGraph

  // The rule the roster exists to make enforceable. Kernel's own row is empty,
  // so these have to be asked from another repository's seat — hence the
  // `PolicyView` parameter on the checks.
  const asRender = {
    thisPackage: '@nerima-games/mc-render',
    dependencyGraph: roster,
    aliases: REPOSITORY_POLICY.aliases,
  }

  const shippedSite = (importedPackage: string) => ({
    importedPackage,
    filePath: 'domain/renderer.ts',
    line: 7,
    isToolingOrTest: false,
  })

  it.effect('mc-render reaches mc-physics only through mc-sim', () =>
    Effect.sync(() => {
      expect(findTransitivePath(roster, '@nerima-games/mc-render', '@nerima-games/mc-physics')).toStrictEqual([
        '@nerima-games/mc-render',
        '@nerima-games/mc-sim',
        '@nerima-games/mc-physics',
      ])
      expect([...(roster.get('@nerima-games/mc-render') ?? [])]).not.toContain('@nerima-games/mc-physics')
    }),
  )

  it.effect('and is therefore REJECTED for importing it — a dependency is not an import licence', () =>
    Effect.sync(() => {
      const violation = classifyImport(
        shippedSite('@nerima-games/mc-physics'),
        { dependencies: new Set(['@nerima-games/mc-physics']), devDependencies: new Set<string>() },
        asRender,
      )
      expect(violation?.rule).toBe('transitive-import')
      expect(violation?.message).toContain('mc-render -> @nerima-games/mc-sim -> @nerima-games/mc-physics')
    }),
  )

  it.effect('mx-ui may not reach mc-worldgen, even though mc-sim does', () =>
    Effect.sync(() => {
      const asUi = {
        thisPackage: '@nerima-games/mx-ui',
        dependencyGraph: roster,
        aliases: REPOSITORY_POLICY.aliases,
      }
      const violation = classifyImport(shippedSite('@nerima-games/mc-worldgen'), NOTHING_DECLARED, asUi)
      expect(violation?.rule).toBe('transitive-import')
    }),
  )

  it.effect('a direct dependency IS an import licence, provided package.json agrees', () =>
    Effect.sync(() => {
      const declared = {
        dependencies: new Set(['@nerima-games/mc-sim']),
        devDependencies: new Set<string>(),
      }
      expect(classifyImport(shippedSite('@nerima-games/mc-sim'), declared, asRender)).toBeUndefined()
      // Same import, undeclared in package.json -> still rejected.
      expect(
        classifyImport(shippedSite('@nerima-games/mc-sim'), NOTHING_DECLARED, asRender)?.rule,
      ).toBe('undeclared-dependency')
    }),
  )

  it.effect('mc-kernel stays importable from anywhere without appearing in any row', () =>
    Effect.sync(() => {
      const declared = {
        dependencies: new Set(['@nerima-games/mc-kernel']),
        devDependencies: new Set<string>(),
      }
      for (const seat of ['@nerima-games/mx-ui', '@nerima-games/mc-compose', '@nerima-games/mc-noise']) {
        const violation = classifyImport(shippedSite('@nerima-games/mc-kernel'), declared, {
          thisPackage: seat,
          dependencyGraph: roster,
          aliases: REPOSITORY_POLICY.aliases,
        })
        expect(violation).toBeUndefined()
      }
    }),
  )

  it.effect('an unknown org package still fails closed, even with the full roster present', () =>
    Effect.sync(() => {
      const violation = classifyImport(shippedSite('@nerima-games/mc-does-not-exist'), NOTHING_DECLARED, asRender)
      expect(violation?.rule).toBe('unknown-package')
    }),
  )

  it.effect('a known package with no path at all is not-whitelisted rather than transitive', () =>
    Effect.sync(() => {
      // mx-ui is a real repository, but nothing reaches it from mc-render:
      // edges point up the tiers, never down.
      expect(findTransitivePath(roster, '@nerima-games/mc-render', '@nerima-games/mx-ui')).toBeUndefined()
      const violation = classifyImport(shippedSite('@nerima-games/mx-ui'), NOTHING_DECLARED, asRender)
      expect(violation?.rule).toBe('not-whitelisted')

      // Contrast: mc-noise IS reachable (render -> worldgen -> noise), so the
      // same import there gets the more specific transitive explanation.
      expect(findTransitivePath(roster, '@nerima-games/mc-render', '@nerima-games/mc-noise')).toStrictEqual([
        '@nerima-games/mc-render',
        '@nerima-games/mc-worldgen',
        '@nerima-games/mc-noise',
      ])
    }),
  )

  it.effect('mc-playground-kit in a shipped file is rejected from an experience module too', () =>
    Effect.sync(() => {
      const asGameplay = {
        thisPackage: '@nerima-games/mx-gameplay',
        dependencyGraph: roster,
        aliases: REPOSITORY_POLICY.aliases,
      }
      const declared = {
        dependencies: new Set<string>(),
        devDependencies: new Set(['@nerima-games/mc-playground-kit']),
      }
      expect(
        classifyImport(shippedSite('@nerima-games/mc-playground-kit'), declared, asGameplay)?.rule,
      ).toBe('dev-only-package-in-shipped-source')
      // ...and permitted from a preview/test file.
      expect(
        classifyImport(
          { ...shippedSite('@nerima-games/mc-playground-kit'), filePath: 'test/x.test.ts', isToolingOrTest: true },
          declared,
          asGameplay,
        ),
      ).toBeUndefined()
    }),
  )
})

describe('a cycle in the roster would be caught', () => {
  it.effect('adding the edge the architecture forbids turns the roster cyclic', () =>
    Effect.sync(() => {
      // Proof that the roster's acyclicity is a real property of the data and
      // not an artefact of findCycles never finding anything: inject the one
      // edge plan.md §2.3-1 forbids (an experience module depending on the
      // composition layer) and the same checker fails.
      const broken = new Map(REPOSITORY_POLICY.dependencyGraph)
      broken.set('@nerima-games/mx-ui', new Set(['@nerima-games/mc-compose']))

      const violations = findCycles(broken)
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0]?.rule).toBe('cycle')
      expect(violations[0]?.message).toContain('@nerima-games/mx-ui')
      expect(violations[0]?.message).toContain('@nerima-games/mc-compose')
    }),
  )

  it.effect('so would a kit runtime edge, which is why it is modelled as devDependency-only', () =>
    Effect.sync(() => {
      const broken = new Map(REPOSITORY_POLICY.dependencyGraph)
      broken.set(
        '@nerima-games/mx-gameplay',
        new Set([...(broken.get('@nerima-games/mx-gameplay') ?? []), '@nerima-games/mc-playground-kit']),
      )
      broken.set(
        '@nerima-games/mc-playground-kit',
        new Set([...(broken.get('@nerima-games/mc-playground-kit') ?? []), '@nerima-games/mx-gameplay']),
      )
      expect(findCycles(broken).length).toBeGreaterThan(0)
    }),
  )
})

describe('cycle rejection', () => {
  it.effect('rejects a two-node cycle outright — there is no co-evolution allowlist in this project', () =>
    Effect.sync(() => {
      const violations = findCycles(graph([['a', ['b']], ['b', ['a']]]))
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0]?.rule).toBe('cycle')
      expect(violations[0]?.message).toContain('->')
    }),
  )

  it.effect('rejects a longer cycle and names the path it found', () =>
    Effect.sync(() => {
      const violations = findCycles(graph([['a', ['b']], ['b', ['c']], ['c', ['a']]]))
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0]?.message).toContain('a -> b -> c -> a')
    }),
  )

  it.effect('accepts a diamond, because a DAG with a shared descendant is not a cycle', () =>
    Effect.sync(() => {
      const violations = findCycles(
        graph([['a', ['b', 'c']], ['b', ['d']], ['c', ['d']], ['d', []]]),
      )
      expect(violations).toStrictEqual([])
    }),
  )

  it.effect('accepts an empty graph and the single-node kernel graph', () =>
    Effect.sync(() => {
      expect(findCycles(graph([]))).toStrictEqual([])
      expect(findCycles(graph([['@nerima-games/mc-kernel', []]]))).toStrictEqual([])
    }),
  )
})

describe('transitive closure', () => {
  it.effect('findTransitivePath produces the chain that explains why an import is not licensed', () =>
    Effect.sync(() => {
      const declared = graph([
        ['@nerima-games/mc-app', ['@nerima-games/mc-sim']],
        ['@nerima-games/mc-sim', ['@nerima-games/mc-physics']],
        ['@nerima-games/mc-physics', []],
      ])

      expect(findTransitivePath(declared, '@nerima-games/mc-app', '@nerima-games/mc-physics')).toStrictEqual([
        '@nerima-games/mc-app',
        '@nerima-games/mc-sim',
        '@nerima-games/mc-physics',
      ])
    }),
  )

  it.effect('findTransitivePath returns undefined when there is no path at all', () =>
    Effect.sync(() => {
      const declared = graph([['a', ['b']], ['b', []], ['c', []]])
      expect(findTransitivePath(declared, 'a', 'c')).toBeUndefined()
    }),
  )
})

describe('classifyImport', () => {
  const site = (importedPackage: string, isToolingOrTest = false) => ({
    importedPackage,
    filePath: isToolingOrTest ? 'test/example.test.ts' : 'domain/example.ts',
    line: 3,
    isToolingOrTest,
  })

  it.effect('rejects importing this package by name instead of relatively', () =>
    Effect.sync(() => {
      const violation = classifyImport(site('@nerima-games/mc-kernel'), NOTHING_DECLARED)
      expect(violation?.rule).toBe('self-import')
    }),
  )

  it.effect('rejects an org package that is not in the declared graph, so the gate fails closed', () =>
    Effect.sync(() => {
      const violation = classifyImport(site('@nerima-games/mc-does-not-exist'), NOTHING_DECLARED)
      expect(violation?.rule).toBe('unknown-package')
      expect(violation?.filePath).toBe('domain/example.ts')
      expect(violation?.line).toBe(3)
    }),
  )

  it.effect('rejects mc-playground-kit imported from shipped source, with the reason spelled out', () =>
    Effect.sync(() => {
      const violation = classifyImport(site('@nerima-games/mc-playground-kit'), {
        dependencies: new Set<string>(),
        devDependencies: new Set(['@nerima-games/mc-playground-kit']),
      })
      expect(violation?.rule).toBe('dev-only-package-in-shipped-source')
      expect(violation?.message).toContain('input handling')
    }),
  )

  it.effect('allows mc-playground-kit from a test file when it is declared in devDependencies', () =>
    Effect.sync(() => {
      const violation = classifyImport(site('@nerima-games/mc-playground-kit', true), {
        dependencies: new Set<string>(),
        devDependencies: new Set(['@nerima-games/mc-playground-kit']),
      })
      expect(violation).toBeUndefined()
    }),
  )

  it.effect('still requires an otherwise-allowed import to be declared in package.json', () =>
    Effect.sync(() => {
      const violation = classifyImport(site('@nerima-games/mc-playground-kit', true), NOTHING_DECLARED)
      expect(violation?.rule).toBe('undeclared-dependency')
    }),
  )
})

describe('checkDeclaredDependencies', () => {
  it.effect('rejects @nerima-games/mc-playground-kit in "dependencies", because it is devDependency-only', () =>
    Effect.sync(() => {
      const violations = checkDeclaredDependencies({
        dependencies: new Set(['effect', '@nerima-games/mc-playground-kit']),
        devDependencies: new Set<string>(),
      })
      expect(violations).toHaveLength(1)
      expect(violations[0]?.rule).toBe('dev-only-package-in-dependencies')
      expect(violations[0]?.message).toContain('input handling')
    }),
  )

  it.effect('accepts @nerima-games/mc-playground-kit in "devDependencies"', () =>
    Effect.sync(() => {
      const violations = checkDeclaredDependencies({
        dependencies: new Set(['effect']),
        devDependencies: new Set(['@nerima-games/mc-playground-kit', 'vitest']),
      })
      expect(violations).toStrictEqual([])
    }),
  )

  it.effect('rejects an org dependency the policy does not allow, even if the code never imports it', () =>
    Effect.sync(() => {
      const violations = checkDeclaredDependencies({
        dependencies: new Set(['@nerima-games/mc-sim']),
        devDependencies: new Set<string>(),
      })
      expect(violations).toHaveLength(1)
      expect(violations[0]?.rule).toBe('undeclared-in-policy')
    }),
  )

  it.effect('ignores non-org dependencies entirely', () =>
    Effect.sync(() => {
      const violations = checkDeclaredDependencies({
        dependencies: new Set(['effect', 'three']),
        devDependencies: new Set(['vitest', 'oxlint']),
      })
      expect(violations).toStrictEqual([])
    }),
  )
})

describe('maskSource', () => {
  it.effect('preserves length and line structure, so offsets stay valid against the original', () =>
    Effect.sync(() => {
      const source = ['const a = "text"', '// comment', '/* block */', 'const b = `tpl`'].join('\n')
      const masked = maskSource(source)
      expect(masked).toHaveLength(source.length)
      expect(masked.split('\n')).toHaveLength(4)
    }),
  )

  it.effect('blanks comment bodies and string interiors while keeping the delimiters', () =>
    Effect.sync(() => {
      expect(maskSource('const a = "hello"')).toBe('const a = "     "')
      expect(maskSource('const a = 1 // why')).toBe('const a = 1       ')
    }),
  )

  it.effect('keeps `${...}` interpolations as live code inside a template literal', () =>
    Effect.sync(() => {
      expect(maskSource('`x${ y }z`')).toBe('` ${ y } `')
    }),
  )
})

describe('import extraction', () => {
  it.effect('finds single-line, multi-line, side-effect, re-export and dynamic imports', () =>
    Effect.sync(() => {
      const source = [
        "import { a } from '@nerima-games/mc-alpha'",
        'import {',
        '  b,',
        "} from '@nerima-games/mc-beta'",
        "import '@nerima-games/mc-gamma'",
        "export * from '@nerima-games/mc-delta'",
        "const later = await import('@nerima-games/mc-epsilon')",
      ].join('\n')

      const specifiers = parseImports(source).map((record) => record.specifier)

      expect(specifiers).toContain('@nerima-games/mc-alpha')
      expect(specifiers).toContain('@nerima-games/mc-beta')
      expect(specifiers).toContain('@nerima-games/mc-gamma')
      expect(specifiers).toContain('@nerima-games/mc-delta')
      expect(specifiers).toContain('@nerima-games/mc-epsilon')
    }),
  )

  it.effect('ignores imports that only appear inside comments', () =>
    Effect.sync(() => {
      const source = [
        "// import { a } from '@nerima-games/mc-commented-out'",
        '/*',
        " import { b } from '@nerima-games/mc-block-commented'",
        '*/',
        "import { c } from '@nerima-games/mc-real'",
      ].join('\n')

      const specifiers = parseImports(source).map((record) => record.specifier)
      expect(specifiers).toStrictEqual(['@nerima-games/mc-real'])
    }),
  )

  it.effect('reports the line an import was found on', () =>
    Effect.sync(() => {
      const source = ['const x = 1', '', "import { a } from '@nerima-games/mc-alpha'"].join('\n')
      expect(parseImports(source)[0]?.line).toBe(3)
    }),
  )

  it.effect('maps a deep specifier back to the package that owns it', () =>
    Effect.sync(() => {
      expect(extractOrgPackageName('@nerima-games/mc-sim/domain/tick')).toBe('@nerima-games/mc-sim')
      expect(extractOrgPackageName('@nerima-games/mc-sim')).toBe('@nerima-games/mc-sim')
      expect(extractOrgPackageName('effect')).toBeUndefined()
      expect(extractOrgPackageName('./relative')).toBeUndefined()
      expect(extractOrgPackageName('@other-scope/thing')).toBeUndefined()
    }),
  )
})

describe('the Date.now() ban', () => {
  const banned = (source: string) => findBannedTimeSources(source, 'domain/example.ts')

  // NOTE: every fixture below is a string literal, so the checker's own scan of
  // this file masks it out. If one of these ever starts failing `pnpm check:deps`
  // that is a genuine bug in maskSource, not a problem with the test.

  it.effect('flags a bare wall-clock read, which oxlint 0.12 cannot express as a rule', () =>
    Effect.sync(() => {
      const violations = banned('const t = Date.now()')
      expect(violations).toHaveLength(1)
      expect(violations[0]?.rule).toBe('banned-time-source')
      expect(violations[0]?.message).toContain('ClockPort')
    }),
  )

  it.effect('flags new Date() and performance.now() as the same class of violation', () =>
    Effect.sync(() => {
      expect(banned('const t = new Date()')).toHaveLength(1)
      expect(banned('const t = performance.now()')).toHaveLength(1)
    }),
  )

  it.effect('does not flag a mention inside a line comment', () =>
    Effect.sync(() => {
      expect(banned('// never call Date.now() here')).toStrictEqual([])
    }),
  )

  it.effect('does not flag a mention inside a string literal', () =>
    Effect.sync(() => {
      expect(banned('const message = "Date.now() is banned"')).toStrictEqual([])
    }),
  )

  it.effect('does not flag a mention inside a regex literal', () =>
    Effect.sync(() => {
      expect(banned('const pattern = /Date\\.now\\(/u')).toStrictEqual([])
    }),
  )

  it.effect('does flag a call hidden inside a template literal interpolation', () =>
    Effect.sync(() => {
      expect(banned('const message = `at ${Date.now()}`')).toHaveLength(1)
    }),
  )

  it.effect('honours the escape hatch, which exists for the one adapter that implements the clock Port', () =>
    Effect.sync(() => {
      expect(banned('const t = Date.now() // mc-kernel-allow-time-source: this IS the adapter')).toStrictEqual([])
    }),
  )

  it.effect('reports the line the call was on', () =>
    Effect.sync(() => {
      expect(banned(['const a = 1', 'const b = 2', 'const t = Date.now()'].join('\n'))[0]?.line).toBe(3)
    }),
  )

  it.effect('does not mistake division for a regex literal and blank the rest of the file', () =>
    Effect.sync(() => {
      const source = ['const half = total / 2', 'const third = total / 3', 'const t = Date.now()'].join('\n')
      expect(banned(source)).toHaveLength(1)
    }),
  )
})

describe('shipped vs tooling source classification', () => {
  it.effect('treats index.ts and domain/ as shipped, and everything else as tooling or tests', () =>
    Effect.sync(() => {
      expect(isToolingOrTestPath('index.ts')).toBe(false)
      expect(isToolingOrTestPath('domain/coordinates.ts')).toBe(false)
      expect(isToolingOrTestPath('test/coordinates.test.ts')).toBe(true)
      expect(isToolingOrTestPath('scripts/check-dependency-whitelist.ts')).toBe(true)
    }),
  )
})
