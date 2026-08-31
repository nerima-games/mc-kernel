import { describe, expect, it } from 'vitest'
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
  applySettings,
  isGraphicsQuality,
  isValidSettings,
  keyBindingFor,
  normaliseSettings,
  rebindKey,
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
      audioEnabled: true,
      masterVolume: 0.8,
      musicVolume: 0.55,
      sfxVolume: 1,
      mouseSensitivity: 1,
      captionsEnabled: true,
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
        captionsEnabled: 'yes',
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
    expect(normaliseSettings({ audioEnabled: false }).audioEnabled).toBe(false)
    expect(normaliseSettings({ captionsEnabled: false }).captionsEnabled).toBe(false)
  })

  it('rebinds by swapping the conflicting action, and applies settings immutably', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      keyBindings: { jump: 'Space', sneak: 'ShiftLeft' },
    }

    expect(keyBindingFor(settings, 'jump')).toBe('Space')
    expect(keyBindingFor(settings, 'missing')).toBeUndefined()
    expect(rebindKey(settings, '', 'KeyA')).toBe(settings)
    expect(rebindKey(settings, 'jump', '')).toBe(settings)

    // No conflict: a fresh action just gets the code.
    const bound = rebindKey(settings, 'sprint', 'KeyW')
    expect(bound.keyBindings).toEqual({ jump: 'Space', sneak: 'ShiftLeft', sprint: 'KeyW' })
    expect(unbindKey(bound, 'missing')).toBe(bound)

    const unbound = unbindKey(bound, 'jump')
    expect(unbound.keyBindings).toEqual({ sneak: 'ShiftLeft', sprint: 'KeyW' })

    // Conflict, both sides already bound: rebinding 'sneak' onto jump's code swaps —
    // jump inherits sneak's old code rather than losing its binding.
    const swapped = rebindKey(settings, 'sneak', 'Space')
    expect(swapped.keyBindings).toEqual({ jump: 'ShiftLeft', sneak: 'Space' })

    // Conflict, the rebound action had no prior code: nothing to swap in, so the
    // conflicting action is unbound rather than left pointing at a fabricated default.
    const stolen = rebindKey(settings, 'sprint', 'Space')
    expect(stolen.keyBindings).toEqual({ sneak: 'ShiftLeft', sprint: 'Space' })

    expect(applySettings(settings, { renderDistance: 40 }).renderDistance).toBe(16)
    expect(applySettings(settings, { audioEnabled: false }).audioEnabled).toBe(false)
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
      { ...DEFAULT_SETTINGS, captionsEnabled: 'true' },
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

  // Second verification angle (enumerated-input property/invariant checks), alongside the
  // example-based tests above: clamping totality, rebind's bijection invariant, and
  // normalise/validate round-tripping as an encode/decode identity.
  describe('invariants over enumerated inputs', () => {
    const NUMERIC_PROBES = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      -0.0001,
      0,
      0.5,
      1,
      2,
      1000,
      Number.MAX_SAFE_INTEGER,
    ] as const

    it('clamps mouseSensitivity, masterVolume, musicVolume, sfxVolume into range for every probe', () => {
      const fields = ['mouseSensitivity', 'masterVolume', 'musicVolume', 'sfxVolume'] as const
      const bounds: Record<(typeof fields)[number], readonly [number, number]> = {
        mouseSensitivity: [MIN_MOUSE_SENSITIVITY, MAX_MOUSE_SENSITIVITY],
        masterVolume: [MIN_VOLUME, MAX_VOLUME],
        musicVolume: [MIN_VOLUME, MAX_VOLUME],
        sfxVolume: [MIN_VOLUME, MAX_VOLUME],
      }

      for (const field of fields) {
        const [min, max] = bounds[field]
        for (const probe of NUMERIC_PROBES) {
          const result = normaliseSettings({ [field]: probe })[field]
          expect(Number.isFinite(result)).toBe(true)
          expect(result).toBeGreaterThanOrEqual(min)
          expect(result).toBeLessThanOrEqual(max)
        }
      }
    })

    it('clamps and floors renderDistance, and clamps fovDegrees, for every probe', () => {
      for (const probe of NUMERIC_PROBES) {
        const renderDistance = normaliseSettings({ renderDistance: probe }).renderDistance
        expect(Number.isInteger(renderDistance)).toBe(true)
        expect(renderDistance).toBeGreaterThanOrEqual(MIN_RENDER_DISTANCE)
        expect(renderDistance).toBeLessThanOrEqual(MAX_RENDER_DISTANCE)

        const fovDegrees = normaliseSettings({ fovDegrees: probe }).fovDegrees
        expect(Number.isFinite(fovDegrees)).toBe(true)
        expect(fovDegrees).toBeGreaterThanOrEqual(MIN_FOV_DEGREES)
        expect(fovDegrees).toBeLessThanOrEqual(MAX_FOV_DEGREES)
      }
    })

    it('round-trips any already-valid settings value through normalise/validate as identity', () => {
      const validSamples: Settings[] = [
        DEFAULT_SETTINGS,
        { ...DEFAULT_SETTINGS, renderDistance: MIN_RENDER_DISTANCE },
        { ...DEFAULT_SETTINGS, renderDistance: MAX_RENDER_DISTANCE },
        { ...DEFAULT_SETTINGS, fovDegrees: MIN_FOV_DEGREES },
        { ...DEFAULT_SETTINGS, fovDegrees: MAX_FOV_DEGREES },
        { ...DEFAULT_SETTINGS, graphicsQuality: 'ultra' },
        { ...DEFAULT_SETTINGS, audioEnabled: false, captionsEnabled: false },
        { ...DEFAULT_SETTINGS, mouseSensitivity: MIN_MOUSE_SENSITIVITY },
        { ...DEFAULT_SETTINGS, mouseSensitivity: MAX_MOUSE_SENSITIVITY },
        { ...DEFAULT_SETTINGS, masterVolume: MIN_VOLUME, musicVolume: MAX_VOLUME, sfxVolume: MIN_VOLUME },
        { ...DEFAULT_SETTINGS, keyBindings: { jump: 'Space', sneak: 'ShiftLeft', sprint: 'KeyW' } },
      ]

      for (const sample of validSamples) {
        expect(isValidSettings(sample)).toBe(true)
        const decoded = normaliseSettings(sample)
        expect(decoded).toEqual(sample)
        // Idempotent: decoding an already-decoded value changes nothing further.
        expect(normaliseSettings(decoded)).toEqual(decoded)
      }
    })

    it('rebindKey never lets two bound actions share one code (injective over bound actions)', () => {
      const actions = ['jump', 'sneak', 'sprint', 'inventory'] as const
      const codes = ['Space', 'ShiftLeft', 'KeyW', 'KeyE'] as const

      // Every ordered (action, code) pair, applied in sequence from a common start, is an
      // enumerated stand-in for "arbitrary rebind history" — small enough to exhaust, large
      // enough to hit every swap and steal-when-unbound case.
      let settings: Settings = {
        ...DEFAULT_SETTINGS,
        keyBindings: { jump: 'Space', sneak: 'ShiftLeft' },
      }

      for (const action of actions) {
        for (const code of codes) {
          settings = rebindKey(settings, action, code)

          const boundCodes = Object.values(settings.keyBindings)
          const uniqueCodes = new Set(boundCodes)
          expect(uniqueCodes.size).toBe(boundCodes.length)
          // The action just rebound always holds the requested code.
          expect(settings.keyBindings[action]).toBe(code)
        }
      }
    })
  })
})
