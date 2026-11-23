import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PremiumStyles, PremiumPanel, PremiumSectionHeader } from '../styles/PremiumUI'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7)
}

// Mêmes teintes que l'ancienne version de cette page (un panneau clair par bloc, un accent par
// bloc) — harmonisées avec le traitement visuel déjà en place côté Commerce (Saisie.jsx) : panneau
// gris uniforme, tuiles de stats, liste en mini-cartes, saisie déportée dans une fenêtre modale.
const RDV_COLOR = '#534AB7', RDV_LIGHT = '#EEEDFE', RDV_RING = 'rgba(83,74,183,0.18)'
const CV_COLOR = '#2E7D32', CV_LIGHT = '#E8F5E9', CV_RING = 'rgba(46,125,50,0.18)'
const PRES_COLOR = '#633806', PRES_LIGHT = '#FAEEDA', PRES_RING = 'rgba(99,56,6,0.18)'
const SIG_COLOR = '#72243E', SIG_LIGHT = '#FBEAF0', SIG_RING = 'rgba(114,36,62,0.18)'

export default function SaisieCR({ crNom, entite }) {
  const annee = new Date().getFullYear()
  const semaineActuelle = currentWeek()
  const [semaine, setSemaine] = useState(semaineActuelle)
  const [iaList, setIaList] = useState([])

  const [nbEntretiens, setNbEntretiens] = useState(0)
  const [nbCvEnvoyes, setNbCvEnvoyes] = useState(0)
  const [nbPresentations, setNbPresentations] = useState(0)
  const [nbSignatures, setNbSignatures] = useState(0)

  const [rdvList, setRdvList] = useState([])
  const [rdvForm, setRdvForm] = useState({ identite_candidat: '', profil: '', valide: false, positionne_sur_besoins: '' })
  const [addRdvOpen, setAddRdvOpen] = useState(false)

  const [presList, setPresList] = useState([])
  const [presForm, setPresForm] = useState({ identite_candidat: '', profil: '', date_presentation: '', ias_concernees: [] })
  const [addPresOpen, setAddPresOpen] = useState(false)

  const [sigList, setSigList] = useState([])
  const [sigForm, setSigForm] = useState({ identite_candidat: '', profil: '', salaire_envisage: '', date_signature: '' })
  const [addSigOpen, setAddSigOpen] = useState(false)

  const [cvList, setCvList] = useState([])
  const [cvForm, setCvForm] = useState({ identite_candidat: '', profil: '', ias_concernees: [], type_envoi: 'push', besoin_concerne: '' })
  const [addCvOpen, setAddCvOpen] = useState(false)

  const [toast, setToast] = useState('')

  const nbCandidatsValides = rdvList.filter(r => r.valide).length

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    // Même règle de cloisonnement que Login.jsx : une CR de l'espace INFRA ne doit voir que les IA
    // d'Anthony (entite !== 'sandra'), jamais celles de la BU de Sandra (SOL), et inversement pour une
    // CR de SOL — sinon la liste "IAs concernées" mélange les deux équipes commerciales.
    supabase.from('ia').select('*').order('nom').then(({ data }) => {
      setIaList((data || []).filter(ia =>
        ia.nom !== 'Anthony' && ia.nom !== 'P1 of the week' && ia.statut !== 'ancien' && ia.type !== 'cr' &&
        (entite === 'sandra' ? ia.entite === 'sandra' : ia.entite !== 'sandra')
      ))
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      setRdvList([]); setPresList([]); setSigList([]); setCvList([])
      setAddRdvOpen(false); setAddPresOpen(false); setAddSigOpen(false); setAddCvOpen(false)

      const [{ data: rep }, { data: rdv }, { data: pres }, { data: sig }, { data: cv }] = await Promise.all([
        supabase.from('cr_reporting').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee).single(),
        supabase.from('cr_rendez_vous').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee),
        supabase.from('cr_presentations').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee),
        supabase.from('cr_signatures').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee),
        supabase.from('cr_cv_proposes').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee),
      ])
      if (rep) {
        setNbEntretiens(rep.nb_entretiens || 0)
        setNbCvEnvoyes(rep.nb_cv_envoyes || 0)
        setNbPresentations(rep.nb_presentations || 0)
        setNbSignatures(rep.nb_signatures || 0)
      } else {
        setNbEntretiens(0); setNbCvEnvoyes(0); setNbPresentations(0); setNbSignatures(0)
      }
      if (rdv) setRdvList(rdv)
      if (pres) setPresList(pres)
      if (sig) setSigList(sig)
      if (cv) setCvList(cv)
    }
    load()
  }, [crNom, semaine, annee])

  // Sauvegarde automatique du reporting global chaque fois que les compteurs ou candidats validés changent
  useEffect(() => {
    const save = async () => {
      await supabase.from('cr_reporting').upsert({
        cr_nom: crNom, semaine, annee,
        nb_entretiens: nbEntretiens,
        nb_candidats_valides: nbCandidatsValides,
        nb_cv_envoyes: nbCvEnvoyes,
        nb_presentations: nbPresentations,
        nb_signatures: nbSignatures,
      }, { onConflict: 'cr_nom,semaine,annee' })
    }
    save()
  }, [nbEntretiens, nbCandidatsValides, nbCvEnvoyes, nbPresentations, nbSignatures, crNom, semaine, annee])

  // Les fenêtres d'ajout ne se ferment plus toutes seules après un enregistrement réussi (seul le ✕ ou
  // un clic sur le fond les ferme) — même principe que RDV Commerciaux/programmés côté Commerce, pour
  // pouvoir enchaîner plusieurs candidats sans rouvrir la fenêtre à chaque fois.
  const addRdv = async () => {
    if (!rdvForm.identite_candidat) return
    const { data, error } = await supabase.from('cr_rendez_vous').insert({ cr_nom: crNom, semaine, annee, ...rdvForm }).select().single()
    if (error || !data) { showToast(error?.message ? `❌ ${error.message}` : '❌ Erreur lors de l\'ajout'); return }
    setRdvList([...rdvList, data])
    setRdvForm({ identite_candidat: '', profil: '', valide: false, positionne_sur_besoins: '' })
    showToast('✅ Rendez-vous ajouté !')
  }

  const deleteRdv = async (id) => {
    await supabase.from('cr_rendez_vous').delete().eq('id', id)
    setRdvList(rdvList.filter(r => r.id !== id))
  }

  const addPres = async () => {
    if (!presForm.identite_candidat) return
    const { data, error } = await supabase.from('cr_presentations').insert({
      cr_nom: crNom, semaine, annee,
      identite_candidat: presForm.identite_candidat,
      profil: presForm.profil,
      date_presentation: presForm.date_presentation,
      ia_concerne: presForm.ias_concernees.join(', '),
    }).select().single()
    if (error || !data) { showToast(error?.message ? `❌ ${error.message}` : '❌ Erreur lors de l\'ajout'); return }
    setPresList([...presList, data])
    setPresForm({ identite_candidat: '', profil: '', date_presentation: '', ias_concernees: [] })
    showToast('✅ Présentation ajoutée !')
  }

  const deletePres = async (id) => {
    await supabase.from('cr_presentations').delete().eq('id', id)
    setPresList(presList.filter(p => p.id !== id))
  }

  const togglePresIA = (nom) => {
    const current = presForm.ias_concernees
    if (current.includes(nom)) {
      setPresForm({ ...presForm, ias_concernees: current.filter(n => n !== nom) })
    } else {
      setPresForm({ ...presForm, ias_concernees: [...current, nom] })
    }
  }

  const addSig = async () => {
    if (!sigForm.identite_candidat) return
    const { data, error } = await supabase.from('cr_signatures').insert({ cr_nom: crNom, semaine, annee, ...sigForm }).select().single()
    if (error || !data) { showToast(error?.message ? `❌ ${error.message}` : '❌ Erreur lors de l\'ajout'); return }
    setSigList([...sigList, data])
    setSigForm({ identite_candidat: '', profil: '', salaire_envisage: '', date_signature: '' })
    showToast('✅ Signature ajoutée !')
  }

  const deleteSig = async (id) => {
    await supabase.from('cr_signatures').delete().eq('id', id)
    setSigList(sigList.filter(s => s.id !== id))
  }

  const toggleIA = (nom) => {
    const current = cvForm.ias_concernees
    if (current.includes(nom)) {
      setCvForm({ ...cvForm, ias_concernees: current.filter(n => n !== nom) })
    } else {
      setCvForm({ ...cvForm, ias_concernees: [...current, nom] })
    }
  }

  const addCv = async () => {
    if (!cvForm.identite_candidat || cvForm.ias_concernees.length === 0) {
      showToast('❌ Remplis le candidat et sélectionne au moins une IA')
      return
    }
    if (cvForm.type_envoi === 'besoin' && !cvForm.besoin_concerne.trim()) {
      showToast('❌ Indique le besoin concerné')
      return
    }
    const { data, error } = await supabase.from('cr_cv_proposes').insert({
      cr_nom: crNom, semaine, annee,
      identite_candidat: cvForm.identite_candidat,
      profil: cvForm.profil,
      ias_concernees: cvForm.ias_concernees.join(', '),
      type_envoi: cvForm.type_envoi,
      besoin_concerne: cvForm.type_envoi === 'besoin' ? cvForm.besoin_concerne : null
    }).select().single()
    if (error || !data) { showToast(error?.message ? `❌ ${error.message}` : '❌ Erreur lors de l\'ajout'); return }
    setCvList([...cvList, { ...data, ias_concernees: cvForm.ias_concernees.join(', ') }])
    setCvForm({ identite_candidat: '', profil: '', ias_concernees: [], type_envoi: 'push', besoin_concerne: '' })
    showToast('✅ CV ajouté !')
  }

  const deleteCv = async (id) => {
    await supabase.from('cr_cv_proposes').delete().eq('id', id)
    setCvList(cvList.filter(c => c.id !== id))
  }

  const rdvOk  = rdvList.length === nbEntretiens
  const cvOk   = cvList.length === nbCvEnvoyes
  const presOk = presList.length === nbPresentations
  const sigOk  = sigList.length === nbSignatures

  return (
    <div style={{ padding: '24px 16px' }}>
      <PremiumStyles />

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#1a1a2e', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, zIndex: 999 }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>👋 Bonjour {crNom}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{annee}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSemaine(s => Math.max(1, s - 1))} style={btnNav}>←</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Semaine {semaine}</div>
            {semaine === semaineActuelle && <div style={{ fontSize: 10, color: '#534AB7', fontWeight: 500 }}>Semaine actuelle</div>}
          </div>
          <button onClick={() => setSemaine(s => Math.min(52, s + 1))} style={btnNav}>→</button>
        </div>
      </div>

      {/* Grille 2 colonnes sur écran large (repasse à 1 colonne sous 420px de large par panneau) — pour
          exploiter la largeur disponible plutôt que d'empiler les 4 panneaux en une seule colonne
          étroite, chaque panneau de cette page restant assez court en contenu pour tenir côte à côte. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>

      {/* ── Rendez-vous (entretiens + candidats validés + détail) ── */}
      <div>
        <PremiumPanel accent={RDV_COLOR} accentLight={RDV_LIGHT} accentRing={RDV_RING}>
          <PremiumSectionHeader icon="ti-calendar-event" title="Rendez-vous" action={
            <button className="ui-add-btn" disabled={rdvOk} style={rdvOk ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              onClick={() => !rdvOk && setAddRdvOpen(true)}>
              <i className="ti ti-plus" aria-hidden="true" /> Ajouter un rendez-vous
            </button>
          } />

          <div className="rdv-stat-row">
            <div className="ui-counter-tile" style={{ width: 128, minHeight: 60, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Entretiens réalisés</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="ui-counter-btn" onClick={() => setNbEntretiens(Math.max(0, nbEntretiens - 1))}>−</button>
                <span style={{ fontSize: 16, fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{nbEntretiens}</span>
                <button className="ui-counter-btn" onClick={() => setNbEntretiens(nbEntretiens + 1)}>+</button>
              </div>
            </div>
            <div className="rdv-stat-tile">
              <div className="v-row"><span className="v">{nbCandidatsValides}</span></div>
              <div className="l">Candidats validés (auto)</div>
            </div>
          </div>

          {!rdvOk && (
            <div style={warningBox}>
              ⚠️ {rdvList.length}/{nbEntretiens} entretien{nbEntretiens !== 1 ? 's' : ''} détaillé{nbEntretiens !== 1 ? 's' : ''} — complète le détail ci-dessous pour valider.
            </div>
          )}

          <div className="rdv-list-title">Détail des entretiens{rdvList.length > 0 ? ` (${rdvList.length})` : ''}</div>
          {rdvList.length === 0 ? (
            <div className="rdv-empty">
              <div style={{ fontSize: 13, fontWeight: 600 }}>Aucun entretien détaillé cette semaine</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>Ajoutez le premier via le bouton ci-dessus.</div>
            </div>
          ) : rdvList.map(r => (
            <div key={r.id} className="rdv-card2">
              <span className="rdv-card2-bar" style={{ background: r.valide ? '#0F6E56' : '#A32D2D' }} />
              <div className="rdv-card2-main">
                <span className="rdv-card2-client">{r.identite_candidat}</span>
                {r.profil && <span className="rdv-card2-pill" style={{ background: '#F3F4F6', color: '#374151' }}>{r.profil}</span>}
                <span className="rdv-card2-pill" style={{ background: r.valide ? '#E1F5EE' : '#FCEBEB', color: r.valide ? '#085041' : '#A32D2D' }}>
                  {r.valide ? '✅ Validé' : '❌ Non validé'}
                </span>
                {r.positionne_sur_besoins && <div className="rdv-card2-meta">📌 {r.positionne_sur_besoins}</div>}
              </div>
              <button className="rdv-card2-trash" onClick={() => deleteRdv(r.id)} title="Supprimer"><i className="ti ti-trash" aria-hidden="true" /></button>
            </div>
          ))}

          {addRdvOpen && (
            <div className="rdv-modal-overlay" onClick={() => setAddRdvOpen(false)}>
              <div className="rdv-modal" onClick={e => e.stopPropagation()}>
                <div className="ui-card-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div className="ui-card-icon" style={{ background: RDV_LIGHT }}><i className="ti ti-plus" style={{ color: RDV_COLOR }} aria-hidden="true" /></div>
                    <div className="ui-card-title">Ajouter un rendez-vous</div>
                  </div>
                  <button className="rdv-modal-close" onClick={() => setAddRdvOpen(false)} aria-label="Fermer"><i className="ti ti-x" aria-hidden="true" /></button>
                </div>

                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Identité du candidat *</label>
                  <input className="ui-input" type="text" value={rdvForm.identite_candidat} onChange={e => setRdvForm({ ...rdvForm, identite_candidat: e.target.value })} />
                </div>
                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Profil</label>
                  <input className="ui-input" type="text" value={rdvForm.profil} onChange={e => setRdvForm({ ...rdvForm, profil: e.target.value })} />
                </div>
                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Positionné sur besoins</label>
                  <input className="ui-input" type="text" value={rdvForm.positionne_sur_besoins} onChange={e => setRdvForm({ ...rdvForm, positionne_sur_besoins: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <input type="checkbox" id="valide" checked={rdvForm.valide} onChange={e => setRdvForm({ ...rdvForm, valide: e.target.checked })} />
                  <label htmlFor="valide" style={{ fontSize: 13 }}>Candidat validé</label>
                </div>

                <div className="ui-cta-row">
                  <button className="ui-btn-primary" style={{ background: RDV_COLOR }} onClick={addRdv} disabled={!rdvForm.identite_candidat}>Ajouter</button>
                </div>
              </div>
            </div>
          )}
        </PremiumPanel>
      </div>

      {/* ── CV envoyés aux IAs ── */}
      <div>
        <PremiumPanel accent={CV_COLOR} accentLight={CV_LIGHT} accentRing={CV_RING}>
          <PremiumSectionHeader icon="ti-send" title="CV envoyés aux IAs" action={
            <button className="ui-add-btn" style={{ background: CV_COLOR, ...(cvOk ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }} disabled={cvOk}
              onClick={() => !cvOk && setAddCvOpen(true)}>
              <i className="ti ti-plus" aria-hidden="true" /> Ajouter un CV proposé
            </button>
          } />

          <div className="rdv-stat-row">
            <div className="ui-counter-tile" style={{ width: 128, minHeight: 60, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>CV envoyés</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="ui-counter-btn" onClick={() => setNbCvEnvoyes(Math.max(0, nbCvEnvoyes - 1))}>−</button>
                <span style={{ fontSize: 16, fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{nbCvEnvoyes}</span>
                <button className="ui-counter-btn" onClick={() => setNbCvEnvoyes(nbCvEnvoyes + 1)}>+</button>
              </div>
            </div>
          </div>

          {!cvOk && (
            <div style={warningBox}>
              ⚠️ {cvList.length}/{nbCvEnvoyes} CV détaillé{nbCvEnvoyes !== 1 ? 's' : ''} — complète le détail ci-dessous.
            </div>
          )}

          <div className="rdv-list-title">Détail des CV{cvList.length > 0 ? ` (${cvList.length})` : ''}</div>
          {cvList.length === 0 ? (
            <div className="rdv-empty">
              <div style={{ fontSize: 13, fontWeight: 600 }}>Aucun CV détaillé cette semaine</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>Ajoutez le premier via le bouton ci-dessus.</div>
            </div>
          ) : cvList.map(c => (
            <div key={c.id} className="rdv-card2">
              <span className="rdv-card2-bar" style={{ background: c.type_envoi === 'besoin' ? '#92400E' : '#0C447C' }} />
              <div className="rdv-card2-main">
                <span className="rdv-card2-client">{c.identite_candidat}</span>
                {c.profil && <span className="rdv-card2-pill" style={{ background: '#F3F4F6', color: '#374151' }}>{c.profil}</span>}
                <span className="rdv-card2-pill" style={{ background: c.type_envoi === 'besoin' ? '#FFF3E0' : '#E3F2FD', color: c.type_envoi === 'besoin' ? '#92400E' : '#0C447C' }}>
                  {c.type_envoi === 'besoin' ? `📌 Besoin : ${c.besoin_concerne}` : '🚀 Push'}
                </span>
                <div className="rdv-card2-meta">
                  {(c.ias_concernees ? c.ias_concernees.split(', ') : []).map(ia => `👤 ${ia}`).join('  ·  ')}
                </div>
              </div>
              <button className="rdv-card2-trash" onClick={() => deleteCv(c.id)} title="Supprimer"><i className="ti ti-trash" aria-hidden="true" /></button>
            </div>
          ))}

          {addCvOpen && (
            <div className="rdv-modal-overlay" onClick={() => setAddCvOpen(false)}>
              <div className="rdv-modal" onClick={e => e.stopPropagation()}>
                <div className="ui-card-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div className="ui-card-icon" style={{ background: CV_LIGHT }}><i className="ti ti-plus" style={{ color: CV_COLOR }} aria-hidden="true" /></div>
                    <div className="ui-card-title">Ajouter un CV proposé</div>
                  </div>
                  <button className="rdv-modal-close" onClick={() => setAddCvOpen(false)} aria-label="Fermer"><i className="ti ti-x" aria-hidden="true" /></button>
                </div>

                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Identité du candidat *</label>
                  <input className="ui-input" type="text" value={cvForm.identite_candidat} onChange={e => setCvForm({ ...cvForm, identite_candidat: e.target.value })} />
                </div>
                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Profil</label>
                  <input className="ui-input" type="text" value={cvForm.profil} onChange={e => setCvForm({ ...cvForm, profil: e.target.value })} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Type d'envoi</label>
                  <div className="ui-toggle-row">
                    {[['push', '🚀 Push'], ['besoin', '📌 Positionnement besoin']].map(([id, label]) => {
                      const checked = cvForm.type_envoi === id
                      return (
                        <div key={id} className={`ui-toggle-item${checked ? ' checked' : ''}`} onClick={() => setCvForm({ ...cvForm, type_envoi: id })}>
                          {label}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {cvForm.type_envoi === 'besoin' && (
                  <div className="ui-field" style={{ marginBottom: 12 }}>
                    <label className="ui-field-label">Besoin concerné</label>
                    <input className="ui-input" type="text" value={cvForm.besoin_concerne} onChange={e => setCvForm({ ...cvForm, besoin_concerne: e.target.value })} />
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label className="ui-field-label">IAs concernées</label>
                  {/* iaList est déjà cloisonnée par entite (cf. useEffect plus haut) : une CR de l'espace
                      INFRA ne voit ici que les commerciaux d'Anthony, jamais ceux de la BU de Sandra. */}
                  <div className="ui-check-grid">
                    {iaList.map(ia => {
                      const checked = cvForm.ias_concernees.includes(ia.nom)
                      return (
                        <div key={ia.id} className={`ui-check-item${checked ? ' checked' : ''}`} onClick={() => toggleIA(ia.nom)}>
                          <div className={`ui-check-box${checked ? ' checked' : ''}`}>{checked && '✓'}</div>
                          <span className={`ui-check-label${checked ? ' checked' : ''}`}>{ia.nom}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="ui-cta-row">
                  <button className="ui-btn-primary" style={{ background: CV_COLOR }} onClick={addCv} disabled={!cvForm.identite_candidat || cvForm.ias_concernees.length === 0}>Ajouter</button>
                </div>
              </div>
            </div>
          )}
        </PremiumPanel>
      </div>

      {/* ── Présentations ── */}
      <div>
        <PremiumPanel accent={PRES_COLOR} accentLight={PRES_LIGHT} accentRing={PRES_RING}>
          <PremiumSectionHeader icon="ti-clipboard-list" title="Présentations" action={
            <button className="ui-add-btn" style={{ background: PRES_COLOR, ...(presOk ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }} disabled={presOk}
              onClick={() => !presOk && setAddPresOpen(true)}>
              <i className="ti ti-plus" aria-hidden="true" /> Ajouter une présentation
            </button>
          } />

          <div className="rdv-stat-row">
            <div className="ui-counter-tile" style={{ width: 128, minHeight: 60, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Présentations</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="ui-counter-btn" onClick={() => setNbPresentations(Math.max(0, nbPresentations - 1))}>−</button>
                <span style={{ fontSize: 16, fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{nbPresentations}</span>
                <button className="ui-counter-btn" onClick={() => setNbPresentations(nbPresentations + 1)}>+</button>
              </div>
            </div>
          </div>

          {!presOk && (
            <div style={warningBox}>
              ⚠️ {presList.length}/{nbPresentations} présentation{nbPresentations !== 1 ? 's' : ''} détaillée{nbPresentations !== 1 ? 's' : ''} — complète le détail ci-dessous.
            </div>
          )}

          <div className="rdv-list-title">Détail des présentations{presList.length > 0 ? ` (${presList.length})` : ''}</div>
          {presList.length === 0 ? (
            <div className="rdv-empty">
              <div style={{ fontSize: 13, fontWeight: 600 }}>Aucune présentation détaillée cette semaine</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>Ajoutez la première via le bouton ci-dessus.</div>
            </div>
          ) : presList.map(p => (
            <div key={p.id} className="rdv-card2">
              <span className="rdv-card2-bar" style={{ background: PRES_COLOR }} />
              <div className="rdv-card2-main">
                <span className="rdv-card2-client">{p.identite_candidat}</span>
                {p.profil && <span className="rdv-card2-pill" style={{ background: '#F3F4F6', color: '#374151' }}>{p.profil}</span>}
                <div className="rdv-card2-meta">
                  {p.date_presentation && `📅 ${p.date_presentation}`}
                  {p.date_presentation && p.ia_concerne ? '  ·  ' : ''}
                  {(p.ia_concerne ? p.ia_concerne.split(', ') : []).map(ia => `👤 ${ia}`).join('  ·  ')}
                </div>
              </div>
              <button className="rdv-card2-trash" onClick={() => deletePres(p.id)} title="Supprimer"><i className="ti ti-trash" aria-hidden="true" /></button>
            </div>
          ))}

          {addPresOpen && (
            <div className="rdv-modal-overlay" onClick={() => setAddPresOpen(false)}>
              <div className="rdv-modal" onClick={e => e.stopPropagation()}>
                <div className="ui-card-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div className="ui-card-icon" style={{ background: PRES_LIGHT }}><i className="ti ti-plus" style={{ color: PRES_COLOR }} aria-hidden="true" /></div>
                    <div className="ui-card-title">Ajouter une présentation</div>
                  </div>
                  <button className="rdv-modal-close" onClick={() => setAddPresOpen(false)} aria-label="Fermer"><i className="ti ti-x" aria-hidden="true" /></button>
                </div>

                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Identité du candidat *</label>
                  <input className="ui-input" type="text" value={presForm.identite_candidat} onChange={e => setPresForm({ ...presForm, identite_candidat: e.target.value })} />
                </div>
                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Profil</label>
                  <input className="ui-input" type="text" value={presForm.profil} onChange={e => setPresForm({ ...presForm, profil: e.target.value })} />
                </div>
                <div className="ui-field" style={{ marginBottom: 14 }}>
                  <label className="ui-field-label">Date de présentation</label>
                  <input className="ui-input" type="date" value={presForm.date_presentation} onChange={e => setPresForm({ ...presForm, date_presentation: e.target.value })} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="ui-field-label">IA(s) concerné(s)</label>
                  {/* iaList est déjà cloisonnée par entite (cf. useEffect plus haut) : une CR de l'espace
                      INFRA ne voit ici que les commerciaux d'Anthony, jamais ceux de la BU de Sandra. */}
                  <div className="ui-check-grid">
                    {iaList.map(ia => {
                      const checked = presForm.ias_concernees.includes(ia.nom)
                      return (
                        <div key={ia.id} className={`ui-check-item${checked ? ' checked' : ''}`} onClick={() => togglePresIA(ia.nom)}>
                          <div className={`ui-check-box${checked ? ' checked' : ''}`}>{checked && '✓'}</div>
                          <span className={`ui-check-label${checked ? ' checked' : ''}`}>{ia.nom}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="ui-cta-row">
                  <button className="ui-btn-primary" style={{ background: PRES_COLOR }} onClick={addPres} disabled={!presForm.identite_candidat}>Ajouter</button>
                </div>
              </div>
            </div>
          )}
        </PremiumPanel>
      </div>

      {/* ── Signatures ── */}
      <div>
        <PremiumPanel accent={SIG_COLOR} accentLight={SIG_LIGHT} accentRing={SIG_RING}>
          <PremiumSectionHeader icon="ti-signature" title="Signatures" action={
            <button className="ui-add-btn" style={{ background: SIG_COLOR, ...(sigOk ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }} disabled={sigOk}
              onClick={() => !sigOk && setAddSigOpen(true)}>
              <i className="ti ti-plus" aria-hidden="true" /> Ajouter une signature
            </button>
          } />

          <div className="rdv-stat-row">
            <div className="ui-counter-tile" style={{ width: 128, minHeight: 60, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Signatures</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="ui-counter-btn" onClick={() => setNbSignatures(Math.max(0, nbSignatures - 1))}>−</button>
                <span style={{ fontSize: 16, fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{nbSignatures}</span>
                <button className="ui-counter-btn" onClick={() => setNbSignatures(nbSignatures + 1)}>+</button>
              </div>
            </div>
          </div>

          {!sigOk && (
            <div style={warningBox}>
              ⚠️ {sigList.length}/{nbSignatures} signature{nbSignatures !== 1 ? 's' : ''} détaillée{nbSignatures !== 1 ? 's' : ''} — complète le détail ci-dessous.
            </div>
          )}

          <div className="rdv-list-title">Détail des signatures{sigList.length > 0 ? ` (${sigList.length})` : ''}</div>
          {sigList.length === 0 ? (
            <div className="rdv-empty">
              <div style={{ fontSize: 13, fontWeight: 600 }}>Aucune signature détaillée cette semaine</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>Ajoutez la première via le bouton ci-dessus.</div>
            </div>
          ) : sigList.map(s => (
            <div key={s.id} className="rdv-card2">
              <span className="rdv-card2-bar" style={{ background: SIG_COLOR }} />
              <div className="rdv-card2-main">
                <span className="rdv-card2-client">{s.identite_candidat}</span>
                {s.profil && <span className="rdv-card2-pill" style={{ background: '#F3F4F6', color: '#374151' }}>{s.profil}</span>}
                <div className="rdv-card2-meta">
                  {s.salaire_envisage && `💰 ${s.salaire_envisage}`}
                  {s.salaire_envisage && s.date_signature ? '  ·  ' : ''}
                  {s.date_signature && `📅 ${s.date_signature}`}
                </div>
              </div>
              <button className="rdv-card2-trash" onClick={() => deleteSig(s.id)} title="Supprimer"><i className="ti ti-trash" aria-hidden="true" /></button>
            </div>
          ))}

          {addSigOpen && (
            <div className="rdv-modal-overlay" onClick={() => setAddSigOpen(false)}>
              <div className="rdv-modal" onClick={e => e.stopPropagation()}>
                <div className="ui-card-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div className="ui-card-icon" style={{ background: SIG_LIGHT }}><i className="ti ti-plus" style={{ color: SIG_COLOR }} aria-hidden="true" /></div>
                    <div className="ui-card-title">Ajouter une signature</div>
                  </div>
                  <button className="rdv-modal-close" onClick={() => setAddSigOpen(false)} aria-label="Fermer"><i className="ti ti-x" aria-hidden="true" /></button>
                </div>

                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Identité du candidat *</label>
                  <input className="ui-input" type="text" value={sigForm.identite_candidat} onChange={e => setSigForm({ ...sigForm, identite_candidat: e.target.value })} />
                </div>
                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Profil</label>
                  <input className="ui-input" type="text" value={sigForm.profil} onChange={e => setSigForm({ ...sigForm, profil: e.target.value })} />
                </div>
                <div className="ui-field" style={{ marginBottom: 12 }}>
                  <label className="ui-field-label">Salaire envisagé</label>
                  <input className="ui-input" type="text" value={sigForm.salaire_envisage} onChange={e => setSigForm({ ...sigForm, salaire_envisage: e.target.value })} />
                </div>
                <div className="ui-field" style={{ marginBottom: 14 }}>
                  <label className="ui-field-label">Date de signature</label>
                  <input className="ui-input" type="date" value={sigForm.date_signature} onChange={e => setSigForm({ ...sigForm, date_signature: e.target.value })} />
                </div>

                <div className="ui-cta-row">
                  <button className="ui-btn-primary" style={{ background: SIG_COLOR }} onClick={addSig} disabled={!sigForm.identite_candidat}>Ajouter</button>
                </div>
              </div>
            </div>
          )}
        </PremiumPanel>
      </div>

      </div>
    </div>
  )
}

const warningBox = { background: '#FEF3C7', color: '#92400E', borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 16, fontWeight: 500 }
const btnNav = { padding: '8px 14px', background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, cursor: 'pointer', fontSize: 14 }
