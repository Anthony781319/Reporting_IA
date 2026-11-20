import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import FicheItcList, { buildPositionnementStats, FAMILLES_METIER } from '../components/FicheItcList'

const ACCENT = '#0F766E'
const BORDER = '#E5E1DC'
const TITLE_COLOR = '#2B2A28'
const TEXT_SECONDARY = '#6B6A66'

// Même mot de passe que l'espace Admin (voir ADMIN_PASSWORD dans App.js) : à garder en synchro si l'un
// des deux change. Dupliqué ici plutôt qu'importé car cette page n'est pas protégée en amont par
// App.js/Login.jsx comme Admin — le "cadenas" se déverrouille directement sur cette page (demande
// d'Antho : gérer les collaborateurs ITC "à partir de cette page directement, sans passer par Admin").
const ADMIN_PASSWORD = 'go'

// Même fenêtre que le Challenge ITC (voir ChallengeItc.jsx) : les compteurs par collaborateur
// restent cohérents entre les deux écrans.
const CHALLENGE_START = '2026-11-01'
const CHALLENGE_END = '2026-12-31'

const emptyForm = () => ({ nom: '', prenom: '', nom_famille: '', habite: '', disponibilite: '', fonction: '', famille_metier: '', a_retenir: '', notes_internes: '', salaire: '', statut: 'actif', commentaire_indispo: '' })

