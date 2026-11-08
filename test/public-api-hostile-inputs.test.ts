import { describe, expect, it } from "vitest"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as fc from "fast-check"
import * as Schema from "effect/Schema"
import * as Result from "effect/Result"
import { API, SignatureKind, TypeFlags } from "typescript/unstable/sync"
import {
  isArrayLiteralExpression,
  isAsExpression,
  isIdentifier,
  isVariableStatement,
} from "typescript/unstable/ast"
import type { Expression } from "typescript/unstable/ast"
import type { Checker, Signature, Symbol as TypeSymbol, Type } from "typescript/unstable/sync"
import * as PublicApi from "../src/index.js"
import {
  propertiesOfBiome,
  resolveDifficultyProperties,
  resolveGameModeProperties,
} from "../src/index.js"
import { hostileExampleName, hostileExamples, hostileInput } from "./hostile-inputs.js"

function projectRootFromSource(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..")
}

const projectRoot = projectRootFromSource()
const rootEntry = resolve(projectRoot, "src/index.ts")
const testEntry = resolve(projectRoot, "test/public-api-hostile-inputs.test.ts")
const tsconfig = resolve(projectRoot, "tsconfig.test.json")

type SchemaExport = Readonly<{ name: string; value: Schema.Top }>
type UnknownFunctionTarget = Readonly<{
  name: string
  callable: Function
  kind: "call" | "construct"
  parameters: ReadonlyArray<Readonly<{ isUnknown: boolean; neutral: unknown }>>
}>
type NeutralCandidate = Readonly<{ value: unknown; type: Type }>

const neutralResultDecoder = (_value: unknown): Result.Result<never, Error> =>
  Result.fail(new Error("neutral decoder failure"))

const emptyArray = (): never[] => []

const neutralArgumentValues = [
  undefined,
  null,
  "",
  0,
  false,
  0n,
  Symbol("neutral"),
  emptyArray(),
  {},
  () => undefined,
  new Date(0),
  neutralResultDecoder,
  PublicApi.BlockId(0),
  PublicApi.NamespacedResourceLocation("minecraft:stone"),
  PublicApi.blockPosition(PublicApi.BlockAxis(0), PublicApi.BlockAxis(0), PublicApi.BlockAxis(0)),
  PublicApi.position(PublicApi.PositionAxis(0), PublicApi.PositionAxis(0), PublicApi.PositionAxis(0)),
  PublicApi.chunkCoord(PublicApi.ChunkAxis(0), PublicApi.ChunkAxis(0)),
] as const

const schemaExports: ReadonlyArray<SchemaExport> = Object.entries(PublicApi)
  .flatMap(([name, value]) => Schema.isSchema(value) ? [{ name, value }] : [])

const unwrapAsExpression = (node: Expression): Expression =>
  isAsExpression(node) ? node.expression : node

const literalNeutral = (type: Type): unknown => {
  const members = type.isUnionType() ? type.getTypes() : [type]
  const literal = members.find((member) =>
    member.isStringLiteralType() ||
    member.isNumberLiteralType() ||
    member.isBigIntLiteralType() ||
    member.isBooleanLiteralType(),
  )
  return literal?.value
}

const neutralParameter = (
  name: string,
  type: Type,
  candidates: ReadonlyArray<NeutralCandidate>,
  checker: Checker,
): Readonly<{ isUnknown: boolean; neutral: unknown }> => {
  const isUnknown = type.flags === TypeFlags.Unknown
  if (isUnknown) return { isUnknown, neutral: undefined }
  const candidate = candidates.find(({ type: candidateType }) => checker.isTypeAssignableTo(candidateType, type))
  const decoderCandidate = candidates.find(({ value }) => value === neutralResultDecoder)
  const isUnknownDecoder = checker.getSignaturesOfType(type, SignatureKind.Call).some((signature) =>
    signature.getParameters().some((parameter) => checker.getTypeOfSymbol(parameter)?.flags === TypeFlags.Unknown),
  )
  if (candidate === undefined && isUnknownDecoder && decoderCandidate !== undefined) {
    return { isUnknown, neutral: decoderCandidate.value }
  }
  const literal = candidate === undefined ? literalNeutral(type) : undefined
  if (candidate === undefined && literal === undefined) {
    throw new Error(`No neutral argument for ${name}: ${checker.typeToString(type)}`)
  }
  return { isUnknown, neutral: candidate?.value ?? literal }
}

