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
  keyBindings: Readonly<Record<string, string>>
}>

export const DEFAULT_SETTINGS: Settings = {
  renderDistance: 5,
  fovDegrees: 75,
  graphicsQuality: 'medium',
  audioEnabled: false,
  masterVolume: 0.8,
  musicVolume: 0.55,
  sfxVolume: 1,
  mouseSensitivity: 0.5,
  keyBindings: {},
}
