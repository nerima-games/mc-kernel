import {
  DEFAULT_SETTINGS,
  FieldOfViewDegrees,
  GRAPHICS_QUALITIES,
  InputAction,
  KeyCode,
  MAX_FOV_DEGREES,
  MAX_MOUSE_SENSITIVITY,
  MAX_RENDER_DISTANCE,
  MAX_VOLUME,
  MIN_FOV_DEGREES,
  MIN_MOUSE_SENSITIVITY,
  MIN_RENDER_DISTANCE,
  MIN_VOLUME,
  MouseSensitivity,
  RenderDistanceChunks,
  VolumeLevel,
} from './settings-data.js'
import type { Settings } from './settings-data.js'

export {
  DEFAULT_SETTINGS,
  FieldOfViewDegrees,
  GRAPHICS_QUALITIES,
  InputAction,
  KeyCode,
  MAX_FOV_DEGREES,
  MAX_MOUSE_SENSITIVITY,
  MAX_RENDER_DISTANCE,
  MAX_VOLUME,
  MIN_FOV_DEGREES,
  MIN_MOUSE_SENSITIVITY,
  MIN_RENDER_DISTANCE,
  MIN_VOLUME,
  MouseSensitivity,
  RenderDistanceChunks,
  VolumeLevel,
} from './settings-data.js'
export type { GraphicsQuality, Settings } from './settings-data.js'

export const normaliseKeyBindings = (
  bindings: unknown,
): Readonly<Record<InputAction, KeyCode>> => {
  if (typeof bindings !== 'object' || bindings === null || Array.isArray(bindings)) {
    return {}
  }

  const normalised: Record<InputAction, KeyCode> = {}
  for (const [action, code] of Object.entries(bindings)) {
    if (InputAction.is(action) && typeof code === 'string' && KeyCode.is(code)) {
      normalised[action] = code
    }
  }
  return normalised
}

export const normaliseSettings = (settings: unknown): Settings => {
  const valueAt = (key: string): unknown =>
    typeof settings === 'object' && settings !== null && !Array.isArray(settings)
      ? Reflect.get(settings, key)
      : undefined
  const audioEnabled = valueAt('audioEnabled')
  const captionsEnabled = valueAt('captionsEnabled')
  const clamp = (value: unknown, minimum: number, maximum: number, fallback: number): number => {
    const number = typeof value === 'number' && !Number.isNaN(value) ? value : fallback
    return Math.min(maximum, Math.max(minimum, number))
  }
  const graphicsQuality = GRAPHICS_QUALITIES.find((quality) => quality === valueAt('graphicsQuality'))
  return {
    renderDistance: RenderDistanceChunks(
      Math.floor(
        clamp(
          valueAt('renderDistance'),
          MIN_RENDER_DISTANCE,
          MAX_RENDER_DISTANCE,
          DEFAULT_SETTINGS.renderDistance,
        ),
      ),
    ),
    fovDegrees: FieldOfViewDegrees(
      clamp(
        valueAt('fovDegrees'),
        MIN_FOV_DEGREES,
        MAX_FOV_DEGREES,
        DEFAULT_SETTINGS.fovDegrees,
      ),
    ),
    graphicsQuality: graphicsQuality ?? DEFAULT_SETTINGS.graphicsQuality,
    audioEnabled: typeof audioEnabled === 'boolean'
      ? audioEnabled
      : DEFAULT_SETTINGS.audioEnabled,
    masterVolume: VolumeLevel(
      clamp(
        valueAt('masterVolume'),
        MIN_VOLUME,
        MAX_VOLUME,
        DEFAULT_SETTINGS.masterVolume,
      ),
    ),
    musicVolume: VolumeLevel(
      clamp(
        valueAt('musicVolume'),
        MIN_VOLUME,
        MAX_VOLUME,
        DEFAULT_SETTINGS.musicVolume,
      ),
    ),
    sfxVolume: VolumeLevel(
      clamp(
        valueAt('sfxVolume'),
        MIN_VOLUME,
        MAX_VOLUME,
        DEFAULT_SETTINGS.sfxVolume,
      ),
    ),
    mouseSensitivity: MouseSensitivity(
      clamp(
        valueAt('mouseSensitivity'),
        MIN_MOUSE_SENSITIVITY,
        MAX_MOUSE_SENSITIVITY,
        DEFAULT_SETTINGS.mouseSensitivity,
      ),
    ),
    captionsEnabled: typeof captionsEnabled === 'boolean'
      ? captionsEnabled
      : DEFAULT_SETTINGS.captionsEnabled,
    keyBindings: normaliseKeyBindings(valueAt('keyBindings')),
  }
}

/**
 * Binds an action to a code and swaps with any action already using that code.
 *
 * The record is sparse, so a missing action is unbound. Kernel defines no fixed action
 * vocabulary for default bindings. If the rebound action has no old code, this operation
 * removes the conflicting binding. Callers that need dense bindings supply their own
 * default code before calling this function.
 */
export const rebindKey = (settings: Settings, action: InputAction, code: KeyCode): Settings => {
  if (
    typeof action !== 'string' ||
    typeof code !== 'string' ||
    !InputAction.is(action) ||
    !KeyCode.is(code)
  ) {
    return settings
  }
  const bindings = settings.keyBindings
  const previousCode = bindings[action]
  const conflictingAction = Object.entries(bindings).find(
    ([candidate, boundCode]) => candidate !== action && boundCode === code,
  )?.[0]

  const nextBindings: Record<string, KeyCode> = { ...bindings, [action]: code }
  if (conflictingAction !== undefined) {
    if (previousCode === undefined) {
      delete nextBindings[conflictingAction]
    } else {
      nextBindings[conflictingAction] = previousCode
    }
  }

  return { ...settings, keyBindings: normaliseKeyBindings(nextBindings) }
}

export const unbindKey = (settings: Settings, action: InputAction): Settings => {
  if (typeof action !== 'string' || !InputAction.is(action) || !(action in settings.keyBindings)) {
    return settings
  }
  const keyBindings = { ...settings.keyBindings }
  delete keyBindings[action]
  return { ...settings, keyBindings: normaliseKeyBindings(keyBindings) }
}
