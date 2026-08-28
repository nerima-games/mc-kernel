/** The dimensions understood by platform-independent Minecraft domain logic. */
export const DIMENSIONS = ['overworld', 'nether', 'end'] as const

export type Dimension = (typeof DIMENSIONS)[number]

const DIMENSION_LOOKUP: ReadonlySet<string> = new Set(DIMENSIONS)

export const isDimension = (value: unknown): value is Dimension =>
  typeof value === 'string' && DIMENSION_LOOKUP.has(value)
