import {
  DEFAULT_SETTINGS,
  GRAPHICS_QUALITIES,
  MAX_FOV_DEGREES,
  MAX_MOUSE_SENSITIVITY,
  MAX_RENDER_DISTANCE,
  MAX_VOLUME,
  MIN_FOV_DEGREES,
  MIN_MOUSE_SENSITIVITY,
  MIN_RENDER_DISTANCE,
  MIN_VOLUME,
} from './settings-data.js'
import type { Settings } from './settings-data.js'

export {
  DEFAULT_SETTINGS,
  GRAPHICS_QUALITIES,
  MAX_FOV_DEGREES,
  MAX_MOUSE_SENSITIVITY,
  MAX_RENDER_DISTANCE,
  MAX_VOLUME,
  MIN_FOV_DEGREES,
  MIN_MOUSE_SENSITIVITY,
  MIN_RENDER_DISTANCE,
  MIN_VOLUME,
} from './settings-data.js'
export type { GraphicsQuality, Settings } from './settings-data.js'

export const normaliseKeyBindings = (bindings: unknown): Readonly<Record<string, string>> => {
  if (typeof bindings !== 'object' || bindings === null || Array.isArray(bindings)) {
    return {}
  }

  const normalised: Record<string, string> = {}
  for (const [action, code] of Object.entries(bindings)) {
    if (action.length > 0 && typeof code === 'string' && code.length > 0) {
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
    renderDistance: Math.floor(
      clamp(
        valueAt('renderDistance'),
        MIN_RENDER_DISTANCE,
        MAX_RENDER_DISTANCE,
        DEFAULT_SETTINGS.renderDistance,
      ),
    ),
    fovDegrees: clamp(
      valueAt('fovDegrees'),
      MIN_FOV_DEGREES,
      MAX_FOV_DEGREES,
      DEFAULT_SETTINGS.fovDegrees,
    ),
    graphicsQuality: graphicsQuality ?? DEFAULT_SETTINGS.graphicsQuality,
    audioEnabled: typeof audioEnabled === 'boolean'
      ? audioEnabled
      : DEFAULT_SETTINGS.audioEnabled,
    masterVolume: clamp(
      valueAt('masterVolume'),
      MIN_VOLUME,
      MAX_VOLUME,
      DEFAULT_SETTINGS.masterVolume,
    ),
    musicVolume: clamp(
      valueAt('musicVolume'),
      MIN_VOLUME,
      MAX_VOLUME,
      DEFAULT_SETTINGS.musicVolume,
    ),
    sfxVolume: clamp(
      valueAt('sfxVolume'),
      MIN_VOLUME,
      MAX_VOLUME,
      DEFAULT_SETTINGS.sfxVolume,
    ),
    mouseSensitivity: clamp(
      valueAt('mouseSensitivity'),
      MIN_MOUSE_SENSITIVITY,
      MAX_MOUSE_SENSITIVITY,
      DEFAULT_SETTINGS.mouseSensitivity,
    ),
    captionsEnabled: typeof captionsEnabled === 'boolean'
      ? captionsEnabled
      : DEFAULT_SETTINGS.captionsEnabled,
    keyBindings: normaliseKeyBindings(valueAt('keyBindings')),
  }
}

/**
 * Binds `action` to `code`, swapping with whichever other action currently holds `code`
 * rather than overwriting it. Renamed from the removed `bindKey`, whose plain-overwrite
 * semantics let two actions collide on one code (press the key, both fire) — merged in
 * from mc-compose's `rebindPlayerSettings`, which is what a real rebind screen needs.
 *
 * `keyBindings` here is a sparse `Record<string, string>` (an action absent from it is
 * simply unbound), unlike mc-compose's `Bindings`, which is dense over every `InputAction`
 * because it always starts from `DEFAULT_BINDINGS`. Kernel has no fixed action vocabulary
 * to seed a dense default from — mc-render owns that — so the swap falls back to
 * *unbinding* the conflicting action when `action` had no previous code to give it, which
 * keeps codes unique without inventing an action-to-default-code table kernel doesn't own.
 * A caller that wants "always dense" (never let a swap leave an action unbound) supplies
 * its own default code as the fallback before calling this.
 */
export const rebindKey = (settings: Settings, action: string, code: string): Settings => {
  if (action.length === 0 || code.length === 0) {
    return settings
  }
  const bindings = settings.keyBindings
  const previousCode = bindings[action]
  const conflictingAction = Object.keys(bindings).find(
    (candidate) => candidate !== action && bindings[candidate] === code,
  )

  const nextBindings: Record<string, string> = { ...bindings, [action]: code }
  if (conflictingAction !== undefined) {
    if (previousCode === undefined) {
      delete nextBindings[conflictingAction]
    } else {
      nextBindings[conflictingAction] = previousCode
    }
  }

  return { ...settings, keyBindings: normaliseKeyBindings(nextBindings) }
}

export const unbindKey = (settings: Settings, action: string): Settings => {
  if (!(action in settings.keyBindings)) {
    return settings
  }
  const keyBindings = { ...settings.keyBindings }
  delete keyBindings[action]
  return { ...settings, keyBindings: normaliseKeyBindings(keyBindings) }
}
