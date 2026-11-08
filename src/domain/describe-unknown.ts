const MAX_STRING_DESCRIPTION_LENGTH = 128

export const describeUnknown = (value: unknown): string => {
  if (typeof value === "string") {
    return value.length <= MAX_STRING_DESCRIPTION_LENGTH
      ? value
      : `${value.slice(0, MAX_STRING_DESCRIPTION_LENGTH - 1)}…`
  }
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return `${value}`
  if (value === null) return "null"
  return typeof value
}
