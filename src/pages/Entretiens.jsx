import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const NOTATION_RDV = ['insuffisant', 'moyen', 'bon']
const NOTATION_SIGN = ['RAS', 'bon', 'excellent']

const couleurNotation = (val, type = 'rdv') => {
  if (type === 'rdv') {
    if (val === 'insuffisant') return { bg: '#FFF0F0', color: '#C53030', border: '#FC8181' }
    if (val === 'moyen') return { bg: '#FFFBEB', color: '#B45309', border: '#FCD34D' }
    if (val === 'bon') return { bg: '#F0FFF4', color: '#276749', border: '#68D391' }
  } else {
    if (val === 'RAS') return { bg: '#F7FAFC', color: '#4A5568', border: '#CBD5E0' }
    if (val === 'bon') return { bg: '#FFFBEB', color: '#B45309', border: '#FCD34D' }
    if (val === 'excellent') return { bg: '#F0FFF4', color: '#276749', border: '#68D391' }
  }
  return { bg: '#F7FAFC', color: '#4A5568', border: '#CBD5E0' }
}

export default function Entretiens() {
  const [ias, setIas] = useState([])
  const [iaSelectionnee, setIaSelectionnee] = useState(null)
  const [menuActif, setMenuActif] = useState(1)
  const [saisies, setSaisies] = useState([])
  const [entretiens, setEntretiens] = useState([])
  const [notations, setNotations] = useState({})
  const [actions, setActions] = useState([])
  const [nouvelleAction, setNouvelleAction] = useState({ description: '', responsable: 'ia', echeance: '' })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchIas() }, [])

  const fetchIas = async () => {
    const { data } = await supabase.from('ia').select('id, nom, email').order('nom')
    if (data) setIas(data)
  }

  const fetchData = async (iaId) => {
    const { data: s } = await supabase.from('saisies').select('*').eq('ia_id', iaId)
    if (s) setSaisies(s)
    const { data: e } = await supabase.from('entretiens').select('*, actions_1to1(*)').eq('ia_id', iaId).order('date_entretien', { ascending: false })
    if (e) {
      setEntretiens(e)
      // Charge les notations existantes
      const notMap = {}
      e.forEach(ent => {
        if (ent.notations) Object.assign(notMap, JSON.parse(ent.notations))
      })
      setNotations(notMap)
    }
    const { data: a } = await supabase.from('actions_1to1').select('*').eq('ia_id', iaId).order('created_at', { ascending: false })
    if (a) setActions(a)
  }

  const handleSelectIA = (ia) => {
    setIaSelectionnee(ia)
    setMenuActif(1)
    setMsg('')
    fetchData(ia.id)
  }

  // Stats YTD
  const nbSemaines = () => {
    const now = new Date()
    const debut = new Date(now.getFullYear(), 0, 1)
    return Math.ceil((now - debut) / (7 * 24 * 60 * 60 * 1000))
  }

  const totalYTD = (col) => saisies.reduce((acc, s) => acc + (s[col] || 0), 0)

  const objectifRdv = nbSemaines() * 8

  const tauxKPI = (num, den) => {
    const total_num = totalYTD(num)
    const total_den = totalYTD(den)
    if (!total_den) return 0
    return Math.round((total_num / total_den) * 100)
  }

  const sauvegarderNotations = async () => {
    setSaving(true)
    try {
      // On crée un entretien du jour si pas déjà fait cette semaine
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase.from('entretiens').select('id').eq('ia_id', iaSelectionnee.id).eq('date_entretien', today).single()
      let entretienId = existing?.id
      if (!entretienId) {
        const { data: newEnt } = await supabase.from('entretiens').insert({ ia_id: iaSelectionnee.id, date_entretien: today, notations: JSON.stringify(notations), cr_envoye: false }).select().single()
        entretienId = newEnt?.id
      } else {
        await supabase.from('entretiens').update({ notations: JSON.stringify(notations) }).eq('id', entretienId)
      }
      setMsg('✅ Notations sauvegardées')
      fetchData(iaSelectionnee.id)
    } catch (e) {
      setMsg('❌ Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  const ajouterAction = async () => {
    if (!nouvelleAction.description.trim()) return
    await supabase.from('actions_1to1').insert({
      ia_id: iaSelectionnee.id,
      entretien_id: entretiens[0]?.id || null,
      description: nouvelleAction.description,
      responsable: nouvelleAction.responsable,
      echeance: nouvelleAction.echeance || null,
      statut: 'en_cours'
    })
    setNouvelleAction({ description: '', responsable: 'ia', echeance: '' })
    fetchData(iaSelectionnee.id)
  }

  const toggleStatut = async (id, statut) => {
    await supabase.from('actions_1to1').update({ statut: statut === 'en_cours' ? 'fait' : 'en_cours' }).eq('id', id)
    fetchData(iaSelectionnee.id)
  }

  const supprimerAction = async (id) => {
    await supabase.from('actions_1to1').delete().eq('id', id)
    fetchData(iaSelectionnee.id)
  }

  // STYLES
  const s = {
    page: { padding: '24px', maxWidth: 960, margin: '0 auto' },
    titre: { fontSize: 22, fontWeight: 800, marginBottom: 6, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' },
    sousTitre: { fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 },
    gridIA: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 28 },
    carteIA: (sel) => ({
      padding: '16px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
      border: `2px solid ${sel ? 'var(--color-accent)' : 'var(--color-border-tertiary)'}`,
      background: sel ? 'var(--color-accent-subtle)' : 'var(--color-background-secondary)',
      fontWeight: sel ? 700 : 500, fontSize: 13, color: 'var(--color-text-primary)',
      transition: 'all 0.15s', transform: sel ? 'translateY(-2px)' : 'none',
      boxShadow: sel ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
    }),
    avatar: (sel) => ({
      width: 40, height: 40, borderRadius: '50%', margin: '0 auto 8px',
      background: sel ? 'var(--color-accent)' : 'var(--color-border-secondary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: sel ? '#fff' : 'var(--color-text-secondary)', fontWeight: 700, fontSize: 14
    }),
    menus: { display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
    menuBtn: (actif) => ({
      padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      border: `1.5px solid ${actif ? 'var(--color-accent)' : 'var(--color-border-tertiary)'}`,
      background: actif ? 'var(--color-accent)' : 'transparent',
      color: actif ? '#fff' : 'var(--color-text-secondary)', transition: 'all 0.15s'
    }),
    card: { background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 14, padding: '20px 24px', marginBottom: 14 },
    cardTitre: { fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 },
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border-tertiary)' },
    label: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' },
    select: (val, type = 'rdv') => {
      const c = val ? couleurNotation(val, type) : { bg: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: 'var(--color-border-tertiary)' }
      return { padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${c.border}`, background: c.bg, color: c.color, fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none' }
    },
    statBox: { background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 14, padding: '18px 20px', flex: 1, minWidth: 140 },
    statVal: { fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-1px' },
    statLabel: { fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2, fontWeight: 500 },
    progressBar: (pct) => ({
      height: 6, borderRadius: 3, marginTop: 8,
      background: `linear-gradient(90deg, ${pct >= 80 ? '#48BB78' : pct >= 60 ? '#ECC94B' : '#FC8181'} ${Math.min(pct, 100)}%, var(--color-border-tertiary) ${Math.min(pct, 100)}%)`
    }),
    kpiRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-tertiary)' },
    badge: (val) => {
      const c = couleurNotation(val)
      return { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}` }
    },
    actionCard: (statut) => ({
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 10,
      background: statut === 'fait' ? '#F0FFF4' : 'var(--color-background-secondary)',
      border: `1px solid ${statut === 'fait' ? '#68D391' : 'var(--color-border-tertiary)'}`,
      marginBottom: 8, opacity: statut === 'fait' ? 0.7 : 1
    }),
    input: { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, flex: 1 },
    btnPrimary: { padding: '10px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    btnGhost: { padding: '6px 12px', background: 'none', border: '1px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)' },
    msg: { padding: '10px 14px', background: 'var(--color-accent-subtle)', borderRadius: 8, fontSize: 13, marginBottom: 16 }
  }

  const semaineCourante = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
  const saisiesSemaine = saisies.filter(s => s.semaine === semaineCourante)

  return (
    <div style={s.page}>
      <div style={s.titre}>🤝 Points Individuels</div>
      <div style={s.sousTitre}>Suivi des entretiens 1:1 et pilotage des actions</div>

      {/* Sélection IA */}
      <div style={s.gridIA}>
        {ias.map(ia => (
          <div key={ia.id} style={s.carteIA(iaSelectionnee?.id === ia.id)} onClick={() => handleSelectIA(ia)}>
            <div style={s.avatar(iaSelectionnee?.id === ia.id)}>
              {ia.nom.slice(0, 2).toUpperCase()}
            </div>
            {ia.nom}
          </div>
        ))}
      </div>

      {iaSelectionnee && (
        <>
          {msg && <div style={s.msg}>{msg}</div>}

          {/* Navigation menus */}
          <div style={s.menus}>
            {[
              { id: 1, label: '📅 Semaine en cours' },
              { id: 2, label: '📊 Stats YTD' },
              { id: 3, label: '🎯 Analyse KPI' },
              { id: 4, label: '✅ Actions' },
            ].map(m => (
              <button key={m.id} style={s.menuBtn(menuActif === m.id)} onClick={() => setMenuActif(m.id)}>
                {m.label}
              </button>
            ))}
          </div>

          {/* MENU 1 — Semaine en cours */}
          {menuActif === 1 && (
            <div style={s.card}>
              <div style={s.cardTitre}>
                📅 Semaine {semaineCourante} — {iaSelectionnee.nom}
              </div>

              {/* Données du reporting */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Données reporting</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { label: 'RDV', val: saisiesSemaine.reduce((a, s) => a + (s.total_rdv || 0), 0) },
                    { label: 'Présentations', val: saisiesSemaine.reduce((a, s) => a + (s.presentations || 0), 0) },
                    { label: 'Signatures', val: saisiesSemaine.reduce((a, s) => a + (s.signatures || 0), 0) },
                    { label: 'Besoins détectés', val: saisiesSemaine.reduce((a, s) => a + (s.besoins_detectes || 0), 0) },
                  ].map(item => (
                    <div key={item.label} style={{ ...s.statBox, flex: 'none', minWidth: 100, textAlign: 'center' }}>
                      <div style={{ ...s.statVal, fontSize: 24 }}>{item.val}</div>
                      <div style={s.statLabel}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notations manuelles */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notation</div>

              {[
                { key: 'rdv', label: 'RDV', options: NOTATION_RDV, type: 'rdv' },
                { key: 'presentation', label: 'Présentation', options: NOTATION_RDV, type: 'rdv' },
                { key: 'signature', label: 'Signature', options: NOTATION_SIGN, type: 'sign' },
              ].map(item => (
                <div key={item.key} style={s.row}>
                  <span style={s.label}>{item.label}</span>
                  <select
                    style={s.select(notations[item.key], item.type)}
                    value={notations[item.key] || ''}
                    onChange={e => setNotations({ ...notations, [item.key]: e.target.value })}
                  >
                    <option value="">— Choisir —</option>
                    {item.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}

              <button style={{ ...s.btnPrimary, marginTop: 20 }} onClick={sauvegarderNotations} disabled={saving}>
                {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
              </button>
            </div>
          )}

          {/* MENU 2 — Stats YTD */}
          {menuActif === 2 && (
            <div>
              <div style={s.card}>
                <div style={s.cardTitre}>📊 Performance YTD — {iaSelectionnee.nom}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                  <div style={s.statBox}>
                    <div style={s.statVal}>{totalYTD('total_rdv')}</div>
                    <div style={s.statLabel}>RDV réalisés</div>
                    <div style={s.progressBar(Math.round((totalYTD('total_rdv') / objectifRdv) * 100))} />
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      Objectif : {objectifRdv} ({nbSemaines()} sem. × 8)
                    </div>
                  </div>
                  <div style={s.statBox}>
                    <div style={s.statVal}>{totalYTD('presentations')}</div>
                    <div style={s.statLabel}>Présentations</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={s.statVal}>{totalYTD('besoins_detectes')}</div>
                    <div style={s.statLabel}>Besoins détectés</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={s.statVal}>{totalYTD('signatures')}</div>
                    <div style={s.statLabel}>Signatures</div>
                  </div>
                </div>

                {/* Notation YTD manuelle */}
                <div style={s.row}>
                  <span style={s.label}>Notation globale RDV</span>
                  <select
                    style={s.select(notations['ytd_rdv'], 'rdv')}
                    value={notations['ytd_rdv'] || ''}
                    onChange={e => setNotations({ ...notations, ytd_rdv: e.target.value })}
                  >
                    <option value="">— Choisir —</option>
                    {NOTATION_RDV.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <button style={{ ...s.btnPrimary, marginTop: 16 }} onClick={sauvegarderNotations} disabled={saving}>
                  {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
                </button>
              </div>
            </div>
          )}

          {/* MENU 3 — Analyse KPI */}
          {menuActif === 3 && (
            <div style={s.card}>
              <div style={s.cardTitre}>🎯 Analyse KPI — {iaSelectionnee.nom}</div>
              {[
                { label: 'Besoins détectés / RDV', num: 'besoins_detectes', den: 'total_rdv', key: 'kpi_besoins_rdv' },
                { label: 'Présentations / Besoins détectés', num: 'presentations', den: 'besoins_detectes', key: 'kpi_pres_besoins' },
                { label: 'Signatures / Besoins détectés', num: 'signatures', den: 'besoins_detectes', key: 'kpi_sign_besoins' },
              ].map(kpi => (
                <div key={kpi.key} style={s.kpiRow}>
                  <div>
                    <div style={s.label}>{kpi.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2 }}>
                      {tauxKPI(kpi.num, kpi.den)}%
                    </div>
                  </div>
                  <select
                    style={s.select(notations[kpi.key], 'rdv')}
                    value={notations[kpi.key] || ''}
                    onChange={e => setNotations({ ...notations, [kpi.key]: e.target.value })}
                  >
                    <option value="">— Choisir —</option>
                    {NOTATION_RDV.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <button style={{ ...s.btnPrimary, marginTop: 16 }} onClick={sauvegarderNotations} disabled={saving}>
                {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
              </button>
            </div>
          )}

          {/* MENU 4 — Actions */}
          {menuActif === 4 && (
            <div>
              {/* Ajouter une action */}
              <div style={s.card}>
                <div style={s.cardTitre}>➕ Nouvelle action</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <input style={s.input} placeholder="Description de l'action…" value={nouvelleAction.description} onChange={e => setNouvelleAction({ ...nouvelleAction, description: e.target.value })} />
                  <select style={{ ...s.input, flex: 'none', width: 'auto' }} value={nouvelleAction.responsable} onChange={e => setNouvelleAction({ ...nouvelleAction, responsable: e.target.value })}>
                    <option value="ia">{iaSelectionnee.nom}</option>
                    <option value="manager">Manager</option>
                  </select>
                  <input type="date" style={{ ...s.input, flex: 'none', width: 'auto' }} value={nouvelleAction.echeance} onChange={e => setNouvelleAction({ ...nouvelleAction, echeance: e.target.value })} />
                </div>
                <button style={s.btnPrimary} onClick={ajouterAction}>Ajouter</button>
              </div>

              {/* Liste des actions */}
              <div>
                {['en_cours', 'fait'].map(statut => (
                  <div key={statut} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {statut === 'en_cours' ? '⏳ En cours' : '✅ Terminées'}
                    </div>
                    {actions.filter(a => a.statut === statut).length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Aucune action</div>
                    )}
                    {actions.filter(a => a.statut === statut).map(a => (
                      <div key={a.id} style={s.actionCard(a.statut)}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', textDecoration: a.statut === 'fait' ? 'line-through' : 'none' }}>
                            {a.description}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                            {a.responsable === 'ia' ? iaSelectionnee.nom : 'Manager'}
                            {a.echeance && ` · ${new Date(a.echeance).toLocaleDateString('fr-FR')}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={s.btnGhost} onClick={() => toggleStatut(a.id, a.statut)}>
                            {a.statut === 'en_cours' ? '✓ Fait' : 'Réouvrir'}
                          </button>
                          <button style={{ ...s.btnGhost, color: '#E53E3E', borderColor: '#FC8181' }} onClick={() => supprimerAction(a.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
