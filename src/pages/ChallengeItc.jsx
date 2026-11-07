import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─────────────────────────────────────────────────────────────────────────
// Portail "Challenge ITC" : suivi dédié du challenge de positionnement des
// intercontrats (1er novembre → 31 décembre). Reprend le formulaire de
// "Positionnement collaborateur ITC" qui vivait avant dans Ma saisie (déplacé
// ici pour ne pas faire doublon), et y ajoute un classement commun à toute
// l'équipe pour suivre qui est le plus actif (positionnements, push,
// présentations, signatures).
// ─────────────────────────────────────────────────────────────────────────

const CHALLENGE_START = '2026-11-01'
const CHALLENGE_END = '2026-12-31'

// Numéro de semaine ISO-like pour une date donnée (même formule que currentWeek() utilisée ailleurs
// dans l'app, mais appliquée à date_push plutôt qu'à "maintenant") : les positionnements saisis ici
// restent cohérents avec semaine/année utilisés par les autres écrans (dashboard hebdo, réunion...).
const weekOfDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7)
}
const yearOfDate = (dateStr) => new Date(dateStr + 'T00:00:00').getFullYear()

const ACCENT = '#C2410C'
const ACCENT_LIGHT = '#FFF7ED'
const BORDER = '#E5E1DC'
const TITLE_COLOR = '#2B2A28'
const TEXT_SECONDARY = '#6B6A66'

const POSITIONNEMENT_STATUTS = [
  { value: 'en_attente',             label: 'En attente de retour',    color: '#0369A1' },
  { value: 'presentation_a_prevoir', label: 'Présentation à prévoir',  color: '#BA7517' },
  { value: 'presentation_realisee',  label: 'Présentation réalisée',   color: '#1E40AF' },
  { value: 'sans_suite',             label: 'Sans suite',              color: '#9F1239' },
  { value: 'signe',                  label: 'Signé / Démarrage',       color: '#0F6E56' },
]
const POSITIONNEMENT_TYPE_OPTIONS = [
  { value: 'besoin', label: 'Positionnement sur besoin' },
  { value: 'push',   label: 'Push' },
]
const POSITIONNEMENT_TYPE_COLORS = { besoin: '#0F6E56', push: '#4338CA' }
const PRESENTED_STATUTS = ['presentation_realisee', 'signe']

const todayISO = () => new Date().toISOString().slice(0, 10)
const emptyPositionnement = () => ({ collaborateur_itc: '', client: '', nom: '', prenom: '', fonction: '', type_positionnement: '', date_push: todayISO() })

// Score du challenge : +1 par positionnement/push saisi, +2 de plus s'il a été présenté (ou signé),
// +5 de plus s'il est signé — pour valoriser le résultat, pas juste le volume. Facile à retoucher ici
// si Anthony veut repondérer.
const scorePositionnement = p => {
  let s = 1
  if (p.statut === 'presentation_realisee' || p.statut === 'signe') s += 2
  if (p.statut === 'signe') s += 5
  return s
}

