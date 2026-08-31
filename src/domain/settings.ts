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
import type { GraphicsQuality, Settings } from './settings-data.js'

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

type UnknownRecord = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isGraphicsQuality = (value: unknown): value is GraphicsQuality =>
  GRAPHICS_QUALITIES.some((quality) => quality === value)

const hasMagnitude = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value)

const clampWithDefault = (
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
): number => {
  if (!hasMagnitude(value)) {
    return fallback
  }
  return Math.min(maximum, Math.max(minimum, value))
}

const normaliseKeyBindings = (bindings: unknown): Readonly<Record<string, string>> => {
  if (!isRecord(bindings)) {
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
  const source: UnknownRecord = isRecord(settings) ? settings : {}
  return {
    renderDistance: Math.floor(
      clampWithDefault(
        source['renderDistance'],
        MIN_RENDER_DISTANCE,
        MAX_RENDER_DISTANCE,
        DEFAULT_SETTINGS.renderDistance,
      ),
    ),
    fovDegrees: clampWithDefault(
      source['fovDegrees'],
      MIN_FOV_DEGREES,
      MAX_FOV_DEGREES,
      DEFAULT_SETTINGS.fovDegrees,
    ),
    graphicsQuality: isGraphicsQuality(source['graphicsQuality'])
      ? source['graphicsQuality']
      : DEFAULT_SETTINGS.graphicsQuality,
    audioEnabled: typeof source['audioEnabled'] === 'boolean'
      ? source['audioEnabled']
      : DEFAULT_SETTINGS.audioEnabled,
    masterVolume: clampWithDefault(
      source['masterVolume'],
      MIN_VOLUME,
      MAX_VOLUME,
      DEFAULT_SETTINGS.masterVolume,
    ),
    musicVolume: clampWithDefault(
      source['musicVolume'],
      MIN_VOLUME,
      MAX_VOLUME,
      DEFAULT_SETTINGS.musicVolume,
    ),
    sfxVolume: clampWithDefault(
      source['sfxVolume'],
      MIN_VOLUME,
      MAX_VOLUME,
      DEFAULT_SETTINGS.sfxVolume,
    ),
    mouseSensitivity: clampWithDefault(
      source['mouseSensitivity'],
      MIN_MOUSE_SENSITIVITY,
      MAX_MOUSE_SENSITIVITY,
      DEFAULT_SETTINGS.mouseSensitivity,
    ),
    captionsEnabled: typeof source['captionsEnabled'] === 'boolean'
      ? source['captionsEnabled']
      : DEFAULT_SETTINGS.captionsEnabled,
    keyBindings: normaliseKeyBindings(source['keyBindings']),
  }
}

export const applySettings = (current: Settings, patch: Partial<Settings>): Settings =>
  normaliseSettings({ ...current, ...patch })

export const keyBindingFor = (settings: Settings, action: string): string | undefined =>
  settings.keyBindings[action]

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

  return normaliseSettings({ ...settings, keyBindings: nextBindings })
}

export const unbindKey = (settings: Settings, action: string): Settings => {
  if (!(action in settings.keyBindings)) {
    return settings
  }
  const keyBindings = { ...settings.keyBindings }
  delete keyBindings[action]
  return normaliseSettings({ ...settings, keyBindings })
}

const isFiniteInRange = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum

const isIntegerInRange = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum

const isValidKeyBindings = (value: unknown): value is Readonly<Record<string, string>> => {
  if (!isRecord(value)) {
    return false
  }
  return Object.entries(value).every(
    ([action, code]) => action.length > 0 && typeof code === 'string' && code.length > 0,
  )
}

export const isValidSettings = (settings: unknown): settings is Settings => {
  if (!isRecord(settings)) {
    return false
  }
  return (
    isIntegerInRange(settings['renderDistance'], MIN_RENDER_DISTANCE, MAX_RENDER_DISTANCE) &&
    isFiniteInRange(settings['fovDegrees'], MIN_FOV_DEGREES, MAX_FOV_DEGREES) &&
    isGraphicsQuality(settings['graphicsQuality']) &&
    typeof settings['audioEnabled'] === 'boolean' &&
    isFiniteInRange(settings['masterVolume'], MIN_VOLUME, MAX_VOLUME) &&
    isFiniteInRange(settings['musicVolume'], MIN_VOLUME, MAX_VOLUME) &&
    isFiniteInRange(settings['sfxVolume'], MIN_VOLUME, MAX_VOLUME) &&
    isFiniteInRange(settings['mouseSensitivity'], MIN_MOUSE_SENSITIVITY, MAX_MOUSE_SENSITIVITY) &&
    typeof settings['captionsEnabled'] === 'boolean' &&
    isValidKeyBindings(settings['keyBindings'])
  )
}
