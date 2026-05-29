import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Saisie from './Saisie'

const AVATAR_COLORS = [
  ['#EDE9FE','#6D28D9'],['#D1FAE5','#065F46'],['#FEF3C7','#92400E'],
  ['#FCE7F3','#9D174D'],['#DBEAFE','#1E40AF'],['#DCFCE7','#166534'],
  ['#F3F4F6','#374151'],['#FFE4E6','#9F1239'],['#E0F2FE','#0369A1'],
  ['#FEF9C3','#854D0E'],
]

export default function Admin({ onSelectIA, selectedIaId }) {
  const [iaList, setIaList] = useState([])
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const [saisieIA, setSaisieIA] = useState(null)
  const [saisieIndex, setSaisieIndex] = useState(0)

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
    if (saisieIA?.id === id) setSaisieIA(null)
    await loadIA()
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 16px' }}>

      {/* Section saisie manager */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.3px' }}>
          📝 Saisie pour un Ingénieur d'Affaires
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
          Sélectionne un IA pour saisir ou modifier son reporting.
        </div>

        {!saisieIA ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
            {iaList.map((ia, i) => {
              const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
              return (
                <div key={ia.id} onClick={() => { setSaisieIA(ia); setSaisieIndex(i) }}
                  style={{ background: bg, borderRadius: 14, padding: '14px 10px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: fg, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>
                    {ia.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: fg }}>{ia.nom}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div>
            {/* Header IA sélectionnée */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: AVATAR_COLORS[saisieIndex % AVATAR_COLORS.length][0], borderRadius: 14, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: AVATAR_COLORS[saisieIndex % AVATAR_COLORS.length][1], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                {saisieIA.nom.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: AVATAR_COLORS[saisieIndex % AVATAR_COLORS.length][1] }}>{saisieIA.nom}</div>
                <div style={{ fontSize: 11, color: AVATAR_COLORS[saisieIndex % AVATAR_COLORS.length][1], opacity: 0.7 }}>Ingénieur d'Affaires</div>
              </div>
              <button onClick={() => setSaisieIA(null)}
                style={{ background: 'none', border: `1.5px solid ${AVATAR_COLORS[saisieIndex % AVATAR_COLORS.length][1]}40`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: AVATAR_COLORS[saisieIndex % AVATAR_COLORS.length][1] }}>
                Changer
              </button>
            </div>
            {/* Composant saisie avec toutes les semaines */}
            <Saisie iaId={saisieIA.id} iaName={saisieIA.nom} managerMode={true} />
          </div>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--color-border-tertiary)', marginBottom: 24 }} />

      {/* Section sélection identité */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.3px' }}>
        👤 Mon identité
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
        Sélectionne ton nom pour activer ta saisie personnelle.
      </div>
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {iaList.map((ia, i) => {
          const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
          const isSelected = selectedIaId === ia.id
          return (
            <div key={ia.id} onClick={() => onSelectIA(ia.id, ia.nom)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border-tertiary)', cursor: 'pointer', background: isSelected ? '#EEEDFE' : 'transparent', transition: 'background 0.15s' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                {ia.nom.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontSize: 14, color: isSelected ? '#3C3489' : 'var(--color-text-primary)', fontWeight: isSelected ? 500 : 400 }}>{ia.nom}</span>
              {isSelected && <span style={{ fontSize: 11, color: '#534AB7', fontWeight: 500 }}>✓ Sélectionné</span>}
              <button onClick={e => { e.stopPropagation(); removeIA(ia.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, fontSize: 15 }}>
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          )
        })}
      </div>

      {/* Ajouter un IA */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 14, letterSpacing: '-0.3px' }}>
        ➕ Ajouter un Ingénieur d'Affaires
      </div>
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14 }}>
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
        <button onClick={addIA} disabled={adding}
          style={{ width: '100%', padding: 12, background: '#6D28D9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {adding ? 'Ajout...' : '+ Ajouter'}
        </button>
      </div>
    </div>
  )
}