function StatutBadge({ statut }) {
  const cfg = POSITIONNEMENT_STATUTS.find(s => s.value === statut) || POSITIONNEMENT_STATUTS[0]
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: cfg.color, background: cfg.color + '18', borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

function PositionnementRow({ p, onStatutChange, onRemove }) {
  const cfg = POSITIONNEMENT_STATUTS.find(s => s.value === p.statut) || POSITIONNEMENT_STATUTS[0]
  const typeColor = POSITIONNEMENT_TYPE_COLORS[p.type_positionnement] || ACCENT
  const typeLabel = POSITIONNEMENT_TYPE_OPTIONS.find(t => t.value === p.type_positionnement)?.label
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${cfg.color}45`, marginBottom: 10, background: '#fff' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TITLE_COLOR }}>{p.collaborateur_itc}</div>
            {typeLabel && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: typeColor, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{typeLabel}</span>}
          </div>
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 600, marginTop: 2 }}>🏢 {p.client}</div>
          {(p.nom || p.prenom) && (
            <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 }}>
              👤 {[p.prenom, p.nom].filter(Boolean).join(' ')}{p.fonction && ` · ${p.fonction}`}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 6 }}>
            {p.date_push ? `Poussé le ${new Date(p.date_push).toLocaleDateString('fr-FR')}` : ''}
          </div>
        </div>
        {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>✕</button>}
      </div>
      <div style={{ padding: '0 14px 12px' }}>
        <select value={p.statut} onChange={e => onStatutChange(p.id, e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${cfg.color}60`, background: cfg.color + '14', color: cfg.color, fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
          {POSITIONNEMENT_STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function ChallengeItc({ iaId, iaName }) {
  const [loading, setLoading] = useState(true)
  const [myPositionnements, setMyPositionnements] = useState([])
  const [allWindowPositionnements, setAllWindowPositionnements] = useState([]) // tous BM, dans la fenêtre du challenge
  const [itcCollaborateurs, setItcCollaborateurs] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const [newPositionnement, setNewPositionnement] = useState(emptyPositionnement())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [posFormKey, setPosFormKey] = useState(0)
  const dateInputRef = useRef(null)
  const [itcSuggestions, setItcSuggestions] = useState([])
  const [itcSuggestionsOpen, setItcSuggestionsOpen] = useState(false)
  const [posContactSuggestions, setPosContactSuggestions] = useState([])
  const [selectedPosContactId, setSelectedPosContactId] = useState(null)

  const [view, setView] = useState('classement')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')
      // "Ma saisie" est scopée à la fenêtre du challenge elle aussi (comme le classement et les
      // présentés) : sinon d'anciens positionnements saisis avant le 1er novembre (via l'ancien panneau
      // de Ma saisie) réapparaissaient ici sans jamais compter nulle part ailleurs, ce qui semait la
      // confusion.
      //
      // On ne demande plus le join embarqué ia(nom, entite) : la colonne positionnements.ia_id n'a
      // jamais été déclarée comme clé étrangère vers ia.id (seul son type a été corrigé en uuid dans
      // fix_ia_id_positionnements.sql), donc PostgREST ne sait pas faire ce join et la requête
      // échouait silencieusement (windowData restait vide, d'où un classement/des totaux bloqués à
      // zéro malgré des saisies bien enregistrées). On récupère la table ia à part et on fait le
      // rapprochement nous-mêmes en JS, ce qui ne dépend plus de cette relation.
      const [{ data: mine, error: mineErr }, { data: windowData, error: windowErr }, { data: itc }, { data: iaRows, error: iaErr }] = await Promise.all([
        iaId ? supabase.from('positionnements').select('*').eq('ia_id', iaId).gte('date_push', CHALLENGE_START).lte('date_push', CHALLENGE_END).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from('positionnements').select('*').gte('date_push', CHALLENGE_START).lte('date_push', CHALLENGE_END),
        supabase.from('collaborateurs_itc').select('*').eq('statut', 'actif').order('nom'),
        supabase.from('ia').select('id, nom, entite'),
      ])
      const firstErr = mineErr || windowErr || iaErr
      if (firstErr) setLoadError(`Erreur de chargement : ${firstErr.message}`)
      const iaById = new Map((iaRows || []).map(i => [i.id, i]))
      setMyPositionnements(mine || [])
      // On exclut l'entité de Sandra (SOL (AS), challenge étanche réservé à l'équipe INFRA d'Anthony).
      setAllWindowPositionnements(
        (windowData || [])
          .map(p => ({ ...p, ia: iaById.get(p.ia_id) || null }))
          .filter(p => p.ia?.entite !== 'sandra' && p.ia?.nom)
      )
      setItcCollaborateurs(itc || [])
      setLoading(false)
    }
    load()
  }, [iaId, refreshKey])

  // Recherche de contact existant pendant la saisie du nom de l'opérationnel visé (même logique que
  // l'ancien panneau de Ma saisie).
  useEffect(() => {
    const term = newPositionnement.nom.trim()
    if (selectedPosContactId || term.length < 2) { setPosContactSuggestions([]); return }
    const timeout = setTimeout(async () => {
      const { data: matches } = await supabase.from('contacts').select('*').ilike('nom', `%${term}%`).limit(5)
      setPosContactSuggestions(matches || [])
    }, 300)
    return () => clearTimeout(timeout)
  }, [newPositionnement.nom, selectedPosContactId])

  const pickPosContact = (c) => {
    setSelectedPosContactId(c.id)
    setNewPositionnement(p => ({ ...p, nom: c.nom, prenom: c.prenom || '' }))
    setPosContactSuggestions([])
  }

  const collaborateurItcValide = itcCollaborateurs.some(c => c.nom.toLowerCase() === newPositionnement.collaborateur_itc.trim().toLowerCase())
  const positionnementComplete = collaborateurItcValide && newPositionnement.client.trim() && newPositionnement.nom.trim() && newPositionnement.type_positionnement && newPositionnement.date_push

  const addPositionnement = async () => {
    if (!positionnementComplete || !iaId) return
    setSaving(true)
    setError('')

    let contactId = selectedPosContactId
    let createdContactId = null
    if (!contactId) {
      const { data: newContact, error: contactErr } = await supabase.from('contacts')
        .insert({ nom: newPositionnement.nom.trim(), prenom: newPositionnement.prenom.trim() || null })
        .select().single()
      if (contactErr) {
        setError(`Erreur contact : ${contactErr.message}`)
        setSaving(false)
        return
      }
      contactId = newContact.id
      createdContactId = newContact.id
    }

    const semaine = weekOfDate(newPositionnement.date_push)
    const annee = yearOfDate(newPositionnement.date_push)
    const { data, error: err } = await supabase.from('positionnements').insert({
      ia_id: iaId,
      semaine, annee,
      collaborateur_itc: newPositionnement.collaborateur_itc.trim(),
      client: newPositionnement.client.trim(),
      contact_id: contactId,
      nom: newPositionnement.nom.trim(),
      prenom: newPositionnement.prenom.trim() || null,
      fonction: newPositionnement.fonction.trim() || null,
      type_positionnement: newPositionnement.type_positionnement,
      date_push: newPositionnement.date_push,
      statut: 'en_attente',
      derniere_maj_semaine: semaine,
      derniere_maj_annee: annee,
    }).select().single()

    if (data) {
      setMyPositionnements(l => [data, ...l])
      // Mise à jour optimiste du classement global en plus du refetch (voir plus bas) : on ajoute
      // tout de suite la ligne avec son ia rattaché, pour que le classement/les présentés réagissent
      // sans attendre le prochain chargement.
      setAllWindowPositionnements(l => [{ ...data, ia: { nom: iaName, entite: null } }, ...l])
      setNewPositionnement(emptyPositionnement())
      setSelectedPosContactId(null)
      setPosFormKey(k => k + 1)
      setRefreshKey(k => k + 1)
    } else {
      if (createdContactId) await supabase.from('contacts').delete().eq('id', createdContactId)
      setError(err?.message ? `Erreur d'enregistrement : ${err.message}` : "Erreur d'enregistrement, réessaie ou préviens Anthony.")
    }
    setSaving(false)
  }

  const removePositionnement = async (id) => {
    setError('')
    const { error: err } = await supabase.from('positionnements').delete().eq('id', id)
    if (err) { setError(`Erreur de suppression : ${err.message}`); return }
    setMyPositionnements(l => l.filter(p => p.id !== id))
    setAllWindowPositionnements(l => l.filter(p => p.id !== id))
  }

  const updateStatut = async (id, statut) => {
    setError('')
    const nowISO = todayISO()
    const { data, error: err } = await supabase.from('positionnements')
      .update({ statut, derniere_maj_semaine: weekOfDate(nowISO), derniere_maj_annee: yearOfDate(nowISO), updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (data) {
      setMyPositionnements(l => l.map(p => p.id === id ? data : p))
      // On fusionne plutôt que remplacer : data (retour de l'update) n'inclut pas le join ia(nom,
      // entite), donc un remplacement pur aurait fait disparaître p.ia et cassé le classement/présentés.
      setAllWindowPositionnements(l => l.map(p => p.id === id ? { ...p, ...data } : p))
    } else {
      setError(err?.message ? `Le statut ne s'est pas enregistré : ${err.message}` : "Le statut ne s'est pas enregistré, réessaie ou préviens Anthony.")
    }
  }

  // ── Classement ──
  const byBm = Object.values(
    allWindowPositionnements.reduce((acc, p) => {
      const nom = p.ia.nom
      if (!acc[nom]) acc[nom] = { nom, total: 0, push: 0, besoin: 0, presentations: 0, signatures: 0, score: 0 }
      acc[nom].total += 1
      if (p.type_positionnement === 'push') acc[nom].push += 1
      if (p.type_positionnement === 'besoin') acc[nom].besoin += 1
      if (PRESENTED_STATUTS.includes(p.statut)) acc[nom].presentations += 1
      if (p.statut === 'signe') acc[nom].signatures += 1
      acc[nom].score += scorePositionnement(p)
      return acc
    }, {})
  ).sort((a, b) => b.score - a.score)

  // Tous les positionnements de la fenêtre, tous statuts confondus (vue détaillée demandée par Antho,
  // entre Classement et Présentés) : à la différence de "Présentés"/"Signé" qui ne montrent que les
  // positionnements arrivés à un certain stade, celle-ci liste tout, y compris ceux encore en attente.
  const tousPositionnes = [...allWindowPositionnements]
    .sort((a, b) => new Date(b.date_push) - new Date(a.date_push))

  const presentes = allWindowPositionnements
    .filter(p => PRESENTED_STATUTS.includes(p.statut))
    .sort((a, b) => new Date(b.date_push) - new Date(a.date_push))

  const signes = allWindowPositionnements
    .filter(p => p.statut === 'signe')
    .sort((a, b) => new Date(b.date_push) - new Date(a.date_push))

  const totalPush = allWindowPositionnements.filter(p => p.type_positionnement === 'push').length
  const totalBesoin = allWindowPositionnements.filter(p => p.type_positionnement === 'besoin').length
  const totalPresentations = presentes.length
  const totalSignatures = allWindowPositionnements.filter(p => p.statut === 'signe').length

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: TEXT_SECONDARY }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>Challenge ITC — Bonjour {iaName} 👋</div>
        <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>
          Du {new Date(CHALLENGE_START).toLocaleDateString('fr-FR')} au {new Date(CHALLENGE_END).toLocaleDateString('fr-FR')} — positionnement des intercontrats
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12.5, fontWeight: 600 }}>
          ⚠️ {loadError} — préviens Anthony, les chiffres affichés ci-dessous ne sont pas fiables tant que ce message est là.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#EDE9FE', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#4338CA', fontWeight: 600, textTransform: 'uppercase' }}>Push</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#4338CA' }}>{totalPush}</div>
        </div>
        <div style={{ background: ACCENT_LIGHT, borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: ACCENT, fontWeight: 600, textTransform: 'uppercase' }}>Positionnement sur besoin</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: ACCENT }}>{totalBesoin}</div>
        </div>
        <div style={{ background: '#DBEAFE', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#1E40AF', fontWeight: 600, textTransform: 'uppercase' }}>Présentation</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1E40AF' }}>{totalPresentations}</div>
        </div>
        <div style={{ background: '#D1FAE5', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#0F6E56', fontWeight: 600, textTransform: 'uppercase' }}>Signature</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F6E56' }}>{totalSignatures}</div>
        </div>
      </div>

      <div style={{ display: 'flex', background: ACCENT_LIGHT, borderRadius: 10, padding: 3, marginBottom: 16, border: `1px solid ${BORDER}` }}>
        {[['classement', '🏆 Classement'], ['positionnes', '📋 Positionné'], ['presentes', '🎤 Présentés'], ['signes', '✍️ Signé'], ['saisie', '➕ Ma saisie']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: view === id ? 700 : 400, background: view === id ? ACCENT : 'transparent', color: view === id ? '#fff' : ACCENT, cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'classement' && (
        <div>
          {byBm.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: TEXT_SECONDARY, fontSize: 13 }}>Aucun positionnement enregistré sur la période pour l'instant.</div>
          ) : byBm.map((bm, i) => (
            <div key={bm.nom} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ width: 26, textAlign: 'center', fontSize: 15 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: TITLE_COLOR }}>{bm.nom}{bm.nom === iaName ? ' (toi)' : ''}</div>
                <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 }}>
                  {bm.total} positionnement{bm.total > 1 ? 's' : ''} · {bm.push} push · {bm.presentations} présentation{bm.presentations > 1 ? 's' : ''} · {bm.signatures} signature{bm.signatures > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>{bm.score}</div>
                <div style={{ fontSize: 9, color: '#98A2B3', textTransform: 'uppercase' }}>points</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'positionnes' && (
        <div>
          {tousPositionnes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: TEXT_SECONDARY, fontSize: 13 }}>Aucun positionnement enregistré sur la période pour l'instant.</div>
          ) : tousPositionnes.map(p => {
            const typeColor = POSITIONNEMENT_TYPE_COLORS[p.type_positionnement] || ACCENT
            const typeLabel = POSITIONNEMENT_TYPE_OPTIONS.find(t => t.value === p.type_positionnement)?.label
            return (
              <div key={p.id} style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: TITLE_COLOR }}>{p.collaborateur_itc}</div>
                    {typeLabel && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: typeColor, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{typeLabel}</span>}
                  </div>
                  <StatutBadge statut={p.statut} />
                </div>
                <div style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 4 }}>
                  🏢 {p.client} · positionné par <strong>{p.ia?.nom}</strong> · {new Date(p.date_push).toLocaleDateString('fr-FR')}
                </div>
                {(p.nom || p.prenom) && (
                  <div style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 2 }}>
                    👤 {[p.prenom, p.nom].filter(Boolean).join(' ')}{p.fonction && ` · ${p.fonction}`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'presentes' && (
        <div>
          {presentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: TEXT_SECONDARY, fontSize: 13 }}>Personne n'a encore été présenté sur la période.</div>
          ) : presentes.map(p => (
            <div key={p.id} style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: TITLE_COLOR }}>{p.collaborateur_itc}</div>
                <StatutBadge statut={p.statut} />
              </div>
              <div style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 3 }}>
                🏢 {p.client} · présenté par <strong>{p.ia?.nom}</strong> · {new Date(p.date_push).toLocaleDateString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'signes' && (
        <div>
          {signes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: TEXT_SECONDARY, fontSize: 13 }}>Aucune signature enregistrée sur la période pour l'instant.</div>
          ) : signes.map(p => (
            <div key={p.id} style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: TITLE_COLOR }}>{p.collaborateur_itc}</div>
                <StatutBadge statut={p.statut} />
              </div>
              <div style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 3 }}>
                🏢 {p.client} · signé par <strong>{p.ia?.nom}</strong> · {new Date(p.date_push).toLocaleDateString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'saisie' && (
        <div>
          {myPositionnements.map(p => (
            <PositionnementRow key={p.id} p={p} onStatutChange={updateStatut} onRemove={() => removePositionnement(p.id)} />
          ))}

          <div style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '16px 18px', marginTop: myPositionnements.length > 0 ? 14 : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TITLE_COLOR, marginBottom: 12 }}>Ajouter un positionnement</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Type de positionnement *</label>
                <select value={newPositionnement.type_positionnement} onChange={e => setNewPositionnement(p => ({ ...p, type_positionnement: e.target.value }))}
                  style={{ height: 44, width: '100%', padding: '0 10px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 13.5 }}>
                  <option value="">Choisir...</option>
                  {POSITIONNEMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Date du push *</label>
                <input ref={dateInputRef} key={posFormKey} type="date" defaultValue={newPositionnement.date_push}
                  onChange={e => setNewPositionnement(p => ({ ...p, date_push: e.target.value }))}
                  onClick={() => { try { dateInputRef.current?.showPicker?.() } catch {} }}
                  style={{ height: 44, width: '100%', padding: '0 10px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 13.5, boxSizing: 'border-box', cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Collaborateur en ITC *</label>
                <input type="text" placeholder="Rechercher dans la liste..." autoComplete="off"
                  value={newPositionnement.collaborateur_itc}
                  onFocus={() => { setItcSuggestions(newPositionnement.collaborateur_itc.trim() ? itcCollaborateurs.filter(c => c.nom.toLowerCase().includes(newPositionnement.collaborateur_itc.trim().toLowerCase())) : itcCollaborateurs); setItcSuggestionsOpen(true) }}
                  onBlur={() => setTimeout(() => setItcSuggestionsOpen(false), 150)}
                  onChange={e => {
                    const term = e.target.value
                    setNewPositionnement(p => ({ ...p, collaborateur_itc: term }))
                    setItcSuggestions(term.trim() ? itcCollaborateurs.filter(c => c.nom.toLowerCase().includes(term.trim().toLowerCase())) : itcCollaborateurs)
                    setItcSuggestionsOpen(true)
                  }}
                  style={{ height: 44, width: '100%', padding: '0 10px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 13.5, boxSizing: 'border-box' }} />
                {collaborateurItcValide && <div style={{ fontSize: 10.5, color: '#12805C', marginTop: 4, fontWeight: 600 }}>✓ Collaborateur reconnu</div>}
                {!collaborateurItcValide && newPositionnement.collaborateur_itc.trim() && <div style={{ fontSize: 10.5, color: '#B42318', marginTop: 4, fontWeight: 600 }}>Sélectionne un nom dans la liste</div>}
                {itcSuggestionsOpen && itcSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 30px rgba(16,24,40,0.14)' }}>
                    {itcSuggestions.map(c => (
                      <div key={c.id} onClick={() => { setNewPositionnement(p => ({ ...p, collaborateur_itc: c.nom })); setItcSuggestionsOpen(false); setItcSuggestions([]) }}
                        style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, borderBottom: '1px solid #F3F4F6' }}>
                        {c.nom}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Client *</label>
                <input type="text" placeholder="Raison sociale du client" autoComplete="off" value={newPositionnement.client}
                  onChange={e => setNewPositionnement(p => ({ ...p, client: e.target.value }))}
                  style={{ height: 44, width: '100%', padding: '0 10px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 13.5, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Nom de l'opérationnel visé *</label>
                <input type="text" placeholder="Nom" autoComplete="off" value={newPositionnement.nom}
                  onChange={e => { setNewPositionnement(p => ({ ...p, nom: e.target.value })); setSelectedPosContactId(null) }}
                  style={{ height: 44, width: '100%', padding: '0 10px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 13.5, boxSizing: 'border-box' }} />
                {selectedPosContactId && <div style={{ fontSize: 10.5, color: '#12805C', marginTop: 4, fontWeight: 600 }}>✓ Contact déjà connu, relié automatiquement</div>}
                {!selectedPosContactId && posContactSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 30px rgba(16,24,40,0.14)' }}>
                    {posContactSuggestions.map(c => (
                      <div key={c.id} onClick={() => pickPosContact(c)} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, borderBottom: '1px solid #F3F4F6' }}>
                        {[c.prenom, c.nom].filter(Boolean).join(' ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Prénom</label>
                <input type="text" placeholder="Prénom" autoComplete="off" value={newPositionnement.prenom}
                  onChange={e => setNewPositionnement(p => ({ ...p, prenom: e.target.value }))}
                  style={{ height: 44, width: '100%', padding: '0 10px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 13.5, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Fonction</label>
                <input type="text" placeholder="Ex: DRH, Directeur IT..." autoComplete="off" value={newPositionnement.fonction}
                  onChange={e => setNewPositionnement(p => ({ ...p, fonction: e.target.value }))}
                  style={{ height: 44, width: '100%', padding: '0 10px', borderRadius: 9, border: `1.5px solid ${BORDER}`, fontSize: 13.5, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={addPositionnement} disabled={saving || !positionnementComplete}
                style={{ height: 45, padding: '0 26px', borderRadius: 10, background: (saving || !positionnementComplete) ? '#EAECF0' : ACCENT, color: (saving || !positionnementComplete) ? '#98A2B3' : '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: (saving || !positionnementComplete) ? 'default' : 'pointer' }}>
                {saving ? 'Enregistrement...' : 'Ajouter le positionnement'}
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
