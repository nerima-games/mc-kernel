import { describe, expect, it } from 'vitest'
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
  normaliseKeyBindings,
  normaliseSettings,
  rebindKey,
  RenderDistanceChunks,
  unbindKey,
  VolumeLevel,
  type Settings,
} from '../src/domain/text/settings'

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
          '   ': 'KeyY',
          invalidCode: ' ',
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

  it('rebinds by swapping the conflicting action immutably', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      keyBindings: normaliseKeyBindings({ jump: 'Space', sneak: 'ShiftLeft' }),
    }

    expect(
      Reflect.apply(rebindKey, undefined, [settings, '', KeyCode('KeyW')]),
    ).toBe(settings)
    expect(
      Reflect.apply(rebindKey, undefined, [settings, InputAction('sprint'), '']),
    ).toBe(settings)

    expect(InputAction.is('')).toBe(false)
    expect(KeyCode.is('')).toBe(false)

    // No conflict: a fresh action just gets the code.
    const bound = rebindKey(settings, InputAction('sprint'), KeyCode('KeyW'))
    expect(bound.keyBindings).toEqual({ jump: 'Space', sneak: 'ShiftLeft', sprint: 'KeyW' })
    expect(unbindKey(bound, InputAction('missing'))).toBe(bound)

    const unbound = unbindKey(bound, InputAction('jump'))
    expect(unbound.keyBindings).toEqual({ sneak: 'ShiftLeft', sprint: 'KeyW' })

    // Conflict, both sides already bound: rebinding 'sneak' onto jump's code swaps —
    // jump inherits sneak's old code rather than losing its binding.
    const swapped = rebindKey(settings, InputAction('sneak'), KeyCode('Space'))
    expect(swapped.keyBindings).toEqual({ jump: 'ShiftLeft', sneak: 'Space' })

    // Conflict, the rebound action had no prior code: nothing to swap in, so the
    // conflicting action is unbound rather than left pointing at a fabricated default.
    const stolen = rebindKey(settings, InputAction('sprint'), KeyCode('Space'))
    expect(stolen.keyBindings).toEqual({ sneak: 'ShiftLeft', sprint: 'Space' })

  })

  it('validates the numeric and string brand boundaries', () => {
    expect(RenderDistanceChunks.is(MIN_RENDER_DISTANCE)).toBe(true)
    expect(RenderDistanceChunks.is(8)).toBe(true)
    expect(RenderDistanceChunks.is(MAX_RENDER_DISTANCE)).toBe(true)
    expect(RenderDistanceChunks.is(MIN_RENDER_DISTANCE - 1)).toBe(false)
    expect(RenderDistanceChunks.is(MAX_RENDER_DISTANCE + 1)).toBe(false)
    expect(RenderDistanceChunks.is(2.5)).toBe(false)

    expect(FieldOfViewDegrees.is(MIN_FOV_DEGREES)).toBe(true)
    expect(FieldOfViewDegrees.is(75)).toBe(true)
    expect(FieldOfViewDegrees.is(MAX_FOV_DEGREES)).toBe(true)
    expect(FieldOfViewDegrees.is(MIN_FOV_DEGREES - 0.1)).toBe(false)
    expect(FieldOfViewDegrees.is(MAX_FOV_DEGREES + 0.1)).toBe(false)

    expect(VolumeLevel.is(MIN_VOLUME)).toBe(true)
    expect(VolumeLevel.is(0.5)).toBe(true)
    expect(VolumeLevel.is(MAX_VOLUME)).toBe(true)
    expect(VolumeLevel.is(-0.1)).toBe(false)
    expect(VolumeLevel.is(1.1)).toBe(false)
    expect(VolumeLevel.is(Number.NaN)).toBe(false)

    expect(MouseSensitivity.is(MIN_MOUSE_SENSITIVITY)).toBe(true)
    expect(MouseSensitivity.is(1)).toBe(true)
    expect(MouseSensitivity.is(MAX_MOUSE_SENSITIVITY)).toBe(true)
    expect(MouseSensitivity.is(MIN_MOUSE_SENSITIVITY - 0.001)).toBe(false)
    expect(MouseSensitivity.is(MAX_MOUSE_SENSITIVITY + 0.001)).toBe(false)

    expect(InputAction.is('jump')).toBe(true)
    expect(InputAction.is('   ')).toBe(false)
    expect(KeyCode.is('Space')).toBe(true)
    expect(KeyCode.is(' ')).toBe(false)
  })

  // Additional invariant checks alongside the example-based tests above.
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

    it('preserves already-normalised settings and remains idempotent', () => {
      const validSamples: Settings[] = [
        DEFAULT_SETTINGS,
        { ...DEFAULT_SETTINGS, renderDistance: RenderDistanceChunks(MIN_RENDER_DISTANCE) },
        { ...DEFAULT_SETTINGS, renderDistance: RenderDistanceChunks(MAX_RENDER_DISTANCE) },
        { ...DEFAULT_SETTINGS, fovDegrees: FieldOfViewDegrees(MIN_FOV_DEGREES) },
        { ...DEFAULT_SETTINGS, fovDegrees: FieldOfViewDegrees(MAX_FOV_DEGREES) },
        { ...DEFAULT_SETTINGS, graphicsQuality: 'ultra' },
        { ...DEFAULT_SETTINGS, audioEnabled: false, captionsEnabled: false },
        { ...DEFAULT_SETTINGS, mouseSensitivity: MouseSensitivity(MIN_MOUSE_SENSITIVITY) },
        { ...DEFAULT_SETTINGS, mouseSensitivity: MouseSensitivity(MAX_MOUSE_SENSITIVITY) },
        {
          ...DEFAULT_SETTINGS,
          masterVolume: VolumeLevel(MIN_VOLUME),
          musicVolume: VolumeLevel(MAX_VOLUME),
          sfxVolume: VolumeLevel(MIN_VOLUME),
        },
        {
          ...DEFAULT_SETTINGS,
          keyBindings: normaliseKeyBindings({ jump: 'Space', sneak: 'ShiftLeft', sprint: 'KeyW' }),
        },
      ]

      for (const sample of validSamples) {
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
        keyBindings: normaliseKeyBindings({ jump: 'Space', sneak: 'ShiftLeft' }),
      }

      for (const action of actions) {
        for (const code of codes) {
          settings = rebindKey(settings, InputAction(action), KeyCode(code))

          const boundCodes = Object.values(settings.keyBindings)
          const uniqueCodes = new Set(boundCodes)
          expect(uniqueCodes.size).toBe(boundCodes.length)
          // The action just rebound always holds the requested code.
          expect(settings.keyBindings[InputAction(action)]).toBe(code)
        }
      }
    })
  })
})
