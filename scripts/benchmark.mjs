import { performance } from 'node:perf_hooks'

import {
  AnvilCustomName,
  AnvilEnchantmentId,
  compileAnvilRuleSet,
  decodeAnvilSnapshotString,
  encodeAnvilSnapshot,
  planAnvil,
} from '../dist/domain/anvil.js'
import {
  BLOCK_ID_MAX,
  BLOCK_IDS,
  capabilityOfBlockId,
  isKnownBlockId,
  isSupportSensitiveBlockId,
  lightEmissionOfBlockId,
  opacityOfBlockId,
  propertyOfBlockId,
  transmitsLight,
} from '../dist/domain/block-registry.js'
import { BYTES_PER_ELEMENT as BLOCK_STATE_BYTES_PER_ELEMENT, BlockState } from '../dist/domain/block-state.js'
import { CHUNK_HEADER_BYTES, chunk, decodeChunk, encodeChunk } from '../dist/domain/chunk.js'

const SAMPLE_COUNT = 9
const REGISTRY_QUERY_COUNT = 1 << 15
const BLOCK_STATE_BYTE_COUNT = 16 * 16 * 256
const ITERATIONS = 20

const propertyNames = [
  'opacity',
  'lightEmission',
  'fluid',
  'collisionShape',
  'renderKind',
  'footstepMaterial',
  'hardness',
  'friction',
  'contactDamage',
  'movementDrag',
  'xpOnBreak',
  'railKind',
]

if (BLOCK_IDS.length === 0 || BLOCK_ID_MAX < 0) {
  throw new Error('The benchmark requires a non-empty block registry')
}

const queryBytes = new Uint8Array(REGISTRY_QUERY_COUNT)
for (let index = 0; index < queryBytes.length; index += 1) {
  queryBytes[index] = index & BLOCK_ID_MAX
}

const blockBytes = new Uint8Array(BLOCK_STATE_BYTE_COUNT)
for (let index = 0; index < blockBytes.length; index += 1) {
  blockBytes[index] = BLOCK_IDS[(index * 17) % BLOCK_IDS.length]
}

const chunkValue = chunk({ cx: 0, cz: 0 }, 256, blockBytes)
const encodedChunk = encodeChunk(chunkValue)

const anvilRules = {
  enchantments: [
    {
      id: AnvilEnchantmentId('sharpness'),
      maxLevel: 5,
      applicableItems: ['iron_sword'],
      incompatibleWith: [],
      costPerLevel: 1,
    },
    {
      id: AnvilEnchantmentId('unbreaking'),
      maxLevel: 3,
      applicableItems: ['iron_sword'],
      incompatibleWith: [],
      costPerLevel: 2,
    },
  ],
}

const compiledAnvilRules = compileAnvilRuleSet(anvilRules)
if (!compiledAnvilRules.ok) {
  throw new Error('The benchmark requires valid anvil rules')
}

const anvilState = {
  left: {
    item: 'iron_sword',
    durability: { current: 100, max: 250 },
    enchantments: [
      { id: AnvilEnchantmentId('sharpness'), level: 2 },
      { id: AnvilEnchantmentId('unbreaking'), level: 1 },
    ],
    repairCost: 4,
    customName: AnvilCustomName('Battle sword'),
  },
  right: {
    payload: {
      item: 'iron_sword',
      durability: { current: 180, max: 250 },
      enchantments: [
        { id: AnvilEnchantmentId('sharpness'), level: 2 },
        { id: AnvilEnchantmentId('unbreaking'), level: 1 },
      ],
      repairCost: 2,
      customName: null,
    },
    count: 1,
  },
  rename: null,
  experienceLevels: 30,
}

const encodedAnvilSnapshot = encodeAnvilSnapshot(anvilState)
if (!encodedAnvilSnapshot.ok) {
  throw new Error('The benchmark requires a valid anvil snapshot')
}

const anvilSnapshotChecksum = (snapshot) => {
  const { left, right } = snapshot.state
  return (
    snapshot.version +
    snapshot.state.experienceLevels +
    (left?.repairCost ?? 0) +
    (left?.enchantments.length ?? 0) +
    (right?.count ?? 0) +
    (right?.payload.enchantments.length ?? 0)
  )
}

