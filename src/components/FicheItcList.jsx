import { useState } from 'react'

// Carte-annuaire des intercontrats (nom/prénom, fonction, lieu d'habitation, disponibilité, à
// retenir) — jamais salaire ni notes_internes ici, réservées à Admin (mot de passe). Composant
// partagé entre l'onglet "Fiche ITC" du portail Challenge ITC et le portail public "Intercontrats
// disponibles" (lecture seule, sans mot de passe).
//
// Le parent passe tous les collaborateurs actifs OU "retenus" (jamais les archivés) ; c'est ce
// composant qui décide de la visibilité par défaut : un collaborateur "retenu" (provisoirement
// indisponible — ex: retenu sur une mission chez un client, avec le commentaire d'Anthony expliquant
// pourquoi) n'apparaît PAS dans la liste par défaut, mais reste trouvable si un commercial tape
// explicitement son nom/sa fonction/sa ville dans la recherche — il voit alors le commentaire.
export default function FicheItcList({ collaborateurs, accent = '#C2410C', border = '#E5E1DC', titleColor = '#2B2A28', textSecondary = '#6B6A66' }) {
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
      ) : filtered.map(c => {
        const isHeld = c.statut === 'retenu'
        return (
          <div key={c.id} style={{ background: '#fff', border: `1.5px solid ${isHeld ? '#FDBA74' : border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
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
          </div>
        )
      })}
    </div>
  )
}
