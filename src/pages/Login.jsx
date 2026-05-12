import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CR_LIST = ['Younes', 'Soundous', 'Zayneb', 'Shaymae', 'Soukaina']

const PORTALS = [
  { id: 'ia', icon: '💼', label: 'Ingénieur d\'affaires', desc: 'Accès à ton espace reporting' },
  { id: 'recrutement', icon: '👥', label: 'Recrutement', desc: 'Accès à ton espace recrutement' },
  { id: 'manager', icon: '🎯', label: 'Manager', desc: 'Accès dashboard & pilotage' },
]

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

  const AVATAR_COLORS = [
    ['#EEEDFE','#3C3489'],['#E1F5EE','#085041'],['#FAEEDA','#633806'],
    ['#FBEAF0','#72243E'],['#F1EFE8','#444441'],['#E6F1FB','#0C447C'],
  ]

  const handleBack = () => {
    setPortal(null)
    setSelected(null)
    setPassword('')
    setRhPassword('')
    setError('')
    setRhError('')
    setShowRH(false)
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
    const ok = onLogin({ nom: selected, type: 'cr' }, password)
    if (!ok) setError('Mot de passe incorrect')
  }

  const handleRHLogin = () => {
    if (!rhPassword) return setRhError('Entre le mot de passe RH')
    const ok = onLogin({ nom: 'RH' }, rhPassword)
    if (!ok) setRhError('Mot de passe incorrect')
  }

  if (!portal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <i className="ti ti-chart-bar" aria-hidden="true" style={{ fontSize: 40, color: '#534AB7' }}></i>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 10 }}>Reporting</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 6 }}>Quel est ton espace ?</div>
        </div>

        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PORTALS.map(p => (
            <div
              key={p.id}
              onClick={() => setPortal(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 14, cursor: 'pointer', border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            >
              <div style={{ fontSize: 24, width: 48, height: 48, borderRadius: 12, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {p.icon}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{p.desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)', fontSize: 18 }}>›</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (portal === 'ia') {
    const filteredList = iaList.filter(ia => ia.nom !== 'Anthony' && ia.nom !== 'P1 of the week')
    return (
      <div style={loginWrap}>
        <BackButton onClick={handleBack} />
        <Header icon="💼" title="Ingénieur d'affaires" />
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={labelStyle}>Je suis...</div>
          {loading ? <Loader /> : (
            <div style={grid2}>
              {filteredList.map((ia, i) => (
                <UserCard key={ia.id} ia={ia} index={i} selected={selected} onSelect={s => { setSelected(s); setError('') }} colors={AVATAR_COLORS} />
              ))}
            </div>
          )}
          <PasswordField show={!!selected} value={password} onChange={v => { setPassword(v); setError('') }} onEnter={handleSubmitIA} />
          {error && <ErrorMsg msg={error} />}
          <SubmitBtn disabled={!selected} onClick={handleSubmitIA} />
        </div>
      </div>
    )
  }

  if (portal === 'recrutement') {
    return (
      <div style={loginWrap}>
        <BackButton onClick={handleBack} />
        <Header icon="👥" title="Recrutement" />
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={labelStyle}>Je suis...</div>
          <div style={grid2}>
            {CR_LIST.map((cr) => {
              const isSelected = selected === cr
              return (
                <div key={cr} onClick={() => { setSelected(cr); setError('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: isSelected ? '2px solid #534AB7' : '0.5px solid var(--color-border-tertiary)', background: isSelected ? '#EEEDFE' : 'var(--color-background-primary)', transition: 'all 0.15s' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                    {cr.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 500 : 400, color: isSelected ? '#3C3489' : 'var(--color-text-primary)' }}>{cr}</span>
                </div>
              )
            })}
          </div>
          <PasswordField show={!!selected} value={password} onChange={v => { setPassword(v); setError('') }} onEnter={handleSubmitCR} />
          {error && <ErrorMsg msg={error} />}
          <SubmitBtn disabled={!selected} onClick={handleSubmitCR} />
        </div>
      </div>
    )
  }

  if (portal === 'manager') {
    const anthony = iaList.find(ia => ia.nom === 'Anthony')
    return (
      <div style={loginWrap}>
        <BackButton onClick={handleBack} />
        <Header icon="🎯" title="Manager" />
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={labelStyle}>Connexion</div>
          {loading ? <Loader /> : anthony && (
            <div style={{ marginBottom: 16 }}>
              <div onClick={() => { setSelected(anthony); setShowRH(false); setError('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: selected?.id === anthony.id ? '2px solid #534AB7' : '0.5px solid var(--color-border-tertiary)', background: selected?.id === anthony.id ? '#EEEDFE' : 'var(--color-background-primary)', transition: 'all 0.15s', marginBottom: 8 }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>AN</div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Anthony</span>
              </div>
              <PasswordField show={selected?.id === anthony.id} value={password} onChange={v => { setPassword(v); setError('') }} onEnter={handleSubmitIA} />
              {error && <ErrorMsg msg={error} />}
              {selected?.id === anthony.id && <SubmitBtn disabled={false} onClick={handleSubmitIA} />}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border-tertiary)', paddingTop: 16, marginTop: 8 }}>
            {!showRH ? (
              <button onClick={() => { setShowRH(true); setSelected(null) }}
                style={{ width: '100%', padding: 12, background: 'none', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                📊 Accès Dashboard RH
              </button>
            ) : (
              <div>
                <div style={labelStyle}>Mot de passe RH</div>
                <input type="password" value={rhPassword} onChange={e => { setRhPassword(e.target.value); setRhError('') }} onKeyDown={e => e.key === 'Enter' && handleRHLogin()} placeholder="Mot de passe" style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }} autoFocus />
                {rhError && <ErrorMsg msg={rhError} />}
                <bu