const targetForSignature = (
  name: string,
  callable: Function,
  kind: "call" | "construct",
  signature: Signature,
  candidates: ReadonlyArray<NeutralCandidate>,
  checker: Checker,
): UnknownFunctionTarget | undefined => {
  const parameters = signature.getParameters()
  const types = parameters.map((parameter) => checker.getTypeOfSymbol(parameter))
  const unknownIndexes = types.flatMap((type, index) => {
    if (type === undefined) throw new Error(`Unable to resolve ${name}.${parameters[index]?.name}`)
    return type.flags === TypeFlags.Unknown ? [index] : []
  })
  if (unknownIndexes.length === 0) return undefined
  const resolvedParameters = parameters.map((parameter, index) => {
    const type = types[index]
    if (type === undefined) throw new Error(`Unable to resolve ${name}.${parameter.name}`)
    return neutralParameter(`${name}.${parameter.name}`, type, candidates, checker)
  })
  return { name, callable, kind, parameters: resolvedParameters }
}

const neutralCandidatesFor = (
  testSource: import("typescript/unstable/ast").SourceFile,
  rootSource: import("typescript/unstable/ast").SourceFile,
  exportedSymbols: ReadonlyArray<TypeSymbol>,
  runtimeValues: ReadonlyMap<string, unknown>,
  checker: Checker,
): ReadonlyArray<NeutralCandidate> => {
  const candidateDeclaration = testSource.statements
    .filter(isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((declaration) => isIdentifier(declaration.name) && declaration.name.text === "neutralArgumentValues")
  if (candidateDeclaration?.initializer === undefined) throw new Error("Unable to find neutral argument candidates")
  const candidateArray = unwrapAsExpression(candidateDeclaration.initializer)
  if (!isArrayLiteralExpression(candidateArray)) throw new Error("Neutral argument candidates must be an array")
  const candidates = candidateArray.elements.map((expression, index) => {
    const value = neutralArgumentValues[index]
    const type = checker.getTypeAtLocation(unwrapAsExpression(expression))
    if (index >= neutralArgumentValues.length || type === undefined) {
      throw new Error("Unable to resolve a neutral argument candidate")
    }
    return { value, type }
  })
  for (const symbol of exportedSymbols) {
    if (!runtimeValues.has(symbol.name)) continue
    const value = runtimeValues.get(symbol.name)
    if (value === undefined || typeof value === "function") continue
    candidates.push({ value, type: checker.getTypeOfSymbolAtLocation(symbol, rootSource) })
  }
  return candidates
}

const targetsForExport = (
  symbol: TypeSymbol,
  value: Function,
  rootSource: import("typescript/unstable/ast").SourceFile,
  candidates: ReadonlyArray<NeutralCandidate>,
  checker: Checker,
): ReadonlyArray<UnknownFunctionTarget> => {
  const type = checker.getTypeOfSymbolAtLocation(symbol, rootSource)
  const kinds = [["call", SignatureKind.Call], ["construct", SignatureKind.Construct]] as const
  return kinds.flatMap(([kind, signatureKind]) =>
    checker.getSignaturesOfType(type, signatureKind).flatMap((signature) => {
      const target = targetForSignature(symbol.name, value, kind, signature, candidates, checker)
      return target === undefined ? [] : [target]
    }),
  )
}

const discoverUnknownFunctionTargets = (): ReadonlyArray<UnknownFunctionTarget> => {
  const api = new API({ cwd: projectRoot })
  try {
    const snapshot = api.updateSnapshot({ openProjects: [tsconfig] })
    const project = snapshot.getProject(tsconfig)
    if (project === undefined) throw new Error("Unable to load the test TypeScript project")
    const checker = project.checker
    const rootSource = project.program.getSourceFile(rootEntry)
    const testSource = project.program.getSourceFile(testEntry)
    if (rootSource === undefined || testSource === undefined) {
      throw new Error("Unable to load the public API test source files")
    }
    const rootModule = checker.getSymbolAtLocation(rootSource)
    if (rootModule === undefined) throw new Error("Unable to resolve the public entry module")
    const exportedSymbols = checker.getExportsOfModule(rootModule)
    const runtimeValues = new Map(Object.entries(PublicApi))
    const candidates = neutralCandidatesFor(testSource, rootSource, exportedSymbols, runtimeValues, checker)
    return exportedSymbols.flatMap((symbol) => {
      const value = runtimeValues.get(symbol.name)
      return typeof value === "function" ? targetsForExport(symbol, value, rootSource, candidates, checker) : []
    })
  } finally {
    api.close()
  }
}

const unknownFunctionTargets = discoverUnknownFunctionTargets()

const checkPublicInputsDoNotThrow = (value: unknown, failures: Set<string>): void => {
  for (const schema of schemaExports) {
    try {
      const decode = Reflect.apply(Schema.decodeUnknownResult, undefined, [schema.value])
      if (typeof decode !== "function") throw new Error(`schema ${schema.name} decoder was not callable`)
      const decoded: unknown = Reflect.apply(decode, undefined, [value])
      if (!Result.isResult(decoded)) {
        failures.add(`schema ${schema.name} did not return a Result`)
      }
    } catch {
      failures.add(`schema ${schema.name} threw`)
    }
  }
  for (const target of unknownFunctionTargets) {
    const args = target.parameters.map((parameter) => parameter.isUnknown ? value : parameter.neutral)
    try {
      if (target.kind === "construct") Reflect.construct(target.callable, args)
      else Reflect.apply(target.callable, undefined, args)
    } catch {
      failures.add(`${target.kind} ${target.name} threw`)
    }
  }
  for (const args of [[{}, value], [{ opacity: value }, "opacity"]]) {
    try {
      Reflect.apply(PublicApi.propertyOf, undefined, args)
    } catch {
      failures.add("function propertyOf threw")
    }
  }
}

describe("public API hostile-input conformance", () => {
  it("keeps every exported unknown input and Schema on a non-throwing path", () => {
    expect(schemaExports.length).toBeGreaterThan(0)
    expect(unknownFunctionTargets.length).toBeGreaterThan(0)
    const discoveredNames = unknownFunctionTargets.map(({ name }) => name)
    expect(discoveredNames).toContain("propertiesOfBiome")
    expect(discoveredNames).toContain("resolveGameModeProperties")
    expect(discoveredNames).toContain("resolveDifficultyProperties")
    expect(discoveredNames).toContain("getDisplayName")

    const failures = new Set<string>()
    for (const { value } of hostileExamples) {
      const exampleName = hostileExampleName(value)
      expect(Result.isFailure(propertiesOfBiome(value)), exampleName).toBe(true)
      expect(Result.isFailure(resolveGameModeProperties(value)), exampleName).toBe(true)
      expect(Result.isFailure(resolveDifficultyProperties(value)), exampleName).toBe(true)
      expect(Result.isFailure(PublicApi.getDisplayName(value)), exampleName).toBe(true)
      expect(Result.isFailure(Reflect.apply(PublicApi.propertyOf, undefined, [{}, value])), exampleName).toBe(true)
      expect(
        Result.isFailure(Reflect.apply(PublicApi.propertyOf, undefined, [{ opacity: value }, "opacity"])),
        exampleName,
      ).toBe(true)
      expect(Result.isFailure(Schema.decodeUnknownResult(PublicApi.DomainEventSchema)(value)), exampleName).toBe(true)
      checkPublicInputsDoNotThrow(value, failures)
    }
    fc.assert(fc.property(hostileInput, (value) => {
      checkPublicInputsDoNotThrow(value, failures)
      return true
    }))
    expect([...failures]).toEqual([])
  })
})
