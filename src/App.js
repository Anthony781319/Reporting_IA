import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Saisie from './pages/Saisie'
import Equipe from './pages/Equipe'
import Admin from './pages/Admin'
import Login from './pages/Login'
import './App.css'

const ADMIN_PASSWORD = 'Kai'

export default function App() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState('saisie')

  const handleLogin = (ia, password) => {
    if (ia.nom === 'Anthony' && password === ADMIN_PASSWORD) {
      setUser(ia)
      setIsAdmin(true)
      setTab('dashboard')
      return true
    }
    if (password.toLowerCase() === ia.nom.toLowerCase()) {
      setUser(ia)
      setIsAdmin(false)
      setTab('saisie')
      return true
    }
    return false
  }

  const handleLogout = () => {
    setUser(null)
    setIsAdmin(false)
    setTab('saisie')
  }

  if (!user) return <Login onLogin={handleLogin} />

  const adminTabs = [
    { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'saisie', icon: 'ti-edit', label: 'Ma saisie' },
    { id: 'equipe', icon: 'ti-users', label: 'Équipe' },
    { id: 'admin', icon: 'ti-settings', label: 'Admin' },
  ]

  const userTabs = [
    { id: 'saisie', icon: 'ti-edit', label: 'Ma saisie' },
  ]

  const tabs = isAdmin ? adminTabs : userTabs

  return (
    <div className="app">
      <div className="nav">
        <div className="nav-title">
          <i className="ti ti-chart-bar" aria-hidden="true"></i>
          Reporting IA
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="nav-avatar">{user.nom.slice(0, 2).toUpperCase()}</div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            <i className="ti ti-logout" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      {tabs.length > 1 && (
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
      )}

      <div className="content">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'saisie' && <Saisie iaId={user.id} iaName={user.nom} />}
        {tab === 'equipe' && <Equipe />}
        {tab === 'admin' && <Admin />}
      </div>
    </div>
  )
}
