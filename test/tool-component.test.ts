/* eslint-disable max-statements, no-magic-numbers -- Component validation is covered at its untrusted-data boundary. */
import {
  resolveToolMiningProperties,
  type ToolComponent,
} from '../src/domain/tool-component'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

const COMPONENT_WITH_DEFAULTS: ToolComponent = {
  rules: [],
  damagePerBlock: 1,
}

describe('minecraft:tool component', () => {
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
      }

      expect(resolveToolMiningProperties(component, 'stone')).toStrictEqual({
        miningSpeed: 6,
        correctForDrops: true,
        damagePerBlock: 2,
      })
      expect(resolveToolMiningProperties(component, 'dirt')).toStrictEqual({
        miningSpeed: 3,
        correctForDrops: false,
        damagePerBlock: 2,
      })
      expect(resolveToolMiningProperties(component, 'air')).toStrictEqual({
        miningSpeed: 3,
        correctForDrops: false,
        damagePerBlock: 2,
      })
    })),
  )

  it('uses the kernel default speed when the component omits it', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(resolveToolMiningProperties(COMPONENT_WITH_DEFAULTS, 'stone')).toStrictEqual({
        miningSpeed: 1,
        correctForDrops: false,
        damagePerBlock: 1,
      })
      expect(
        resolveToolMiningProperties(
          { rules: [{ blocks: ['stone'], speed: 4 }], damagePerBlock: 0 },
          'stone',
        ),
      ).toStrictEqual({ miningSpeed: 4, correctForDrops: false, damagePerBlock: 0 })
      expect(
        resolveToolMiningProperties(
          { rules: [{ blocks: ['stone'], correctForDrops: true }], damagePerBlock: 1 },
          'stone',
        ),
      ).toStrictEqual({ miningSpeed: 1, correctForDrops: true, damagePerBlock: 1 })
    })),
  )

  it('rejects invalid component data before resolving a block', () =>
    Effect.runPromise(Effect.sync(() => {
      const resolve = (component: unknown, block: unknown = 'stone') =>
        resolveToolMiningProperties(component as ToolComponent, block as ToolComponent['rules'][number]['blocks'][number])

      expect(() => resolve(null)).toThrow('tool component must be an object')
      expect(() => resolve([])).toThrow('tool component must be an object')
      expect(() => resolve('tool')).toThrow('tool component must be an object')
      expect(() => resolve({ rules: undefined, damagePerBlock: 1 })).toThrow(
        'tool component rules must be an array',
      )
      expect(() => resolve({ rules: [], defaultMiningSpeed: 0, damagePerBlock: 1 })).toThrow(
        'defaultMiningSpeed must be a finite number greater than zero',
      )
      expect(() => resolve({ rules: [], defaultMiningSpeed: Number.NaN, damagePerBlock: 1 })).toThrow(
        'defaultMiningSpeed must be a finite number greater than zero',
      )
      expect(() => resolve({ rules: [], damagePerBlock: -1 })).toThrow(
        'damagePerBlock must be a non-negative integer',
      )
      expect(() => resolve({ rules: [], damagePerBlock: 0.5 })).toThrow(
        'damagePerBlock must be a non-negative integer',
      )
      expect(() => resolve({ rules: [{ blocks: undefined }], damagePerBlock: 1 })).toThrow(
        'must contain at least one block',
      )
      expect(() => resolve({ rules: [null], damagePerBlock: 1 })).toThrow('tool rule 0 must be an object')
      expect(() => resolve({ rules: [[]], damagePerBlock: 1 })).toThrow('tool rule 0 must be an object')
      expect(() => resolve({ rules: [{ blocks: [] }], damagePerBlock: 1 })).toThrow(
        'must contain at least one block',
      )
      expect(() => resolve({ rules: [{ blocks: 'stone' }], damagePerBlock: 1 })).toThrow(
        'must contain at least one block',
      )
      expect(() => resolve({ rules: [{ blocks: ['unobtainium'] }], damagePerBlock: 1 })).toThrow(
        'contains an unknown block type',
      )
      expect(() => resolve({ rules: [{ blocks: ['stone'], speed: 0 }], damagePerBlock: 1 })).toThrow(
        'speed must be a finite number greater than zero',
      )
      expect(() => resolve({ rules: [{ blocks: ['stone'], speed: Number.NaN }], damagePerBlock: 1 })).toThrow(
        'speed must be a finite number greater than zero',
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
})
