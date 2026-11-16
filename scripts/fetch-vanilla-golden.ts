import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'

// The golden files are derived from Mojang data through misode/mcmeta, so they
// are fetched here instead of committed. The pins, sources, canonical form, and
// SHA-256 values mirror mc-dev-meta's scripts/conformance/generate.ts, which
// produced the bytes the tests were written against. Change them together.
export const PINS = {
  data: '538b2b167248c648b2198f2c0d56eced10dfc0cf',
  registries: '2240df2376509bfaf12becbb36e156e29f8ecb4d',
  summary: 'd96c75fec200c4580dd75e033a76341521165461',
} as const

export const GOLDEN_NAMES = [
  'biome',
  'block',
  'damage-type',
  'enchantment',
  'item',
  'mob-effect',
  'recipe',
  'tag',
] as const

export type GoldenName = typeof GOLDEN_NAMES[number]

type Source = {
  readonly pin: keyof typeof PINS
  readonly file: string
  readonly kind: 'array' | 'record' | 'tree-record'
}

export const SOURCES: Readonly<Record<GoldenName, Source>> = {
  biome: { pin: 'data', file: 'data/minecraft/worldgen/biome/', kind: 'tree-record' },
  block: { pin: 'summary', file: 'blocks/data.json', kind: 'record' },
  'damage-type': { pin: 'registries', file: 'damage_type/data.json', kind: 'array' },
  enchantment: { pin: 'summary', file: 'data/enchantment/data.json', kind: 'record' },
  item: { pin: 'registries', file: 'item/data.json', kind: 'array' },
  'mob-effect': { pin: 'registries', file: 'mob_effect/data.json', kind: 'array' },
  recipe: { pin: 'summary', file: 'data/recipe/data.json', kind: 'record' },
  tag: { pin: 'summary', file: 'data/tag/item/data.json', kind: 'record' },
}

export const EXPECTED_SHA256: Readonly<Record<GoldenName, string>> = {
  biome: '3aa23765748208a535c4dbc681d39fca2a559332933de379f3a0d6339d0c3371',
  block: '8eda5632c5af023acbaa286e55b3e43627974deedfba716cac3020132cb0948d',
  'damage-type': 'f628aa52d8203ee32e4bfb44e7445b74e930d447c014cff3383b2ac3c8adbd31',
  enchantment: 'a158492b8677a88f02b599540129bba588a2dead84f42c14d7936a7fb8a96dd7',
  item: '9c564cecf0358caaaa03e5b6501174a2879331e86d2820e2c475a24465f2f9cc',
  'mob-effect': 'cca53935b2e8ab143e8d76242408e2eed6aac40347edc1f4fcbeb887f5ca38a7',
  recipe: 'f1d2e3c21e30ff0187e7ba4b45b7165536e5b303bd7ef4858dcc5c04b661d701',
  tag: 'cd6b463583aa7379b340636ffa3ae62b97b2dc723fabb54bfec36a2b9d27e446',
}

const RAW_BASE = 'https://raw.githubusercontent.com/misode/mcmeta'
const TREE_BASE = 'https://api.github.com/repos/misode/mcmeta/git/trees'
const API_HOST = 'api.github.com'
const DEFAULT_CONCURRENCY = 8

export type FetchResponse = {
  readonly ok: boolean
  readonly status: number
  readonly text: () => Promise<string>
}

export type Fetcher = (
  url: string,
  init: { readonly headers: Readonly<Record<string, string>> },
) => Promise<FetchResponse>

export type FetchOptions = {
  readonly out: string
  readonly fetcher?: Fetcher
  readonly expected?: Readonly<Record<GoldenName, string>>
  readonly token?: string | undefined
  readonly concurrency?: number
}

export type FetchReport = {
  readonly fetched: ReadonlyArray<string>
  readonly kept: ReadonlyArray<string>
}

const jsonArray = Schema.Array(Schema.Unknown)
const jsonRecord = Schema.Record(Schema.String, Schema.Unknown)
const gitTree = Schema.Struct({
  truncated: Schema.Boolean,
  tree: Schema.Array(Schema.Struct({ path: Schema.String, type: Schema.String })),
})

const decode = <S extends Schema.ConstraintDecoder<unknown, never>>(schema: S, value: unknown, label: string): S["Type"] => {
  const result = Schema.decodeUnknownResult(schema)(value)
  if (Result.isFailure(result)) throw new Error(`${label} failed schema validation: ${String(result.failure)}`)
  return result.success
}

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable)
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    return Object.fromEntries(entries.map(([key, entry]) => [key, stable(entry)]))
  }
  return value
}

export const canonicalJson = (value: unknown): string => `${JSON.stringify(stable(value), null, 2)}\n`

const sha256 = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex')

