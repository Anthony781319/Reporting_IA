
import { useState } from 'react'

// Carte-annuaire des intercontrats (nom/prénom, fonction, lieu d'habitation, disponibilité, à
// retenir) — jamais salaire ni notes_internes ici, réservées à Admin (mot de passe). Composant
// partagé entre l'onglet "Fiche ITC" du portail Challenge ITC et le portail public "Intercontrats
// disponibles" (lecture seule, sans mot de passe) : le parent fait le fetch et filtre déjà sur
// statut='actif', ce composant se contente de chercher/afficher.
export default function FicheItcList({ collaborateurs, accent = '#C2410C', border = '#E5E1DC', titleColor = '#2B2A28', textSecondary = '#6B6A66' }) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const filtered = !term ? collaborateurs : collaborateurs.filter(c =>
    [c.nom, c.prenom, c.nom_famille, c.fonction, c.habite].filter(Boolean).some(v => v.toLowerCase().includes(term))
  )

  return (
    <div>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un collaborateur, une fonction, une ville..."
        style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 9, border: `1.5px solid ${border}`, fontSize: 13.5, boxSizing: 'border-box', marginBottom: 12 }} />
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: textSecondary, fontSize: 13 }}>Aucun collaborateur ne correspond à la recherche.</div>
      ) : filtered.map(c => (
        <div key={c.id} style={{ background: '#fff', border: `1.5px solid ${border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: titleColor }}>{[c.prenom, c.nom_famille].filter(Boolean).join(' ') || c.nom}</div>
            {c.disponibilite && <span style={{ fontSize: 10, fontWeight: 700, color: '#0F6E56', background: '#D1FAE5', borderRadius: 20, padding: '2px 8px' }}>{c.disponibilite}</span>}
          </div>
          {c.fonction && <div style={{ fontSize: 12.5, color: accent, fontWeight: 600, marginTop: 3, whiteSpace: 'pre-line' }}>{c.fonction}</div>}
          {c.habite && <div style={{ fontSize: 11.5, color: textSecondary, marginTop: 4 }}>📍 {c.habite}</div>}
          {c.a_retenir && <div style={{ fontSize: 11.5, color: textSecondary, marginTop: 6, whiteSpace: 'pre-line' }}>{c.a_retenir}</div>}
        </div>
      ))}
    </div>
  )
}
