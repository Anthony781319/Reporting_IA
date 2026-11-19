import { useState } from 'react'

// Calcule, pour chaque collaborateur ITC (par nom, insensible à la casse), le nombre de push, de
// positionnements sur besoin et de présentations qui lui sont associés, à partir d'une liste de
// positionnements (déjà filtrée par le parent sur la fenêtre du challenge et l'entité souhaitée).
// Partagé par ChallengeItc.jsx (qui a déjà allWindowPositionnements sous la main) et Intercontrats.jsx
// (qui fait son propre petit fetch dédié) pour afficher ces compteurs sur la Fiche ITC / la liste
// publique, "pour suivre ça d'un coup d'œil" (demande d'Antho).
export function buildPositionnementStats(positionnements) {
  const stats = new Map()
  for (const p of positionnements || []) {
    if (!p?.collaborateur_itc) continue
    const key = p.collaborateur_itc.trim().toLowerCase()
    if (!stats.has(key)) stats.set(key, { total: 0, push: 0, besoin: 0, presentations: 0 })
    const s = stats.get(key)
    s.total += 1
    if (p.type_positionnement === 'push') s.push += 1
    if (p.type_positionnement === 'besoin') s.besoin += 1
    if (p.statut === 'presentation_realisee' || p.statut === 'signe') s.presentations += 1
  }
  return stats
}

function StatBadge({ color, bg, children }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, color, background: bg, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{children}</span>
}

// Carte-annuaire des intercontrats (nom/prénom, fonction, lieu d'habitation, disponibilité, à
// retenir, et désormais un résumé des positionnements en cours) — jamais salaire ni notes_internes
// ici, réservées à Admin (mot de passe). Composant partagé entre l'onglet "Fiche ITC" du portail
// Challenge ITC et le portail public "Intercontrats disponibles" (lecture seule, sans mot de passe).
//
// Le parent passe tous les collaborateurs actifs OU "retenus" (jamais les archivés) ; c'est ce
// composant qui décide de la visibilité par défaut : un collaborateur "retenu" (provisoirement
// indisponible — ex: retenu sur une mission chez un client, avec le commentaire d'Anthony expliquant
// pourquoi) n'apparaît PAS dans la liste par défaut, mais reste trouvable si un commercial tape
// explicitement son nom/sa fonction/sa ville dans la recherche — il voit alors le commentaire.
//
// Présentation en grille (plusieurs cartes par ligne selon la largeur) plutôt qu'en liste empilée
// verticale, pour exploiter la largeur de l'écran — demande d'Antho ("on est très vertical, c'est
// chiant"). Nécessite que le conteneur parent soit en pleine largeur (classe .wide) pour que ça se
// voie vraiment.
export default function FicheItcList({ collaborateurs, positionnementStats, accent = '#C2410C', border = '#E5E1DC', titleColor = '#2B2A28', textSecondary = '#6B6A66' }) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  // Sans recherche : seuls les "actif" ressortent. Avec une recherche : les "retenu" redeviennent
  // trouvables (mais pas les archivés, déjà exclus en amont par le parent).
  const pool = term ? collaborateurs : collaborateurs.filter(c => c.statut !== 'retenu')
  const filtered = !term ? pool : pool.filter(c =>
    [c.nom, c.prenom, c.nom_famille, c.fonction, c.habite].filter(Boolean).some(v => v.toLowerCase().includes(term))
  )

  return (
    <div>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un collaborateur, une fonction, une ville..."
        style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 9, border: `1.5px solid ${border}`, fontSize: 13.5, boxSizing: 'border-box', marginBottom: 12 }} />
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: textSecondary, fontSize: 13 }}>Aucun collaborateur ne correspond à la recherche.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
          {filtered.map(c => {
            const isHeld = c.statut === 'retenu'
            const stats = positionnementStats?.get((c.nom || '').trim().toLowerCase())
            return (
              <div key={c.id} style={{ background: '#fff', border: `1.5px solid ${isHeld ? '#FDBA74' : border}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: titleColor }}>{[c.prenom, c.nom_famille].filter(Boolean).join(' ') || c.nom}</div>
                  {isHeld ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#B45309', background: '#FEF3C7', borderRadius: 20, padding: '2px 8px' }}>🔶 Indisponible</span>
                  ) : c.disponibilite && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', background: '#D1FAE5', borderRadius: 20, padding: '2px 8px' }}>{c.disponibilite}</span>
                  )}
                </div>
                {c.fonction && <div style={{ fontSize: 12.5, color: accent, fontWeight: 600, marginTop: 3, whiteSpace: 'pre-line' }}>{c.fonction}</div>}
                {c.habite && <div style={{ fontSize: 11.5, color: textSecondary, marginTop: 4 }}>📍 {c.habite}</div>}
                {isHeld && c.commentaire_indispo && (
                  <div style={{ fontSize: 11.5, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '7px 9px', marginTop: 6, whiteSpace: 'pre-line', fontWeight: 600 }}>
                    {c.commentaire_indispo}
                  </div>
                )}
                {!isHeld && c.a_retenir && <div style={{ fontSize: 11.5, color: textSecondary, marginTop: 6, whiteSpace: 'pre-line' }}>{c.a_retenir}</div>}

                {positionnementStats && (
                  stats && stats.total > 0 ? (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${border}` }}>
                      {stats.push > 0 && <StatBadge color="#4338CA" bg="#EEF2FF">🚀 Push ×{stats.push}</StatBadge>}
                      {stats.besoin > 0 && <StatBadge color="#0F6E56" bg="#E1F5EE">🎯 Besoin ×{stats.besoin}</StatBadge>}
                      {stats.presentations > 0 && <StatBadge color="#1E40AF" bg="#DBEAFE">🎤 Présenté ×{stats.presentations}</StatBadge>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10.5, color: '#98A2B3', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${border}`, fontStyle: 'italic' }}>
                      Pas encore positionné sur la période du challenge
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
