import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Écran de gestion d'équipe en autonomie pour une entité "satellite" (ex: Sandra / "SOL (AS)") :
// même principe que les sections IA / CR d'Admin.jsx, mais scopé à une entité via la colonne
// ia.entite, et sans les sections propres à Anthony (saisie manager, identité perso, collaborateurs ITC).
// Toutes les lignes créées ici portent entite={entite}, ce qui les garde étanches de l'équipe d'Anthony
// dans tout le reste de l'appli (Login, DashboardManager, BilanEquipe, SaisieCR...).

const AVATAR_COLORS = [
  ['#EDE9FE','#6D28D9'],['#D1FAE5','#065F46'],['#FEF3C7','#92400E'],
  ['#FCE7F3','#9D174D'],['#DBEAFE','#1E40AF'],['#DCFCE7','#166534'],
  ['#F3F4F6','#374151'],['#FFE4E6','#9F1239'],['#E0F2FE','#0369A1'],
  ['#FEF9C3','#854D0E'],
]

export default function AdminEntite({ entite, entiteLabel }) {
  const [iaList, setIaList] = useState([])
  const [anciensList, setAnciensList] = useState([])
  const [showAnciens, setShowAnciens] = useState(false)
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')

  const [crList, setCrList] = useState([])
  const [crAnciensList, setCrAnciensList] = useState([])
  const [showCrAnciens, setShowCrAnciens] = useState(false)
  const [crNom, setCrNom] = useState('')
  const [crAdding, setCrAdding] = useState(false)
  const [crMsg, setCrMsg] = useState('')

  useEffect(() => { load() }, [entite])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('ia').select('*').eq('entite', entite).order('nom')
    const all = data || []
    setIaList(all.filter(ia => ia.statut !== 'ancien' && ia.type !== 'cr'))
    setAnciensList(all.filter(ia => ia.statut === 'ancien' && ia.type !== 'cr'))
    setCrList(all.filter(ia => ia.type === 'cr' && ia.statut !== 'ancien'))
    setCrAnciensList(all.filter(ia => ia.type === 'cr' && ia.statut === 'ancien'))
    setLoading(false)
  }

  const addIA = async () => {
    if (!nom.trim()) return setMsg('Prénom requis')
    setAdding(true)
    const { error } = await supabase.from('ia').insert({ nom: nom.trim(), email: email.trim() || null, statut: 'actif', entite })
    if (error) setMsg('Erreur : ' + error.message)
    else { setNom(''); setEmail(''); setMsg('IA ajouté !'); await load() }
    setAdding(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const archiveIA = async (id) => {
    if (!window.confirm("Archiver cet IA ? Il n'apparaîtra plus dans les menus actifs, mais ses données historiques sont conservées.")) return
    await supabase.from('ia').update({ statut: 'ancien' }).eq('id', id)
    await load()
  }

  const reactivateIA = async (id) => {
    await supabase.from('ia').update({ statut: 'actif' }).eq('id', id)
    await load()
  }

  const removeIA = async (id) => {
    if (!window.confirm('Supprimer définitivement cet IA ? Ses données seront effacées, cette action est irréversible.')) return
    await supabase.from('ia').delete().eq('id', id)
    await load()
  }

  const addCR = async () => {
    if (!crNom.trim()) return setCrMsg('Prénom requis')
    setCrAdding(true)
    const { error } = await supabase.from('ia').insert({ nom: crNom.trim(), type: 'cr', statut: 'actif', entite })
    if (error) setCrMsg('Erreur : ' + error.message)
    else { setCrNom(''); setCrMsg('CR ajoutée !'); await load() }
    setCrAdding(false)
    setTimeout(() => setCrMsg(''), 3000)
  }

  const archiveCR = async (id) => {
    if (!window.confirm("Archiver cette CR ? Elle n'apparaîtra plus dans l'écran de connexion, mais ses données historiques sont conservées.")) return
    await supabase.from('ia').update({ statut: 'ancien' }).eq('id', id)
    await load()
  }

  const reactivateCR = async (id) => {
    await supabase.from('ia').update({ statut: 'actif' }).eq('id', id)
    await load()
  }

  const removeCR = async (id) => {
    if (!window.confirm('Supprimer définitivement cette CR ? Cette action est irréversible.')) return
    await supabase.from('ia').delete().eq('id', id)
    await load()
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 16px' }}>

      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.3px' }}>
        🏢 Équipe — {entiteLabel}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
        Gère ici tes propres Ingénieur(e)s d'Affaires et Chargé(e)s de recrutement : ils apparaîtront dans ton espace de connexion et dans ton dashboard, sans être mélangés avec l'équipe d'Anthony.
      </div>

      {/* Section IA */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.3px' }}>
        💼 Ingénieur(e)s d'Affaires
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
        Liste utilisée par le portail de connexion "SOL (AS)" et ton dashboard.
      </div>
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {iaList.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '11px 14px' }}>Aucune IA pour le moment.</div>
        ) : iaList.map((ia, i) => {
          const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
          return (
            <div key={ia.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                {ia.nom.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-primary)' }}>{ia.nom}</span>
              <button onClick={() => archiveIA(ia.id)} title="Archiver (a quitté la société)"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, fontSize: 15 }}>
                <i className="ti ti-archive" aria-hidden="true"></i>
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Prénom</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Thomas" style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Email (optionnel)</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="thomas@equipe.fr" style={{ width: '100%' }} />
        </div>
        {msg && (
          <div style={{ fontSize: 12, marginBottom: 10, color: msg.includes('Erreur') ? '#A32D2D' : '#0F6E56', padding: '6px 10px', background: msg.includes('Erreur') ? '#FCEBEB' : '#E1F5EE', borderRadius: 6 }}>
            {msg}
          </div>
        )}
        <button onClick={addIA} disabled={adding}
          style={{ width: '100%', padding: 12, background: '#0E7490', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {adding ? 'Ajout...' : '+ Ajouter un IA'}
        </button>
      </div>

      <div onClick={() => setShowAnciens(!showAnciens)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: 20, marginBottom: showAnciens ? 14 : 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          🗄️ Anciens IA {anciensList.length > 0 && `(${anciensList.length})`}
        </div>
        <i className={`ti ti-chevron-${showAnciens ? 'up' : 'down'}`} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }}></i>
      </div>

      {showAnciens && (
        anciensList.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '8px 0' }}>Aucun IA archivé pour le moment.</div>
        ) : (
          <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden' }}>
            {anciensList.map((ia, i) => (
              <div key={ia.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border-tertiary)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F3F4F6', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                  {ia.nom.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-secondary)' }}>{ia.nom}</span>
                <button onClick={() => reactivateIA(ia.id)} title="Réactiver"
                  style={{ background: 'none', border: '1.5px solid #0E7490', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#0E7490', marginRight: 4 }}>
                  ↩️ Réactiver
                </button>
                <button onClick={() => removeIA(ia.id)} title="Supprimer définitivement"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, fontSize: 15 }}>
                  <i className="ti ti-trash" aria-hidden="true"></i>
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Section CR */}
      <div style={{ height: 1, background: 'var(--color-border-tertiary)', margin: '24px 0' }} />
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.3px' }}>
        👥 Chargé(e)s de recrutement
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
        Liste utilisée par le portail de connexion "SOL (AS)" et ton dashboard Recrutement.
      </div>
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {crList.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '11px 14px' }}>Aucune CR pour le moment.</div>
        ) : crList.map((cr, i) => (
          <div key={cr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#CFFAFE', color: '#0E7490', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
              {cr.nom.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-primary)' }}>{cr.nom}</span>
            <button onClick={() => archiveCR(cr.id)} title="Archiver (a quitté la société)"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, fontSize: 15 }}>
              <i className="ti ti-archive" aria-hidden="true"></i>
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Prénom</label>
          <input type="text" value={crNom} onChange={e => setCrNom(e.target.value)} placeholder="ex: Salma" style={{ width: '100%' }} />
        </div>
        {crMsg && (
          <div style={{ fontSize: 12, marginBottom: 10, color: crMsg.includes('Erreur') ? '#A32D2D' : '#0F6E56', padding: '6px 10px', background: crMsg.includes('Erreur') ? '#FCEBEB' : '#E1F5EE', borderRadius: 6 }}>
            {crMsg}
          </div>
        )}
        <button onClick={addCR} disabled={crAdding}
          style={{ width: '100%', padding: 12, background: '#0F6E56', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {crAdding ? 'Ajout...' : '+ Ajouter une CR'}
        </button>
      </div>

      <div onClick={() => setShowCrAnciens(!showCrAnciens)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: 20, marginBottom: showCrAnciens ? 14 : 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          🗄️ Anciennes CR {crAnciensList.length > 0 && `(${crAnciensList.length})`}
        </div>
        <i className={`ti ti-chevron-${showCrAnciens ? 'up' : 'down'}`} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }}></i>
      </div>

      {showCrAnciens && (
        crAnciensList.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '8px 0' }}>Aucune CR archivée pour le moment.</div>
        ) : (
          <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden' }}>
            {crAnciensList.map((cr, i) => (
              <div key={cr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border-tertiary)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F3F4F6', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                  {cr.nom.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-secondary)' }}>{cr.nom}</span>
                <button onClick={() => reactivateCR(cr.id)} title="Réactiver"
                  style={{ background: 'none', border: '1.5px solid #0F6E56', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#0F6E56', marginRight: 4 }}>
                  ↩️ Réactiver
                </button>
                <button onClick={() => removeCR(cr.id)} title="Supprimer définitivement"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, fontSize: 15 }}>
                  <i className="ti ti-trash" aria-hidden="true"></i>
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
