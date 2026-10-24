import { describe, expect, it } from 'vitest'
import { Result } from 'effect'
import { BlockBlastResistance } from '../src/domain/block/block-properties'
import { blockIdOf } from '../src/domain/block/block-registry'
import { BlockId } from '../src/domain/block/block-registry-types'
import {
  ExplosionExposure,
  ExplosionBlockCount,
  ExplosionEntityCount,
  ExplosionRadius,
  ExplosionRayStepCount,
  resistsExplosion,
} from '../src/domain/entity/explosion'
import { optionValue, resultValue } from './block-result-helpers.js'

const expectBrandFailure = <A>(result: Result.Result<A, unknown>, message: string) => {
  expect(Result.isFailure(result)).toBe(true)
  if (Result.isFailure(result)) {
    expect(result.failure).toMatchObject({
      _tag: 'BrandError',
      name: 'BrandError',
    })
    expect(result.failure).toHaveProperty('message', message)
  }
}

const TNT_POWER = 4
const CHARGED_CREEPER_POWER = 6
const HUGE_POWER = 1_000_000

describe('resistsExplosion', () => {
  it('reproduces the mx-gameplay block-vocabulary.ts mirror of resistsNormalExplosion(id) at TNT/creeper power', () => {
    // mx-gameplay's mirror (`block-vocabulary.ts:610,649`) flags exactly
    // `bedrock` and `obsidian` as resistant to a normal creeper/TNT
    // explosion; every other block resolves to `false`.
    const bedrockId = optionValue(blockIdOf('bedrock'))
    const obsidianId = optionValue(blockIdOf('obsidian'))
    const stoneId = optionValue(blockIdOf('stone'))

    for (const power of [TNT_POWER, CHARGED_CREEPER_POWER, HUGE_POWER].map(BlockBlastResistance)) {
      expect(resultValue(resistsExplosion(bedrockId, power))).toBe(true)
      expect(resultValue(resistsExplosion(obsidianId, power))).toBe(true)
      expect(resultValue(resistsExplosion(stoneId, power))).toBe(false)
    }
  })

  it('an ordinary block never resists a positive-power explosion, matching its blastResistance default of 0', () => {
    const stoneId = optionValue(blockIdOf('stone'))
    expect(resultValue(resistsExplosion(stoneId, BlockBlastResistance(Number.EPSILON)))).toBe(false)
    // A zero-power explosion destroys nothing, so even a default-resistance
    // block "survives" it — the `>=` boundary, not a special case.
    expect(resultValue(resistsExplosion(stoneId, BlockBlastResistance(0)))).toBe(true)
  })

  it('an unregistered block id resolves to the default blastResistance', () => {
    const UNREGISTERED_ID = BlockId(65_535)
    expect(resultValue(resistsExplosion(UNREGISTERED_ID, BlockBlastResistance(0)))).toBe(true)
    expect(resultValue(resistsExplosion(UNREGISTERED_ID, BlockBlastResistance(TNT_POWER)))).toBe(false)
  })

  it('validates explosion quantities at their inclusive and exclusive boundaries', () => {
    expect(ExplosionRadius(0)).toBe(0)
    expect(ExplosionRadius(Number.MAX_VALUE)).toBe(Number.MAX_VALUE)
    expectBrandFailure(ExplosionRadius.result(-Number.EPSILON), 'ExplosionRadius must be finite and non-negative, received -2.220446049250313e-16')
    expectBrandFailure(ExplosionRadius.result(Number.POSITIVE_INFINITY), 'ExplosionRadius must be finite and non-negative, received Infinity')
    expectBrandFailure(ExplosionRadius.result(Number.NaN), 'ExplosionRadius must be finite and non-negative, received NaN')

    const boundaryValues = [0, Number.MAX_SAFE_INTEGER]
    for (const value of boundaryValues) {
      expect(ExplosionBlockCount(value)).toBe(value)
      expect(ExplosionRayStepCount(value)).toBe(value)
      expect(ExplosionEntityCount(value)).toBe(value)
    }
    expectBrandFailure(ExplosionBlockCount.result(-1), 'ExplosionBlockCount must be a non-negative safe integer, received -1')
    expectBrandFailure(ExplosionRayStepCount.result(1.5), 'ExplosionRayStepCount must be a non-negative safe integer, received 1.5')
    expectBrandFailure(
      ExplosionEntityCount.result(Number.MAX_SAFE_INTEGER + 1),
      `ExplosionEntityCount must be a non-negative safe integer, received ${Number.MAX_SAFE_INTEGER + 1}`,
    )

    expect(ExplosionExposure(0)).toBe(0)
    expect(ExplosionExposure(1)).toBe(1)
    expectBrandFailure(ExplosionExposure.result(-Number.EPSILON), 'ExplosionExposure must be finite and in [0, 1], received -2.220446049250313e-16')
    expectBrandFailure(ExplosionExposure.result(1 + Number.EPSILON), `ExplosionExposure must be finite and in [0, 1], received ${1 + Number.EPSILON}`)
    expectBrandFailure(ExplosionExposure.result(Number.NaN), 'ExplosionExposure must be finite and in [0, 1], received NaN')
  })
})
