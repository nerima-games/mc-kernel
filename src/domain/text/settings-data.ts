import { Brand } from 'effect'

export const GRAPHICS_QUALITIES = ['low', 'medium', 'high', 'ultra'] as const

export type GraphicsQuality = (typeof GRAPHICS_QUALITIES)[number]

export const MIN_RENDER_DISTANCE = 2
export const MAX_RENDER_DISTANCE = 16
export const MIN_FOV_DEGREES = 30
export const MAX_FOV_DEGREES = 110
export const MIN_MOUSE_SENSITIVITY = 0.1
export const MAX_MOUSE_SENSITIVITY = 3
export const MIN_VOLUME = 0
export const MAX_VOLUME = 1

export type RenderDistanceChunks = number & Brand.Brand<'RenderDistanceChunks'>
export const RenderDistanceChunks: Brand.Constructor<RenderDistanceChunks> =
  Brand.make<RenderDistanceChunks>((value) =>
    Number.isInteger(value) && value >= MIN_RENDER_DISTANCE && value <= MAX_RENDER_DISTANCE
      ? true
      : `RenderDistanceChunks must be an integer from ${MIN_RENDER_DISTANCE} to ${MAX_RENDER_DISTANCE}, received ${value}`,
  )

export type FieldOfViewDegrees = number & Brand.Brand<'FieldOfViewDegrees'>
export const FieldOfViewDegrees: Brand.Constructor<FieldOfViewDegrees> =
  Brand.make<FieldOfViewDegrees>((value) =>
    Number.isFinite(value) && value >= MIN_FOV_DEGREES && value <= MAX_FOV_DEGREES
      ? true
      : `FieldOfViewDegrees must be between ${MIN_FOV_DEGREES} and ${MAX_FOV_DEGREES}, received ${value}`,
  )

export type VolumeLevel = number & Brand.Brand<'VolumeLevel'>
export const VolumeLevel: Brand.Constructor<VolumeLevel> =
  Brand.make<VolumeLevel>((value) =>
    Number.isFinite(value) && value >= MIN_VOLUME && value <= MAX_VOLUME
      ? true
      : `VolumeLevel must be between ${MIN_VOLUME} and ${MAX_VOLUME}, received ${value}`,
  )

export type MouseSensitivity = number & Brand.Brand<'MouseSensitivity'>
export const MouseSensitivity: Brand.Constructor<MouseSensitivity> =
  Brand.make<MouseSensitivity>((value) =>
    Number.isFinite(value) && value >= MIN_MOUSE_SENSITIVITY && value <= MAX_MOUSE_SENSITIVITY
      ? true
      : `MouseSensitivity must be between ${MIN_MOUSE_SENSITIVITY} and ${MAX_MOUSE_SENSITIVITY}, received ${value}`,
  )

export type InputAction = string & Brand.Brand<'InputAction'>
export const InputAction: Brand.Constructor<InputAction> = Brand.make<InputAction>(
  (value) =>
    value.trim().length > 0
      ? true
      : `InputAction must be a non-blank string, received ${JSON.stringify(value)}`,
)

export type KeyCode = string & Brand.Brand<'KeyCode'>
export const KeyCode: Brand.Constructor<KeyCode> = Brand.make<KeyCode>(
  (value) =>
    value.trim().length > 0
      ? true
      : `KeyCode must be a non-blank string, received ${JSON.stringify(value)}`,
)

export type Settings = Readonly<{
  renderDistance: RenderDistanceChunks
  fovDegrees: FieldOfViewDegrees
  graphicsQuality: GraphicsQuality
  audioEnabled: boolean
  masterVolume: VolumeLevel
  musicVolume: VolumeLevel
  sfxVolume: VolumeLevel
  mouseSensitivity: MouseSensitivity
  /** Subtitle/caption display for sound cues. Merged in from mc-compose's PlayerSettingsV1. */
  captionsEnabled: boolean
  keyBindings: Readonly<Record<InputAction, KeyCode>>
}>

export const DEFAULT_SETTINGS: Settings = {
  renderDistance: RenderDistanceChunks(5),
  fovDegrees: FieldOfViewDegrees(75),
  graphicsQuality: 'medium',
  // Was `false`. Reconciled against mc-compose's PlayerSettingsV1, which shipped `true` to
  // real players. Vanilla Minecraft also starts with sound on, and the browser's autoplay
  // gate (no audio before a user gesture, regardless of this flag) already prevents an
  // unwanted cold-open blast — so `false` bought no safety, only a silent-by-default game
  // for anyone who never finds the settings menu.
  audioEnabled: true,
  masterVolume: VolumeLevel(0.8),
  musicVolume: VolumeLevel(0.55),
  sfxVolume: VolumeLevel(1),
  // Was `0.5`. mc-compose's `sensitivity` (same [0.1, 3] range) defaulted to `1`, which is
  // the multiplier's identity value — no scaling of raw input. Vanilla Minecraft's own
  // sensitivity slider defaults to its midpoint, 100%, i.e. "unscaled"; `1` is the direct
  // translation of that into this range, and `0.5` had no stated rationale.
  mouseSensitivity: MouseSensitivity(1),
  // New: merged in from mc-compose's PlayerSettingsV1, defaulting on (matches compose and
  // is the accessible default).
  captionsEnabled: true,
  keyBindings: {},
}
