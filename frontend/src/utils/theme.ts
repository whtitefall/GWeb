export const resolveTheme = (preference: 'dark' | 'light' | 'system', prefersDark: boolean) => {
  if (preference === 'system') {
    return prefersDark ? 'dark' : 'light'
  }
  return preference
}

export const hexToRgb = (hex: string) => {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) {
    return null
  }
  const num = Number.parseInt(cleaned, 16)
  if (Number.isNaN(num)) {
    return null
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export const isLightColor = (hex: string) => {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return false
  }
  const { r, g, b } = rgb
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.6
}

export const isValidColor = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    return true
  }
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(trimmed)) {
    return true
  }
  return false
}
