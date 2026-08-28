import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  GRAPHICS_QUALITIES,
  applySettings,
  bindKey,
  isGraphicsQuality,
  isValidSettings,
  keyBindingFor,
  normaliseSettings,
  unbindKey,
  type Settings,
} from '../src/domain/settings'

describe('settings', () => {
  it('defines the graphics quality vocabulary and defaults', () => {
    expect(GRAPHICS_QUALITIES).toEqual(['low', 'medium', 'high', 'ultra'])
    expect(DEFAULT_SETTINGS).toEqual({
      renderDistance: 5,
      fovDegrees: 75,
      graphicsQuality: 'medium',
      audioEnabled: false,
      masterVolume: 0.8,
      musicVolume: 0.55,
      sfxVolume: 1,
      mouseSensitivity: 0.5,
      keyBindings: {},
    })
    expect(isGraphicsQuality('ultra')).toBe(true)
    expect(isGraphicsQuality('cinematic')).toBe(false)
    expect(isGraphicsQuality(null)).toBe(false)
  })

  it('normalises malformed and out-of-range input without assertions', () => {
    expect(normaliseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(normaliseSettings([])).toEqual(DEFAULT_SETTINGS)
    expect(normaliseSettings({})).toEqual(DEFAULT_SETTINGS)

    expect(
      normaliseSettings({
        renderDistance: 20.9,
        fovDegrees: 20,
        graphicsQuality: 'cinematic',
        audioEnabled: 'true',
        masterVolume: -1,
        musicVolume: 2,
        sfxVolume: Number.POSITIVE_INFINITY,
        mouseSensitivity: Number.NaN,
        keyBindings: {
          jump: 'Space',
          empty: '',
          bad: 4,
          '': 'KeyX',
        },
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      renderDistance: 16,
      fovDegrees: 30,
      masterVolume: 0,
      musicVolume: 1,
      sfxVolume: 1,
      keyBindings: { jump: 'Space' },
    })

    expect(normaliseSettings({ audioEnabled: true, keyBindings: [] }).audioEnabled).toBe(true)
  })

  it('applies bindings and settings immutably', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      keyBindings: { jump: 'Space', sneak: 'ShiftLeft' },
    }

    expect(keyBindingFor(settings, 'jump')).toBe('Space')
    expect(keyBindingFor(settings, 'missing')).toBeUndefined()
    expect(bindKey(settings, '', 'KeyA')).toBe(settings)
    expect(bindKey(settings, 'jump', '')).toBe(settings)

    const bound = bindKey(settings, 'sprint', 'KeyW')
    expect(bound.keyBindings).toEqual({ jump: 'Space', sneak: 'ShiftLeft', sprint: 'KeyW' })
    expect(unbindKey(bound, 'missing')).toBe(bound)

    const unbound = unbindKey(bound, 'jump')
    expect(unbound.keyBindings).toEqual({ sneak: 'ShiftLeft', sprint: 'KeyW' })
    expect(applySettings(settings, { renderDistance: 40 }).renderDistance).toBe(16)
    expect(applySettings(settings, { audioEnabled: true }).audioEnabled).toBe(true)
  })

  it('validates the complete settings shape', () => {
    expect(isValidSettings(DEFAULT_SETTINGS)).toBe(true)

    const invalidSettings: unknown[] = [
      null,
      [],
      { ...DEFAULT_SETTINGS, renderDistance: '5' },
      { ...DEFAULT_SETTINGS, renderDistance: 2.5 },
      { ...DEFAULT_SETTINGS, renderDistance: 1 },
      { ...DEFAULT_SETTINGS, fovDegrees: '75' },
      { ...DEFAULT_SETTINGS, fovDegrees: Number.NaN },
      { ...DEFAULT_SETTINGS, fovDegrees: 29 },
      { ...DEFAULT_SETTINGS, graphicsQuality: 'cinematic' },
      { ...DEFAULT_SETTINGS, audioEnabled: 'false' },
      { ...DEFAULT_SETTINGS, masterVolume: Number.NaN },
      { ...DEFAULT_SETTINGS, musicVolume: 2 },
      { ...DEFAULT_SETTINGS, sfxVolume: -1 },
      { ...DEFAULT_SETTINGS, mouseSensitivity: Number.POSITIVE_INFINITY },
      { ...DEFAULT_SETTINGS, mouseSensitivity: 0 },
      { ...DEFAULT_SETTINGS, keyBindings: null },
      { ...DEFAULT_SETTINGS, keyBindings: [] },
      { ...DEFAULT_SETTINGS, keyBindings: { '': 'KeyA' } },
      { ...DEFAULT_SETTINGS, keyBindings: { jump: '' } },
      { ...DEFAULT_SETTINGS, keyBindings: { jump: 4 } },
    ]

    for (const settings of invalidSettings) {
      expect(isValidSettings(settings)).toBe(false)
    }
  })
})
