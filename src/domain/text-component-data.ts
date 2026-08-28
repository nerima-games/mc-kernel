/** Portable data contracts for Minecraft JSON text components. */

export interface TextComponentObject {
  readonly [key: string]: TextComponentValue
}

export type TextComponentValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<TextComponentValue>
  | TextComponentObject

export type TextComponent =
  | string
  | ReadonlyArray<TextComponentValue>
  | TextComponentObject
