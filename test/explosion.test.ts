import { describe, expect, it } from 'vitest'
import { blockIdOf } from '../src/domain/block/block-registry'
import { resistsExplosion } from '../src/domain/entity/explosion'

const TNT_POWER = 4
const CHARGED_CREEPER_POWER = 6
const HUGE_POWER = 1_000_000

describe('resistsExplosion', () => {
  it('reproduces the mx-gameplay block-vocabulary.ts mirror of resistsNormalExplosion(id) at TNT/creeper power', () => {
    // mx-gameplay's mirror (`block-vocabulary.ts:610,649`) flags exactly
    // `bedrock` and `obsidian` as resistant to a normal creeper/TNT
    // explosion; every other block resolves to `false`.
    const bedrockId = blockIdOf('bedrock')
    const obsidianId = blockIdOf('obsidian')
    const stoneId = blockIdOf('stone')

    for (const power of [TNT_POWER, CHARGED_CREEPER_POWER, HUGE_POWER]) {
      expect(resistsExplosion(bedrockId, power)).toBe(true)
      expect(resistsExplosion(obsidianId, power)).toBe(true)
      expect(resistsExplosion(stoneId, power)).toBe(false)
    }
  })

  it('an ordinary block never resists a positive-power explosion, matching its blastResistance default of 0', () => {
    const stoneId = blockIdOf('stone')
    expect(resistsExplosion(stoneId, Number.EPSILON)).toBe(false)
    // A zero-power explosion destroys nothing, so even a default-resistance
    // block "survives" it — the `>=` boundary, not a special case.
    expect(resistsExplosion(stoneId, 0)).toBe(true)
  })

  it('an unregistered block id resolves to the default blastResistance rather than throwing', () => {
    const UNREGISTERED_ID = 65_535
    expect(resistsExplosion(UNREGISTERED_ID, 0)).toBe(true)
    expect(resistsExplosion(UNREGISTERED_ID, TNT_POWER)).toBe(false)
  })
})
