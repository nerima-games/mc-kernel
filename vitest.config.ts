import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: '50%',
        minForks: 1,
        isolate: true,
        singleFork: false,
      },
    },
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.git/**'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    slowTestThreshold: 300,
    fileParallelism: true,
    sequence: {
      seed: 0,
      hooks: 'stack',
    },
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      enabled: false,
      include: ['src/index.ts', 'src/domain/**/*.ts'],
      exclude: [
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        // PURE_TYPE: declarations only, zero executable statements. v8 reports
        // such a file as 0% rather than 100%, which would make the headline
        // number meaningless. Its contracts are exercised by
        // test/clock-and-frame.test.ts and enforced by `pnpm typecheck`.
        'src/domain/frame.ts',
      ],
      all: true,
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // THE 99% GATE, ON. `docs/testing.md` §5 row 7.
      //
      // This block used to explain why there was NO threshold: a number imposed
      // on a skeleton is satisfied by type-only modules and says nothing about
      // the implementation. That argument was about the skeleton, and it has
      // expired — `domain/` now carries the registry, the capability and
      // property resolvers, the harvest gate and the drop bridge, so the
      // percentage is finally a statement about behaviour.
      //
      // It is set at 99 rather than at the measured 100 for the reason the
      // reference repository (takeokunn/ts-minecraft) uses 99: the gate exists
      // to catch a REGRESSION, and a threshold pinned to the exact current
      // number turns every unrelated refactor into a red build, which trains
      // people to raise the number instead of writing the test. One percent of
      // this package is under two branch arms — enough to land a commit, not
      // enough to land a feature untested.
      //
      // What it took to get here is the part worth knowing, because it is what
      // the gate protects. Branches sat at 95.07%, and NOT ONE of the seven
      // uncovered arms wanted a test: five were fallbacks against inputs their
      // own types exclude (`?? 0` over a closed tier union, `?? new Set()` over
      // a table keyed by the enum it was built from) and were deleted by making
      // the lookups total; one was a duplicated range check, removed by having
      // `isKnownBlockId` ask the resolver; one is excluded, in `./domain/
      // block-registry`, with its reason written at the call site. Reaching a
      // coverage number by contriving inputs to unreachable arms is the failure
      // this gate is supposed to make visible, so it would be a poor start to
      // have switched it on by doing exactly that.
      thresholds: { branches: 99, functions: 99, lines: 99, statements: 99 },
    },
  },
  esbuild: {
    target: 'node24',
    format: 'esm',
    platform: 'node',
  },
})