// Portail public "Intercontrats disponibles (ITC actuel et à venir)" : accessible en un clic depuis
// l'écran de connexion INFRA, sans sélection de prénom ni mot de passe (demande d'Antho — aucune
// friction pour que n'importe quel commercial la consulte). Reprend les mêmes données que l'onglet
// "Fiche ITC" du Challenge ITC (fiche + compteurs de positionnements). Lecture seule par défaut.
//
// Accès privilégié (🔐, réservé à Anthony — même mot de passe que l'espace Admin) : un petit cadenas
// discret en haut de la page déverrouille, sur cette même page, un mode gestion complet des
// collaborateurs ITC (ajout, modification de toute la fiche y compris salaire/notes internes,
// archivage/réactivation) — ce qui remplace entièrement l'ancienne liste "Collaborateurs ITC" de
// l'espace Admin (jugée peu pratique, supprimée de cet écran). Tant que ce n'est pas déverrouillé, la
// page ne charge jamais salaire/notes_internes : seules les colonnes déjà publiques sont en mémoire.
//
// allowDetail={false} sur FicheItcList : cette page n'ayant aucun mot de passe en lecture, on continue
// à y afficher les compteurs de push/besoins (utile pour voir d'un coup d'œil qu'un collaborateur est
// déjà "joué"), mais jamais le détail dépliable (client, contact visé, date, statut) — commercialement
// sensible. Pour le détail complet : Dashboard du Challenge ITC (protégé par mot de passe).
export default function Intercontrats() {
  const [collaborateurs, setCollaborateurs] = useState([])
  const [positionnementStats, setPositionnementStats] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [editUnlocked, setEditUnlocked] = useState(false)
  const [pwdPromptOpen, setPwdPromptOpen] = useState(false)
  const [pwdInput, setPwdInput] = useState('')
  const [pwdError, setPwdError] = useState(false)

  const [itcAnciens, setItcAnciens] = useState([])
  const [showAnciens, setShowAnciens] = useState(false)

  // Fiche en cours d'édition dans la modale "✎ Gérer" (objet complet venant de la base), ou un objet
  // { id: null, ... } pour une création. null = modale fermée.
  const [managingCard, setManagingCard] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [manageSaving, setManageSaving] = useState(false)
  const [manageMsg, setManageMsg] = useState('')

  // Requête "publique" : jamais salaire/notes_internes, c'est celle qui tourne par défaut pour tout le
  // monde (y compris Anthony tant qu'il n'a pas déverrouillé). On récupère aussi les "retenu"/
  // "arret_maladie" (provisoirement indisponibles) : FicheItcList se charge de les cacher de la liste
  // par défaut et de ne les ressortir qu'à la recherche explicite d'un nom, avec le commentaire d'Anthony.
  const loadPublic = async () => {
    const { data, error } = await supabase.from('collaborateurs_itc')
      .select('id, nom, prenom, nom_famille, habite, disponibilite, fonction, a_retenir, statut, commentaire_indispo, famille_metier')
      .in('statut', ['actif', 'retenu', 'arret_maladie']).order('nom')
    if (error) { setLoadError(`Erreur de chargement : ${error.message}`); return }
    setCollaborateurs(data || [])
  }

  // Requête "privilégiée" : tous les champs (dont salaire/notes_internes), appelée uniquement après
  // déverrouillage par mot de passe — jamais chargée pour un visiteur public.
  const loadFull = async () => {
    const { data, error } = await supabase.from('collaborateurs_itc').select('*')
      .in('statut', ['actif', 'retenu', 'arret_maladie']).order('nom')
    if (error) { setLoadError(`Erreur de chargement : ${error.message}`); return }
    setCollaborateurs(data || [])
  }

  const loadAnciens = async () => {
    const { data } = await supabase.from('collaborateurs_itc').select('*').eq('statut', 'ancien').order('nom')
    setItcAnciens(data || [])
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')
      const [, { data: pos, error: posErr }, { data: iaRows }] = await Promise.all([
        loadPublic(),
        // Pour les compteurs "push / besoin / présenté" par collaborateur, et le détail (client, contact
        // visé, date, statut) affiché au dépli de chaque carte, sur la fenêtre du challenge.
        supabase.from('positionnements').select('id, collaborateur_itc, type_positionnement, statut, ia_id, client, nom, prenom, fonction, date_push')
          .gte('date_push', CHALLENGE_START).lte('date_push', CHALLENGE_END),
        supabase.from('ia').select('id, entite'),
      ])
      if (posErr) setLoadError(`Erreur de chargement : ${posErr.message}`)
      // On exclut l'entité de Sandra (SOL (AS), challenge étanche réservé à l'équipe INFRA d'Anthony) —
      // même principe que ChallengeItc.jsx.
      const sandraIds = new Set((iaRows || []).filter(i => i.entite === 'sandra').map(i => i.id))
      setPositionnementStats(buildPositionnementStats((pos || []).filter(p => !sandraIds.has(p.ia_id))))
      setLoading(false)
    }
    load()
  }, [])

  const tryUnlock = async () => {
    if (pwdInput !== ADMIN_PASSWORD) { setPwdError(true); return }
    setPwdPromptOpen(false); setPwdInput(''); setPwdError(false)
    setEditUnlocked(true)
    await loadFull()
  }

  const lockEdit = async () => {
    setEditUnlocked(false)
    setShowAnciens(false)
    setManagingCard(null)
    // On repasse sur la requête publique pour purger salaire/notes_internes de la mémoire du navigateur.
    await loadPublic()
  }

  // Classe/reclasse la famille de métier en un clic depuis la grille (même principe que le Dashboard du
  // Challenge ITC), sans ouvrir la modale complète.
  const updateFamilleMetier = async (id, famille_metier) => {
    const { error } = await supabase.from('collaborateurs_itc').update({ famille_metier: famille_metier || null }).eq('id', id)
    if (error) { setLoadError(`La famille ne s'est pas enregistrée : ${error.message}`); return }
    setCollaborateurs(l => l.map(c => c.id === id ? { ...c, famille_metier } : c))
  }

  // Bouton "✅ Remettre disponible" sur une carte "retenu"/"arret_maladie".
  const updateDisponibilite = async (id, statut) => {
    const { error } = await supabase.from('collaborateurs_itc').update({ statut, commentaire_indispo: null }).eq('id', id)
    if (error) { setLoadError(`La disponibilité ne s'est pas enregistrée : ${error.message}`); return }
    setCollaborateurs(l => l.map(c => c.id === id ? { ...c, statut, commentaire_indispo: null } : c))
  }

  const openManage = (c) => {
    setManagingCard(c)
    setForm({
      nom: c.nom || '', prenom: c.prenom || '', nom_famille: c.nom_famille || '', habite: c.habite || '',
      disponibilite: c.disponibilite || '', fonction: c.fonction || '', famille_metier: c.famille_metier || '', a_retenir: c.a_retenir || '',
      notes_internes: c.notes_internes || '', salaire: c.salaire ?? '',
      statut: ['retenu', 'arret_maladie'].includes(c.statut) ? c.statut : 'actif', commentaire_indispo: c.commentaire_indispo || '',
    })
    setManageMsg('')
  }

  const openAddNew = () => { setManagingCard({ id: null }); setForm(emptyForm()); setManageMsg('') }
  const closeManage = () => { setManagingCard(null); setManageMsg('') }

  const refreshAfterChange = async () => {
    await loadFull()
    if (showAnciens) await loadAnciens()
  }

  const saveManage = async () => {
    if (!form.nom.trim()) return setManageMsg('Nom requis')
    setManageSaving(true)
    const payload = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim() || null,
      nom_famille: form.nom_famille.trim() || null,
      habite: form.habite.trim() || null,
      disponibilite: form.disponibilite.trim() || null,
      fonction: form.fonction.trim() || null,
      famille_metier: form.famille_metier || null,
      a_retenir: form.a_retenir.trim() || null,
      notes_internes: form.notes_internes.trim() || null,
      salaire: form.salaire === '' ? null : Number(form.salaire),
      statut: form.statut,
      // On ne garde le commentaire que si la fiche est bien marquée "retenu" ou "arret_maladie" :
      // repasser en "Disponible" efface le commentaire pour ne pas laisser traîner une raison obsolète.
      commentaire_indispo: (form.statut === 'retenu' || form.statut === 'arret_maladie') ? (form.commentaire_indispo.trim() || null) : null,
    }
    const { error } = managingCard.id
      ? await supabase.from('collaborateurs_itc').update(payload).eq('id', managingCard.id)
      : await supabase.from('collaborateurs_itc').insert(payload)
    if (error) { setManageMsg('Erreur : ' + error.message); setManageSaving(false); return }
    await refreshAfterChange()
    setManageSaving(false)
    closeManage()
  }

  // Archiver : le collaborateur n'est plus en intercontrat / a quitté. Il disparaît de la grille, mais
  // l'historique de ses positionnements passés est conservé (le champ est du texte, pas une clé étrangère).
  const archiveManage = async () => {
    if (!managingCard?.id) return
    await supabase.from('collaborateurs_itc').update({ statut: 'ancien' }).eq('id', managingCard.id)
    await refreshAfterChange()
    closeManage()
  }

  const reactivateAncien = async (id) => {
    await supabase.from('collaborateurs_itc').update({ statut: 'actif' }).eq('id', id)
    await loadFull()
    await loadAnciens()
  }

  const removeAncien = async (id) => {
    if (!window.confirm('Supprimer définitivement ce collaborateur ? Cette action est irréversible.')) return
    await supabase.from('collaborateurs_itc').delete().eq('id', id)
    await loadAnciens()
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: TEXT_SECONDARY }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Intercontrats disponibles</div>
          <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>
            ITC actuel et à venir — collaborateurs disponibles, à jour par Anthony
          </div>
        </div>

        {editUnlocked ? (
          <button onClick={lockEdit}
            style={{ background: '#E1F5EE', color: '#0F6E56', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🔓 Mode édition — Verrouiller
          </button>
        ) : pwdPromptOpen ? (
          <form onSubmit={e => { e.preventDefault(); tryUnlock() }} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="password" autoFocus value={pwdInput} onChange={e => { setPwdInput(e.target.value); setPwdError(false) }}
              placeholder="Mot de passe" style={{ width: 120, fontSize: 12.5, padding: '6px 9px', borderRadius: 8, border: `1.5px solid ${pwdError ? '#DC2626' : BORDER}`, boxSizing: 'border-box' }} />
            <button type="submit" style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OK</button>
            <button type="button" onClick={() => { setPwdPromptOpen(false); setPwdInput(''); setPwdError(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_SECONDARY, fontSize: 15, padding: '0 2px' }}>✕</button>
          </form>
        ) : (
          <button onClick={() => setPwdPromptOpen(true)} title="Accès gestion"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, opacity: 0.3, padding: 2 }}>🔐</button>
        )}
      </div>
      {pwdError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: -10, marginBottom: 10 }}>Mot de passe incorrect.</div>}

      {loadError && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12.5, fontWeight: 600 }}>
          ⚠️ {loadError}
        </div>
      )}

      {editUnlocked && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <button onClick={openAddNew}
            style={{ background: '#4338CA', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Ajouter un collaborateur
          </button>
          <button onClick={() => { if (!showAnciens) loadAnciens(); setShowAnciens(s => !s) }}
            style={{ background: 'none', border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: TEXT_SECONDARY, cursor: 'pointer' }}>
            🗄️ {showAnciens ? 'Masquer les anciens' : 'Voir les anciens'}{itcAnciens.length > 0 ? ` (${itcAnciens.length})` : ''}
          </button>
        </div>
      )}

      {editUnlocked && showAnciens && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SECONDARY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Collaborateurs archivés {itcAnciens.length > 0 && `(${itcAnciens.length})`}
          </div>
          {itcAnciens.length === 0 ? (
            <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>Aucun collaborateur archivé pour le moment.</div>
          ) : (
            <div style={{ background: '#fff', border: `0.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
              {itcAnciens.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: i === 0 ? 'none' : `0.5px solid ${BORDER}` }}>
                  <span style={{ flex: 1, fontSize: 13.5, color: TEXT_SECONDARY }}>{c.nom}</span>
                  <button onClick={() => reactivateAncien(c.id)} title="Réactiver"
                    style={{ background: 'none', border: '1.5px solid #4338CA', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#4338CA' }}>
                    ↩️ Réactiver
                  </button>
                  <button onClick={() => removeAncien(c.id)} title="Supprimer définitivement"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_SECONDARY, padding: 4, fontSize: 14 }}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <FicheItcList collaborateurs={collaborateurs} positionnementStats={positionnementStats} allowDetail={false}
        editable={editUnlocked} onFamilleChange={editUnlocked ? updateFamilleMetier : undefined}
        onDisponibiliteChange={editUnlocked ? updateDisponibilite : undefined} onManage={editUnlocked ? openManage : undefined}
        accent={ACCENT} border={BORDER} titleColor={TITLE_COLOR} textSecondary={TEXT_SECONDARY} />

      {managingCard && (
        <div onClick={closeManage} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TITLE_COLOR, marginBottom: 10 }}>
              {managingCard.id ? `✎ Modifier la fiche — ${form.nom || '...'}` : '+ Ajouter un collaborateur ITC'}
            </div>
            <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 10 }}>
              Nom, prénom, fonction et lieu d'habitation sont visibles par tous les commerciaux. Salaire et notes internes restent réservés à cet accès.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Nom affiché (ce que les commerciaux saisissent) *</label>
                <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="ex: Jean Dupont" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Fonction</label>
                <input type="text" value={form.fonction} onChange={e => setForm(f => ({ ...f, fonction: e.target.value }))} placeholder="ex: Chef de Projet" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Prénom</label>
                <input type="text" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Nom de famille</label>
                <input type="text" value={form.nom_famille} onChange={e => setForm(f => ({ ...f, nom_famille: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Lieu d'habitation</label>
                <input type="text" value={form.habite} onChange={e => setForm(f => ({ ...f, habite: e.target.value }))} placeholder="ex: MAUREPAS (78)" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Disponibilité</label>
                <input type="text" value={form.disponibilite} onChange={e => setForm(f => ({ ...f, disponibilite: e.target.value }))} placeholder="ex: Immédiate" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Famille de métier</label>
              <select value={form.famille_metier} onChange={e => setForm(f => ({ ...f, famille_metier: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">Non classé</option>
                {FAMILLES_METIER.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Disponibilité pour le challenge</label>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="actif">✅ Disponible (visible par tous dans la liste)</option>
                <option value="retenu">🔶 Retenu sur une mission (caché de la liste, visible si un commercial recherche son nom)</option>
                <option value="arret_maladie">🤒 En arrêt maladie (caché de la liste, visible si un commercial recherche son nom)</option>
              </select>
            </div>
            {(form.statut === 'retenu' || form.statut === 'arret_maladie') && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Commentaire (visible par les commerciaux qui recherchent ce nom)</label>
                <textarea value={form.commentaire_indispo} onChange={e => setForm(f => ({ ...f, commentaire_indispo: e.target.value }))} rows={2}
                  placeholder={form.statut === 'arret_maladie' ? 'ex: Retour prévu le 02/12' : 'ex: Retenu sur mission Renault, démarrage prévu le 15/12'}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: 8, borderRadius: 8, border: `0.5px solid ${BORDER}`, boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>À retenir (compétences, visible par les commerciaux)</label>
              <textarea value={form.a_retenir} onChange={e => setForm(f => ({ ...f, a_retenir: e.target.value }))} rows={3} style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: 8, borderRadius: 8, border: `0.5px solid ${BORDER}`, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>🔒 Notes internes (jamais visibles des commerciaux)</label>
              <textarea value={form.notes_internes} onChange={e => setForm(f => ({ ...f, notes_internes: e.target.value }))} rows={2} style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: 8, borderRadius: 8, border: `0.5px solid ${BORDER}`, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>🔒 Salaire (jamais visible des commerciaux)</label>
              <input type="number" value={form.salaire} onChange={e => setForm(f => ({ ...f, salaire: e.target.value }))} placeholder="ex: 45000" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            {manageMsg && (
              <div style={{ fontSize: 12, marginBottom: 10, color: manageMsg.includes('Erreur') ? '#A32D2D' : '#0F6E56', padding: '6px 10px', background: manageMsg.includes('Erreur') ? '#FCEBEB' : '#E1F5EE', borderRadius: 6 }}>
                {manageMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={closeManage}
                style={{ padding: '0 14px', background: 'none', border: `1.5px solid ${BORDER}`, color: TEXT_SECONDARY, borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
              {managingCard.id && managingCard.statut !== 'ancien' && (
                <button onClick={archiveManage} title="N'est plus en intercontrat"
                  style={{ padding: '0 14px', background: 'none', border: '1.5px solid #FDBA74', color: '#B45309', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  🗄️ Archiver
                </button>
              )}
              <button onClick={saveManage} disabled={manageSaving}
                style={{ flex: 1, padding: 12, background: '#4338CA', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {manageSaving ? 'Enregistrement...' : managingCard.id ? 'Enregistrer' : '+ Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
