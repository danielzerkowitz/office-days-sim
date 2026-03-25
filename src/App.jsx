import { useState, useEffect, useCallback, useRef } from 'react'
import FloorEditor from './components/FloorEditor'
import TeamManager from './components/TeamManager'
import ScheduleView from './components/ScheduleView'
import { calculateSchedule } from './utils/scheduler'
import { loadFromCloud, saveToCloud } from './lib/supabase'

const DEFAULT_FLOOR = { cols: 10, rows: 8, desks: {} }
const DEFAULT_ARTS = [
  { id: 'art1', name: 'ART 1', color: '#3b5bdb' },
  { id: 'art2', name: 'ART 2', color: '#c2255c' },
]
const STORAGE_KEY = 'officeDaysSim_v1'

function loadLocal() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return null
}

function saveLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export default function App() {
  const local = loadLocal()
  const [tab, setTab] = useState('floor')
  const [floor, setFloor] = useState(local?.floor || DEFAULT_FLOOR)
  const [teams, setTeams] = useState(local?.teams || [])
  const [arts, setArts] = useState(local?.arts || DEFAULT_ARTS)
  const [schedule, setSchedule] = useState(null)
  const [needsCalc, setNeedsCalc] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'saving' | 'error'
  const importRef = useRef()
  const saveTimer = useRef()

  // On mount, load from Supabase and override local state
  useEffect(() => {
    loadFromCloud()
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          if (data.floor) setFloor(data.floor)
          if (data.teams) setTeams(data.teams)
          if (data.arts) setArts(data.arts)
        }
      })
      .catch(() => {}) // silently fall back to localStorage on error
  }, [])

  const handleExport = () => {
    const data = JSON.stringify({ floor, teams, arts }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'office-layout.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.floor) setFloor(data.floor)
        if (data.teams) setTeams(data.teams)
        if (data.arts) setArts(data.arts)
      } catch {
        alert('Invalid file — could not load layout.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  useEffect(() => {
    const payload = { floor, teams, arts }
    saveLocal(payload)
    setNeedsCalc(true)

    // Debounce cloud saves — wait 1s after last change
    clearTimeout(saveTimer.current)
    setSyncStatus('saving')
    saveTimer.current = setTimeout(() => {
      saveToCloud(payload)
        .then(() => setSyncStatus('idle'))
        .catch(() => setSyncStatus('error'))
    }, 1000)
  }, [floor, teams, arts])

  const handleCalculate = useCallback(() => {
    setSchedule(calculateSchedule(floor, teams))
    setNeedsCalc(false)
  }, [floor, teams])

  const goToSchedule = () => {
    handleCalculate()
    setTab('schedule')
  }

  const TABS = [
    { id: 'floor', label: 'Floor Plan' },
    { id: 'teams', label: 'Teams' },
    { id: 'schedule', label: 'Schedule' },
  ]

  return (
    <div className="app">
      <header className="app-bar">
        <span className="app-title">Office Days Sim</span>
        <nav className="app-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${tab === t.id ? 'nav-btn-active' : ''}`}
              onClick={() => {
                if (t.id === 'schedule') goToSchedule()
                else setTab(t.id)
              }}
            >
              {t.label}
              {t.id === 'schedule' && needsCalc && schedule && (
                <span className="nav-dot" title="Changes since last calculation" />
              )}
            </button>
          ))}
        </nav>
        <div className="app-bar-right">
          <button className="nav-btn" onClick={handleExport}>Export</button>
          <button className="nav-btn" onClick={() => importRef.current.click()}>Import</button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <span className="app-meta">
            {syncStatus === 'saving' && '↑ saving…'}
            {syncStatus === 'error' && '⚠ sync failed'}
            {syncStatus === 'idle' && `${Object.keys(floor.desks).length} desks · ${teams.length} teams`}
          </span>
        </div>
      </header>

      <main className="app-main">
        {tab === 'floor' && (
          <FloorEditor floor={floor} onFloorChange={setFloor} />
        )}
        {tab === 'teams' && (
          <TeamManager teams={teams} onTeamsChange={setTeams} arts={arts} onArtsChange={setArts} />
        )}
        {tab === 'schedule' && (
          <ScheduleView
            floor={floor}
            teams={teams}
            arts={arts}
            schedule={schedule}
            needsCalc={needsCalc}
            onCalculate={handleCalculate}
          />
        )}
      </main>
    </div>
  )
}
