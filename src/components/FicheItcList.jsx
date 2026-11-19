import { useState } from 'react'

// Grandes familles de métiers ITC (recrutement IT / Télécom / Cybersécurité) — choisies dans Admin au
// moment de la fiche, et utilisées ici pour regrouper l'annuaire "par grande famille de collaborateurs"
// (demande d'Antho). "Non classé" n'y figure pas volontairement : c'est le groupe de repli pour toute
// fiche sans famille renseignée (ou une valeur devenue obsolète), toujours affiché en dernier.
export const FAMILLES_METIER = [
  'Chef de projet',
  'Coordinateur de projet',
  'Ingénieur Système',
  'Ingénieur réseaux',
  'Ingénieur Cybersécurité',
  'Ingénieur de production',
  'Ingénieur Mainframe',
  'Ingénieur Flux',
  'Ingénieur Telecom',
  'Ingénieur Active Directory',
  'Ingénieur DevOps',
  'Profil Fonctionnels / Autres',
]

// Mêmes libellés/couleurs que POSITIONNEMENT_STATUTS dans ChallengeItc.jsx, dupliqués ici car ce
// composant est aussi utilisé par Intercontrats.jsx, en dehors de tout contexte Challenge ITC — à
// garder en synchro si la liste des statuts change côté ChallengeItc.jsx.
const STATUT_LABELS = {
  en_attente:             { label: 'En attente de retour',   color: '#0369A1' },
  presentation_a_prevoir: { label: 'Présentation à prévoir', color: '#BA7517' },
  presentation_realisee:  { label: 'Présentation réalisée',  color: '#1E40AF' },
  sans_suite:             { label: 'Sans suite',              color: '#9F1239' },
  signe:                  { label: 'Signé / Démarrage',       color: '#0F6E56' },
}

// Calcule, pour chaque collaborateur ITC (par nom, insensible à la casse), le nombre de push, de
// positionnements sur besoin et de présentations qui lui sont associés, ainsi que le détail complet
// (client, contact visé, date, statut) de chacun — pour qu'on puisse non seulement voir "push x6" mais
// aussi creuser "c'est quoi les 6 pushes" sans ressortir le Challenge ITC. La liste de positionnements
// passée en entrée est déjà filtrée par le parent sur la fenêtre du challenge et l'entité souhaitée.
// Partagé par ChallengeItc.jsx (qui a déjà allWindowPositionnements sous la main) et Intercontrats.jsx
// (qui fait son propre petit fetch dédié).
export function buildPositionnementStats(positionnements) {
  const stats = new Map()
  for (const p of positionnements || []) {
    if (!p?.collaborateur_itc) continue
    const key = p.collaborateur_itc.trim().toLowerCase()
    if (!stats.has(key)) stats.set(key, { total: 0, push: 0, besoin: 0, presentations: 0, items: [] })
    const s = stats.get(key)
    s.total += 1
    if (p.type_positionnement === 'push') s.push += 1
    if (p.type_positionnement === 'besoin') s.besoin += 1
    if (p.statut === 'presentation_realisee' || p.statut === 'signe') s.presentations += 1
    s.items.push(p)
  }
  // Les plus récents en premier dans le détail déplié.
  for (const s of stats.values()) s.items.sort((a, b) => (b.date_push || '').localeCompare(a.date_push || ''))
  return stats
}

function StatBadge({ color, bg, children }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, color, background: bg, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{children}</span>
}

// Une ligne de détail pour un push/besoin donné : client, contact visé (nom/prénom + fonction), date
// et statut d'avancement.
function PositionnementDetailRow({ p, border, titleColor, textSecondary }) {
  const statutCfg = STATUT_LABELS[p.statut] || STATUT_LABELS.en_attente
  const contact = [p.prenom, p.nom].filter(Boolean).join(' ')
  return (
    <div style={{ fontSize: 11, background: '#FAFAF9', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 9px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: titleColor }}>{p.client || 'Client non précisé'}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: p.type_positionnement === 'push' ? '#4338CA' : '#0F6E56', whiteSpace: 'nowrap' }}>
          {p.type_positionnement === 'push' ? '🚀 Push' : '🎯 Besoin'}
        </span>
      </div>
      {(contact || p.fonction) && (
        <div style={{ color: textSecondary, marginTop: 2 }}>{contact}{contact && p.fonction ? ' — ' : ''}{p.fonction}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 6, flexWrap: 'wrap' }}>
        <span style={{ color: textSecondary }}>{p.date_push ? new Date(p.date_push + 'T00:00:00').toLocaleDateString('fr-FR') : ''}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: statutCfg.color, background: statutCfg.color + '18', borderRadius: 20, padding: '2px 7px', whiteSpace: 'nowrap' }}>{statutCfg.label}</span>
      </div>
    </div>
  )
}

