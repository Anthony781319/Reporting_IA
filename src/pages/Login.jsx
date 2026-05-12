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
          <div style={{ display: 'grid', gridTemplateColumn
