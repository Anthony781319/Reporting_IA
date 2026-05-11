import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Saisie from './pages/Saisie'
import Equipe from './pages/Equipe'
import Admin from './pages/Admin'
import Login from './pages/Login'
import P1Page from './pages/P1Page'
import './App.css'

const ADMIN_PASSWORD = 'Kai'
const P1_PASSWORD = 'P1'

export default function App() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isP1, setIsP1] = useState(false)
  const [tab, setTab] = useState('saisie')

  const handleLogin = (ia, password) => {
    // Accès P1 of the week
    if (ia.nom === 'P1 of the week' && password === P1_PASSWORD) {
      setUser(ia)
      setIsP1(true)
      setIsAdmin(false)
      setTab('p1')
      return true
    }
    // Accès admin Anthony
    if (ia.nom === 'Anthony' && password === ADMIN_PASSWORD) {
      setUser(ia)
      setIsAdmin(true)
      setIsP1(false)
      setTab('dashboard')
      return true
    }
    // Accès IA standard
    if (password.toLowerCase() === ia.nom.toLowerCase()) {
      setUser(ia)
      setIsAdmin(false)
      setIsP1(false)
      setTab('saisie')
      return true
    }
    return false
  }

  const handleLogout = () => {
    setUser(null)
    setIsAdmin(false)
    setIsP1(false)
    setTab('saisie')
  }

  if (!user) return <Login onLogin={handleLogin} />

  // Onglets selon le rôle
  const adminTabs = [
    { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'saisie', icon: 'ti-edit', label: 'Ma saisie' },
    { id: 'equipe', icon: 'ti-users', label: 'Équipe' },
    { id: 'admin', icon: 'ti-settings', label: 'Admin' },
  ]

  const userTabs = [
    { id: 'saisie', icon: 'ti-edit', label: 'Ma saisie' },
  ]

  const p1Tabs = [
    { id: 'p1', icon: 'ti-target', label: 'P1 of the week' },
  ]

  const tabs = isAdmin ? adminTabs : isP1 ? p1Tabs : userTabs

  return (
    <div className="app">
      <div className="nav">
        <div className="nav-title">
          <i className="ti ti-chart-bar" aria-hidden="true"></i>
          {isP1 ? 'P1 of the week' : 'Reporting IA'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="nav-avatar">{user.nom === 'P1 of the week' ? 'P1' : user.nom.slice(0, 2).toUpperCase()}</div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            <i className="ti ti-logout" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
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
        {tab === 'p1' && <P1Page />}
      </div>
    </div>
  )
}
