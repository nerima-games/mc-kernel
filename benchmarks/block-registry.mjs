import { performance } from 'node:perf_hooks'

import {
  capabilityOfBlockId,
  lightEmissionOfBlockId,
  opacityOfBlockId,
  transmitsLight,
} from '../dist/index.js'

const SAMPLE_SIZE = 1 << 16
const PASSES = 2_000
const blockIds = new Uint8Array(SAMPLE_SIZE)

for (let index = 0; index < blockIds.length; index += 1) {
  blockIds[index] = index % 120
}

const run = (label, read) => {
  let checksum = 0

  for (let pass = 0; pass < 50; pass += 1) {
    for (const id of blockIds) {
      checksum += read(id)
    }
  }

  const startedAt = performance.now()
  for (let pass = 0; pass < PASSES; pass += 1) {
    for (const id of blockIds) {
      checksum += read(id)
    }
  }
  const elapsedSeconds = (performance.now() - startedAt) / 1_000
  const readsPerSecond = (SAMPLE_SIZE * PASSES) / elapsedSeconds

  console.log(`${label}: ${Math.round(readsPerSecond).toLocaleString('en-US')} reads/s (checksum ${checksum})`)
}

run('capability', (id) => Number(capabilityOfBlockId(id, 'passable')))
run('opacity', (id) => opacityOfBlockId(id).length)
run('light emission', lightEmissionOfBlockId)
run('light transmission', (id) => Number(transmitsLight(id)))
