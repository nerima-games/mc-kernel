import { describe, expect, it } from 'vitest'
import { LightVolumeHeight } from '../src/domain/block/light-data'
import { MAX_CHUNK_HEIGHT } from '../src/domain/world/chunk'
import { resultFailure } from './block-result-helpers'

describe('LightVolumeHeight', () => {
  it('reports an invalid height below the supported range', () => {
    expect(resultFailure(LightVolumeHeight(0))).toStrictEqual({
      _tag: 'LightVolumeFailure',
      reason: 'invalid-height',
      message: `Light volume height must be an integer in [1, ${MAX_CHUNK_HEIGHT}], received 0`,
    })
  })
})
