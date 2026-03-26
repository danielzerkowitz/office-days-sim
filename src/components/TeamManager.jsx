import { useState } from 'react'
import { getTeamColor, suggestTeamColor } from '../utils/colors'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' }

const emptyForm = () => ({ name: '', size: '', days: [], artId: '', color: '#9ca3af' })

export default function TeamManager({ teams, onTeamsChange, arts, onArtsChange }) {
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')

  const totalPeople = teams.reduce((sum, t) => sum + t.size, 0)

  const validate = () => {
    if (!form.name.trim()) return 'Team name is required.'
    if (!form.size || parseInt(form.size) < 1) return 'Team size must be at least 1.'
    if (!form.artId) return 'Select an ART.'
    if (form.days.length < 1) return 'Select at least one office day.'
    if (teams.find(t => t.id !== editId && t.name.trim().toLowerCase() === form.name.trim().toLowerCase()))
      return 'A team with this name already exists.'
    return null
  }

  const handleSubmit = () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')

    const team = {
      id: editId || `team-${Date.now()}`,
      name: form.name.trim(),
      size: parseInt(form.size),
      days: [...form.days],
      artId: form.artId,
      color: form.color,
    }

    if (editId) {
      onTeamsChange(teams.map(t => (t.id === editId ? team : t)))
      setEditId(null)
    } else {
      onTeamsChange([...teams, team])
    }
    setForm(emptyForm())
  }

  const handleEdit = team => {
    setEditId(team.id)
    setForm({ name: team.name, size: String(team.size), days: [...team.days], artId: team.artId, color: getTeamColor(team, teams, arts) })
    setError('')
  }

  const handleCancel = () => {
    setEditId(null)
    setForm(emptyForm())
    setError('')
  }

  const handleDelete = id => {
    const updated = teams.filter(t => t.id !== id)
    onTeamsChange(updated)
    if (editId === id) { setEditId(null); setForm(emptyForm()); setError('') }
  }

  const toggleDay = day => {
    setForm(f => {
      if (f.days.includes(day)) {
        // Deselect
        return { ...f, days: f.days.filter(d => d !== day) }
      }
      if (f.days.length < 2) {
        // Add as next day (primary or secondary)
        return { ...f, days: [...f.days, day] }
      }
      // Already have 2: replace secondary (index 1) with new day
      return { ...f, days: [f.days[0], day] }
    })
  }

  const updateArt = (id, field, value) => {
    onArtsChange(arts.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const addArt = () => {
    const colors = ['#3b5bdb','#c2255c','#2f9e44','#e67700','#6741d9','#0c8599']
    const usedColors = arts.map(a => a.color)
    const color = colors.find(c => !usedColors.includes(c)) || '#888888'
    onArtsChange([...arts, { id: `art-${Date.now()}`, name: `ART ${arts.length + 1}`, color }])
  }

  const removeArt = (id) => {
    onArtsChange(arts.filter(a => a.id !== id))
    // Clear artId from teams that belonged to this ART
    onTeamsChange(teams.map(t => t.artId === id ? { ...t, artId: '' } : t))
    if (form.artId === id) setForm(f => ({ ...f, artId: '' }))
  }

  return (
    <div className="team-manager-wrap">

      {/* ART configuration */}
      <div className="art-config">
        {arts.map(art => (
          <div key={art.id} className="art-card" style={{ borderTopColor: art.color }}>
            <div className="art-card-header">
              <input
                className="art-name-input"
                value={art.name}
                onChange={e => updateArt(art.id, 'name', e.target.value)}
                style={{ color: art.color }}
              />
              <input
                type="color"
                className="art-color-picker"
                value={art.color}
                onChange={e => updateArt(art.id, 'color', e.target.value)}
                title="Pick ART color"
              />
              <button
                className="art-remove-btn"
                onClick={() => removeArt(art.id)}
                title="Remove ART"
              >×</button>
            </div>
            <div className="art-team-chips">
              {teams.filter(t => t.artId === art.id).map(t => (
                <span
                  key={t.id}
                  className="art-team-chip"
                  style={{ background: getTeamColor(t, teams, arts), color: '#fff' }}
                >
                  {t.name}
                </span>
              ))}
              {teams.filter(t => t.artId === art.id).length === 0 && (
                <span className="art-no-teams">No teams yet</span>
              )}
            </div>
          </div>
        ))}
        <button className="art-add-btn" onClick={addArt}>+ Add ART</button>
      </div>

      <div className="team-manager">
        {/* Add / Edit form */}
        <div className="team-form-panel">
          <div className="panel-header">
            <h2>{editId ? 'Edit Team' : 'Add Team'}</h2>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="form-grid">
            <label className="field-label">
              Team name
              <input
                type="text"
                value={form.name}
                placeholder="e.g. Engineering"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </label>
            <label className="field-label">
              Team size
              <input
                type="number"
                value={form.size}
                min={1}
                placeholder="10"
                onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
              />
            </label>
            <label className="field-label">
              Color
              <input
                type="color"
                className="team-color-picker"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              />
            </label>
          </div>

          <div className="field-label" style={{ marginBottom: 16 }}>
            <span className="field-label-text">ART</span>
            <div className="art-selector">
              {arts.map(art => (
                <button
                  key={art.id}
                  className={`art-select-btn ${form.artId === art.id ? 'art-select-active' : ''}`}
                  style={form.artId === art.id ? { background: art.color, borderColor: art.color, color: '#fff' } : { borderColor: art.color, color: art.color }}
                  onClick={() => setForm(f => ({ ...f, artId: art.id, color: suggestTeamColor(art.id, arts, teams) }))}
                >
                  {art.name}
                </button>
              ))}
            </div>
          </div>

          <div className="day-selector">
            <span className="field-label-text">Office days</span>
            <div className="day-buttons">
              {DAYS.map(day => {
                const idx = form.days.indexOf(day)
                const label = idx === 0 ? '1st' : idx === 1 ? '2nd' : null
                return (
                  <button
                    key={day}
                    className={`day-btn ${idx >= 0 ? 'day-selected' : ''} ${idx === 0 ? 'day-primary' : ''} ${idx === 1 ? 'day-secondary' : ''}`}
                    onClick={() => toggleDay(day)}
                    title={idx === 0 ? 'Primary day' : idx === 1 ? 'Secondary day' : ''}
                  >
                    {DAY_SHORT[day]}
                    {label && <span className="day-badge">{label}</span>}
                  </button>
                )
              })}
            </div>
            <span className="day-hint">Click once for primary, again for secondary (optional)</span>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSubmit}>
              {editId ? 'Update team' : 'Add team'}
            </button>
            {editId && <button className="btn-ghost" onClick={handleCancel}>Cancel</button>}
          </div>
        </div>

        {/* Team list */}
        <div className="team-list-panel">
          <div className="panel-header">
            <h2>Teams</h2>
            {teams.length > 0 && (
              <span className="meta">{teams.length} teams &middot; {totalPeople} people total</span>
            )}
          </div>

          {teams.length === 0 ? (
            <p className="empty-state">No teams yet. Add your first team on the left.</p>
          ) : (
            <div className="team-list">
              {arts.map(art => {
                const artTeams = teams.filter(t => t.artId === art.id)
                if (artTeams.length === 0) return null
                return (
                  <div key={art.id} className="team-list-art-group">
                    <div className="team-list-art-label" style={{ color: art.color }}>
                      {art.name}
                    </div>
                    {artTeams.map(team => (
                      <div key={team.id} className={`team-card ${editId === team.id ? 'editing' : ''}`}>
                        <div className="team-color-bar" style={{ background: getTeamColor(team, teams, arts) }} />
                        <div className="team-card-info">
                          <strong>{team.name}</strong>
                          <span>{team.size} people &middot; {team.days.map((d, i) => `${DAY_SHORT[d]}${i === 1 ? ' (2nd)' : ''}`).join(', ')}</span>
                        </div>
                        <div className="team-card-actions">
                          <button className="btn-sm" onClick={() => handleEdit(team)}>Edit</button>
                          <button className="btn-sm btn-sm-danger" onClick={() => handleDelete(team.id)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
              {/* Teams not yet assigned to an ART */}
              {teams.filter(t => !arts.find(a => a.id === t.artId)).map(team => (
                <div key={team.id} className={`team-card ${editId === team.id ? 'editing' : ''}`}>
                  <div className="team-color-bar" style={{ background: '#9ca3af' }} />
                  <div className="team-card-info">
                    <strong>{team.name}</strong>
                    <span>{team.size} people &middot; {team.days.map(d => DAY_SHORT[d]).join(', ')} &middot; <em>no ART</em></span>
                  </div>
                  <div className="team-card-actions">
                    <button className="btn-sm" onClick={() => handleEdit(team)}>Edit</button>
                    <button className="btn-sm btn-sm-danger" onClick={() => handleDelete(team.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
