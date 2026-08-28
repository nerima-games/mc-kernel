import { describe, expect, it } from 'vitest'
import { DeltaTimeSecs } from '../src/domain/quantities'
import {
  addExhaustion,
  addExperience,
  advanceFoodTimer,
  applyDamage,
  DEFAULT_MAX_HEALTH_POINTS,
  DEFAULT_MAX_HUNGER_POINTS,
  eat,
  experienceCostOfLevel,
  experienceLevel,
  experienceProgress,
  heal,
  isDead,
  isValidVitals,
  levelForTotalExperience,
  normaliseVitals,
  respawn,
  SPAWN_SATURATION,
  SPAWN_VITALS,
  totalExperienceAtLevel,
  vitalsView,
  type Vitals,
} from '../src/domain/vitals'

const withVitals = (patch: Partial<Vitals> = {}): Vitals => ({
  ...SPAWN_VITALS,
  ...patch,
})

const deltaTime = (seconds: number): DeltaTimeSecs => DeltaTimeSecs(seconds)

describe('vitals health model', () => {
  it('provides safe spawn defaults and death detection', () => {
    expect(DEFAULT_MAX_HEALTH_POINTS).toBe(20)
    expect(DEFAULT_MAX_HUNGER_POINTS).toBe(20)
    expect(SPAWN_SATURATION).toBe(5)
    expect(SPAWN_VITALS).toEqual({
      healthPoints: 20,
      maxHealthPoints: 20,
      hungerPoints: 20,
      maxHungerPoints: 20,
      saturation: 5,
      exhaustion: 0,
      foodTimerSecs: 0,
      totalExperience: 0,
      lastDamageCause: undefined,
    })
    expect(isDead(SPAWN_VITALS)).toBe(false)
    expect(isDead(withVitals({ healthPoints: 0 }))).toBe(true)
  })

  it('applies damage only when it changes health', () => {
    expect(applyDamage(SPAWN_VITALS, { amount: Number.NaN, cause: 'fall' })).toBe(SPAWN_VITALS)
    expect(applyDamage(SPAWN_VITALS, { amount: -1, cause: 'fall' })).toBe(SPAWN_VITALS)
    expect(applyDamage(SPAWN_VITALS, { amount: 0, cause: 'fall' })).toBe(SPAWN_VITALS)
    expect(applyDamage(SPAWN_VITALS, { amount: 6, cause: 'fall' })).toEqual({
      ...SPAWN_VITALS,
      healthPoints: 14,
    })
    expect(applyDamage(SPAWN_VITALS, { amount: 30, cause: 'lava' })).toEqual({
      ...SPAWN_VITALS,
      healthPoints: 0,
      lastDamageCause: 'lava',
    })
    const dead = withVitals({ healthPoints: 0, lastDamageCause: 'fire' })
    expect(applyDamage(dead, { amount: 1, cause: 'fall' })).toBe(dead)
    expect(applyDamage(SPAWN_VITALS, { amount: Number.POSITIVE_INFINITY, cause: 'void' })).toEqual({
      ...SPAWN_VITALS,
      healthPoints: 0,
      lastDamageCause: 'void',
    })
  })

  it('heals living players up to their maximum', () => {
    const injured = withVitals({ healthPoints: 8 })
    expect(heal(injured, Number.NaN)).toBe(injured)
    expect(heal(injured, -1)).toBe(injured)
    expect(heal(injured, 0)).toBe(injured)
    expect(heal(injured, 4)).toEqual({ ...injured, healthPoints: 12 })
    expect(heal(injured, 20)).toEqual({ ...injured, healthPoints: 20 })
    const dead = withVitals({ healthPoints: 0 })
    expect(heal(dead, 4)).toBe(dead)
  })
})

