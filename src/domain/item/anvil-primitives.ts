/* eslint-disable no-control-regex -- Custom names must reject the JSON control-character range. */
import { Brand } from 'effect'

export type AnvilEnchantmentId = string & Brand.Brand<'AnvilEnchantmentId'>
export type AnvilCustomName = string & Brand.Brand<'AnvilCustomName'>

/** Material consumed by an anvil operation; zero means the right input contributed nothing. */
export type AnvilMaterialCost = number & Brand.Brand<'AnvilMaterialCost'>

export const AnvilMaterialCost: Brand.Constructor<AnvilMaterialCost> = Brand.make<AnvilMaterialCost>(
  (value) =>
    Number.isSafeInteger(value) && value >= 0 && value <= 99
      ? true
      : `AnvilMaterialCost must be an integer in [0, 99], received ${String(value)}`,
)

const isEnchantmentId = (value: unknown): value is AnvilEnchantmentId =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9_.:/-]{0,127}$/.test(value)

const isCustomName = (value: unknown): value is AnvilCustomName =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 50 &&
  !/[\u0000-\u001f\u007f]/.test(value)

export const AnvilEnchantmentId: Brand.Constructor<AnvilEnchantmentId> = Brand.make<AnvilEnchantmentId>(
  (value) => isEnchantmentId(value) ? true : `Invalid AnvilEnchantmentId: ${String(value)}`,
)

export const AnvilCustomName: Brand.Constructor<AnvilCustomName> = Brand.make<AnvilCustomName>(
  (value) => isCustomName(value) ? true : `Invalid AnvilCustomName: ${String(value)}`,
)
