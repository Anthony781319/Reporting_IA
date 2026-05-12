import { useState } from 'react'

const CR_LIST = ['Younes', 'Soundous', 'Zayneb', 'Shaymae', 'Soukaina']

export default function LoginCR({ onLogin, onBack }) {
  const [nom, setNom] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (!nom || !password) { setError('Merci de renseigner ton prénom et mot de passe.'); return }
    const success = onLogin({ nom, type: 'cr' }, password)
    if (!success) setError('Nom ou mot de passe incorrect.')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <i className="ti ti-users" aria-hidden="true" style={{ fontSize: 36, color: '#534AB7' }}></i>
        <div style={{ fontSize: 20, fontWeight: 500, marginTop: 8 }}>Espace Recrutement</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>Connecte-toi pour accéder à ton reporting</div>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10, fontWeight: 500 }}>Je suis...</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 16 }}>
          {CR_LIST.map((cr, i) => {
            const isSelected = nom === cr
            return (
              <div
                key={cr}
                onClick={() => { setNom(cr); setError('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: isSelected ? '2px solid #534AB7' : '0.5px solid var(--color-border-tertiary)',
                  background: isSelected ? '#EEEDFE' : 'var(--color-background-primary)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                  {cr.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: isSelected ? 500 : 400, color: isSelected ? '#3C3489' : 'var(--color-text-primary)' }}>{cr}</span>
              </div>
            )
          })}
        </div>

        {nom && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Mot de passe</div>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Entre ton mot de passe"
              style={{ width: '100%' }}
              autoFocus
            />
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={!nom}
          style={{
            width: '100%', padding: 13,
            background: nom ? '#534AB7' : 'var(--color-background-secondary)',
            color: nom ? '#EEEDFE' : 'var(--color-text-secondary)',
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 500, cursor: nom ? 'pointer' : 'default',
            transition: 'all 0.2s'
          }}
        >
          Se connecter
        </button>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            ← Retour Espace IA
          </button>
        </div>
      </div>
    </div>
  )
}
