/* eslint-disable max-statements, no-magic-numbers -- Component validation is covered at its untrusted-data boundary. */
import {
  compileToolComponent,
  isToolComponent,
  resolveToolMiningProperties,
  type ToolBlockMembershipLike,
  type ToolBlockTag,
  type ToolBlockTagMembershipsLike,
  type ToolComponent,
  type ToolRule,
  type ToolResolutionContext,
} from '../src/domain/tool-component'
import type { BlockType } from '../src/domain/block-type'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

const COMPONENT_WITH_DEFAULTS: ToolComponent = {
  rules: [],
  damagePerBlock: 1,
}

describe('minecraft:tool component', () => {
  it('guards tool component values at untrusted boundaries', () => {
    expect(isToolComponent(COMPONENT_WITH_DEFAULTS)).toBe(true)
    expect(isToolComponent({ rules: [], damagePerBlock: 1, extra: true })).toBe(false)
    expect(isToolComponent(undefined)).toBe(false)
  })

  it('resolves a single block, a block list, and a block tag', () =>
    Effect.runPromise(Effect.sync(() => {
      const component: ToolComponent = {
        rules: [
          { blocks: 'stone', speed: 2 },
          { blocks: '#minecraft:mineable/pickaxe', speed: 5, correctForDrops: true },
          { blocks: ['grass_block'], speed: 7 },
        ],
        damagePerBlock: 1,
      }
      const context: ToolResolutionContext = {
        blockTags: new Map([
          ['#minecraft:mineable/pickaxe', new Set<BlockType>(['dirt', 'stone'])],
        ]),
      }

      expect(resolveToolMiningProperties(component, 'stone', context).miningSpeed).toBe(2)
      expect(resolveToolMiningProperties(component, 'dirt', context)).toStrictEqual({
        miningSpeed: 5,
        correctForDrops: true,
        damagePerBlock: 1,
        canDestroyBlocksInCreative: true,
      })
      expect(resolveToolMiningProperties(component, 'grass_block', context).miningSpeed).toBe(7)
      expect(resolveToolMiningProperties(component, 'air', context).miningSpeed).toBe(1)
    })),
  )

  it('compiles an immutable component snapshot for repeated resolution', () =>
    Effect.runPromise(Effect.sync(() => {
      const rules: ToolRule[] = [
        { blocks: 'stone', speed: 2 },
        { blocks: '#minecraft:mineable/pickaxe', speed: 5, correctForDrops: true },
        { blocks: 'grass_block' },
      ]
      const component: ToolComponent = { rules, damagePerBlock: 1 }
      const context: ToolResolutionContext = {
        blockTags: new Map([
          ['#minecraft:mineable/pickaxe', new Set<BlockType>(['dirt'])],
        ]),
      }
      const compiled = compileToolComponent(component)

      rules[0] = { blocks: 'dirt', speed: 8 }

      expect(Object.isFrozen(compiled)).toBe(true)
      expect(Object.isFrozen(compiled.rules)).toBe(true)
      expect(() => resolveToolMiningProperties(compiled, 'stone')).toThrow(
        'tool resolution context with blockTags is required for tag rules',
      )
      expect(resolveToolMiningProperties(compiled, 'stone', context)).toStrictEqual({
        miningSpeed: 2,
        correctForDrops: false,
        damagePerBlock: 1,
        canDestroyBlocksInCreative: true,
      })
      expect(resolveToolMiningProperties(compiled, 'dirt', context)).toStrictEqual({
        miningSpeed: 5,
        correctForDrops: true,
        damagePerBlock: 1,
        canDestroyBlocksInCreative: true,
      })
      expect(resolveToolMiningProperties(compiled, 'grass_block', context).miningSpeed).toBe(1)
      expect(resolveToolMiningProperties(compiled, 'grass_block', { blockTags: new Map() }).miningSpeed).toBe(1)
      expect(
        resolveToolMiningProperties(
          compileToolComponent({ rules: [{ blocks: 'grass_block' }], damagePerBlock: 0 }),
          'grass_block',
        ),
      ).toStrictEqual({
        miningSpeed: 1,
        correctForDrops: false,
        damagePerBlock: 0,
        canDestroyBlocksInCreative: true,
      })
      expect(resolveToolMiningProperties(component, 'stone', context).miningSpeed).toBe(1)
    })),
  )

  it('preserves source order when indexed direct and tag rules overlap', () =>
    Effect.runPromise(Effect.sync(() => {
      const context: ToolResolutionContext = {
        blockTags: new Map([
          ['#minecraft:mineable/pickaxe', new Set<BlockType>(['stone'])],
        ]),
      }
      const tagFirst = compileToolComponent({
        rules: [
          { blocks: '#minecraft:mineable/pickaxe', speed: 7 },
          { blocks: 'stone', speed: 11 },
          { blocks: '#minecraft:mineable/pickaxe', speed: 13 },
        ],
        damagePerBlock: 1,
      })
      const directFirst = compileToolComponent({
        rules: [
          { blocks: 'stone', speed: 11 },
          { blocks: '#minecraft:mineable/pickaxe', speed: 7 },
          { blocks: 'stone', speed: 17 },
        ],
        damagePerBlock: 1,
      })

      expect(resolveToolMiningProperties(tagFirst, 'stone', context).miningSpeed).toBe(7)
      expect(resolveToolMiningProperties(directFirst, 'stone', context).miningSpeed).toBe(11)
    })),
  )

  it('requires explicit tag memberships and treats an empty registry as no match', () =>
    Effect.runPromise(Effect.sync(() => {
      const component: ToolComponent = {
        rules: [{ blocks: '#minecraft:mineable/pickaxe', speed: 5 }],
        damagePerBlock: 1,
      }

      expect(() => resolveToolMiningProperties(component, 'stone')).toThrow(
        'tool resolution context with blockTags is required for tag rules',
      )
      expect(resolveToolMiningProperties(component, 'stone', { blockTags: new Map() })).toStrictEqual({
        miningSpeed: 1,
        correctForDrops: false,
        damagePerBlock: 1,
        canDestroyBlocksInCreative: true,
      })
    })),
  )

  it('resolves the first matching rule and preserves its independent overrides', () =>
    Effect.runPromise(Effect.sync(() => {
      const component: ToolComponent = {
        rules: [
          { blocks: ['stone'], speed: 6, correctForDrops: true },
          { blocks: ['stone'], speed: 12, correctForDrops: false },
          { blocks: ['dirt'], correctForDrops: false },
        ],
        defaultMiningSpeed: 3,
        damagePerBlock: 2,
        canDestroyBlocksInCreative: false,
      }

      expect(resolveToolMiningProperties(component, 'stone')).toStrictEqual({
        miningSpeed: 6,
        correctForDrops: true,
        damagePerBlock: 2,
        canDestroyBlocksInCreative: false,
      })
      expect(resolveToolMiningProperties(component, 'dirt')).toStrictEqual({
        miningSpeed: 3,
        correctForDrops: false,
        damagePerBlock: 2,
        canDestroyBlocksInCreative: false,
      })
      expect(resolveToolMiningProperties(component, 'air')).toStrictEqual({
        miningSpeed: 3,
        correctForDrops: false,
        damagePerBlock: 2,
        canDestroyBlocksInCreative: false,
      })
    })),
  )

  it('accepts zero mining speeds from the Java float contract', () =>
    Effect.runPromise(Effect.sync(() => {
      const component: ToolComponent = {
        rules: [{ blocks: 'stone', speed: 0, correctForDrops: true }],
        defaultMiningSpeed: 0,
        damagePerBlock: 0,
      }

      expect(resolveToolMiningProperties(component, 'stone')).toStrictEqual({
        miningSpeed: 0,
        correctForDrops: true,
        damagePerBlock: 0,
        canDestroyBlocksInCreative: true,
      })
      expect(resolveToolMiningProperties(component, 'dirt')).toStrictEqual({
        miningSpeed: 0,
        correctForDrops: false,
        damagePerBlock: 0,
        canDestroyBlocksInCreative: true,
      })
    })),
  )

  it('accepts readonly map and set contracts without requiring concrete collections', () =>
    Effect.runPromise(Effect.sync(() => {
      const readonlySetLike: ToolBlockMembershipLike = {
        has: (block: unknown): boolean => block === 'stone',
        [Symbol.iterator]: function* (): Generator<BlockType> {
          yield 'stone'
        },
      }
      const readonlyMapLike: ToolBlockTagMembershipsLike = {
        get: (tag: ToolBlockTag) =>
          tag === '#minecraft:mineable/pickaxe' ? readonlySetLike : undefined,
        [Symbol.iterator]: function* (): Generator<
          readonly [ToolBlockTag, ToolBlockMembershipLike]
        > {
          yield ['#minecraft:mineable/pickaxe', readonlySetLike]
        },
      }
      const component: ToolComponent = {
        rules: [{ blocks: '#minecraft:mineable/pickaxe', speed: 5 }],
        damagePerBlock: 1,
      }

      expect(
        resolveToolMiningProperties(component, 'stone', { blockTags: readonlyMapLike }),
      ).toStrictEqual({
        miningSpeed: 5,
        correctForDrops: false,
        damagePerBlock: 1,
        canDestroyBlocksInCreative: true,
      })
    })),
  )

  it('uses the kernel default speed when the component omits it', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(resolveToolMiningProperties(COMPONENT_WITH_DEFAULTS, 'stone')).toStrictEqual({
        miningSpeed: 1,
        correctForDrops: false,
        damagePerBlock: 1,
        canDestroyBlocksInCreative: true,
      })
      expect(
        resolveToolMiningProperties(
          { rules: [{ blocks: ['stone'], speed: 4 }], damagePerBlock: 0 },
          'stone',
        ),
      ).toStrictEqual({
        miningSpeed: 4,
        correctForDrops: false,
        damagePerBlock: 0,
        canDestroyBlocksInCreative: true,
      })
      expect(
        resolveToolMiningProperties(
          { rules: [{ blocks: ['stone'], correctForDrops: true }], damagePerBlock: 1 },
          'stone',
        ),
      ).toStrictEqual({
        miningSpeed: 1,
        correctForDrops: true,
        damagePerBlock: 1,
        canDestroyBlocksInCreative: true,
      })
    })),
  )

  it('rejects invalid component data before resolving a block', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolve = (component: unknown, block: unknown = 'stone') =>
        Reflect.apply(resolveToolMiningProperties, undefined, [component, block])

      expect(() => resolve(null)).toThrow('tool component must be an object')
      expect(() => resolve([])).toThrow('tool component must be an object')
      expect(() => resolve('tool')).toThrow('tool component must be an object')
      expect(() => resolve({ rules: undefined, damagePerBlock: 1 })).toThrow(
        'tool component rules must be an array',
      )
      expect(() => resolve({ rules: [], defaultMiningSpeed: -1, damagePerBlock: 1 })).toThrow(
        'defaultMiningSpeed must be a finite number greater than or equal to zero',
      )
      expect(() => resolve({ rules: [], defaultMiningSpeed: Number.NaN, damagePerBlock: 1 })).toThrow(
        'defaultMiningSpeed must be a finite number greater than or equal to zero',
      )
      expect(() => resolve({ rules: [], damagePerBlock: -1 })).toThrow(
        'damagePerBlock must be a non-negative integer',
      )
      expect(() => resolve({ rules: [], damagePerBlock: 0.5 })).toThrow(
        'damagePerBlock must be a non-negative integer',
      )
      expect(() => resolve({ rules: [], damagePerBlock: 1, canDestroyBlocksInCreative: 'yes' })).toThrow(
        'canDestroyBlocksInCreative must be a boolean',
      )
      expect(() => resolve({ rules: [], damagePerBlock: 1, futureField: true })).toThrow(
        'unknown tool component field futureField',
      )
      expect(() => resolve({ rules: [{ blocks: undefined }], damagePerBlock: 1 })).toThrow(
        'must contain at least one block',
      )
      expect(() => resolve({ rules: [null], damagePerBlock: 1 })).toThrow('tool rule 0 must be an object')
      expect(() => resolve({ rules: [[]], damagePerBlock: 1 })).toThrow('tool rule 0 must be an object')
      expect(() => resolve({ rules: [{ blocks: ['stone'], futureField: true }], damagePerBlock: 1 })).toThrow(
        'unknown tool rule 0 field futureField',
      )
      expect(() => resolve({ rules: [{ blocks: [] }], damagePerBlock: 1 })).toThrow(
        'must contain at least one block',
      )
      expect(() => resolve({ rules: [{ blocks: ['unobtainium'] }], damagePerBlock: 1 })).toThrow(
        'contains an unknown block or block tag',
      )
      expect(() => resolve({ rules: [{ blocks: 'unobtainium' }], damagePerBlock: 1 })).toThrow(
        'must contain a block or block tag',
      )
      expect(() => resolve({ rules: [{ blocks: ['#'] }], damagePerBlock: 1 })).toThrow(
        'contains an unknown block or block tag',
      )
      expect(() => resolve({ rules: [{ blocks: ['#minecraft:mineable pickaxe'] }], damagePerBlock: 1 })).toThrow(
        'contains an unknown block or block tag',
      )
      expect(() => resolve({ rules: [{ blocks: '#minecraft:mineable/pickaxe' }], damagePerBlock: 1 })).toThrow(
        'tool resolution context with blockTags is required for tag rules',
      )
      expect(() => resolve({ rules: [{ blocks: ['stone'], speed: -1 }], damagePerBlock: 1 })).toThrow(
        'speed must be a finite number greater than or equal to zero',
      )
      expect(() => resolve({ rules: [{ blocks: ['stone'], speed: Number.NaN }], damagePerBlock: 1 })).toThrow(
        'speed must be a finite number greater than or equal to zero',
      )
      expect(() => resolve({ rules: [{ blocks: ['stone'], correctForDrops: 'yes' }], damagePerBlock: 1 })).toThrow(
        'correctForDrops must be a boolean',
      )
      expect(() => resolve({ rules: [], damagePerBlock: Number.NaN })).toThrow(
        'damagePerBlock must be a non-negative integer',
      )
      expect(() => resolve(COMPONENT_WITH_DEFAULTS, 'unobtainium')).toThrow(
        'block must be a known block type',
      )
    })),
  )

  it('validates tag membership context at the resolution boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      const component: ToolComponent = {
        rules: [{ blocks: 'stone' }],
        damagePerBlock: 1,
      }
      const resolve = (context: unknown) =>
        Reflect.apply(resolveToolMiningProperties, undefined, [component, 'stone', context])

      expect(() => resolve(null)).toThrow('tool resolution context must be an object')
      expect(() => resolve({ blockTags: [] })).toThrow(
        'tool resolution blockTags must be a Map or Map-like iterable',
      )
      expect(() => resolve({ blockTags: null })).toThrow(
        'tool resolution blockTags must be a Map or Map-like iterable',
      )
      expect(() => resolve({ blockTags: new Map([['mineable', new Set<BlockType>(['stone'])]]) })).toThrow(
        'contains an invalid tag mineable',
      )
      expect(() => resolve({ blockTags: new Map([['#mineable', ['stone']]]) })).toThrow(
        'must contain a Set or Set-like iterable',
      )
      expect(() => resolve({ blockTags: new Map([['#mineable', null]]) })).toThrow(
        'must contain a Set or Set-like iterable',
      )
      expect(() => resolve({ blockTags: new Map([['#mineable', new Set(['unobtainium'])]]) })).toThrow(
        'contains an unknown block type',
      )
      expect(() => resolve({ futureField: true, blockTags: new Map() })).toThrow(
        'unknown tool resolution context field futureField',
      )
    })),
  )
})
