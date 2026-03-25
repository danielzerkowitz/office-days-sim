import { useState } from 'react'
import { getTeamColor } from '../utils/colors'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Borders that outline zones and separate teams within a zone.
function schedCellStyle(c, r, desk, tid, teamColor, desks, assignments) {
  if (!desk) return {}

  const borderForSide = (dc, dr) => {
    const n = `${c + dc},${r + dr}`
    if (!desks[n]) return teamColor ? `2px solid ${teamColor}` : '2px solid #9ca3af'
    if (assignments[n] === tid) return '2px solid transparent'
    return '2px solid rgba(255,255,255,0.6)'
  }

  return {
    background: teamColor ? teamColor + 'bb' : undefined,
    borderTop:    borderForSide(0, -1),
    borderBottom: borderForSide(0,  1),
    borderLeft:   borderForSide(-1, 0),
    borderRight:  borderForSide( 1, 0),
  }
}

export default function ScheduleView({ floor, teams, arts, schedule, needsCalc, onCalculate }) {
  const [activeDay, setActiveDay] = useState('Monday')
  const { cols, rows, desks } = floor

  const teamById = Object.fromEntries(teams.map(t => [t.id, t]))

  // Compute display color for every team (derived from ART)
  const teamColor = t => getTeamColor(t, teams, arts)

  const dayData = schedule?.[activeDay]
  const assignments = dayData?.assignments || {}
  const warnings = dayData?.warnings || []
  const warningMap = Object.fromEntries(warnings.map(w => [w.teamId, w]))

  const teamsToday = teams.filter(t => t.days.includes(activeDay))

  const seatsByTeam = {}
  for (const [dk, tid] of Object.entries(assignments)) {
    const d = desks[dk]
    if (d) seatsByTeam[tid] = (seatsByTeam[tid] || 0) + d.seats
  }

  const totalSeats = Object.values(desks).reduce((s, d) => s + d.seats, 0)
  const usedSeats = Object.keys(assignments).reduce((s, dk) => s + (desks[dk]?.seats || 0), 0)
  const headcountToday = teamsToday.reduce((s, t) => s + t.size, 0)

  return (
    <div className="schedule-view">
      <div className="panel-header schedule-header">
        <h2>Weekly Schedule</h2>
        <button
          className={needsCalc ? 'btn-primary recalc-btn' : 'btn-ghost recalc-btn'}
          onClick={onCalculate}
        >
          Recalculate
        </button>
      </div>

      {!schedule && (
        <div className="no-schedule">
          <p>No schedule calculated yet.</p>
          <button className="btn-primary" onClick={onCalculate}>Calculate now</button>
        </div>
      )}

      {schedule && (
        <>
          <div className="day-tabs">
            {DAYS.map(day => {
              const dt = teams.filter(t => t.days.includes(day))
              const hc = dt.reduce((s, t) => s + t.size, 0)
              const hasWarn = schedule[day]?.warnings?.length > 0
              return (
                <button
                  key={day}
                  className={`day-tab ${activeDay === day ? 'day-tab-active' : ''}`}
                  onClick={() => setActiveDay(day)}
                >
                  <span className="day-tab-name">{day}</span>
                  <span className="day-tab-meta">{dt.length} teams &middot; {hc} ppl</span>
                  {hasWarn && <span className="day-warn-dot" title="Some teams have seat overflow" />}
                </button>
              )
            })}
          </div>

          <div className="schedule-body">
            <div className="schedule-floor">
              <div
                className="sched-grid"
                style={{ gridTemplateColumns: `repeat(${cols}, 48px)` }}
              >
                {Array.from({ length: rows }, (_, r) =>
                  Array.from({ length: cols }, (_, c) => {
                    const key = `${c},${r}`
                    const desk = desks[key]
                    const tid = assignments[key]
                    const team = tid ? teamById[tid] : null
                    const color = team ? teamColor(team) : null
                    return (
                      <div
                        key={key}
                        className={[
                          'sched-cell',
                          desk ? 'sched-has-desk' : 'sched-empty',
                          team ? 'sched-assigned' : '',
                        ].join(' ')}
                        style={schedCellStyle(c, r, desk, tid, color, desks, assignments)}
                        title={
                          team
                            ? `${team.name} — ${desk?.seats} seat${desk?.seats !== 1 ? 's' : ''}`
                            : desk
                            ? `${desk.seats} seat${desk.seats !== 1 ? 's' : ''} — unassigned`
                            : ''
                        }
                      >
                        {desk && (
                          <span className="sched-seat-label" style={team ? { color: 'rgba(0,0,0,0.65)' } : {}}>
                            {desk.seats}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              <div className="sched-floor-meta">
                {usedSeats}/{totalSeats} seats occupied &middot; {headcountToday} people in today
              </div>
            </div>

            {/* Legend grouped by ART */}
            <div className="schedule-legend">
              <h3>{activeDay}</h3>
              {teamsToday.length === 0 ? (
                <p className="empty-state">No teams in the office today.</p>
              ) : (
                arts.map(art => {
                  const artTeams = teamsToday.filter(t => t.artId === art.id)
                  if (artTeams.length === 0) return null
                  return (
                    <div key={art.id} className="legend-art-group">
                      <div className="legend-art-header" style={{ borderLeftColor: art.color, color: art.color }}>
                        {art.name}
                      </div>
                      {artTeams.map(team => {
                        const assigned = seatsByTeam[team.id] || 0
                        const warn = warningMap[team.id]
                        const color = teamColor(team)
                        return (
                          <div key={team.id} className="legend-row">
                            <div className="legend-dot" style={{ background: color }} />
                            <div className="legend-info">
                              <strong>{team.name}</strong>
                              <span>{team.size} people &middot; {assigned} seats assigned</span>
                              {warn && (
                                <span className="legend-warn">⚠ {warn.needed - warn.got} without a seat</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              )}

              {teamsToday.length > 0 && (
                <div className="legend-summary">
                  <div>{headcountToday} people in</div>
                  <div>{usedSeats} / {totalSeats} seats used</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
