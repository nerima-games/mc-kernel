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
    audioEnabled: source['audioEnabled'] === true,
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
    keyBindings: normaliseKeyBindings(source['keyBindings']),
  }
}

export const applySettings = (current: Settings, patch: Partial<Settings>): Settings =>
  normaliseSettings({ ...current, ...patch })

export const keyBindingFor = (settings: Settings, action: string): string | undefined =>
  settings.keyBindings[action]

export const bindKey = (settings: Settings, action: string, code: string): Settings => {
  if (action.length === 0 || code.length === 0) {
    return settings
  }
  return normaliseSettings({
    ...settings,
    keyBindings: { ...settings.keyBindings, [action]: code },
  })
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
    isValidKeyBindings(settings['keyBindings'])
  )
}
