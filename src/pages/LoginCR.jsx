import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const CR_LIST = ['Younes', 'Soundous', 'Zayneb', 'Shaymae', 'Soukaina']

export default function LoginCR() {
  const [nom, setNom] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    setError('')
    if (!nom || !password) {
      setError('Merci de renseigner ton nom et ton mot de passe.')
      return
    }
    setLoading(true)
    const { data, error: sbError } = await supabase
      .from('cr_users')
      .select('*')
      .eq('nom', nom)
      .eq('password', password)
      .single()

    setLoading(false)

    if (sbError || !data) {
      setError('Nom ou mot de passe incorrect.')
      return
    }

    sessionStorage.setItem('cr_nom', data.nom)
    navigate('/saisie-cr')
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>👥 Espace Recrutement</h2>
        <p style={styles.subtitle}>Connecte-toi pour accéder à ton reporting</p>

        <label style={styles.label}>Ton prénom</label>
        <select style={styles.input} value={nom} onChange={e => setNom(e.target.value)}>
          <option value=''>-- Sélectionne ton prénom --</option>
          {CR_LIST.map(cr => (
            <option key={cr} value={cr}>{cr}</option>
          ))}
        </select>

        <label style={styles.label}>Mot de passe</label>
        <input
          style={styles.input}
          type='password'
          placeholder='Ton mot de passe'
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.button} onClick={handleLogin} disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a2e',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 8px',
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#444',
    marginBottom: -4,
  },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    margin: 0,
  },
  button: {
    marginTop: 8,
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
