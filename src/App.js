import Entretiens from './pages/Entretiens'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import DashboardManager from './pages/DashboardManager'
import Saisie from './pages/Saisie'
import Admin from './pages/Admin'
import Login from './pages/Login'
import P1Page from './pages/P1Page'
import SaisieCR from './pages/SaisieCR'
import DashboardRH from './pages/DashboardRH'
import BilanEquipe from './pages/BilanEquipe'
import Contacts from './pages/Contacts'
import Classement from './pages/Classement'
import ProspectionSaisie from './pages/ProspectionSaisie'
import AdminEntite from './pages/AdminEntite'
import ChallengeItc from './pages/ChallengeItc'
import Intercontrats from './pages/Intercontrats'
import Prod2027 from './pages/Prod2027'
import './App.css'

const ADMIN_PASSWORD = 'go'
const P1_PASSWORD = 'P1'
const RH_PASSWORD = 'rh'
const ROMAIN_MANAGER_PASSWORD = 'chervet'
const ROMAIN_TEAM = ['Luxhana', 'Virginie', 'Andrea', 'Laila', 'Romain']
const STEPHANE_MANAGER_PASSWORD = 'Stéphane'
const STEPHANE_TEAM = ['Antoine', 'Nassim', 'Karim', 'Sarah', 'Stéphane']
const CONTACTS_PASSWORD = 'crm'
const SANDRA_PASSWORD = 'attoun'
const SANDRA_ENTITE = 'sandra'
const SANDRA_LABEL = 'SOL (AS)'

