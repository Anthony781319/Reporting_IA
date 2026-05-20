import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CR_LIST = ['Younes', 'Soundous', 'Zayneb', 'Shaymae', 'Soukaina']

const PORTALS = [
  { id: 'ia',          icon: '💼', label: "Ingénieur d'affaires", desc: 'Accès à ton espace reporting',   bg: '#EEEDFE', color: '#534AB7' },
  { id: 'recrutement', icon: '👥', label: 'Recrutement',          desc: 'Accès à ton espace recrutement', bg: '#E1F5EE', color: '#0F6E56' },
  { id: 'manager',     icon: '🎯', label: 'Manager',              desc: 'Accès dashboard & pilotage',     bg: '#FAEEDA', color: '#BA7517' },
]

const MANAGER_OPTIONS = [
  {
    id: 'commerce',
    icon: '📊',
    label: 'Dashboard Commerce',
    desc: 'Pilotage & reporting équipe',
    bg: '#DBEAFE',
    color: '#2563EB',
    darkColor: '#1E3A8A'
  },
  {
    id: 'rh',
    icon: '👥',
    label: 'Dashboard RH',
    desc: 'Suivi recrutement & candidats',
    bg: '#DCFCE7',
    color: '#16A34A',
    darkColor: '#14532D'
  },
]

const CARD_COLORS = [
  { bg: '#EEEDFE', border: '#534AB7', avatarBg: '#534AB7', avatarText: '#EEEDFE', nameColor: '#3C3489' },
  { bg: '#E1F5EE', border: '#0F6E56', avatarBg: '#0F6E56', avatarText: '#E1F5EE', nameColor: '#085041' },
  { bg: '#FAEEDA', border: '#BA7517', avatarBg: '#BA7517', avatarText: '#FAEEDA', nameColor: '#633806' },
  { bg: '#FBEAF0', border: '#993556', avatarBg: '#993556', avatarText: '#FBEAF0', nameColor: '#72243E' },
  { bg: '#E6F1FB', border: '#185FA5', avatarBg: '#185FA5', avatarText: '#E6F1FB', nameColor: '#0C447C' },
  { bg: '#EAF3DE', border: '#3B6D11', avatarBg: '#3B6D11', avatarText: '#EAF3DE', nameColor: '#27500A' },
  { bg: '#F1EFE8', border: '#5F5E5A', avatarBg: '#5F5E5A', avatarText: '#F1EFE8', nameColor: '#444441' },
]

const loginWrap = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }
const labelStyle = { fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, fontWeight: 500 }

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} style={{ position: 'absolute', top: 24, left: 24, background: 'none', border: 'none', fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
      ← Retour
    </button>
  )
}

function Header({ icon, title }) {
  return (
    <div style={{ marginBottom: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Connecte-toi pour accéder à ton espace</div>
    </div>
  )
}

function PasswordField({ show, value, onChange, onEnter }) {
  if (!show) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={labelStyle}>Mot de passe</div>
      <input type="password" value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onEnter()} placeholder="Entre ton mot de passe" style={{ width: '100%' }} autoFocus />
    </div>
  )
}

function SubmitBtn({ disabled, onClick, color }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: '100%', padding: 13, background: disabled ? 'var(--color-bg-secondary)' : (color || '#534AB7'), color: disabled ? 'var(--color-text-muted)' : '#ffffff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.2s' }}>
      Se connecter
    </button>
  )
}

function ErrorMsg({ msg }) {
  return <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>{msg}</div>
}

function Loader() {
  return <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 20 }}>Chargement...</div>
}

