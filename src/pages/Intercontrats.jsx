import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import FicheItcList, { buildPositionnementStats } from '../components/FicheItcList'

const ACCENT = '#0F766E'
const BORDER = '#E5E1DC'
const TITLE_COLOR = '#2B2A28'
const TEXT_SECONDARY = '#6B6A66'

// Même fenêtre que le Challenge ITC (voir ChallengeItc.jsx) : les compteurs par collaborateur
// restent cohérents entre les deux écrans.
const CHALLENGE_START = '2026-11-01'
const CHALLENGE_END = '2026-12-31'

// Portail public "Intercontrats disponibles (ITC actuel et à venir)" : accessible en un clic depuis
// l'écran de connexion INFRA, sans sélection de prénom ni mot de passe (demande d'Antho — aucune
// friction pour que n'importe quel commercial la consulte). Reprend les mêmes données que l'onglet
// "Fiche ITC" du Challenge ITC (fiche + compteurs de positionnements), mais en autonome et en lecture
// seule : pas de bouton de changement de statut ici, volontairement — seul Anthony (Admin, mot de
// passe) peut marquer un collaborateur "signé" (et donc le faire disparaître de cette liste) ou le
// réactiver.
export default function Intercontrats() {
  const [collaborateurs, setCollaborateurs] = useState([])
  const [positionnementStats, setPositionnementStats] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')
      const [{ data: itc, error: itcErr }, { data: pos, error: posErr }, { data: iaRows }] = await Promise.all([
        // Même allowlist de colonnes que la Fiche ITC : jamais salaire/notes_internes ici, cette page
        // étant accessible sans la moindre identification. On récupère aussi les "retenu" (provisoirement
        // indisponibles) : FicheItcList se charge de les cacher de la liste par défaut et de ne les
        // ressortir qu'à la recherche explicite d'un nom, avec le commentaire d'Anthony.
        supabase.from('collaborateurs_itc')
          .select('id, nom, prenom, nom_famille, habite, disponibilite, fonction, a_retenir, statut, commentaire_indispo')
          .in('statut', ['actif', 'retenu']).order('nom'),
        // Pour les compteurs "push / besoin / présenté" par collaborateur, sur la fenêtre du challenge.
        supabase.from('positionnements').select('collaborateur_itc, type_positionnement, statut, ia_id')
          .gte('date_push', CHALLENGE_START).lte('date_push', CHALLENGE_END),
        supabase.from('ia').select('id, entite'),
      ])
      const firstErr = itcErr || posErr
      if (firstErr) setLoadError(`Erreur de chargement : ${firstErr.message}`)
      // On exclut l'entité de Sandra (SOL (AS), challenge étanche réservé à l'équipe INFRA d'Anthony) —
      // même principe que ChallengeItc.jsx.
      const sandraIds = new Set((iaRows || []).filter(i => i.entite === 'sandra').map(i => i.id))
      setPositionnementStats(buildPositionnementStats((pos || []).filter(p => !sandraIds.has(p.ia_id))))
      setCollaborateurs(itc || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: TEXT_SECONDARY }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>Intercontrats disponibles</div>
        <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>
          ITC actuel et à venir — collaborateurs disponibles, à jour par Anthony
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12.5, fontWeight: 600 }}>
          ⚠️ {loadError}
        </div>
      )}

      <FicheItcList collaborateurs={collaborateurs} positionnementStats={positionnementStats} accent={ACCENT} border={BORDER} titleColor={TITLE_COLOR} textSecondary={TEXT_SECONDARY} />
    </div>
  )
}
