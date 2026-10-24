import {
  FieldOfViewDegrees,
  InputAction,
  KeyCode,
  RenderDistanceChunks,
  VolumeLevel,
  DEFAULT_SETTINGS,
  type Settings,
} from '../src/domain/text/settings'
import { VanillaResourcePath, vanillaId } from '../src/domain/text/identifiers'

const renderDistance: ReturnType<typeof RenderDistanceChunks> = RenderDistanceChunks(5)
const fieldOfView: ReturnType<typeof FieldOfViewDegrees> = FieldOfViewDegrees(75)
const volume: ReturnType<typeof VolumeLevel> = VolumeLevel(0.5)
const inputAction: ReturnType<typeof InputAction> = InputAction('jump')
const keyCode: ReturnType<typeof KeyCode> = KeyCode('Space')
const vanillaResourcePath: ReturnType<typeof VanillaResourcePath> = VanillaResourcePath('blocks/stone')

// @ts-expect-error Render distance and field of view are different quantities.
export const fieldOfViewFromRenderDistance: typeof fieldOfView = renderDistance

// @ts-expect-error A volume level is not a render distance.
export const renderDistanceFromVolume: typeof renderDistance = volume

// @ts-expect-error Input actions and keyboard codes are distinct string brands.
export const actionFromCode: typeof inputAction = keyCode

// @ts-expect-error A raw string is not a validated input action.
export const rawInputAction: typeof inputAction = 'jump'

// @ts-expect-error vanillaId requires an unqualified resource path brand.
export const rawVanillaId: ReturnType<typeof vanillaId> = vanillaId('arrow')

// @ts-expect-error A settings field retains its numeric brand at the public boundary.
export const rawFieldValue: Settings['fovDegrees'] = 75

export const settingsWithRawField: Settings = {
  ...DEFAULT_SETTINGS,
  // @ts-expect-error A raw number cannot replace a branded setting.
  fovDegrees: 75,
}

export const vanillaIdFromBrand: ReturnType<typeof vanillaId> = vanillaId(vanillaResourcePath)
