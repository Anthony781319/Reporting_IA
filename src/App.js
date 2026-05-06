import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Saisie from './pages/Saisie'
import Equipe from './pages/Equipe'
import Admin from './pages/Admin'
import './App.css'

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [iaId, setIaId] = useState(null)
  const [iaName, setIaName] = useState('')

  const handleSelectIA = (id, name) => {
    setIaId(id)
    setIaName(name)
    setTab('saisie')
  }

  const tabs = [
    { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'saisie', icon: 'ti-edit', label: 'Ma saisie' },
    { id: 'equipe', icon: 'ti-users', label: 'Équipe' },
    { id: 'admin', icon: 'ti-settings', label: 'Admin' },
  ]

  return (
    <div className="app">
      <div className="nav">
        <div className="nav-title">
          <i className="ti ti-chart-bar" aria-hidden="true"></i>
          Reporting IA
        </div>
        {iaName && (
          <div className="nav-avatar">
            {iaName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`ti ${t.icon}`} aria-hidden="true"></i>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="content">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'saisie' && <Saisie iaId={iaId} iaName={iaName} />}
        {tab === 'equipe' && <Equipe />}
        {tab === 'admin' && <Admin onSelectIA={handleSelectIA} selectedIaId={iaId} />}
      </div>
    </div>
  )
}
