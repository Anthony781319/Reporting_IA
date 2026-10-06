import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const CURRENT_YEAR = new Date().getFullYear()
const RANGE_1_24 = Array.from({ length: 24 }, (_, i) => i + 1)
const NOMS_EXCLUS = ['P1 of the week']
const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']

const startOfYear = (y) => new Date(Date.UTC(y, 0, 1))
const endOfYear = (y) => new Date(Date.UTC(y, 11, 31))
const daysBetween = (a, b) => Math.round((b - a) / 86400000)

function StatTile({ label, value, color }) {
  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || 'var(--purple-dark)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function Budget() {
  const [annee, setAnnee] = useState(CURRENT_YEAR + 1)
  const [loading, setLoading] = useState(true)
  const [iaList, setIaList] = useState([])
  const [comptesList, setComptesList] = useState([])
  const [objectifsIa, setObjectifsIa] = useState([])
  const [objectifsCompte, setObjectifsCompte] = useState([])
  const [sortiesEffectifs, setSortiesEffectifs] = useState([])
  const [msg, setMsg] = useState('')
  const [msgIsError, setMsgIsError] = useState(false)

  const [formCompteId, setFormCompteId] = useState('')
  const [formIaId, setFormIaId] = useState('')
  const [formNb, setFormNb] = useState('')

  const [formSortieIaId, setFormSortieIaId] = useState('')
  const [formSortieDate, setFormSortieDate] = useState('')
  const [formSortieMotif, setFormSortieMotif] = useState('')

  useEffect(() => { loadAll() }, [annee])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: ias }, { data: comptes }, { data: objIa }, { data: objCompte }, { data: sorties }] = await Promise.all([
      supabase.from('ia').select('*').eq('statut', 'actif').not('nom', 'in', `(${NOMS_EXCLUS.map(n => `"${n}"`).join(',')})`).order('nom'),
      supabase.from('comptes_clients').select('*').eq('statut', 'actif').order('raison_sociale'),
      supabase.from('budget_objectifs_ia').select('*').eq('annee', annee),
      supabase.from('budget_objectifs_compte').select('*, comptes_clients(raison_sociale, secteur), ia(nom)').eq('annee', annee),
      supabase.from('budget_sorties_effectifs').select('*').eq('annee', annee),
    ])
    setIaList(ias || [])
    setComptesList(comptes || [])
    setObjectifsIa(objIa || [])
    setObjectifsCompte(objCompte || [])
    setSortiesEffectifs(sorties || [])
    setLoading(false)
  }

  const flash = (text, isError = false) => {
    setMsg(text)
    setMsgIsError(isError)
    if (!isError) setTimeout(() => setMsg(''), 2500)
  }

  const objectifIaFor = (iaId) => objectifsIa.find(o => o.ia_id === iaId)?.nb_affaires_vise ?? ''
  const barWidthPct = (val) => (val === '' || val === null || val === undefined ? 0 : Math.min(100, (Number(val) / 24) * 100))

  const saveObjectifIa = async (iaId, value) => {
    const nb = value === '' ? null : parseInt(value, 10)
    if (nb === null) return
    const { error } = await supabase
      .from('budget_objectifs_ia')
      .upsert({ ia_id: iaId, annee, nb_affaires_vise: nb }, { onConflict: 'ia_id,annee' })
    if (error) { flash('Erreur : ' + error.message, true); return }
    flash('Enregistré !')
    await loadAll()
  }

  const addObjectifCompte = async () => {
    if (!formCompteId || !formIaId || formNb === '') return flash('Compte, IA et nombre requis', true)
    const { error } = await supabase
      .from('budget_objectifs_compte')
      .upsert(
        { compte_client_id: formCompteId, ia_id: formIaId, annee, nb_affaires_vise: parseInt(formNb, 10) },
        { onConflict: 'compte_client_id,ia_id,annee' }
      )
    if (error) { flash('Erreur : ' + error.message, true); return }
    setFormCompteId(''); setFormIaId(''); setFormNb('')
    flash('Enregistré !')
    await loadAll()
  }

  const removeObjectifCompte = async (id) => {
    await supabase.from('budget_objectifs_compte').delete().eq('id', id)
    await loadAll()
  }

  const sortieFor = (iaId) => sortiesEffectifs.find(s => s.ia_id === iaId)

  const timelinePercent = (iaId) => {
    const s = sortieFor(iaId)
    if (!s) return 100
    const start = startOfYear(annee)
    const end = endOfYear(annee)
    const totalDays = daysBetween(start, end) + 1
    const exit = new Date(s.date_sortie_prevue + 'T00:00:00Z')
    const offsetDays = Math.min(Math.max(daysBetween(start, exit), 0), totalDays)
    return (offsetDays / totalDays) * 100
  }

  const saveSortie = async () => {
    if (!formSortieIaId || !formSortieDate) return flash('Commercial et date requis', true)
    const { error } = await supabase.from('budget_sorties_effectifs').upsert(
      { ia_id: formSortieIaId, annee, date_sortie_prevue: formSortieDate, motif: formSortieMotif || null },
      { onConflict: 'ia_id,annee' }
    )
    if (error) { flash('Erreur : ' + error.message, true); return }
    setFormSortieIaId(''); setFormSortieDate(''); setFormSortieMotif('')
    flash('Enregistré !')
    await loadAll()
  }

  const removeSortie = async (id) => {
    await supabase.from('budget_sorties_effectifs').delete().eq('id', id)
    await loadAll()
  }

  const coherence = useMemo(() => {
    return iaList.map(ia => {
      const global = objectifsIa.find(o => o.ia_id === ia.id)?.nb_affaires_vise ?? null
      const detail = objectifsCompte.filter(o => o.ia_id === ia.id).reduce((s, o) => s + (o.nb_affaires_vise || 0), 0)
      return { ia, global, detail, ecart: global === null ? null : global - detail }
    })
  }, [iaList, objectifsIa, objectifsCompte])

  const detailParCompte = useMemo(() => {
    const map = new Map()
    objectifsCompte.forEach(o => {
      const key = o.compte_client_id
      if (!map.has(key)) map.set(key, { raison_sociale: o.comptes_clients?.raison_sociale, secteur: o.comptes_clients?.secteur, lignes: [] })
      map.get(key).lignes.push(o)
    })
    return [...map.values()].sort((a, b) => (a.raison_sociale || '').localeCompare(b.raison_sociale || ''))
  }, [objectifsCompte])

  const totalObjectifGlobal = coherence.reduce((s, c) => s + (c.global || 0), 0)
  const ecartsCount = coherence.filter(c => c.global !== null && c.ecart !== 0).length

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 24px 32px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
          🎯 Budget — vision
        </div>
        <input type="number" value={annee} onChange={e => setAnnee(parseInt(e.target.value, 10) || annee)}
          style={{ width: 90, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--color-border)' }} />
      </div>

      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 16, color: msgIsError ? '#A32D2D' : '#0F6E56', padding: '6px 10px', background: msgIsError ? '#FCEBEB' : '#E1F5EE', borderRadius: 6 }}>
          <span style={{ flex: 1 }}>{msg}</span>
          {msgIsError && <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A32D2D', fontSize: 13 }}>✕</button>}
        </div>
      )}

      {/* Tuiles de synthèse */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 28 }}>
        <StatTile label="Objectif global (affaires)" value={totalObjectifGlobal} />
        <StatTile label="Comptes attribués" value={`${detailParCompte.length} / ${comptesList.length}`} />
        <StatTile label="Sorties prévues" value={sortiesEffectifs.length} color={sortiesEffectifs.length > 0 ? '#B45309' : undefined} />
        <StatTile label="Écarts à corriger" value={ecartsCount} color={ecartsCount > 0 ? '#B45309' : '#0F6E56'} />
      </div>

      {/* Sorties d'effectifs */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
        📉 Sorties d'effectifs prévues — {annee}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
        Date à laquelle un commercial doit sortir des effectifs si l'objectif n'est pas tenu.
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 10, borderRadius: 3, background: '#0F6E56', display: 'inline-block' }}></span> Présent
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 10, borderRadius: 3, display: 'inline-block', background: 'repeating-linear-gradient(135deg, #D1D5DB, #D1D5DB 3px, #F3F4F6 3px, #F3F4F6 6px)' }}></span> Sortie prévue
        </span>
      </div>

      <div style={{ background: 'var(--color-bg-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', padding: '6px 14px 4px', borderBottom: '0.5px solid var(--color-border)' }}>
          {MOIS.map(m => <div key={m} style={{ flex: 1, fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center' }}>{m}</div>)}
        </div>
        {iaList.map((ia, i) => {
          const s = sortieFor(ia.id)
          const pct = timelinePercent(ia.id)
          return (
            <div key={ia.id} style={{ padding: '10px 14px', borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{ia.nom}</span>
                {s && (
                  <>
                    <span style={{ fontSize: 11, color: '#B45309' }}>
                      Sortie prévue : {new Date(s.date_sortie_prevue + 'T00:00:00Z').toLocaleDateString('fr-FR')}{s.motif ? ` · ${s.motif}` : ''}
                    </span>
                    <button onClick={() => removeSortie(s.id)} title="Annuler cette sortie prévue"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B45309', opacity: 0.7, fontSize: 13 }}>
                      <i className="ti ti-x" aria-hidden="true"></i>
                    </button>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, background: '#0F6E56' }}></div>
                {pct < 100 && <div style={{ width: `${100 - pct}%`, background: 'repeating-linear-gradient(135deg, #D1D5DB, #D1D5DB 3px, #F3F4F6 3px, #F3F4F6 6px)' }}></div>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'var(--color-bg-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: 14, marginBottom: 32, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Commercial</label>
          <select value={formSortieIaId} onChange={e => setFormSortieIaId(e.target.value)} style={{ minWidth: 150, padding: '6px 8px', borderRadius: 8 }}>
            <option value="">— choisir —</option>
            {iaList.map(ia => <option key={ia.id} value={ia.id}>{ia.nom}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date de sortie prévue</label>
          <input type="date" value={formSortieDate} onChange={e => setFormSortieDate(e.target.value)} style={{ padding: '6px 8px', borderRadius: 8 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Motif (optionnel)</label>
          <input type="text" value={formSortieMotif} onChange={e => setFormSortieMotif(e.target.value)} placeholder="ex: objectif non tenu" style={{ padding: '6px 8px', borderRadius: 8 }} />
        </div>
        <button onClick={saveSortie}
          style={{ padding: '8px 16px', background: '#B45309', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Déclarer la sortie
        </button>
      </div>

      {/* Objectif par commercial — jauges */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
        👤 Objectif par commercial — {annee}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
        Nombre d'affaires (signatures) visé, tous comptes confondus.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10, marginBottom: 32 }}>
        {iaList.map(ia => {
          const c = coherence.find(x => x.ia.id === ia.id)
          const val = objectifIaFor(ia.id)
          return (
            <div key={ia.id} style={{ background: 'var(--color-bg-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{ia.nom}</span>
                <select value={val} onChange={e => saveObjectifIa(ia.id, e.target.value)} style={{ width: 70, padding: '4px 6px', borderRadius: 8 }}>
                  <option value="">—</option>
                  {RANGE_1_24.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ height: 10, borderRadius: 5, background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barWidthPct(val)}%`, background: 'var(--purple)', borderRadius: 5 }}></div>
              </div>
              {c && c.global !== null && (
                <div style={{ fontSize: 11, marginTop: 6, color: c.ecart === 0 ? '#0F6E56' : '#B45309' }}>
                  détail compte par compte : {c.detail} {c.ecart !== 0 && `(écart ${c.ecart > 0 ? '+' : ''}${c.ecart})`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Objectif par compte */}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
        🏢 Objectif par compte — {annee}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
        Qui couvre quel compte cette année-là. Un compte peut avoir plusieurs IA (comptes partagés).
      </div>
      <div style={{ background: 'var(--color-bg-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Compte</label>
          <select value={formCompteId} onChange={e => setFormCompteId(e.target.value)} style={{ minWidth: 200, padding: '6px 8px', borderRadius: 8 }}>
            <option value="">— choisir —</option>
            {comptesList.map(c => <option key={c.id} value={c.id}>{c.raison_sociale}{c.secteur ? ` (${c.secteur})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Commercial</label>
          <select value={formIaId} onChange={e => setFormIaId(e.target.value)} style={{ minWidth: 150, padding: '6px 8px', borderRadius: 8 }}>
            <option value="">— choisir —</option>
            {iaList.map(ia => <option key={ia.id} value={ia.id}>{ia.nom}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nb affaires visé</label>
          <select value={formNb} onChange={e => setFormNb(e.target.value)} style={{ width: 90, padding: '6px 8px', borderRadius: 8 }}>
            <option value="">—</option>
            {RANGE_1_24.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={addObjectifCompte}
          style={{ padding: '8px 16px', background: '#6D28D9', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter / Mettre à jour
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {detailParCompte.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Aucun objectif par compte pour {annee} pour l'instant.</div>
        ) : detailParCompte.map(grp => (
          <div key={grp.raison_sociale} style={{ background: 'var(--color-bg-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{grp.raison_sociale}</div>
            {grp.secteur && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>{grp.secteur}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: grp.secteur ? 0 : 8 }}>
              {grp.lignes.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--purple-light)', borderRadius: 8, padding: '4px 8px 4px 10px' }}>
                  <span style={{ fontSize: 12, color: 'var(--purple-dark)', fontWeight: 600 }}>{l.ia?.nom}</span>
                  <span style={{ fontSize: 12, color: 'var(--purple-dark)' }}>— {l.nb_affaires_vise}</span>
                  <button onClick={() => removeObjectifCompte(l.id)} title="Supprimer"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple-dark)', opacity: 0.6, fontSize: 13, padding: 2 }}>
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