const registryQueries = () => {
  let checksum = 0

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    for (let index = 0; index < queryBytes.length; index += 1) {
      const id = queryBytes[index]
      const property = propertyOfBlockId(id, propertyNames[index % propertyNames.length])
      checksum += isKnownBlockId(id) ? 1 : 0
      checksum += capabilityOfBlockId(id, 'passable') ? 3 : 5
      checksum += typeof property === 'number' ? property : property.length
      checksum += opacityOfBlockId(id) === 'opaque' ? 7 : 11
      checksum += lightEmissionOfBlockId(id)
      checksum += transmitsLight(id) ? 13 : 17
      checksum += isSupportSensitiveBlockId(id) ? 19 : 23
    }
  }

  return checksum
}

const blockStateConstruction = () => {
  // copyTo writes wire bytes (BLOCK_STATE_BYTES_PER_ELEMENT bytes per
  // element, little-endian), not one byte per element, so the destination
  // must be sized in bytes: blockBytes.length is an element count.
  const target = new Uint8Array(blockBytes.length * BLOCK_STATE_BYTES_PER_ELEMENT)
  let checksum = 0

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const state = BlockState.fromBytes(blockBytes)
    state.copyTo(target)
    checksum += target[(iteration * 17) % target.length]
  }

  return checksum
}

const chunkEncoding = () => {
  let checksum = 0

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const encoded = encodeChunk(chunkValue)
    checksum += encoded[CHUNK_HEADER_BYTES + ((iteration * 17) % blockBytes.length)]
  }

  return checksum
}

const chunkDecoding = () => {
  let checksum = 0

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const decoded = decodeChunk(encodedChunk)
    checksum += decoded.blocks.get((iteration * 17) % decoded.blocks.length)
  }

  return checksum
}

const chunkRoundTrip = () => {
  let checksum = 0

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const decoded = decodeChunk(encodeChunk(chunkValue))
    checksum += decoded.blocks.get((iteration * 17) % decoded.blocks.length)
  }

  return checksum
}

const anvilSnapshotEncoding = () => {
  let checksum = 0

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const encoded = encodeAnvilSnapshot(anvilState)
    if (!encoded.ok) throw new Error('The benchmark produced an invalid anvil snapshot')
    checksum += encoded.encoded.length + anvilSnapshotChecksum(encoded.snapshot)
  }

  return checksum
}

const anvilSnapshotDecoding = () => {
  let checksum = 0

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const decoded = decodeAnvilSnapshotString(encodedAnvilSnapshot.encoded)
    if (!decoded.ok) throw new Error('The benchmark failed to decode anvil snapshot')
    checksum += anvilSnapshotChecksum(decoded.snapshot)
  }

  return checksum
}

const anvilPlanning = () => {
  let checksum = 0

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const plan = planAnvil(anvilState, compiledAnvilRules.rules)
    if (!plan.ok) throw new Error('The benchmark produced an invalid anvil plan')
    checksum += plan.levelCost + plan.materialCost
    checksum += plan.output.enchantments.reduce((total, enchantment) => total + enchantment.level, 0)
  }

  return checksum
}

const benchmark = (name, run) => {
  const expectedChecksum = run()
  const samples = []

  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const startedAt = performance.now()
    const checksum = run()
    const elapsed = performance.now() - startedAt
    if (checksum !== expectedChecksum) {
      throw new Error(`${name} produced a non-deterministic checksum`)
    }
    samples.push(elapsed)
  }

  samples.sort((left, right) => left - right)
  return {
    checksum: expectedChecksum,
    maxMs: samples[samples.length - 1],
    medianMs: samples[Math.floor(samples.length / 2)],
    minMs: samples[0],
  }
}

console.log(
  JSON.stringify({
    iterations: ITERATIONS,
    registryQueryCount: queryBytes.length,
    blockStateByteCount: blockBytes.length,
    results: {
      anvilPlanning: benchmark('anvil-planning', anvilPlanning),
      anvilSnapshotDecoding: benchmark('anvil-snapshot-decoding', anvilSnapshotDecoding),
      anvilSnapshotEncoding: benchmark('anvil-snapshot-encoding', anvilSnapshotEncoding),
      blockStateConstruction: benchmark('block-state-construction', blockStateConstruction),
      chunkDecoding: benchmark('chunk-decoding', chunkDecoding),
      chunkEncoding: benchmark('chunk-encoding', chunkEncoding),
      chunkRoundTrip: benchmark('chunk-round-trip', chunkRoundTrip),
      registryQueries: benchmark('registry-queries', registryQueries),
    },
  }),
)
