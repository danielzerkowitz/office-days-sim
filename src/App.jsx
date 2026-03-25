import { useState, useEffect, useCallback } from 'react'
import FloorEditor from './components/FloorEditor'
import TeamManager from './components/TeamManager'
import ScheduleView from './components/ScheduleView'
import { calculateSchedule } from './utils/scheduler'

const DEFAULT_FLOOR = { cols: 10, rows: 8, desks: {} }
const DEFAULT_ARTS = [
  { id: 'art1', name: 'ART 1', color: '#3b5bdb' },
  { id: 'art2', name: 'ART 2', color: '#c2255c' },
]
const STORAGE_KEY = 'officeDaysSim_v1'

function load() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return null
}

function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export default function App() {
  const saved = load()
  const [tab, setTab] = useState('floor')
  const [floor, setFloor] = useState(saved?.floor || DEFAULT_FLOOR)
  const [teams, setTeams] = useState(saved?.teams || [])
  const [arts, setArts] = useState(saved?.arts || DEFAULT_ARTS)
  const [schedule, setSchedule] = useState(null)
  const [needsCalc, setNeedsCalc] = useState(false)

  useEffect(() => {
    save({ floor, teams, arts })
    setNeedsCalc(true)
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
          <span className="app-meta">
            {Object.keys(floor.desks).length} desks &middot; {teams.length} teams
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