// Every request goes through one slot pool. A released slot is handed straight
// to the next waiter so a caller arriving in between cannot exceed the bound.
const limiter = (max: number): (<T>(task: () => Promise<T>) => Promise<T>) => {
  let active = 0
  const waiting: Array<() => void> = []
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active < max) {
      active++
    } else {
      await new Promise<void>((resolve) => {
        waiting.push(resolve)
      })
    }
    try {
      return await task()
    } finally {
      const next = waiting.shift()
      if (next === undefined) active--
      else next()
    }
  }
}

const isMissing = (cause: unknown): boolean =>
  cause instanceof Error && 'code' in cause && cause.code === 'ENOENT'

const readIfPresent = async (file: string): Promise<Uint8Array | undefined> => {
  try {
    return await readFile(file)
  } catch (cause) {
    if (isMissing(cause)) return undefined
    throw cause
  }
}

export const fetchVanillaGolden = async (options: FetchOptions): Promise<FetchReport> => {
  const fetcher: Fetcher = options.fetcher ?? fetch
  const expected = options.expected ?? EXPECTED_SHA256
  const token = options.token === undefined || options.token === '' ? undefined : options.token
  const slot = limiter(options.concurrency ?? DEFAULT_CONCURRENCY)

  // The token is attached only for the tree API, whose anonymous rate limit is
  // low; raw.githubusercontent.com never receives it.
  const getJson = (url: string): Promise<unknown> => slot(async () => {
    const headers: Record<string, string> = token !== undefined && new URL(url).hostname === API_HOST
      ? { Authorization: `Bearer ${token}` }
      : {}
    const response = await fetcher(url, { headers })
    if (!response.ok) throw new Error(`${url}: HTTP ${String(response.status)}`)
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch (cause) {
      throw new Error(`${url}: response is not JSON`, { cause })
    }
  })

  const fetchTreeRecord = async (source: Source): Promise<unknown> => {
    const treeUrl = `${TREE_BASE}/${PINS[source.pin]}?recursive=1`
    const tree = decode(gitTree, await getJson(treeUrl), treeUrl)
    if (tree.truncated) throw new Error(`${treeUrl}: tree listing is truncated`)
    const files = tree.tree
      .filter((entry) => entry.type === 'blob' && entry.path.startsWith(source.file) && entry.path.endsWith('.json'))
      .sort((left, right) => left.path.localeCompare(right.path))
    const values = await Promise.all(files.map(async (entry) => {
      const url = `${RAW_BASE}/${PINS[source.pin]}/${entry.path}`
      return [entry.path, decode(jsonRecord, await getJson(url), url)] as const
    }))
    return Object.fromEntries(values)
  }

  const fetchSource = async (source: Source): Promise<unknown> => {
    if (source.kind === 'tree-record') return fetchTreeRecord(source)
    const url = `${RAW_BASE}/${PINS[source.pin]}/${source.file}`
    return getJson(url)
  }

  const ensure = async (name: GoldenName): Promise<{ readonly file: string, readonly kept: boolean }> => {
    const source = SOURCES[name]
    const file = `vanilla-${name}.json`
    const destination = join(options.out, file)
    const want = expected[name]
    const existing = await readIfPresent(destination)
    if (existing !== undefined && sha256(existing) === want) return { file, kept: true }

    const value = decode(source.kind === 'array' ? jsonArray : jsonRecord, await fetchSource(source), file)
    const text = canonicalJson(value)
    const actual = sha256(text)
    if (actual !== want) {
      throw new Error(`${file}: SHA-256 mismatch (expected ${want}, actual ${actual})`)
    }
    // Write beside the destination and rename, so a crash or a failed write
    // never leaves a partial file under the final name.
    const temporary = `${destination}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, text, 'utf8')
      await rename(temporary, destination)
    } finally {
      await rm(temporary, { force: true })
    }
    return { file, kept: false }
  }

  await mkdir(options.out, { recursive: true })
  // Settle every file before failing so one run reports all broken sources.
  const outcomes = await Promise.allSettled(GOLDEN_NAMES.map(ensure))
  const failures: Array<string> = []
  const fetched: Array<string> = []
  const kept: Array<string> = []
  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') failures.push(String(outcome.reason))
    else (outcome.value.kept ? kept : fetched).push(outcome.value.file)
  }
  if (failures.length > 0) throw new Error(`vanilla golden fetch failed:\n${failures.join('\n')}`)
  return { fetched, kept }
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { out: { type: 'string' } } })
  if (values.out === undefined) {
    process.stderr.write('usage: fetch-vanilla-golden.ts --out <directory>\n')
    process.exitCode = 1
  } else {
    await fetchVanillaGolden({ out: values.out, token: process.env['GITHUB_TOKEN'] }).then(
      (report) => {
        process.stdout.write(`fetched ${String(report.fetched.length)}, kept ${String(report.kept.length)} verified golden files\n`)
      },
      (cause: unknown) => {
        process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`)
        process.exitCode = 1
      },
    )
  }
}
