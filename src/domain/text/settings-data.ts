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

export type Settings = Readonly<{
  renderDistance: number
  fovDegrees: number
  graphicsQuality: GraphicsQuality
  audioEnabled: boolean
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  mouseSensitivity: number
  /** Subtitle/caption display for sound cues. Merged in from mc-compose's PlayerSettingsV1. */
  captionsEnabled: boolean
  keyBindings: Readonly<Record<string, string>>
}>

export const DEFAULT_SETTINGS: Settings = {
  renderDistance: 5,
  fovDegrees: 75,
  graphicsQuality: 'medium',
  // Was `false`. Reconciled against mc-compose's PlayerSettingsV1, which shipped `true` to
  // real players. Vanilla Minecraft also starts with sound on, and the browser's autoplay
  // gate (no audio before a user gesture, regardless of this flag) already prevents an
  // unwanted cold-open blast — so `false` bought no safety, only a silent-by-default game
  // for anyone who never finds the settings menu.
  audioEnabled: true,
  masterVolume: 0.8,
  musicVolume: 0.55,
  sfxVolume: 1,
  // Was `0.5`. mc-compose's `sensitivity` (same [0.1, 3] range) defaulted to `1`, which is
  // the multiplier's identity value — no scaling of raw input. Vanilla Minecraft's own
  // sensitivity slider defaults to its midpoint, 100%, i.e. "unscaled"; `1` is the direct
  // translation of that into this range, and `0.5` had no stated rationale.
  mouseSensitivity: 1,
  // New: merged in from mc-compose's PlayerSettingsV1, defaulting on (matches compose and
  // is the accessible default).
  captionsEnabled: true,
  keyBindings: {},
}