export default function App() {
  const [user, setUser] = useState(null)
  const [isManager, setIsManager] = useState(false)
  const [isTeamManager, setIsTeamManager] = useState(false)
  const [isAdminOnly, setIsAdminOnly] = useState(false)
  const [isP1, setIsP1] = useState(false)
  const [isCR, setIsCR] = useState(false)
  const [isRH, setIsRH] = useState(false)
  const [isContacts, setIsContacts] = useState(false)
  const [isProspection, setIsProspection] = useState(false)
  const [isSandraManager, setIsSandraManager] = useState(false)
  const [isStephaneManager, setIsStephaneManager] = useState(false)
  const [isChallengeItc, setIsChallengeItc] = useState(false)
  const [challengeDashboardDirect, setChallengeDashboardDirect] = useState(false)
  const [isIntercontrats, setIsIntercontrats] = useState(false)
  const [isProd2027, setIsProd2027] = useState(false)
  const [tab, setTab] = useState('saisie')

   const resetRoles = () => {
    setIsManager(false); setIsTeamManager(false); setIsAdminOnly(false); setIsP1(false); setIsCR(false); setIsRH(false); setIsContacts(false); setIsProspection(false); setIsSandraManager(false); setIsStephaneManager(false); setIsChallengeItc(false); setChallengeDashboardDirect(false); setIsIntercontrats(false); setIsProd2027(false)
  }

  const handleLogin = (ia, password, initialTab) => {
    if (ia.nom === 'RH' && initialTab === 'manager-rh') {
      if (password !== RH_PASSWORD) return false
      resetRoles(); setUser(ia); setIsRH(true); setTab('dashboard-rh'); return true
    }
    if (ia.type === 'cr' && password.toLowerCase() === ia.nom.toLowerCase()) {
      resetRoles(); setUser(ia); setIsCR(true); setTab('saisie-cr'); return true
    }
    if (ia.nom === 'P1 of the week' && password === P1_PASSWORD) {
      resetRoles(); setUser(ia); setIsP1(true); setTab('p1'); return true
    }
    if (initialTab === 'challenge-itc') {
      resetRoles(); setUser(ia); setIsChallengeItc(true); setTab('challenge-itc'); return true
    }
    if (initialTab === 'challenge-itc-dashboard') {
      if (password !== ADMIN_PASSWORD) return false
      resetRoles(); setUser(ia); setIsChallengeItc(true); setChallengeDashboardDirect(true); setTab('challenge-itc'); return true
    }
    if (initialTab === 'intercontrats') {
      resetRoles(); setUser(ia); setIsIntercontrats(true); setTab('intercontrats'); return true
    }
    if (ia.nom === 'Anthony' && initialTab === 'prod-2027') {
      if (password !== ADMIN_PASSWORD) return false
      resetRoles(); setUser(ia); setIsProd2027(true); setTab('prod-2027'); return true
    }
    if (ia.nom === 'Anthony' && (initialTab === 'admin' || initialTab === 'manager-commerce')) {
      if (password !== ADMIN_PASSWORD) return false
      resetRoles()
      setUser(ia)
      if (initialTab === 'admin') { setIsAdminOnly(true); setTab('admin') }
      else { setIsManager(true); setTab('dashboard-manager') }
      return true
    }
    if (ia.nom === 'Romain' && initialTab === 'manager-romain') {
      if (password !== ROMAIN_MANAGER_PASSWORD) return false
      resetRoles(); setUser(ia); setIsManager(true); setIsTeamManager(true); setTab('dashboard-manager'); return true
    }
    if (ia.nom === 'Stéphane' && initialTab === 'manager-stephane') {
      if (password.toLowerCase() !== STEPHANE_MANAGER_PASSWORD.toLowerCase()) return false
      resetRoles(); setUser(ia); setIsManager(true); setIsStephaneManager(true); setTab('dashboard-manager'); return true
    }
    if (ia.nom === 'Contacts' && initialTab === 'manager-contacts') {
      if (password !== CONTACTS_PASSWORD) return false
      resetRoles(); setUser(ia); setIsContacts(true); setTab('contacts'); return true
    }
    if (ia.nom === 'Sandra' && initialTab === 'manager-sandra') {
      if (password !== SANDRA_PASSWORD) return false
      resetRoles(); setUser(ia); setIsSandraManager(true); setTab('dashboard-manager'); return true
    }
    if (initialTab === 'prospection' && password.toLowerCase() === ia.nom.toLowerCase()) {
      resetRoles(); setUser(ia); setIsProspection(true); setTab('prospection-saisie'); return true
    }
    if (password.toLowerCase() === ia.nom.toLowerCase()) {
      resetRoles(); setUser(ia); setTab('saisie'); return true
    }
    return false
  }

  const handleLogout = () => { setUser(null); resetRoles(); setTab('saisie') }

  if (!user) return <Login onLogin={handleLogin} />

  const managerTabs = [
    { id: 'dashboard-manager', icon: 'ti-layout-columns', label: 'Dashboard' },
    { id: 'bilan-equipe',      icon: 'ti-chart-bar',      label: 'Bilan équipe' },
    { id: 'saisie',            icon: 'ti-edit',           label: 'Ma saisie' },
    { id: 'ytd',               icon: 'ti-chart-bar',      label: 'Year to Date' },
    { id: 'entretiens',        icon: 'ti-messages',       label: '1:1' },
  ]
  const teamManagerTabs = [
    { id: 'dashboard-manager', icon: 'ti-layout-columns', label: 'Dashboard' },
    { id: 'bilan-equipe',      icon: 'ti-chart-bar',      label: 'Bilan équipe' },
    { id: 'saisie',            icon: 'ti-edit',           label: 'Ma saisie' },
  ]
  const adminOnlyTabs = [{ id: 'admin', icon: 'ti-settings', label: 'Admin' }]
  const prod2027Tabs = [{ id: 'prod-2027', icon: 'ti-users', label: 'Prod 2027' }]
  const userTabs = [{ id: 'saisie', icon: 'ti-edit', label: 'Ma saisie' }]
  const p1Tabs   = [{ id: 'p1',           icon: 'ti-target',    label: 'P1 of the week' }]
  const crTabs   = [{ id: 'saisie-cr',    icon: 'ti-edit',      label: 'Mon reporting' }]
  const rhTabs   = [{ id: 'dashboard-rh', icon: 'ti-chart-bar', label: 'Dashboard RH' }]
  const contactsTabs = [{ id: 'contacts', icon: 'ti-address-book', label: 'Contacts' }]
  const prospectionTabs = [
    { id: 'prospection-saisie',     icon: 'ti-edit',   label: 'Saisie RDV' },
    { id: 'prospection-classement', icon: 'ti-trophy', label: 'Classement' },
  ]
  const challengeItcTabs = [{ id: 'challenge-itc', icon: 'ti-rocket', label: 'Challenge ITC' }]
  const intercontratsTabs = [{ id: 'intercontrats', icon: 'ti-list-details', label: 'Intercontrats' }]
  const sandraManagerTabs = [
    { id: 'dashboard-manager', icon: 'ti-layout-columns', label: 'Dashboard' },
    { id: 'bilan-equipe',      icon: 'ti-chart-bar',      label: 'Bilan équipe' },
    { id: 'admin-sol',         icon: 'ti-settings',       label: 'Équipe' },
  ]

  const tabs = isTeamManager ? teamManagerTabs : isSandraManager ? sandraManagerTabs : isManager ? managerTabs : isAdminOnly ? adminOnlyTabs : isProd2027 ? prod2027Tabs : isP1 ? p1Tabs : isCR ? crTabs : isRH ? rhTabs : isContacts ? contactsTabs : isProspection ? prospectionTabs : isChallengeItc ? challengeItcTabs : isIntercontrats ? intercontratsTabs : userTabs

  const managerScope = isTeamManager ? ROMAIN_TEAM : isStephaneManager ? STEPHANE_TEAM : null

  const getAvatar = () => {
    if (user.nom === 'P1 of the week') return 'P1'
    if (user.nom === 'RH') return 'RH'
    return user.nom.slice(0, 2).toUpperCase()
  }

  const getTitle = () => {
    if (isSandraManager) return 'Dashboard SOL (AS)'
    if (isManager) return 'Reporting IA'
    if (isAdminOnly) return 'Admin'
    if (isProd2027) return 'Prod 2027'
    if (isP1) return 'P1 of the week'
    if (isCR || isRH) return 'Espace Recrutement'
    if (isContacts) return 'Base Contacts'
    if (isProspection) return 'Prospection du lundi'
    if (isChallengeItc) return 'Challenge ITC'
    if (isIntercontrats) return 'Intercontrats disponibles'
    return 'Reporting'
  }

  return (
    <div className={`app${tab === 'p1' || tab === 'challenge-itc' || tab === 'intercontrats' || tab === 'saisie-cr' ? ' wide' : ''}`}>
      <div className="nav">
        <div className="nav-title">
          <i className="ti ti-chart-bar" aria-hidden="true"></i>
          {getTitle()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="nav-avatar">{getAvatar()}</div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13 }}>
            <i className="ti ti-logout" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="tabs-wrapper">
          <div className="tabs-pill">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`tab-pill ${tab === t.id ? 'active' : ''}`}>
                <i className={`ti ${t.icon}`} aria-hidden="true"></i>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="content">
        {tab === 'dashboard-manager' && <DashboardManager restrictedScope={isTeamManager ? { label: user.nom, members: ROMAIN_TEAM } : isStephaneManager ? { label: user.nom, members: STEPHANE_TEAM } : isSandraManager ? { label: SANDRA_LABEL, entite: SANDRA_ENTITE, showRecrutement: true } : null} />}
        {tab === 'bilan-equipe'      && <BilanEquipe scopeMembers={isTeamManager ? ROMAIN_TEAM : isStephaneManager ? STEPHANE_TEAM : null} scopeEntite={isSandraManager ? SANDRA_ENTITE : null} />}
        {tab === 'saisie'            && <Saisie iaId={user.id} iaName={user.nom} />}
        {tab === 'ytd'               && <Dashboard ytdOnly={true} scopeMembers={managerScope} />}
        {tab === 'admin'             && <Admin onSelectIA={(id, nom) => {}} selectedIaId={user.id} />}
        {tab === 'admin-sol'         && <AdminEntite entite={SANDRA_ENTITE} entiteLabel={SANDRA_LABEL} />}
        {tab === 'p1'                && <P1Page />}
        {tab === 'saisie-cr'         && <SaisieCR crNom={user.nom} entite={user.entite} />}
        {tab === 'dashboard-rh'      && <DashboardRH />}
        {tab === 'entretiens'        && <Entretiens scopeMembers={managerScope} />}
        {tab === 'contacts'          && <Contacts />}
        {tab === 'prospection-saisie'     && <ProspectionSaisie iaId={user.id} iaName={user.nom} />}
        {tab === 'prospection-classement' && <Classement entite={user?.entite || null} />}
        {tab === 'challenge-itc'          && <ChallengeItc iaId={user.id} iaName={user.nom} startOnDashboard={challengeDashboardDirect} />}
        {tab === 'intercontrats'          && <Intercontrats />}
        {tab === 'prod-2027'              && <Prod2027 />}
      </div>
    </div>
  )
}
