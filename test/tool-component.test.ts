/* eslint-disable max-statements, no-magic-numbers -- Component validation is covered at its untrusted-data boundary. */
import * as toolComponentResult from '../src/domain/item/tool-component'
import {
  isToolComponent,
  type ToolBlockMembershipLike,
  type ToolBlockTag,
  type ToolBlockTagMembershipsLike,
  type ToolComponent,
  type ToolRule,
  type ToolResolutionContext,
} from '../src/domain/item/tool-component'
import type { BlockType } from '../src/domain/block/block-type'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import { ToolDurabilityDamage, ToolMiningSpeed } from '../src/domain/item/item-primitives'
import { expectItemFailure, itemResultValue } from './item-result-assertions'

const compileToolComponent = (...args: Parameters<typeof toolComponentResult.compileToolComponent>) =>
  itemResultValue(toolComponentResult.compileToolComponent(...args))
const resolveToolMiningProperties = (...args: Parameters<typeof toolComponentResult.resolveToolMiningProperties>) =>
  itemResultValue(toolComponentResult.resolveToolMiningProperties(...args))
const expectToolFailure = (
  result: ReturnType<typeof toolComponentResult.resolveToolMiningProperties>,
  kind: string,
  reason: string,
  field: string,
  message: string,
  value: unknown,
) => expectItemFailure(result, { _tag: 'ItemValidationFailure', kind, reason, field, message, value })

