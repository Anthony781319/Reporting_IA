import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const AVATAR_COLORS = [
  ['#EEEDFE','#3C3489'],['#E1F5EE','#085041'],['#FAEEDA','#633806'],
  ['#FBEAF0','#72243E'],['#F1EFE8','#444441'],['#E6F1FB','#0C447C'],
]

export default function Admin({ onSelectIA, selectedIaId }) {
  const [iaList, setIaList] = useState([])
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadIA() }, [])

  const loadIA = async () => {
    const { data } = await supabase.from('ia').select('*').order('nom')
    setIaList(data || [])
    setLoading(false)
  }

  const addIA = async () => {
    if (!nom.trim() || !email.trim()) return setMsg('Prénom et email requis')
    setAdding(true)
    const { error } = await supabase.from('ia').insert({ nom: nom.trim(), email: email.trim() })
    if (error) setMsg('Erreur : ' + error.message)
    else { setNom(''); setEmail(''); setMsg('IA ajouté !'); await loadIA() }
    setAdding(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const removeIA = async (id) => {
    if (!window.confirm('Supprimer cet IA ? Ses données seront effacées.')) return
    await supabase.from('ia').delete().eq('id', id)
    if (selectedIaId === id) onSelectIA(null, null)
    await loadIA()
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
        Sélectionne ton nom pour activer la saisie, ou gère l'équipe ci-dessous.
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '10px 14px', background: 'var(--color-background-secondary)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          Je suis...
        </div>
        {iaList.map((ia, i) => {
          const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
          const isSelected = selectedIaId === ia.id
          return (
            <div
              key={ia.id}
              onClick={() => onSelectIA(ia.id, ia.nom)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px',
                borderTop: '0.5px solid var(--color-border-tertiary)',
                cursor: 'pointer',
                background: isSelected ? '#EEEDFE' : 'transparent',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                {ia.nom.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontSize: 14, color: isSelected ? '#3C3489' : 'var(--color-text-primary)', fontWeight: isSelected ? 500 : 400 }}>{ia.nom}</span>
              {isSelected && <span style={{ fontSize: 11, color: '#534AB7', fontWeight: 500 }}>✓ Sélectionné</span>}
              <button
                onClick={e => { e.stopPropagation(); removeIA(ia.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, fontSize: 15 }}
              >
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 12 }}>Ajouter un IA</div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Prénom</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Thomas" style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="thomas@equipe.fr" style={{ width: '100%' }} />
        </div>
        {msg && (
          <div style={{ fontSize: 12, marginBottom: 10, color: msg.includes('Erreur') ? '#A32D2D' : '#0F6E56', padding: '6px 10px', background: msg.includes('Erreur') ? '#FCEBEB' : '#E1F5EE', borderRadius: 6 }}>
            {msg}
          </div>
        )}
        <button
          onClick={addIA}
          disabled={adding}
          style={{ width: '100%', padding: 12, background: '#534AB7', color: '#EEEDFE', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          {adding ? 'Ajout...' : '+ Ajouter'}
        </button>
      </div>
    </div>
  )
}
