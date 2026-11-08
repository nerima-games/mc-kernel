import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import { describeUnknown } from "../src/domain/describe-unknown.js"
import { hostileExamples, hostileInput } from "./hostile-inputs.js"

describe("describeUnknown", () => {
  it("describes arbitrary and hostile values without coercion", () => {
    let failure: string | undefined
    fc.assert(fc.property(hostileInput, (value) => {
      try {
        const description = describeUnknown(value)
        if (typeof description !== "string" || description.length > 128) failure = "invalid description"
      } catch {
        failure = "description threw"
      }
      return true
    }))
    expect(failure).toBeUndefined()
  })

  it("preserves primitive values and labels non-primitives by kind", () => {
    expect(describeUnknown(12)).toBe("12")
    expect(describeUnknown(12n)).toBe("12")
    expect(describeUnknown(false)).toBe("false")
    expect(describeUnknown(null)).toBe("null")
    expect(describeUnknown(undefined)).toBe("undefined")
    expect(describeUnknown("text")).toBe("text")
    expect(describeUnknown(Symbol("text"))).toBe("symbol")
    expect(describeUnknown(() => undefined)).toBe("function")
    expect(describeUnknown({})).toBe("object")
    expect(describeUnknown("x".repeat(129))).toBe(`${"x".repeat(127)}…`)
  })

  it("describes each explicit hostile example", () => {
    for (const { name, value } of hostileExamples) {
      const description = describeUnknown(value)
      expect(typeof description, name).toBe("string")
      expect(description.length, name).toBeLessThanOrEqual(128)
    }
  })
})