export default function Login({ onLogin }) {
  const [portal, setPortal] = useState(null)
  const [iaList, setIaList] = useState([])
  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [rhPassword, setRhPassword] = useState('')
  const [showRH, setShowRH] = useState(false)
  const [error, setError] = useState('')
  const [rhError, setRhError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (portal === 'ia' || portal === 'manager') {
      setLoading(true)
      supabase.from('ia').select('*').order('nom').then(({ data }) => {
        setIaList(data || [])
        setLoading(false)
      })
    }
  }, [portal])

  const handleBack = () => {
    setPortal(null); setSelected(null); setPassword('')
    setRhPassword(''); setError(''); setRhError(''); setShowRH(false)
  }

  const handleSubmitIA = () => {
    if (!selected) return setError('Sélectionne ton prénom')
    if (!password) return setError('Entre ton mot de passe')
    const ok = onLogin(selected, password)
    if (!ok) setError('Mot de passe incorrect')
  }

  const handleSubmitCR = () => {
    if (!selected) return setError('Sélectionne ton prénom')
    if (!password) return setError('Entre ton mot de passe')
    if (selected === 'P1 of the week') {
      const ok = onLogin({ nom: 'P1 of the week' }, password)
      if (!ok) setError('Mot de passe incorrect')
      return
    }
    const ok = onLogin({ nom: selected, type: 'cr' }, password)
    if (!ok) setError('Mot de passe incorrect')
  }

  const handleRHLogin = () => {
    if (!rhPassword) return setRhError('Entre le mot de passe RH')
    const ok = onLogin({ nom: 'RH' }, rhPassword)
    if (!ok) setRhError('Mot de passe incorrect')
  }

  // — Écran d'accueil : choix du portail —
  if (!portal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <i className="ti ti-chart-bar" aria-hidden="true" style={{ fontSize: 40, color: '#534AB7' }}></i>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 10 }}>Reporting</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>Quel est ton espace ?</div>
        </div>
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PORTALS.map(p => (
            <div key={p.id} onClick={() => setPortal(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 14, cursor: 'pointer', border: '1.5px solid ' + p.color + '40', background: p.bg, transition: 'all 0.15s' }}>
              <div style={{ fontSize: 24, width: 48, height: 48, borderRadius: 12, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: p.color }}>{p.label}</div>
                <div style={{ fontSize: 12, color: p.color + 'AA', marginTop: 2 }}>{p.desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', color: p.color, fontSize: 18 }}>›</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // — Portail IA —
  if (portal === 'ia') {
    const filteredList = iaList.filter(ia => ia.nom !== 'Anthony' && ia.nom !== 'P1 of the week')
    return (
      <div style={loginWrap}>
        <BackButton onClick={handleBack} />
        <Header icon="💼" title="Ingénieur d'affaires" />
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={labelStyle}>Je suis...</div>
          {loading ? <Loader /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {filteredList.map((ia, i) => {
                const c = CARD_COLORS[i % CARD_COLORS.length]
                const isSelected = selected && selected.id === ia.id
                return (
                  <div key={ia.id} onClick={() => { setSelected(ia); setError('') }}
                    style={{ borderRadius: 12, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: c.bg, border: '1.5px solid ' + (isSelected ? c.border : c.bg), outline: isSelected ? '2.5px solid ' + c.border : 'none', transition: 'all 0.15s' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.avatarBg, color: c.avatarText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                      {ia.nom.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: c.nameColor, textAlign: 'center', lineHeight: 1.2 }}>{ia.nom}</div>
                  </div>
                )
              })}
            </div>
          )}
          <PasswordField show={!!selected} value={password} onChange={v => { setPassword(v); setError('') }} onEnter={handleSubmitIA} />
          {error && <ErrorMsg msg={error} />}
          <SubmitBtn disabled={!selected} onClick={handleSubmitIA} color={selected ? CARD_COLORS[filteredList.findIndex(ia => ia.id === (selected && selected.id)) % CARD_COLORS.length].border : undefined} />
        </div>
      </div>
    )
  }

  // — Portail Recrutement —
  if (portal === 'recrutement') {
    return (
      <div style={loginWrap}>
        <BackButton onClick={handleBack} />
        <Header icon="👥" title="Recrutement" />
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={labelStyle}>Je suis...</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 16 }}>
            {CR_LIST.map((cr, i) => {
              const c = CARD_COLORS[i % CARD_COLORS.length]
              const isSelected = selected === cr
              return (
                <div key={cr} onClick={() => { setSelected(cr); setError('') }}
                  style={{ borderRadius: 12, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: c.bg, border: '1.5px solid ' + (isSelected ? c.border : c.bg), outline: isSelected ? '2.5px solid ' + c.border : 'none', transition: 'all 0.15s' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.avatarBg, color: c.avatarText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                    {cr.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: c.nameColor, textAlign: 'center' }}>{cr}</div>
                </div>
              )
            })}
            <div onClick={() => { setSelected('P1 of the week'); setError('') }}
              style={{ borderRadius: 12, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#F1EFE8', border: '1.5px solid ' + (selected === 'P1 of the week' ? '#5F5E5A' : '#F1EFE8'), outline: selected === 'P1 of the week' ? '2.5px solid #5F5E5A' : 'none', transition: 'all 0.15s' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5F5E5A', color: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>P1</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#444441', textAlign: 'center' }}>P1 of the week</div>
            </div>
          </div>
          <PasswordField show={!!selected} value={password} onChange={v => { setPassword(v); setError('') }} onEnter={handleSubmitCR} />
          {error && <ErrorMsg msg={error} />}
          <SubmitBtn disabled={!selected} onClick={handleSubmitCR} />
        </div>
      </div>
    )
  }

  // — Portail Manager —
  if (portal === 'manager') {
    const anthony = iaList.find(ia => ia.nom === 'Anthony')
    return (
      <div style={loginWrap}>
        <BackButton onClick={handleBack} />
        <Header icon="🎯" title="Manager" />
        <div style={{ width: '100%', maxWidth: 360 }}>
          {loading ? <Loader /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {MANAGER_OPTIONS.map(opt => {
                const isSelected = opt.id === 'commerce'
                  ? (selected && anthony && selected.id === anthony.id)
                  : showRH
                return (
                  <div key={opt.id}>
                    <div
                      onClick={() => {
                        if (opt.id === 'commerce') { setSelected(anthony); setShowRH(false); setError('') }
                        else { setShowRH(true); setSelected(null); setRhError('') }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '18px 20px', borderRadius: 14, cursor: 'pointer',
                        background: opt.bg,
border: '2px solid ' + (isSelected ? opt.color : opt.color + '40'),
                        transition: 'all 0.15s'
                      }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: opt.bg, border: '1.5px solid ' + opt.color + '50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                        {opt.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: isSelected ? opt.darkColor : 'var(--color-text)' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: isSelected ? opt.color : 'var(--color-text-muted)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: isSelected ? opt.color : 'var(--color-text-muted)', fontSize: 18 }}>›</div>
                    </div>

                    {opt.id === 'commerce' && isSelected && (
                      <div style={{ marginTop: 10 }}>
                        <PasswordField show value={password} onChange={v => { setPassword(v); setError('') }} onEnter={handleSubmitIA} />
                        {error && <ErrorMsg msg={error} />}
                        <SubmitBtn disabled={false} onClick={handleSubmitIA} color={opt.color} />
                      </div>
                    )}

                    {opt.id === 'rh' && isSelected && (
                      <div style={{ marginTop: 10 }}>
                        <div style={labelStyle}>Mot de passe</div>
                        <input type="password" value={rhPassword} onChange={e => { setRhPassword(e.target.value); setRhError('') }} onKeyDown={e => e.key === 'Enter' && handleRHLogin()} placeholder="Entre ton mot de passe" style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }} autoFocus />
                        {rhError && <ErrorMsg msg={rhError} />}
                        <button onClick={handleRHLogin} style={{ width: '100%', padding: 13, background: opt.color, color: opt.bg, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                          Se connecter
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }
}
