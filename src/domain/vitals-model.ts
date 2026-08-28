export const DEFAULT_MAX_HEALTH_POINTS: number = 20
export const DEFAULT_MAX_HUNGER_POINTS: number = 20
export const SPAWN_SATURATION: number = 5
export const EXHAUSTION_PER_POINT: number = 4
export const MAX_EXHAUSTION: number = 40
export const FOOD_TICK_SECS: number = 4
export const REGEN_HUNGER_THRESHOLD: number = 18
export const EXHAUSTION_PER_REGEN: number = 6

export type DamageCause = string

export type Damage = Readonly<{
  amount: number
  cause: DamageCause
}>

export type Vitals = Readonly<{
  healthPoints: number
  maxHealthPoints: number
  hungerPoints: number
  maxHungerPoints: number
  saturation: number
  exhaustion: number
  foodTimerSecs: number
  totalExperience: number
  lastDamageCause: DamageCause | undefined
}>

export type VitalsView = Readonly<{
  healthPoints: number
  maxHealthPoints: number
  hungerPoints: number
  maxHungerPoints: number
  experienceLevel: number
  experienceProgress: number
}>

export const SPAWN_VITALS: Vitals = {
  healthPoints: DEFAULT_MAX_HEALTH_POINTS,
  maxHealthPoints: DEFAULT_MAX_HEALTH_POINTS,
  hungerPoints: DEFAULT_MAX_HUNGER_POINTS,
  maxHungerPoints: DEFAULT_MAX_HUNGER_POINTS,
  saturation: SPAWN_SATURATION,
  exhaustion: 0,
  foodTimerSecs: 0,
  totalExperience: 0,
  lastDamageCause: undefined,
}