describe('vitals hunger model', () => {
  it('cascades exhaustion through saturation and hunger', () => {
    expect(addExhaustion(SPAWN_VITALS, Number.NaN)).toBe(SPAWN_VITALS)
    expect(addExhaustion(SPAWN_VITALS, -1)).toBe(SPAWN_VITALS)
    expect(addExhaustion(SPAWN_VITALS, 0)).toBe(SPAWN_VITALS)
    expect(addExhaustion(SPAWN_VITALS, 4)).toEqual({
      ...SPAWN_VITALS,
      saturation: 4,
    })
    expect(addExhaustion(SPAWN_VITALS, 20)).toEqual({
      ...SPAWN_VITALS,
      saturation: 0,
    })
    expect(addExhaustion(SPAWN_VITALS, 24)).toEqual({
      ...SPAWN_VITALS,
      hungerPoints: 19,
      saturation: 0,
    })
    expect(addExhaustion(SPAWN_VITALS, 4.5)).toEqual({
      ...SPAWN_VITALS,
      saturation: 4,
      exhaustion: 0.5,
    })
    expect(addExhaustion(withVitals({ exhaustion: 3.5 }), 1)).toEqual({
      ...SPAWN_VITALS,
      saturation: 4,
      exhaustion: 0.5,
    })
    expect(addExhaustion(SPAWN_VITALS, Number.POSITIVE_INFINITY)).toEqual({
      ...SPAWN_VITALS,
      hungerPoints: 15,
      saturation: 0,
    })
  })

  it('adds food and saturation without exceeding hunger limits', () => {
    expect(eat(SPAWN_VITALS, Number.NaN, 1)).toBe(SPAWN_VITALS)
    expect(eat(SPAWN_VITALS, -1, 1)).toBe(SPAWN_VITALS)
    expect(eat(SPAWN_VITALS, 0, 1)).toBe(SPAWN_VITALS)
    expect(eat(withVitals({ hungerPoints: 0, saturation: 0 }), 6, 6)).toEqual({
      ...SPAWN_VITALS,
      hungerPoints: 6,
      saturation: 6,
    })
    expect(eat(withVitals({ hungerPoints: 10, saturation: 0 }), 5, 6)).toEqual({
      ...SPAWN_VITALS,
      hungerPoints: 15,
      saturation: 6,
    })
    expect(eat(SPAWN_VITALS, 5, 10)).toEqual({
      ...SPAWN_VITALS,
      saturation: 15,
    })
    expect(eat(SPAWN_VITALS, 5, Number.NaN)).toEqual({
      ...SPAWN_VITALS,
      hungerPoints: 20,
      saturation: 5,
    })
  })

  it('emits food signals at the fixed food interval', () => {
    const beforeTick = advanceFoodTimer(SPAWN_VITALS, deltaTime(2))
    expect(beforeTick).toEqual(['none', { ...SPAWN_VITALS, foodTimerSecs: 2 }])

    const regenerating = withVitals({ healthPoints: 10, hungerPoints: 18 })
    expect(advanceFoodTimer(regenerating, deltaTime(4))).toEqual([
      'regen',
      { ...regenerating, saturation: 4, exhaustion: 2 },
    ])
    expect(advanceFoodTimer(SPAWN_VITALS, deltaTime(4))).toEqual([
      'none',
      { ...SPAWN_VITALS, foodTimerSecs: 0 },
    ])
    expect(advanceFoodTimer(withVitals({ healthPoints: 0, hungerPoints: 18 }), deltaTime(4))).toEqual([
      'none',
      { ...SPAWN_VITALS, healthPoints: 0, hungerPoints: 18, foodTimerSecs: 0 },
    ])
    expect(advanceFoodTimer(withVitals({ healthPoints: 10, hungerPoints: 17 }), deltaTime(4))).toEqual([
      'none',
      { ...SPAWN_VITALS, healthPoints: 10, hungerPoints: 17, foodTimerSecs: 0 },
    ])
    expect(advanceFoodTimer(withVitals({ healthPoints: 10, hungerPoints: 0 }), deltaTime(4))).toEqual([
      'starve',
      { ...SPAWN_VITALS, healthPoints: 10, hungerPoints: 0, foodTimerSecs: 0 },
    ])
    expect(advanceFoodTimer(withVitals({ foodTimerSecs: 3 }), deltaTime(2))).toEqual([
      'none',
      { ...SPAWN_VITALS, foodTimerSecs: 1 },
    ])
    expect(advanceFoodTimer(SPAWN_VITALS, deltaTime(0))).toEqual(['none', SPAWN_VITALS])
  })
})

