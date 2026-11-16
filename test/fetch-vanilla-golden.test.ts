import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  canonicalJson,
  fetchVanillaGolden,
  GOLDEN_NAMES,
  PINS,
  SOURCES,
  type Fetcher,
  type GoldenName,
} from '../scripts/fetch-vanilla-golden.js'

const RAW = 'https://raw.githubusercontent.com/misode/mcmeta'
const TREE_URL = `https://api.github.com/repos/misode/mcmeta/git/trees/${PINS.data}?recursive=1`
const BIOME_DIRECTORY = SOURCES.biome.file

const biomeBlobs: Readonly<Record<string, unknown>> = {
  [`${BIOME_DIRECTORY}plains.json`]: { temperature: 0.8, downfall: 0.4, has_precipitation: true },
  [`${BIOME_DIRECTORY}desert.json`]: { temperature: 2, downfall: 0, has_precipitation: false },
}

const tree = (truncated: boolean): unknown => ({
  truncated,
  tree: [
    ...Object.keys(biomeBlobs).map((path) => ({ path, type: 'blob' })),
    { path: BIOME_DIRECTORY.slice(0, -1), type: 'tree' },
    { path: `${BIOME_DIRECTORY}README.md`, type: 'blob' },
    { path: 'data/minecraft/worldgen/noise/overworld.json', type: 'blob' },
  ],
})

const upstream = (name: GoldenName): unknown =>
  SOURCES[name].kind === 'array' ? [`minecraft:${name}_b`, `minecraft:${name}_a`] : { [`${name}_b`]: { z: 1, a: [2, 1] }, [`${name}_a`]: 0 }

// What each golden file must contain after canonicalisation: arrays keep their
// order, object keys are sorted, and the biome tree becomes a record by path.
const canonicalOf = (name: GoldenName): string =>
  canonicalJson(name === 'biome' ? biomeBlobs : upstream(name))

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex')

const expectedHashes = (): Record<GoldenName, string> => ({
  biome: sha256(canonicalOf('biome')),
  block: sha256(canonicalOf('block')),
  'damage-type': sha256(canonicalOf('damage-type')),
  enchantment: sha256(canonicalOf('enchantment')),
  item: sha256(canonicalOf('item')),
  'mob-effect': sha256(canonicalOf('mob-effect')),
  recipe: sha256(canonicalOf('recipe')),
  tag: sha256(canonicalOf('tag')),
})

type Call = { readonly url: string, readonly headers: Readonly<Record<string, string>> }

const fakeUpstream = (options: { readonly truncated?: boolean, readonly failing?: string } = {}): {
  readonly fetcher: Fetcher
  readonly calls: Array<Call>
} => {
  const routes = new Map<string, unknown>([[TREE_URL, tree(options.truncated ?? false)]])
  for (const [path, value] of Object.entries(biomeBlobs)) routes.set(`${RAW}/${PINS.data}/${path}`, value)
  for (const name of GOLDEN_NAMES) {
    const source = SOURCES[name]
    if (source.kind !== 'tree-record') routes.set(`${RAW}/${PINS[source.pin]}/${source.file}`, upstream(name))
  }
  const calls: Array<Call> = []
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url, headers: init.headers })
    const body = routes.get(url)
    const status = url === options.failing || body === undefined ? 404 : 200
    return { ok: status === 200, status, text: async () => JSON.stringify(body) }
  }
  return { fetcher, calls }
}

const goldenFile = (name: GoldenName): string => `vanilla-${name}.json`

let out = ''

beforeEach(() => {
  out = mkdtempSync(join(tmpdir(), 'mc-kernel-golden-'))
})

afterEach(() => {
  rmSync(out, { recursive: true, force: true })
})

