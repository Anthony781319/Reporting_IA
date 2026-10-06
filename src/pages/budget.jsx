import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const CURRENT_YEAR = new Date().getFullYear()

export default function Budget() {
  const [annee, setAnnee] = useState(CURRENT_YEAR + 1)
  const [loading, setLoading] = useState(true)
  const [iaList, setIaList] = useState([])
  const [comptesList, setComptesList] = useState([])
  const [objectifsIa, setObjectifsIa] = useState([])       // lignes budget_objectifs_ia pour l'année
  const [objectifsCompte, setObjectifsCompte] = useState([]) // lignes budget_objectifs_compte pour l'année (avec jointures)
  const [msg, setMsg] = useState('')

  // Formulaire d'ajout "objectif par compte"
  const [formCompteId, setFormCompteId] = useState('')
  const [formIaId, setFormIaId] = useState('')
  const [formNb, setFormNb] = useState('')

  useEffect(() => { loadAll() }, [annee])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: ias }, { data: comptes }, { data: objIa }, { data: objCompte }] = await Promise.all([
      supabase.from('ia').select('*').eq('statut', 'actif').order('nom'),
      supabase.from('comptes_clients').select('*').eq('statut', 'actif').order('raison_sociale'),
      supabase.from('budget_objectifs_ia').select('*').eq('annee', annee),
      supabase.from('budget_objectifs_compte').select('*, comptes_clients(raison_sociale, secteur), ia(nom)').eq('annee', annee),
    ])
    setIaList(ias || [])
    setComptesList(comptes || [])
    setObjectifsIa(objIa || [])
    setObjectifsCompte(objCompte || [])
    setLoading(false)
  }

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500) }

  // --- Objectif global par commercial -----------------------------------
  const objectifIaFor = (iaId) => objectifsIa.find(o => o.ia_id === iaId)?.nb_affaires_vise ?? ''

  const saveObjectifIa = async (iaId, value) => {
    const nb = value === '' ? null : parseInt(value, 10)
    if (nb === null) return
    const { error } = await supabase
      .from('budget_objectifs_ia')
      .upsert({ ia_id: iaId, annee, nb_affaires_vise: nb }, { onConflict: 'ia_id,annee' })
    if (error) flash('Erreur : ' + error.message)
    await loadAll()
  }

  // --- Détail par compte ---------------------------------------------------
  const addObjectifCompte = async () => {
    if (!formCompteId || !formIaId || formNb === '') return flash('Compte, IA et nombre requis')
    const { error } = await supabase
      .from('budget_objectifs_compte')
      .upsert(
        { compte_client_id: formCompteId, ia_id: formIaId, annee, nb_affaires_vise: parseInt(formNb, 10) },
        { onConflict: 'compte_client_id,ia_id,annee' }
      )
    if (error) return flash('Erreur : ' + error.message)
    setFormCompteId(''); setFormIaId(''); setFormNb('')
    flash('Enregistré !')
    await loadAll()
  }

  const removeObjectifCompte = async (id) => {
    await supabase.from('budget_objectifs_compte').delete().eq('id', id)
    await loadAll()
  }

  // --- Cohérence : objectif global vs somme des objectifs détaillés -------
  const coherence = useMemo(() => {
    return iaList.map(ia => {
      const global = objectifsIa.find(o => o.ia_id === ia.id)?.nb_affaires_vise ?? null
      const detail = objectifsCompte.filter(o => o.ia_id === ia.id).reduce((s, o) => s + (o.nb_affaires_vise || 0), 0)
      return { ia, global, detail, ecart: global === null ? null : global - detail }
    })
  }, [iaList, objectifsIa, objectifsCompte])

  // Regroupement du détail par compte, pour affichage (un compte peut avoir plusieurs IA dessus)
  const detailParCompte = useMemo(() => {
    const map = new Map()
    objectifsCompte.forEach(o => {
      const key = o.compte_client_id
      if (!map.has(key)) map.set(key, { raison_sociale: o.comptes_clients?.raison_sociale, secteur: o.comptes_clients?.secteur, lignes: [] })
      map.get(key).lignes.push(o)
    })
    return [...map.values()].sort((a, b) => (a.raison_sociale || '').localeCompare(b.raison_sociale || ''))
  }, [objectifsCompte])

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 16px' }}>

      {/* Sélecteur d'année */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          🎯 Budget — vision
        </div>
        <input type="number" value={annee} onChange={e => setAnnee(parseInt(e.target.value, 10) || annee)}
          style={{ width: 90, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)' }} />
      </div>

      {msg && (
        <div style={{ fontSize: 12, marginBottom: 14, color: msg.includes('Erreur') ? '#A32D2D' : '#0F6E56', padding: '6px 10px', background: msg.includes('Erreur') ? '#FCEBEB' : '#E1F5EE', borderRadius: 6 }}>
          {msg}
        </div>
      )}

      {/* Objectif global par commercial */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
        👤 Objectif par commercial — {annee}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
        Nombre d'affaires (signatures) visé, tous comptes confondus.
      </div>
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        {iaList.map((ia, i) => {
          const c = coherence.find(x => x.ia.id === ia.id)
          return (
            <div key={ia.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border-tertiary)' }}>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-primary)' }}>{ia.nom}</span>
              {c && c.global !== null && (
                <span style={{ fontSize: 11, color: c.ecart === 0 ? '#0F6E56' : '#B45309' }}>
                  détail : {c.detail} {c.ecart !== 0 && `(écart ${c.ecart > 0 ? '+' : ''}${c.ecart})`}
                </span>
              )}
              <input type="number" defaultValue={objectifIaFor(ia.id)} placeholder="—"
                onBlur={e => { if (e.target.value !== '' && parseInt(e.target.value, 10) !== objectifIaFor(ia.id)) saveObjectifIa(ia.id, e.target.value) }}
                style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', textAlign: 'right' }} />
            </div>
          )
        })}
      </div>

      {/* Ajout d'un objectif détaillé par compte */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
        🏢 Objectif par compte — {annee}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
        Qui couvre quel compte cette année-là, et combien d'affaires visées dessus. Un compte peut avoir plusieurs IA (comptes partagés) : ajoute simplement une ligne par IA.
      </div>
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Compte</label>
          <select value={formCompteId} onChange={e => setFormCompteId(e.target.value)} style={{ minWidth: 200, padding: '6px 8px', borderRadius: 8 }}>
            <option value="">— choisir —</option>
            {comptesList.map(c => <option key={c.id} value={c.id}>{c.raison_sociale}{c.secteur ? ` (${c.secteur})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Commercial</label>
          <select value={formIaId} onChange={e => setFormIaId(e.target.value)} style={{ minWidth: 150, padding: '6px 8px', borderRadius: 8 }}>
            <option value="">— choisir —</option>
            {iaList.map(ia => <option key={ia.id} value={ia.id}>{ia.nom}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Nb affaires visé</label>
          <input type="number" value={formNb} onChange={e => setFormNb(e.target.value)} style={{ width: 90, padding: '6px 8px', borderRadius: 8 }} />
        </div>
        <button onClick={addObjectifCompte}
          style={{ padding: '8px 16px', background: '#6D28D9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter / Mettre à jour
        </button>
      </div>

      {/* Liste des objectifs par compte, groupés */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden' }}>
        {detailParCompte.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '14px' }}>Aucun objectif par compte pour {annee} pour l'instant.</div>
        ) : detailParCompte.map((grp, i) => (
          <div key={grp.raison_sociale} style={{ padding: '10px 14px', borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              {grp.raison_sociale}{grp.secteur ? <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}> · {grp.secteur}</span> : null}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {grp.lignes.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEEDFE', borderRadius: 8, padding: '4px 8px 4px 10px' }}>
                  <span style={{ fontSize: 12, color: '#3C3489', fontWeight: 600 }}>{l.ia?.nom}</span>
                  <span style={{ fontSize: 12, color: '#3C3489' }}>— {l.nb_affaires_vise}</span>
                  <button onClick={() => removeObjectifCompte(l.id)} title="Supprimer"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3C3489', opacity: 0.6, fontSize: 13, padding: 2 }}>
                    <i className="ti ti-x" aria-hidden="true"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