function CollaborateurCard({ c, statsProvided, stats, expanded, onToggleExpand, accent, border, titleColor, textSecondary }) {
  const isHeld = c.statut === 'retenu'
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${isHeld ? '#FDBA74' : border}`, borderRadius: 12, padding: '12px 14px' }}>
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

      {statsProvided && (
        stats && stats.total > 0 ? (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${border}` }}>
            <div onClick={onToggleExpand} style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', cursor: 'pointer' }}>
              {stats.push > 0 && <StatBadge color="#4338CA" bg="#EEF2FF">🚀 Push ×{stats.push}</StatBadge>}
              {stats.besoin > 0 && <StatBadge color="#0F6E56" bg="#E1F5EE">🎯 Besoin ×{stats.besoin}</StatBadge>}
              {stats.presentations > 0 && <StatBadge color="#1E40AF" bg="#DBEAFE">🎤 Présenté ×{stats.presentations}</StatBadge>}
              <span style={{ fontSize: 10.5, color: textSecondary, fontWeight: 600, marginLeft: 2 }}>{expanded ? '▲ masquer le détail' : '▼ voir le détail'}</span>
            </div>
            {expanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {stats.items.map((p, i) => <PositionnementDetailRow key={p.id || i} p={p} border={border} titleColor={titleColor} textSecondary={textSecondary} />)}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 10.5, color: '#98A2B3', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${border}`, fontStyle: 'italic' }}>
            Pas encore positionné sur la période du challenge
          </div>
        )
      )}
    </div>
  )
}

export default function FicheItcList({ collaborateurs, positionnementStats, accent = '#C2410C', border = '#E5E1DC', titleColor = '#2B2A28', textSecondary = '#6B6A66' }) {
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const term = search.trim().toLowerCase()
  const pool = term ? collaborateurs : collaborateurs.filter(c => c.statut !== 'retenu')
  const filtered = !term ? pool : pool.filter(c =>
    [c.nom, c.prenom, c.nom_famille, c.fonction, c.habite].filter(Boolean).some(v => v.toLowerCase().includes(term))
  )

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const groups = new Map()
  for (const c of filtered) {
    const fam = FAMILLES_METIER.includes(c.famille_metier) ? c.famille_metier : 'Non classé'
    if (!groups.has(fam)) groups.set(fam, [])
    groups.get(fam).push(c)
  }
  const orderedFamilies = [...FAMILLES_METIER, 'Non classé'].filter(fam => groups.has(fam))
  const statsProvided = !!positionnementStats

  return (
    <div>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un collaborateur, une fonction, une ville..."
        style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 9, border: `1.5px solid ${border}`, fontSize: 13.5, boxSizing: 'border-box', marginBottom: 12 }} />
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: textSecondary, fontSize: 13 }}>Aucun collaborateur ne correspond à la recherche.</div>
      ) : (
        orderedFamilies.map(fam => (
          <div key={fam} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              {fam} <span style={{ color: textSecondary, fontWeight: 600, textTransform: 'none' }}>({groups.get(fam).length})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
              {groups.get(fam).map(c => (
                <CollaborateurCard key={c.id} c={c}
                  statsProvided={statsProvided}
                  stats={positionnementStats?.get((c.nom || '').trim().toLowerCase())}
                  expanded={expandedIds.has(c.id)}
                  onToggleExpand={() => toggleExpand(c.id)}
                  accent={accent} border={border} titleColor={titleColor} textSecondary={textSecondary} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