describe('fetchVanillaGolden', () => {
  it('writes every canonical file whose SHA-256 matches and sends the token only to the GitHub API', async () => {
    const upstreamFake = fakeUpstream()
    const report = await fetchVanillaGolden({
      out,
      fetcher: upstreamFake.fetcher,
      expected: expectedHashes(),
      token: 'test-token',
    })

    expect(report.kept).toEqual([])
    expect([...report.fetched].sort()).toEqual(GOLDEN_NAMES.map(goldenFile).sort())
    expect(readdirSync(out).sort()).toEqual(GOLDEN_NAMES.map(goldenFile).sort())
    for (const name of GOLDEN_NAMES) {
      expect(readFileSync(join(out, goldenFile(name)), 'utf8')).toBe(canonicalOf(name))
    }
    expect(Object.keys(JSON.parse(readFileSync(join(out, goldenFile('biome')), 'utf8')))).toEqual([
      `${BIOME_DIRECTORY}desert.json`,
      `${BIOME_DIRECTORY}plains.json`,
    ])

    const authorized = upstreamFake.calls.filter((call) => 'Authorization' in call.headers)
    expect(authorized).toEqual([{ url: TREE_URL, headers: { Authorization: 'Bearer test-token' } }])
    // One tree listing, two biome blobs, and the seven single-file sources.
    expect(upstreamFake.calls).toHaveLength(10)
  })

  it('does not refetch a file whose existing bytes already verify', async () => {
    await fetchVanillaGolden({ out, fetcher: fakeUpstream().fetcher, expected: expectedHashes() })
    const second = fakeUpstream()

    const report = await fetchVanillaGolden({ out, fetcher: second.fetcher, expected: expectedHashes() })

    expect(second.calls).toEqual([])
    expect(report.fetched).toEqual([])
    expect([...report.kept].sort()).toEqual(GOLDEN_NAMES.map(goldenFile).sort())
  })

  it('refetches and repairs an existing file whose bytes do not verify', async () => {
    await fetchVanillaGolden({ out, fetcher: fakeUpstream().fetcher, expected: expectedHashes() })
    writeFileSync(join(out, goldenFile('tag')), '{}\n')
    const second = fakeUpstream()

    const report = await fetchVanillaGolden({ out, fetcher: second.fetcher, expected: expectedHashes() })

    expect(report.fetched).toEqual([goldenFile('tag')])
    expect(second.calls.map((call) => call.url)).toEqual([`${RAW}/${PINS.summary}/${SOURCES.tag.file}`])
    expect(readFileSync(join(out, goldenFile('tag')), 'utf8')).toBe(canonicalOf('tag'))
  })

  it('rejects a SHA-256 mismatch with file, expected, and actual and leaves no destination file', async () => {
    const wrong = 'f'.repeat(64)
    const actual = sha256(canonicalOf('item'))

    await expect(fetchVanillaGolden({
      out,
      fetcher: fakeUpstream().fetcher,
      expected: { ...expectedHashes(), item: wrong },
    })).rejects.toThrow(`vanilla-item.json: SHA-256 mismatch (expected ${wrong}, actual ${actual})`)

    expect(readdirSync(out)).not.toContain(goldenFile('item'))
    expect(readdirSync(out).filter((file) => file.endsWith('.tmp'))).toEqual([])
  })

  it('rejects a truncated tree listing instead of writing a partial biome record', async () => {
    await expect(fetchVanillaGolden({
      out,
      fetcher: fakeUpstream({ truncated: true }).fetcher,
      expected: expectedHashes(),
    })).rejects.toThrow(`${TREE_URL}: tree listing is truncated`)

    expect(readdirSync(out)).not.toContain(goldenFile('biome'))
  })

  it('rejects an HTTP failure with the URL and status', async () => {
    const failing = `${RAW}/${PINS.registries}/${SOURCES['mob-effect'].file}`

    await expect(fetchVanillaGolden({
      out,
      fetcher: fakeUpstream({ failing }).fetcher,
      expected: expectedHashes(),
    })).rejects.toThrow(`${failing}: HTTP 404`)

    expect(readdirSync(out)).not.toContain(goldenFile('mob-effect'))
  })

  it('keeps at most the configured number of requests in flight', async () => {
    const upstreamFake = fakeUpstream()
    let active = 0
    let peak = 0
    const slow: Fetcher = async (url, init) => {
      active++
      peak = Math.max(peak, active)
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1)
      })
      active--
      return upstreamFake.fetcher(url, init)
    }

    await fetchVanillaGolden({ out, fetcher: slow, expected: expectedHashes(), concurrency: 2 })

    expect(peak).toBe(2)
  })
})