const COMPONENT_WITH_DEFAULTS: ToolComponent = {
  rules: [],
  damagePerBlock: ToolDurabilityDamage(1),
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
          { blocks: 'stone', speed: ToolMiningSpeed(2) },
          { blocks: '#minecraft:mineable/pickaxe', speed: ToolMiningSpeed(5), correctForDrops: true },
          { blocks: ['grass_block'], speed: ToolMiningSpeed(7) },
        ],
        damagePerBlock: ToolDurabilityDamage(1),
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
        damagePerBlock: ToolDurabilityDamage(1),
        canDestroyBlocksInCreative: true,
      })
      expect(resolveToolMiningProperties(component, 'grass_block', context).miningSpeed).toBe(7)
      expect(resolveToolMiningProperties(component, 'air', context).miningSpeed).toBe(1)
    })),
  )

  it('compiles an immutable component snapshot for repeated resolution', () =>
    Effect.runPromise(Effect.sync(() => {
      const rules: ToolRule[] = [
        { blocks: 'stone', speed: ToolMiningSpeed(2) },
        { blocks: '#minecraft:mineable/pickaxe', speed: ToolMiningSpeed(5), correctForDrops: true },
        { blocks: 'grass_block' },
      ]
      const component: ToolComponent = { rules, damagePerBlock: ToolDurabilityDamage(1) }
      const context: ToolResolutionContext = {
        blockTags: new Map([
          ['#minecraft:mineable/pickaxe', new Set<BlockType>(['dirt'])],
        ]),
      }
      const compiled = compileToolComponent(component)

      rules[0] = { blocks: 'dirt', speed: ToolMiningSpeed(8) }

      expect(Object.isFrozen(compiled)).toBe(true)
      expect(Object.isFrozen(compiled.rules)).toBe(true)
      expectToolFailure(toolComponentResult.resolveToolMiningProperties(compiled, 'stone'), 'TypeError', 'invalid-type',
        'context', 'tool resolution context with blockTags is required for tag rules', undefined)
      expect(resolveToolMiningProperties(compiled, 'stone', context)).toStrictEqual({
        miningSpeed: 2,
        correctForDrops: false,
        damagePerBlock: ToolDurabilityDamage(1),
        canDestroyBlocksInCreative: true,
      })
      expect(resolveToolMiningProperties(compiled, 'dirt', context)).toStrictEqual({
        miningSpeed: 5,
        correctForDrops: true,
        damagePerBlock: ToolDurabilityDamage(1),
        canDestroyBlocksInCreative: true,
      })
      expect(resolveToolMiningProperties(compiled, 'grass_block', context).miningSpeed).toBe(1)
      expect(resolveToolMiningProperties(compiled, 'grass_block', { blockTags: new Map() }).miningSpeed).toBe(1)
      expect(
        resolveToolMiningProperties(
          compileToolComponent({ rules: [{ blocks: 'grass_block' }], damagePerBlock: ToolDurabilityDamage(0) }),
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
          { blocks: '#minecraft:mineable/pickaxe', speed: ToolMiningSpeed(7) },
          { blocks: 'stone', speed: ToolMiningSpeed(11) },
          { blocks: '#minecraft:mineable/pickaxe', speed: ToolMiningSpeed(13) },
        ],
        damagePerBlock: ToolDurabilityDamage(1),
      })
      const directFirst = compileToolComponent({
        rules: [
          { blocks: 'stone', speed: ToolMiningSpeed(11) },
          { blocks: '#minecraft:mineable/pickaxe', speed: ToolMiningSpeed(7) },
          { blocks: 'stone', speed: ToolMiningSpeed(17) },
        ],
        damagePerBlock: ToolDurabilityDamage(1),
      })

      expect(resolveToolMiningProperties(tagFirst, 'stone', context).miningSpeed).toBe(7)
      expect(resolveToolMiningProperties(directFirst, 'stone', context).miningSpeed).toBe(11)
    })),
  )

  it('requires explicit tag memberships and treats an empty registry as no match', () =>
    Effect.runPromise(Effect.sync(() => {
      const component: ToolComponent = {
        rules: [{ blocks: '#minecraft:mineable/pickaxe', speed: ToolMiningSpeed(5) }],
        damagePerBlock: ToolDurabilityDamage(1),
      }

      expectToolFailure(toolComponentResult.resolveToolMiningProperties(component, 'stone'), 'TypeError', 'invalid-type',
        'context', 'tool resolution context with blockTags is required for tag rules', undefined)
      expect(resolveToolMiningProperties(component, 'stone', { blockTags: new Map() })).toStrictEqual({
        miningSpeed: 1,
        correctForDrops: false,
        damagePerBlock: ToolDurabilityDamage(1),
        canDestroyBlocksInCreative: true,
      })
    })),
  )

  it('resolves the first matching rule and preserves its independent overrides', () =>
    Effect.runPromise(Effect.sync(() => {
      const component: ToolComponent = {
        rules: [
          { blocks: ['stone'], speed: ToolMiningSpeed(6), correctForDrops: true },
          { blocks: ['stone'], speed: ToolMiningSpeed(12), correctForDrops: false },
          { blocks: ['dirt'], correctForDrops: false },
        ],
        defaultMiningSpeed: ToolMiningSpeed(3),
        damagePerBlock: ToolDurabilityDamage(2),
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
        rules: [{ blocks: 'stone', speed: ToolMiningSpeed(0), correctForDrops: true }],
        defaultMiningSpeed: ToolMiningSpeed(0),
        damagePerBlock: ToolDurabilityDamage(0),
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
        rules: [{ blocks: '#minecraft:mineable/pickaxe', speed: ToolMiningSpeed(5) }],
        damagePerBlock: ToolDurabilityDamage(1),
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
          { rules: [{ blocks: ['stone'], speed: ToolMiningSpeed(4) }], damagePerBlock: ToolDurabilityDamage(0) },
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
          { rules: [{ blocks: ['stone'], correctForDrops: true }], damagePerBlock: ToolDurabilityDamage(1) },
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
        Reflect.apply(toolComponentResult.resolveToolMiningProperties, undefined, [component, block])

      for (const component of [null, [], 'tool']) {
        expectToolFailure(resolve(component), 'TypeError', 'invalid-type', 'tool component', 'tool component must be an object', component)
      }
      expectToolFailure(resolve({ rules: undefined, damagePerBlock: 1 }), 'TypeError', 'invalid-type', 'rules',
        'tool component rules must be an array', undefined)
      for (const speed of [-1, Number.NaN]) {
        expectToolFailure(resolve({ rules: [], defaultMiningSpeed: speed, damagePerBlock: 1 }), 'RangeError', 'out-of-range',
          'defaultMiningSpeed', 'tool component defaultMiningSpeed must be a finite number greater than or equal to zero', speed)
      }
      for (const damagePerBlock of [-1, 0.5, Number.NaN]) {
        expectToolFailure(resolve({ rules: [], damagePerBlock }), 'RangeError', 'out-of-range', 'damagePerBlock',
          'tool component damagePerBlock must be a non-negative integer', damagePerBlock)
      }
      expectToolFailure(resolve({ rules: [], damagePerBlock: 1, canDestroyBlocksInCreative: 'yes' }), 'TypeError', 'invalid-type',
        'canDestroyBlocksInCreative', 'tool component canDestroyBlocksInCreative must be a boolean', 'yes')
      expectToolFailure(resolve({ rules: [], damagePerBlock: 1, futureField: true }), 'TypeError', 'invalid-value',
        'tool component', 'unknown tool component futureField', 'futureField')
      expectToolFailure(resolve({ rules: [{ blocks: undefined }], damagePerBlock: 1 }), 'RangeError', 'out-of-range',
        'tool rule 0', 'tool rule 0 must contain at least one block', undefined)
      for (const rule of [null, []]) {
        expectToolFailure(resolve({ rules: [rule], damagePerBlock: 1 }), 'TypeError', 'invalid-type', 'tool rule 0',
          'tool rule 0 must be an object', rule)
      }
      expectToolFailure(resolve({ rules: [{ blocks: ['stone'], futureField: true }], damagePerBlock: 1 }), 'TypeError', 'invalid-value',
        'tool rule 0', 'unknown tool rule 0 futureField', 'futureField')
      expectToolFailure(resolve({ rules: [{ blocks: [] }], damagePerBlock: 1 }), 'RangeError', 'out-of-range',
        'tool rule 0', 'tool rule 0 must contain at least one block', [])
      for (const block of ['unobtainium', '#', '#minecraft:mineable pickaxe']) {
        expectToolFailure(resolve({ rules: [{ blocks: [block] }], damagePerBlock: 1 }), 'RangeError', 'out-of-range',
          'tool rule 0', 'tool rule 0 contains an unknown block or block tag', block)
      }
      expectToolFailure(resolve({ rules: [{ blocks: 'unobtainium' }], damagePerBlock: 1 }), 'RangeError', 'out-of-range',
        'tool rule 0', 'tool rule 0 must contain a block or block tag', 'unobtainium')
      expectToolFailure(resolve({ rules: [{ blocks: '#minecraft:mineable/pickaxe' }], damagePerBlock: 1 }), 'TypeError', 'invalid-type',
        'context', 'tool resolution context with blockTags is required for tag rules', undefined)
      for (const speed of [-1, Number.NaN]) {
        expectToolFailure(resolve({ rules: [{ blocks: ['stone'], speed }], damagePerBlock: 1 }), 'RangeError', 'out-of-range',
          'tool rule 0 speed', 'tool rule 0 speed must be a finite number greater than or equal to zero', speed)
      }
      expectToolFailure(resolve({ rules: [{ blocks: ['stone'], correctForDrops: 'yes' }], damagePerBlock: 1 }), 'TypeError', 'invalid-type',
        'tool rule 0', 'tool rule 0 correctForDrops must be a boolean', 'yes')
      expectToolFailure(Reflect.apply(toolComponentResult.resolveToolMiningProperties, undefined, [COMPONENT_WITH_DEFAULTS, 'unobtainium']), 'RangeError', 'out-of-range',
        'block', 'block must be a known block type', 'unobtainium')
    })),
  )

  it('validates tag membership context at the resolution boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      const component: ToolComponent = {
        rules: [{ blocks: 'stone' }],
        damagePerBlock: ToolDurabilityDamage(1),
      }
      const resolve = (context: unknown) =>
        Reflect.apply(toolComponentResult.resolveToolMiningProperties, undefined, [component, 'stone', context])

      expectToolFailure(resolve(null), 'TypeError', 'invalid-type', 'tool resolution context',
        'tool resolution context must be an object', null)
      for (const blockTags of [[], null]) {
        expectToolFailure(resolve({ blockTags }), 'TypeError', 'invalid-type', 'blockTags',
          'tool resolution blockTags must be a Map or Map-like iterable', blockTags)
      }
      expectToolFailure(resolve({ blockTags: new Map([['mineable', new Set<BlockType>(['stone'])]]) }), 'RangeError', 'out-of-range',
        'blockTags', 'tool resolution blockTags contains an invalid tag mineable', 'mineable')
      expectToolFailure(resolve({ blockTags: new Map([['#mineable', ['stone']]]) }), 'TypeError', 'invalid-type',
        'blockTags.#mineable', 'tool resolution blockTags #mineable must contain a Set or Set-like iterable', ['stone'])
      expectToolFailure(resolve({ blockTags: new Map([['#mineable', null]]) }), 'TypeError', 'invalid-type',
        'blockTags.#mineable', 'tool resolution blockTags #mineable must contain a Set or Set-like iterable', null)
      expectToolFailure(resolve({ blockTags: new Map([['#mineable', new Set(['unobtainium'])]]) }), 'RangeError', 'out-of-range',
        'blockTags.#mineable', 'tool resolution blockTags #mineable contains an unknown block type', 'unobtainium')
      expectToolFailure(resolve({ futureField: true, blockTags: new Map() }), 'TypeError', 'invalid-value',
        'tool resolution context', 'unknown tool resolution context futureField', 'futureField')
    })),
  )
})
