import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Saisie from './pages/Saisie'
import Equipe from './pages/Equipe'
import Admin from './pages/Admin'
import Login from './pages/Login'
import P1Page from './pages/P1Page'
import SaisieCR from './pages/SaisieCR'
import DashboardRH from './pages/DashboardRH'
import './App.css'

const ADMIN_PASSWORD = 'Kai'
const P1_PASSWORD = 'P1'
const RH_PASSWORD = 'rh'

export default function App() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isP1, setIsP1] = useState(false)
  const [isCR, setIsCR] = useState(false)
  const [isRH, setIsRH] = useState(false)
  const [tab, setTab] = useState('saisie')

  const resetRoles = () => {
    setIsAdmin(false)
    setIsP1(false)
    setIsCR(false)
    setIsRH(false)
  }

  const handleLogin = (ia, password) => {
    if (ia.nom === 'RH' && password === RH_PASSWORD) {
      resetRoles(); setUser(ia); setIsRH(true); setTab('dashboard-rh'); return true
    }
    if (ia.type === 'cr' && password.toLowerCase() === ia.nom.toLowerCase()) {
      resetRoles(); setUser(ia); setIsCR(true); setTab('saisie-cr'); return true
    }
    if (ia.nom === 'P1 of the week' && password === P1_PASSWORD) {
      resetRoles(); setUser(ia); setIsP1(true); setTab('p1'); return true
    }
    if (ia.nom === 'Anthony' && password === ADMIN_PASSWORD) {
      resetRoles(); setUser(ia); setIsAdmin(true); setTab('dashboard'); return true
    }
    if (password.toLowerCase() === ia.nom.toLowerCase()) {
      resetRoles(); setUser(ia); setTab('saisie'); return true
    }
    return false
  }

  const handleLogout = () => {
    setUser(null)
    resetRoles()
    setTab('saisie')
  }

  if (!user) return <Login onLogin={handleLogin} />

  const adminTabs = [
    { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'saisie', icon: 'ti-edit', label: 'Ma saisie' },
    { id: 'equipe', icon: 'ti-users', label: 'Équipe' },
    { id: 'admin', icon: 'ti-settings', label: 'Admin' },
  ]
  const userTabs = [{ id: 'saisie', icon: 'ti-edit', label: 'Ma saisie' }]
  const p1Tabs   = [{ id: 'p1', icon: 'ti-target', label: 'P1 of the week' }]
  const crTabs   = [{ id: 'saisie-cr', icon: 'ti-edit', label: 'Mon reporting' }]
  const rhTabs   = [{ id: 'dashboard-rh', icon: 'ti-chart-bar', label: 'Dashboard RH' }]

  const tabs = isAdmin ? adminTabs : isP1 ? p1Tabs : isCR ? crTabs : isRH ? rhTabs : userTabs

  const getAvatar = () => {
    if (user.nom === 'P1 of the week') return 'P1'
    if (user.nom === 'RH') return 'RH'
    return user.nom.slice(0, 2).toUpperCase()
  }

  const getTitle = () => {
    if (isP1) return 'P1 of the week'
    if (isCR || isRH) return 'Espace Recrutement'
    return 'Reporting'
  }

  return (
    <div className="app">
      <div className="nav">
        <div className="nav-title">
          <i className="ti ti-chart-bar" aria-hidden="true"></i>
          {getTitle()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="nav-avatar">{getAvatar()}</div>
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
        {tab === 'dashboard'    && <Dashboard />}
        {tab === 'saisie'       && <Saisie iaId={user.id} iaName={user.nom} />}
        {tab === 'equipe'       && <Equipe />}
        {tab === 'admin'        && <Admin />}
        {tab === 'p1'           && <P1Page />}
        {tab === 'saisie-cr'    && <SaisieCR crNom={user.nom} />}
        {tab === 'dashboard-rh' && <DashboardRH />}
      </div>
    </div>
  )
}
