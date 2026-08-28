import { Brand } from 'effect'
import {
  HORIZONTAL_BLOCK_FACES,
  isBlockFace,
  type BlockFace,
} from './coordinate-neighbours.js'

export type HorizontalRedstoneFace = (typeof HORIZONTAL_BLOCK_FACES)[number]

export const REDSTONE_REPEATER_DELAY_MIN_TICKS = 1
export const REDSTONE_REPEATER_DELAY_MAX_TICKS = 4

export type RepeaterDelayTicks = number & Brand.Brand<'RepeaterDelayTicks'>

export const repeaterDelayTicks: Brand.Brand.Constructor<RepeaterDelayTicks> = Brand.refined<
  RepeaterDelayTicks
>(
  (value): value is RepeaterDelayTicks =>
    Number.isInteger(value) &&
    value >= REDSTONE_REPEATER_DELAY_MIN_TICKS &&
    value <= REDSTONE_REPEATER_DELAY_MAX_TICKS,
  (value) =>
    Brand.error(
      `Expected repeater delay ticks from ${REDSTONE_REPEATER_DELAY_MIN_TICKS} to ${REDSTONE_REPEATER_DELAY_MAX_TICKS}, received ${value}`,
    ),
)

export type RedstoneRepeater = Readonly<{
  kind: 'repeater'
  facing: HorizontalRedstoneFace
  delayTicks: RepeaterDelayTicks
  locked: boolean
}>

export type RedstoneComparatorMode = 'compare' | 'subtract'

export type RedstoneComparator = Readonly<{
  kind: 'comparator'
  facing: HorizontalRedstoneFace
  mode: RedstoneComparatorMode
}>

export type RedstoneObserver = Readonly<{
  kind: 'observer'
  facing: BlockFace
}>

export type RedstoneDevice = RedstoneRepeater | RedstoneComparator | RedstoneObserver

const isHorizontalRedstoneFace = (value: string): value is HorizontalRedstoneFace =>
  HORIZONTAL_BLOCK_FACES.some((face) => face === value)

const requireHorizontalFace = (facing: string): HorizontalRedstoneFace => {
  if (!isHorizontalRedstoneFace(facing)) {
    throw new Error(`Invalid horizontal redstone face: ${facing}`)
  }
  return facing
}

export const redstoneRepeater = (
  facing: string,
  delayTicks: number,
  locked = false,
): RedstoneRepeater => ({
  kind: 'repeater',
  facing: requireHorizontalFace(facing),
  delayTicks: repeaterDelayTicks(delayTicks),
  locked,
})

export const redstoneComparator = (
  facing: string,
  mode: string = 'compare',
): RedstoneComparator => {
  if (mode !== 'compare' && mode !== 'subtract') {
    throw new Error(`Invalid redstone comparator mode: ${mode}`)
  }
  return { kind: 'comparator', facing: requireHorizontalFace(facing), mode }
}

export const redstoneObserver = (facing: string): RedstoneObserver => {
  if (!isBlockFace(facing)) {
    throw new Error(`Invalid observer face: ${facing}`)
  }
  return { kind: 'observer', facing }
}
