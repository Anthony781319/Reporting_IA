import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin, onSwitchCR }) {
  const [iaList, setIaList] = useState([])
  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('ia').select('*').order('nom').then(({ data }) => {
      setIaList(data || [])
      setLoading(false)
    })
  }, [])

  const AVATAR_COLORS = [
    ['#EEEDFE','#3C3489'],['#E1F5EE','#085041'],['#FAEEDA','#633806'],
    ['#FBEAF0','#72243E'],['#F1EFE8','#444441'],['#E6F1FB','#0C447C'],
  ]

  const handleSubmit = () => {
    if (!selected) return setError('Sélectionne ton prénom')
    if (!password) return setError('Entre ton mot de passe')
    const ok = onLogin(selected, password)
    if (!ok) setError('Mot de passe incorrect')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <i className="ti ti-chart-bar" aria-hidden="true" style={{ fontSize: 36, color: '#534AB7' }}></i>
        <div style={{ fontSize: 20, fontWeight: 500, marginTop: 8 }}>Reporting IA</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>Connecte-toi pour accéder à ton espace</div>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10, fontWeight: 500 }}>Je suis...</div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 20 }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 16 }}>
            {iaList.map((ia, i) => {
              const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const isSelected = selected?.id === ia.id
              return (
                <div
                  key={ia.id}
                  onClick={() => { setSelected(ia); setError('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    border: isSelected ? '2px solid #534AB7' : '0.5px solid var(--color-border-tertiary)',
                    background: isSelected ? '#EEEDFE' : 'var(--color-background-primary)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                    {ia.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 500 : 400, color: isSelected ? '#3C3489' : 'var(--color-text-primary)' }}>{ia.nom}</span>
                </div>
              )
            })}
          </div>
        )}

        {selected && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Mot de passe</div>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError
