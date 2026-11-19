
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import FicheItcList from '../components/FicheItcList'

const ACCENT = '#0F766E'
const BORDER = '#E5E1DC'
const TITLE_COLOR = '#2B2A28'
const TEXT_SECONDARY = '#6B6A66'

// Portail public "Intercontrats disponibles (ITC actuel et à venir)" : accessible en un clic depuis
// l'écran de connexion INFRA, sans sélection de prénom ni mot de passe (demande d'Antho — aucune
// friction pour que n'importe quel commercial la consulte). Reprend les mêmes données que l'onglet
// "Fiche ITC" du Challenge ITC, mais en autonome et en lecture seule : pas de bouton de changement de
// statut ici, volontairement — seul Anthony (Admin, mot de passe) peut marquer un collaborateur
// "signé" (et donc le faire disparaître de cette liste) ou le réactiver.
export default function Intercontrats() {
  const [collaborateurs, setCollaborateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')
      // Même allowlist de colonnes que la Fiche ITC : jamais salaire/notes_internes ici, cette page
      // étant accessible sans la moindre identification.
      const { data, error } = await supabase.from('collaborateurs_itc')
        .select('id, nom, prenom, nom_famille, habite, disponibilite, fonction, a_retenir, statut')
        .eq('statut', 'actif').order('nom')
      if (error) setLoadError(`Erreur de chargement : ${error.message}`)
      setCollaborateurs(data || [])
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

      <FicheItcList collaborateurs={collaborateurs} accent={ACCENT} border={BORDER} titleColor={TITLE_COLOR} textSecondary={TEXT_SECONDARY} />
    </div>
  )
}
