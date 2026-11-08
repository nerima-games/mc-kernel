import * as fc from "fast-check"

const throwFromTrap = (): never => {
  throw new Error("hostile trap")
}

const allTrapsThrowHandler: ProxyHandler<() => void> = {
  get: throwFromTrap,
  set: throwFromTrap,
  has: throwFromTrap,
  deleteProperty: throwFromTrap,
  ownKeys: throwFromTrap,
  getOwnPropertyDescriptor: throwFromTrap,
  defineProperty: throwFromTrap,
  getPrototypeOf: throwFromTrap,
  setPrototypeOf: throwFromTrap,
  isExtensible: throwFromTrap,
  preventExtensions: throwFromTrap,
  apply: throwFromTrap,
  construct: throwFromTrap,
}

const circular: { self?: unknown } = {}
circular.self = circular

export const hostileExamples: ReadonlyArray<Readonly<{ name: string; value: unknown }>> = [
  { name: "false toString", value: { toString: false } },
  { name: "throwing toString", value: { toString: throwFromTrap } },
  { name: "throwing valueOf", value: { valueOf: throwFromTrap } },
  { name: "throwing Symbol.toPrimitive", value: { [Symbol.toPrimitive]: throwFromTrap } },
  { name: "throwing Proxy traps", value: new Proxy(() => undefined, allTrapsThrowHandler) },
  { name: "null prototype", value: Object.create(null) },
  { name: "cycle", value: circular },
  { name: "symbol", value: Symbol("hostile") },
  { name: "function", value: () => undefined },
]

const hostileValues = hostileExamples.map(({ value }) => value)

export const hostileExampleName = (value: unknown): string =>
  hostileExamples.find((example) => example.value === value)?.name ?? "fc.anything value"

class HostileInputArbitrary extends fc.Arbitrary<unknown> {
  private readonly anything = fc.anything()

  generate(mrng: fc.Random, biasFactor: number | undefined): fc.Value<unknown> {
    if (mrng.nextInt(0, 1) === 0) return this.anything.generate(mrng, biasFactor)
    const index = mrng.nextInt(0, hostileValues.length - 1)
    const value = hostileValues[index]
    if (value === undefined) throw new Error("Hostile input index was out of range")
    return new fc.Value(value, index, () => value)
  }

  canShrinkWithoutContext(value: unknown): value is unknown {
    return hostileValues.some((candidate) => candidate === value) || this.anything.canShrinkWithoutContext(value)
  }

  shrink(value: unknown, context: unknown): fc.Stream<fc.Value<unknown>> {
    if (hostileValues.some((candidate) => candidate === value)) return fc.Stream.nil()
    return this.anything.shrink(value, context)
  }
}

export const hostileInput: fc.Arbitrary<unknown> = new HostileInputArbitrary()
