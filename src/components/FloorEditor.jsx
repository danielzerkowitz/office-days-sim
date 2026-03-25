import { useState, useCallback, useRef } from 'react'

const DEFAULT_SEATS = 4

// Returns inline border styles that outline zone perimeters.
// Adjacent desks share an edge so the border is suppressed there,
// making each connected cluster appear as one visual island.
function zoneBorderStyle(c, r, deskSet) {
  const has = (dc, dr) => deskSet.has(`${c + dc},${r + dr}`)
  const edge = '2px solid rgba(255,255,255,0.35)'
  const inner = '2px solid transparent'
  return {
    borderTop:    has(0, -1) ? inner : edge,
    borderBottom: has(0,  1) ? inner : edge,
    borderLeft:   has(-1, 0) ? inner : edge,
    borderRight:  has( 1, 0) ? inner : edge,
  }
}

export default function FloorEditor({ floor, onFloorChange }) {
  const { cols, rows, desks } = floor
  const [popup, setPopup] = useState(null) // { key, col, row, rect }
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawMode, setDrawMode] = useState('add') // 'add' or 'remove'
  const gridRef = useRef(null)

  const totalSeats = Object.values(desks).reduce((sum, d) => sum + d.seats, 0)
  const totalDesks = Object.keys(desks).length

  const updateDimension = (prop, raw) => {
    const n = Math.max(2, Math.min(30, parseInt(raw) || 2))
    const newDesks = {}
    for (const [key, desk] of Object.entries(desks)) {
      const [c, r] = key.split(',').map(Number)
      if (c < (prop === 'cols' ? n : cols) && r < (prop === 'rows' ? n : rows)) {
        newDesks[key] = desk
      }
    }
    onFloorChange({ ...floor, [prop]: n, desks: newDesks })
  }

  const toggleDesk = useCallback((col, row, e) => {
    const key = `${col},${row}`
    if (e && e.type === 'click' && !isDrawing) {
      if (desks[key]) {
        const rect = e.currentTarget.getBoundingClientRect()
        setPopup({ key, col, row, rect })
      } else {
        onFloorChange({
          ...floor,
          desks: { ...desks, [key]: { seats: DEFAULT_SEATS } },
        })
      }
    }
  }, [floor, desks, onFloorChange, isDrawing])

  const handleMouseDown = useCallback((col, row, e) => {
    e.preventDefault()
    const key = `${col},${row}`
    const mode = desks[key] ? 'remove' : 'add'
    setIsDrawing(true)
    setDrawMode(mode)
    setPopup(null)

    const newDesks = { ...desks }
    if (mode === 'remove') {
      delete newDesks[key]
    } else {
      newDesks[key] = { seats: DEFAULT_SEATS }
    }
    onFloorChange({ ...floor, desks: newDesks })
  }, [floor, desks, onFloorChange])

  const handleMouseEnter = useCallback((col, row) => {
    if (!isDrawing) return
    const key = `${col},${row}`
    const newDesks = { ...desks }
    if (drawMode === 'remove') {
      delete newDesks[key]
    } else {
      if (!newDesks[key]) newDesks[key] = { seats: DEFAULT_SEATS }
    }
    onFloorChange({ ...floor, desks: newDesks })
  }, [isDrawing, drawMode, floor, desks, onFloorChange])

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const updateDesk = useCallback((key, seats) => {
    onFloorChange({ ...floor, desks: { ...desks, [key]: { seats } } })
    setPopup(null)
  }, [floor, desks, onFloorChange])

  const removeDesk = useCallback((key) => {
    const newDesks = { ...desks }
    delete newDesks[key]
    onFloorChange({ ...floor, desks: newDesks })
    setPopup(null)
  }, [floor, desks, onFloorChange])

  const clearAll = () => {
    onFloorChange({ ...floor, desks: {} })
    setPopup(null)
  }

  const deskSet = new Set(Object.keys(desks))

  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${c},${r}`
      const desk = desks[key]
      cells.push({ key, c, r, desk })
    }
  }

  return (
    <div className="floor-editor" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="panel-header">
        <h2>Floor Plan</h2>
        <p className="hint">Click to add a desk &middot; Click &amp; drag to draw multiple &middot; Click an existing desk to edit its seat count</p>
      </div>

      <div className="floor-controls">
        <label>
          Columns
          <input
            type="number"
            value={cols}
            min={2}
            max={30}
            onChange={e => updateDimension('cols', e.target.value)}
          />
        </label>
        <label>
          Rows
          <input
            type="number"
            value={rows}
            min={2}
            max={30}
            onChange={e => updateDimension('rows', e.target.value)}
          />
        </label>
        <div className="floor-stats">
          <span className="stat">{totalDesks} desks</span>
          <span className="stat-sep">&middot;</span>
          <span className="stat">{totalSeats} seats total</span>
        </div>
        {totalDesks > 0 && (
          <button className="btn-ghost danger-ghost" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      <div
        className="floor-grid"
        ref={gridRef}
        style={{ gridTemplateColumns: `repeat(${cols}, 44px)` }}
        onClick={() => setPopup(null)}
      >
        {cells.map(({ key, c, r, desk }) => (
          <div
            key={key}
            className={`grid-cell ${desk ? 'has-desk' : 'empty-cell'}`}
            style={desk ? zoneBorderStyle(c, r, deskSet) : undefined}
            onMouseDown={e => handleMouseDown(c, r, e)}
            onMouseEnter={() => handleMouseEnter(c, r)}
            onClick={e => { e.stopPropagation(); toggleDesk(c, r, e) }}
          >
            {desk && <span className="cell-label">{desk.seats}</span>}
          </div>
        ))}
      </div>

      {popup && (
        <DeskPopup
          desk={desks[popup.key]}
          onUpdate={seats => updateDesk(popup.key, seats)}
          onRemove={() => removeDesk(popup.key)}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}

function DeskPopup({ desk, onUpdate, onRemove, onClose }) {
  const [seats, setSeats] = useState(desk.seats)

  const handleKeyDown = e => {
    if (e.key === 'Enter') onUpdate(Math.max(1, seats))
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Edit Desk</h3>
        <label className="field-label">
          Seats
          <input
            type="number"
            value={seats}
            min={1}
            max={20}
            autoFocus
            onChange={e => setSeats(parseInt(e.target.value) || 1)}
            onKeyDown={handleKeyDown}
          />
        </label>
        <div className="modal-actions">
          <button className="btn-primary" onClick={() => onUpdate(Math.max(1, seats))}>Save</button>
          <button className="btn-danger" onClick={onRemove}>Remove desk</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
