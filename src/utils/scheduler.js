const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function adj(key) {
  const [c, r] = key.split(',').map(Number)
  return [`${c + 1},${r}`, `${c - 1},${r}`, `${c},${r + 1}`, `${c},${r - 1}`]
}

/**
 * Returns an array of zones (connected components of desks).
 * Each zone: { id: number, desks: string[], totalSeats: number }
 */
export function findZones(desks) {
  const keys = new Set(Object.keys(desks))
  const visited = new Set()
  const zones = []

  const sorted = [...keys].sort((a, b) => {
    const [ac, ar] = a.split(',').map(Number)
    const [bc, br] = b.split(',').map(Number)
    return ar !== br ? ar - br : ac - bc
  })

  for (const start of sorted) {
    if (visited.has(start)) continue
    const zone = { id: zones.length, desks: [], totalSeats: 0 }
    const q = [start]
    visited.add(start)
    while (q.length) {
      const dk = q.shift()
      zone.desks.push(dk)
      zone.totalSeats += desks[dk].seats
      for (const n of adj(dk)) {
        if (keys.has(n) && !visited.has(n)) { visited.add(n); q.push(n) }
      }
    }
    zones.push(zone)
  }

  return zones
}

/**
 * Build a map from desk key → zone id for quick lookup.
 */
export function deskZoneMap(desks) {
  const zones = findZones(desks)
  const map = {}
  for (const z of zones) {
    for (const dk of z.desks) map[dk] = z.id
  }
  return map
}

/**
 * Assign teams to desks for each weekday.
 *
 * Zone-aware strategy:
 *  1. Detect zones (connected desk clusters).
 *  2. Per team (largest first), pick the smallest zone that still has enough
 *     seats to fully accommodate the team ("best-fit"). If no zone is big
 *     enough, fall back to the largest remaining zone.
 *  3. Within the chosen zone, BFS from the first available desk so the team
 *     always occupies a contiguous block.
 *
 * This guarantees:
 *  - A team never straddles two disconnected zones.
 *  - Multiple teams sharing a zone sit in adjacent, clearly separated blocks.
 */
export function calculateSchedule(floor, teams) {
  const { desks } = floor

  const sortedDeskKeys = Object.keys(desks).sort((a, b) => {
    const [ac, ar] = a.split(',').map(Number)
    const [bc, br] = b.split(',').map(Number)
    return ar !== br ? ar - br : ac - bc
  })

  const result = {}

  for (const day of DAYS) {
    const teamsToday = teams
      .filter(t => t.days.includes(day))
      .sort((a, b) => b.size - a.size)

    const zones = findZones(desks)
    // Each zone gets its own mutable available-desks Set
    const zoneAvail = zones.map(z => new Set(z.desks))

    const remainingSeats = i =>
      [...zoneAvail[i]].reduce((s, dk) => s + desks[dk].seats, 0)

    const assignments = {}
    const warnings = []

    for (const team of teamsToday) {
      // Best-fit: smallest zone that fully seats the team
      let bestIdx = -1
      let bestSeats = Infinity
      for (let i = 0; i < zones.length; i++) {
        const s = remainingSeats(i)
        if (s >= team.size && s < bestSeats) { bestIdx = i; bestSeats = s }
      }

      // Fallback: largest zone (partial seating, will trigger a warning)
      if (bestIdx === -1) {
        let maxSeats = 0
        for (let i = 0; i < zones.length; i++) {
          const s = remainingSeats(i)
          if (s > maxSeats) { maxSeats = s; bestIdx = i }
        }
      }

      if (bestIdx === -1 || remainingSeats(bestIdx) === 0) {
        warnings.push({ teamId: team.id, needed: team.size, got: 0 })
        continue
      }

      // BFS within the chosen zone — guarantees contiguous assignment
      const avail = zoneAvail[bestIdx]
      const start = sortedDeskKeys.find(k => avail.has(k))
      const q = [start]
      const visited = new Set([start])
      const assigned = []
      let need = team.size

      while (q.length && need > 0) {
        const dk = q.shift()
        if (!avail.has(dk)) continue
        assigned.push(dk)
        need -= desks[dk].seats
        avail.delete(dk)
        for (const n of adj(dk)) {
          if (avail.has(n) && !visited.has(n)) { visited.add(n); q.push(n) }
        }
      }

      for (const dk of assigned) assignments[dk] = team.id

      const got = assigned.reduce((s, dk) => s + desks[dk].seats, 0)
      if (got < team.size) warnings.push({ teamId: team.id, needed: team.size, got })
    }

    result[day] = { assignments, warnings }
  }

  return result
}