describe('vitals experience model', () => {
  it('uses the three official level cost curves', () => {
    expect(experienceCostOfLevel(Number.NaN)).toBe(7)
    expect(experienceCostOfLevel(-1)).toBe(7)
    expect(experienceCostOfLevel(0)).toBe(7)
    expect(experienceCostOfLevel(15)).toBe(37)
    expect(experienceCostOfLevel(16)).toBe(42)
    expect(experienceCostOfLevel(30)).toBe(112)
    expect(experienceCostOfLevel(31)).toBe(121)
    expect(experienceCostOfLevel(100)).toBe(742)
    expect(experienceCostOfLevel(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
    expect(experienceCostOfLevel(Number.NEGATIVE_INFINITY)).toBe(7)
  })

  it('maps levels to total experience and back at boundaries', () => {
    expect(totalExperienceAtLevel(Number.NaN)).toBe(0)
    expect(totalExperienceAtLevel(-1)).toBe(0)
    expect(totalExperienceAtLevel(0)).toBe(0)
    expect(totalExperienceAtLevel(16)).toBe(352)
    expect(totalExperienceAtLevel(17)).toBe(394)
    expect(totalExperienceAtLevel(31)).toBe(1507)
    expect(totalExperienceAtLevel(32)).toBe(1628)
    expect(totalExperienceAtLevel(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
    expect(totalExperienceAtLevel(Number.NEGATIVE_INFINITY)).toBe(0)

    expect(levelForTotalExperience(Number.NEGATIVE_INFINITY)).toBe(0)
    expect(levelForTotalExperience(Number.NaN)).toBe(0)
    expect(levelForTotalExperience(Number.POSITIVE_INFINITY)).toBe(0)
    expect(levelForTotalExperience(0)).toBe(0)
    expect(levelForTotalExperience(6)).toBe(0)
    expect(levelForTotalExperience(7)).toBe(1)
    expect(levelForTotalExperience(351)).toBe(15)
    expect(levelForTotalExperience(352)).toBe(16)

    const largeLevel = levelForTotalExperience(1_000_000)
    expect(totalExperienceAtLevel(largeLevel)).toBeLessThanOrEqual(1_000_000)
    expect(totalExperienceAtLevel(largeLevel + 1)).toBeGreaterThan(1_000_000)
  })

  it('updates experience and exposes level progress', () => {
    const experienced = withVitals({ totalExperience: 8 })
    expect(experienceLevel(experienced)).toBe(1)
    expect(experienceProgress(experienced)).toBeCloseTo(1 / 9)
    expect(experienceLevel(withVitals({ totalExperience: Number.NaN }))).toBe(0)
    expect(experienceProgress(withVitals({ totalExperience: Number.POSITIVE_INFINITY }))).toBe(0)
    expect(addExperience(SPAWN_VITALS, Number.NaN)).toBe(SPAWN_VITALS)
    expect(addExperience(SPAWN_VITALS, 0)).toBe(SPAWN_VITALS)
    expect(addExperience(SPAWN_VITALS, 8)).toEqual({ ...SPAWN_VITALS, totalExperience: 8 })
    expect(addExperience(withVitals({ totalExperience: 2 }), -8)).toEqual({
      ...SPAWN_VITALS,
      totalExperience: 0,
    })
  })
})

describe('vitals validation and lifecycle', () => {
  it('validates all persisted vitals fields', () => {
    expect(isValidVitals(SPAWN_VITALS)).toBe(true)
    expect(isValidVitals({ ...SPAWN_VITALS, lastDamageCause: 'fall' })).toBe(true)
    expect(isValidVitals(null)).toBe(false)
    expect(isValidVitals([])).toBe(false)
    expect(isValidVitals('vitals')).toBe(false)
    expect(isValidVitals({})).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, maxHealthPoints: 0 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, healthPoints: -1 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, healthPoints: 21 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, maxHealthPoints: Number.NaN })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, maxHungerPoints: -1 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, hungerPoints: -1 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, hungerPoints: 21 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, saturation: -1 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, saturation: 21 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, exhaustion: -1 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, exhaustion: 4 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, foodTimerSecs: -1 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, foodTimerSecs: 4 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, totalExperience: -1 })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, totalExperience: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isValidVitals({ ...SPAWN_VITALS, lastDamageCause: 1 })).toBe(false)
  })

  it('normalises unknown persisted values into a valid model', () => {
    expect(normaliseVitals(null)).toEqual({
      ...SPAWN_VITALS,
      healthPoints: 0,
      hungerPoints: 0,
      saturation: 0,
    })
    expect(normaliseVitals([])).toEqual({
      ...SPAWN_VITALS,
      healthPoints: 0,
      hungerPoints: 0,
      saturation: 0,
    })
    expect(normaliseVitals({})).toEqual({
      ...SPAWN_VITALS,
      healthPoints: 0,
      hungerPoints: 0,
      saturation: 0,
    })
    expect(normaliseVitals({
      maxHealthPoints: 40,
      healthPoints: 25,
      maxHungerPoints: 30,
      hungerPoints: 28,
      saturation: 4,
      exhaustion: 9,
      foodTimerSecs: 11,
      totalExperience: 12,
      lastDamageCause: 'fall',
    })).toEqual({
      healthPoints: 25,
      maxHealthPoints: 40,
      hungerPoints: 28,
      maxHungerPoints: 30,
      saturation: 4,
      exhaustion: 1,
      foodTimerSecs: 3,
      totalExperience: 12,
      lastDamageCause: 'fall',
    })
    expect(normaliseVitals({
      maxHealthPoints: 0,
      maxHungerPoints: -1,
      healthPoints: Number.POSITIVE_INFINITY,
      hungerPoints: Number.NEGATIVE_INFINITY,
      saturation: Number.NaN,
      exhaustion: Number.POSITIVE_INFINITY,
      foodTimerSecs: -1,
      totalExperience: Number.NEGATIVE_INFINITY,
      lastDamageCause: 1,
    })).toEqual({
      healthPoints: 1,
      maxHealthPoints: 1,
      hungerPoints: 0,
      maxHungerPoints: 0,
      saturation: 0,
      exhaustion: 0,
      foodTimerSecs: 0,
      totalExperience: 0,
      lastDamageCause: undefined,
    })
    expect(normaliseVitals({
      maxHealthPoints: Number.POSITIVE_INFINITY,
      maxHungerPoints: Number.NaN,
      totalExperience: Number.POSITIVE_INFINITY,
      exhaustion: -1,
      foodTimerSecs: Number.NaN,
    })).toEqual({
      ...SPAWN_VITALS,
      healthPoints: 0,
      hungerPoints: 0,
      saturation: 0,
    })
  })

  it('respawns while preserving maxima and experience', () => {
    const changed = withVitals({
      healthPoints: 1,
      maxHealthPoints: 30,
      hungerPoints: 0,
      maxHungerPoints: 2,
      saturation: 0,
      exhaustion: 3,
      foodTimerSecs: 2,
      totalExperience: 17,
      lastDamageCause: 'lava',
    })
    expect(respawn(changed)).toEqual({
      ...changed,
      healthPoints: 30,
      hungerPoints: 2,
      saturation: 2,
      exhaustion: 0,
      foodTimerSecs: 0,
      lastDamageCause: undefined,
    })
  })

  it('builds the stable player-facing view', () => {
    expect(vitalsView(withVitals({
      healthPoints: 12,
      maxHealthPoints: 24,
      hungerPoints: 14,
      maxHungerPoints: 24,
      totalExperience: 8,
    }))).toEqual({
      healthPoints: 12,
      maxHealthPoints: 24,
      hungerPoints: 14,
      maxHungerPoints: 24,
      experienceLevel: 1,
      experienceProgress: 1 / 9,
    })
  })
})
