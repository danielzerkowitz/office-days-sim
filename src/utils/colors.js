function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = t => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return '#' + [hue2rgb(h + 1 / 3), hue2rgb(h), hue2rgb(h - 1 / 3)]
    .map(x => Math.round(x * 255).toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a distinct shade of an ART's base color for a specific team.
 * Keeps the hue, varies lightness from dark → light across the team count.
 */
export function artTeamColor(baseColor, index, total) {
  const [h] = hexToHsl(baseColor)
  const lMin = 32, lMax = 62
  const l = total <= 1 ? (lMin + lMax) / 2 : lMin + (index / (total - 1)) * (lMax - lMin)
  return hslToHex(h, 62, l)
}

/**
 * Return a team's display color.
 * Uses the explicitly stored color if present, otherwise derives from ART.
 */
export function getTeamColor(team, teams, arts) {
  if (team.color) return team.color
  const art = arts.find(a => a.id === team.artId)
  if (!art) return '#9ca3af'
  const artTeams = teams.filter(t => t.artId === team.artId)
  const idx = artTeams.findIndex(t => t.id === team.id)
  return artTeamColor(art.color, idx, artTeams.length)
}

/**
 * Suggest a default color for a new team being added to an ART.
 */
export function suggestTeamColor(artId, arts, existingTeams) {
  const art = arts.find(a => a.id === artId)
  if (!art) return '#9ca3af'
  const artTeams = existingTeams.filter(t => t.artId === artId)
  return artTeamColor(art.color, artTeams.length, artTeams.length + 1)
}
