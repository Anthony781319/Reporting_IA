import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ─────────────────────────────────────────────
// SHARED UTILS
// ─────────────────────────────────────────────
const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const CR_LIST = ['Younes', 'Soundous', 'Zayneb', 'Shaymae', 'Soukaina']

const AVATAR_COLORS = [
  ['#EDE9FE','#6D28D9'],['#D1FAE5','#065F46'],['#FEF3C7','#92400E'],
  ['#FCE7F3','#9D174D'],['#DBEAFE','#1E40AF'],['#DCFCE7','#166534'],
  ['#F3F4F6','#374151'],['#FFE4E6','#9F1239'],['#E0F2FE','#0369A1'],
  ['#FEF9C3','#854D0E'],
]

const CR_COLORS = [
  ['#EEEDFE','#534AB7'],['#E1F5EE','#085041'],['#FAEEDA','#633806'],
  ['#FBEAF0','#72243E'],['#E6F1FB','#0C447C'],
]

// ─────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────
const Trend = ({ current, previous }) => {
  if (previous === undefined || previous === null) return null
  const diff = current - previous
  if (diff === 0) return <span style={{ fontSize: 11, color: '#888780' }}>—</span>
  const up = diff > 0
  return <span style={{ fontSize: 12, fontWeight: 700, color: up ? '#065F46' : '#991B1B' }}>{up ? '↑ +' : '↓ '}{diff}</span>
}

const KpiCard = ({ label, value, color, bg, previous }) => (
  <div style={{ background: bg || color + '12', borderRadius: 10, padding: '10px 12px' }}>
    <div style={{ fontSize: 10, color, fontWeight: 600, opacity: 0.75, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      <div style={{ paddingBottom: 2 }}><Trend current={value} previous={previous} /></div>
    </div>
    {previous !== undefined && <div style={{ fontSize: 10, color, opacity: 0.55, marginTop: 3 }}>Préc. : {previous}</div>}
  </div>
)

const KpiCardDetail = ({ label, value, color, bg, previous, type, semaine, annee, iaId, allYear = false }) => {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { setLoaded(false); setOpen(false); setDetails([]) }, [semaine, iaId])

  const handleClick = async () => {
    if (value === 0) return
    if (!loaded) {
      let query = supabase.from('details_resultats').select('*, ia(nom)').eq('annee', annee).eq('type', type).order('date')
      if (iaId) query = query.eq('ia_id', iaId)
      if (!allYear && semaine) query = query.eq('semaine', semaine)
      const { data } = await query
      setDetails(data || [])
      setLoaded(true)
    }
    setOpen(o => !o)
  }

  return (
    <div>
      <div onClick={handleClick} style={{ background: bg, borderRadius: open ? '10px 10px 0 0' : 10, padding: '10px 12px', cursor: value > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color, fontWeight: 600, opacity: 0.75, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
            <div style={{ paddingBottom: 2 }}><Trend current={value} previous={previous} /></div>
          </div>
          {previous !== undefined && <div style={{ fontSize: 10, color, opacity: 0.55, marginTop: 3 }}>Préc. : {previous}</div>}
        </div>
        {value > 0 && <span style={{ fontSize: 12, color, fontWeight: 700, marginLeft: 6 }}>{open ? '▲' : '▼'}</span>}
      </div>
      {open && (
        <div style={{ background: 'rgba(255,255,255,0.9)', border: `1.5px solid ${color}20`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 10 }}>
          {details.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 12, color, opacity: 0.6, padding: '6px 0', fontStyle: 'italic' }}>Aucun détail renseigné</div>
          ) : details.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: bg, borderRadius: 8, marginBottom: 5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color }}>{d.nom_prenom || '—'}{d.ia?.nom && <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.6 }}> · {d.ia.nom}</span>}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  {d.client && <span style={{ fontSize: 10, color, opacity: 0.7 }}>🏢 {d.client}</span>}
                  {d.tjm && <span style={{ fontSize: 10, color, opacity: 0.7 }}>💰 {d.tjm}</span>}
                  {d.date && <span style={{ fontSize: 10, color, opacity: 0.7 }}>📅 {new Date(d.date).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SectionTitle = ({ title, color, icon }) => (
  <div style={{ fontSize: 13, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 16 }}>
    <span>{icon}</span>{title}
  </div>
)

const isValidP1 = p => p.profil && p.profil.trim() || p.description && p.description.trim()

// Podium partagé
function Podium({ ranking, accentColor, bgGradient, borderColor }) {
  if (ranking.length === 0) return (
    <div style={{ textAlign: 'center', color: accentColor, fontSize: 12, padding: '20px 0', background: bgGradient, borderRadius: 12, marginBottom: 16, opacity: 0.6 }}>
      🏆 Aucune donnée cette semaine
    </div>
  )
  const maxScore = ranking[0]?.score || 1
  return (
    <div style={{ background: bgGradient, borderRadius: 12, padding: '12px', marginBottom: 16, border: `1px solid ${borderColor}` }}>
      {ranking.map((r, i) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14, width: 20 }}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{r.name.slice(0,2).toUpperCase()}</div>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1F2937' }}>{r.name}</span>
          <div style={{ flex: 2, height: 5, background: `${accentColor}20`, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: accentColor, width: Math.round((r.score / maxScore) * 100) + '%' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: accentColor, minWidth: 48, textAlign: 'right' }}>{r.score % 1 === 0 ? r.score : r.score.toFixed(1)}pts</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// PANNEAU GAUCHE : COMMERCE
// ─────────────────────────────────────────────
function PanneauCommerce({ saisies, iaList, p1Data, selectedWeek, setSelectedWeek, semaine, annee, refreshKey, onRefresh }) {
  const [view, setView] = useState('equipe')
  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)

  const weekData = saisies.filter(s => s.semaine === selectedWeek)
  const prevData = saisies.filter(s => s.semaine === selectedWeek - 1)
  const p = key => selectedWeek > 1 ? sum(prevData, key) : undefined

  const weekTrend = Array.from({ length: 6 }, (_, i) => {
    const w = selectedWeek - 5 + i
    const ws = saisies.filter(s => s.semaine === w)
    return { name: 'S' + w, RDV: ws.reduce((s, d) => s + (d.total_rdv || 0), 0), Signatures: ws.reduce((s, d) => s + (d.signatures || 0), 0) }
  })

  const validP1 = p1Data.filter(p => p.semaine === selectedWeek && isValidP1(p))

  const ranking = [...weekData]
    .filter(d => d.ia?.nom && !d.ia.nom.toLowerCase().includes('p1'))
    .map(d => ({ name: d.ia.nom, score: (d.total_rdv || 0) * 0.5 + (d.presentations || 0) * 2 + (d.signatures || 0) * 3 }))
    .filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#6D28D9' }}>💼 Commerce</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={onRefresh} style={{ padding: '3px 8px', background: '#EDE9FE', border: '1px solid #C4B5FD', borderRadius: 7, fontSize: 11, cursor: 'pointer', color: '#6D28D9' }}>🔄</button>
          <button onClick={() => setSelectedWeek(w => Math.max(1, w - 1))} style={{ padding: '3px 8px', background: '#EDE9FE', border: '1px solid #C4B5FD', borderRadius: 7, fontSize: 13, cursor: 'pointer', color: '#6D28D9' }}>‹</button>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9' }}>S{selectedWeek}</span>
          <button onClick={() => setSelectedWeek(w => Math.min(semaine, w + 1))} disabled={selectedWeek === semaine} style={{ padding: '3px 8px', background: '#EDE9FE', border: '1px solid #C4B5FD', borderRadius: 7, fontSize: 13, cursor: selectedWeek === semaine ? 'default' : 'pointer', color: '#6D28D9', opacity: selectedWeek === semaine ? 0.4 : 1 }}>›</button>
        </div>
      </div>

      <div style={{ display: 'flex', background: '#F5F3FF', borderRadius: 10, padding: 3, marginBottom: 14, border: '1px solid #DDD6FE' }}>
        {[['equipe', '📊 Équipe'], ['focus', '👤 Focus IA']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: view === id ? 700 : 400, background: view === id ? '#6D28D9' : 'transparent', color: view === id ? '#fff' : '#6D28D9', cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'equipe' ? (
        <>
          <SectionTitle title="KPIs semaine" color="#6D28D9" icon="📊" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
            <KpiCard label="RDV" value={sum(weekData, 'total_rdv')} color="#6D28D9" bg="#EDE9FE" previous={p('total_rdv')} />
            <KpiCard label="Solutions" value={sum(weekData, 'cv_envoyes')} color="#166534" bg="#DCFCE7" previous={p('cv_envoyes')} />
            <KpiCard label="Besoins" value={sum(weekData, 'besoins_detectes')} color="#9F1239" bg="#FFE4E6" previous={p('besoins_detectes')} />
            <KpiCard label="Pipe total" color="#854D0E" bg="#FEF9C3"
              value={sum(weekData, 'besoins_sans_solution') + sum(weekData, 'attente_retour') + sum(weekData, 'attente_retour_prez')}
              previous={selectedWeek > 1 ? sum(prevData, 'besoins_sans_solution') + sum(prevData, 'attente_retour') + sum(prevData, 'attente_retour_prez') : undefined} />
            <KpiCardDetail label="Présentations" value={sum(weekData, 'presentations')} color="#1E40AF" bg="#DBEAFE" previous={p('presentations')} type="presentation" semaine={selectedWeek} annee={annee} key={`p-${selectedWeek}-${refreshKey}`} />
            <KpiCardDetail label="Signatures" value={sum(weekData, 'signatures')} color="#9D174D" bg="#FCE7F3" previous={p('signatures')} type="signature" semaine={selectedWeek} annee={annee} key={`s-${selectedWeek}-${refreshKey}`} />
            <KpiCardDetail label="Démarrages" value={sum(weekData, 'demarrages')} color="#065F46" bg="#D1FAE5" previous={p('demarrages')} type="demarrage" semaine={selectedWeek} annee={annee} key={`d-${selectedWeek}-${refreshKey}`} />
            <KpiCardDetail label="Fins mission" value={sum(weekData, 'fins_de_mission')} color="#92400E" bg="#FEF3C7" previous={p('fins_de_mission')} type="fin_mission" semaine={selectedWeek} annee={annee} key={`f-${selectedWeek}-${refreshKey}`} />
          </div>

          <SectionTitle title="Tendance 6 semaines" color="#1E40AF" icon="📈" />
          <div style={{ background: '#DBEAFE', borderRadius: 12, padding: '12px', marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={weekTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#1E40AF' }} />
                <YAxis tick={{ fontSize: 10, fill: '#1E40AF' }} />
                <Tooltip />
                <Line type="monotone" dataKey="RDV" stroke="#6D28D9" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Signatures" stroke="#9D174D" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="2 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <SectionTitle title={`Classement S${selectedWeek}`} color="#9D174D" icon="🏆" />
          <Podium ranking={ranking} accentColor="#BE185D" bgGradient="linear-gradient(180deg,#FFF1F2,#FCE7F3)" borderColor="#FECDD3" />

          {validP1.length > 0 && (
            <>
              <SectionTitle title={`P1 actifs S${selectedWeek}`} color="#6D28D9" icon="🎯" />
              <div style={{ background: '#EDE9FE', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                {validP1.map(p => (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 6, border: '1.5px solid #C4B5FD' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>{p.profil || p.description}</div>
                    {p.client && <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>🏢 {p.client}</div>}
                    {p.ia?.nom && <div style={{ fontSize: 10, color: '#7C3AED', opacity: 0.7, marginTop: 2 }}>👤 {p.ia.nom}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <FocusIAMini saisies={saisies} iaList={iaList} selectedWeek={selectedWeek} semaine={semaine} annee={annee} refreshKey={refreshKey} />
      )}
    </div>
  )
}

function FocusIAMini({ saisies, iaList, selectedWeek, semaine, annee, refreshKey }) {
  const [selectedIa, setSelectedIa] = useState(null)
  const [iaIndex, setIaIndex] = useState(0)
  const [viewMode, setViewMode] = useState('semaine')
  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)

  const iaData   = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === selectedWeek) : []
  const iaPrev   = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === selectedWeek - 1) : []
  const iaAnnuel = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id) : []
  const iaTrend  = selectedIa ? Array.from({ length: 6 }, (_, i) => {
    const w = selectedWeek - 5 + i
    const ws = saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === w)
    return { name: 'S' + w, RDV: ws.reduce((s, d) => s + (d.total_rdv || 0), 0), Signatures: ws.reduce((s, d) => s + (d.signatures || 0), 0) }
  }) : []
  const p = key => selectedWeek > 1 ? sum(iaPrev, key) : undefined

  if (!selectedIa) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {iaList.map((ia, i) => {
        const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
        return (
          <div key={ia.id} onClick={() => { setSelectedIa(ia); setIaIndex(i); setViewMode('semaine') }}
            style={{ background: bg, borderRadius: 12, padding: '12px 8px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: fg, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>
              {ia.nom.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: fg }}>{ia.nom}</div>
          </div>
        )
      })}
    </div>
  )

  const couleur = AVATAR_COLORS[iaIndex % AVATAR_COLORS.length]
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: couleur[0], borderRadius: 12, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: couleur[1], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          {selectedIa.nom.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: couleur[1] }}>{selectedIa.nom}</div>
          <div style={{ fontSize: 10, color: couleur[1], opacity: 0.7 }}>Ingénieur d'Affaires</div>
        </div>
        <button onClick={() => setSelectedIa(null)} style={{ background: 'none', border: `1px solid ${couleur[1]}40`, borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: couleur[1] }}>← Retour</button>
      </div>

      <div style={{ display: 'flex', background: couleur[0], borderRadius: 10, padding: 3, marginBottom: 14, border: `1px solid ${couleur[1]}30` }}>
        {[['semaine', '📅 Semaine'], ['annuel', '📊 Annuel']].map(([id, label]) => (
          <button key={id} onClick={() => setViewMode(id)} style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: viewMode === id ? 700 : 400, background: viewMode === id ? couleur[1] : 'transparent', color: viewMode === id ? '#fff' : couleur[1], cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'semaine' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            <KpiCard label="RDV" value={sum(iaData, 'total_rdv')} color="#6D28D9" bg="#EDE9FE" previous={p('total_rdv')} />
            <KpiCard label="Solutions" value={sum(iaData, 'cv_envoyes')} color="#166534" bg="#DCFCE7" previous={p('cv_envoyes')} />
            <KpiCard label="Besoins" value={sum(iaData, 'besoins_detectes')} color="#9F1239" bg="#FFE4E6" previous={p('besoins_detectes')} />
            <KpiCard label="Pipe" color="#92400E" bg="#FEF3C7"
              value={sum(iaData, 'besoins_sans_solution') + sum(iaData, 'attente_retour') + sum(iaData, 'attente_retour_prez')}
              previous={selectedWeek > 1 ? sum(iaPrev, 'besoins_sans_solution') + sum(iaPrev, 'attente_retour') + sum(iaPrev, 'attente_retour_prez') : undefined} />
            <KpiCardDetail label="Présentations" value={sum(iaData, 'presentations')} color="#1E40AF" bg="#DBEAFE" previous={p('presentations')} type="presentation" semaine={selectedWeek} annee={annee} iaId={selectedIa.id} key={`fp-${selectedWeek}-${selectedIa.id}-${refreshKey}`} />
            <KpiCardDetail label="Signatures" value={sum(iaData, 'signatures')} color="#9D174D" bg="#FCE7F3" previous={p('signatures')} type="signature" semaine={selectedWeek} annee={annee} iaId={selectedIa.id} key={`fs-${selectedWeek}-${selectedIa.id}-${refreshKey}`} />
          </div>
          <SectionTitle title="Évolution" color="#1E40AF" icon="📈" />
          <div style={{ background: '#DBEAFE', borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={iaTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#1E40AF' }} />
                <YAxis tick={{ fontSize: 10, fill: '#1E40AF' }} />
                <Tooltip />
                <Line type="monotone" dataKey="RDV" stroke="#6D28D9" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Signatures" stroke="#9D174D" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="2 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <KpiCard label="RDV total" value={sum(iaAnnuel, 'total_rdv')} color="#6D28D9" bg="#EDE9FE" />
          <KpiCard label="Solutions" value={sum(iaAnnuel, 'cv_envoyes')} color="#166534" bg="#DCFCE7" />
          <KpiCard label="Besoins" value={sum(iaAnnuel, 'besoins_detectes')} color="#9F1239" bg="#FFE4E6" />
          <KpiCard label="Pipe" color="#854D0E" bg="#FEF9C3"
            value={sum(iaAnnuel, 'besoins_sans_solution') + sum(iaAnnuel, 'attente_retour') + sum(iaAnnuel, 'attente_retour_prez')} />
          <KpiCardDetail label="Présentations" value={sum(iaAnnuel, 'presentations')} color="#1E40AF" bg="#DBEAFE" type="presentation" semaine={null} annee={annee} iaId={selectedIa.id} key={`afp-${selectedIa.id}-${refreshKey}`} allYear={true} />
          <KpiCardDetail label="Signatures" value={sum(iaAnnuel, 'signatures')} color="#9D174D" bg="#FCE7F3" type="signature" semaine={null} annee={annee} iaId={selectedIa.id} key={`afs-${selectedIa.id}-${refreshKey}`} allYear={true} />
          <KpiCardDetail label="Démarrages" value={sum(iaAnnuel, 'demarrages')} color="#065F46" bg="#D1FAE5" type="demarrage" semaine={null} annee={annee} iaId={selectedIa.id} key={`afd-${selectedIa.id}-${refreshKey}`} allYear={true} />
          <KpiCardDetail label="Fins mission" value={sum(iaAnnuel, 'fins_de_mission')} color="#92400E" bg="#FEF3C7" type="fin_mission" semaine={null} annee={annee} iaId={selectedIa.id} key={`aff-${selectedIa.id}-${refreshKey}`} allYear={true} />
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// PANNEAU DROIT : RECRUTEMENT
// ─────────────────────────────────────────────
const RH_KPIS = [
  { label: 'Entretiens',       key: 'nb_entretiens',        color: '#534AB7', bg: '#EEEDFE' },
  { label: 'Candidats validés',key: 'nb_candidats_valides', color: '#085041', bg: '#E1F5EE' },
  { label: 'CV envoyés',       key: 'nb_cv_envoyes',        color: '#0C447C', bg: '#E6F1FB' },
  { label: 'Présentations',    key: 'nb_presentations',     color: '#633806', bg: '#FAEEDA' },
  { label: 'Signatures',       key: 'nb_signatures',        color: '#72243E', bg: '#FBEAF0' },
]

const KpiCardDetailRH = ({ label, value, color, bg, previous, rows, renderDetail }) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div onClick={() => value > 0 && setOpen(o => !o)}
        style={{ background: bg, borderRadius: open ? '10px 10px 0 0' : 10, padding: '10px 12px', cursor: value > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color, fontWeight: 600, opacity: 0.75, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
            <div style={{ paddingBottom: 2 }}><Trend current={value} previous={previous} /></div>
          </div>
          {previous !== undefined && <div style={{ fontSize: 10, color, opacity: 0.55, marginTop: 3 }}>Préc. : {previous}</div>}
        </div>
        {value > 0 && <span style={{ fontSize: 12, color, fontWeight: 700, marginLeft: 6 }}>{open ? '▲' : '▼'}</span>}
      </div>
      {open && (
        <div style={{ background: 'rgba(255,255,255,0.9)', border: `1.5px solid ${color}20`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 10 }}>
          {rows.length === 0
            ? <div style={{ textAlign: 'center', fontSize: 12, color, opacity: 0.6, padding: '6px 0', fontStyle: 'italic' }}>Aucun détail</div>
            : rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: bg, borderRadius: 8, marginBottom: 5 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                  {r.cr_nom?.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color }}>{r.identite_candidat || '—'}</div>
                  <div style={{ fontSize: 11, color, opacity: 0.75, marginTop: 1 }}>{r.profil}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    {r.ia_concerne && <span style={{ fontSize: 10, color, opacity: 0.7 }}>👤 {r.ia_concerne}</span>}
                    {r.ias_concernees && <span style={{ fontSize: 10, color, opacity: 0.7 }}>👤 {r.ias_concernees}</span>}
                    {r.date_presentation && <span style={{ fontSize: 10, color, opacity: 0.7 }}>📅 {new Date(r.date_presentation).toLocaleDateString('fr-FR')}</span>}
                    {r.date_signature && <span style={{ fontSize: 10, color, opacity: 0.7 }}>📅 {new Date(r.date_signature).toLocaleDateString('fr-FR')}</span>}
                    {r.salaire_envisage && <span style={{ fontSize: 10, color, opacity: 0.7 }}>💰 {r.salaire_envisage}</span>}
                    <span style={{ fontSize: 10, background: color + '20', color, borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>{r.cr_nom}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function PanneauRecrutement({ semaine, setSemaine }) {
  const annee = new Date().getFullYear()
  const semaineCourante = currentWeek()
  const [view, setView] = useState('equipe')
  const [reportings, setReportings] = useState({})
  const [allReportings, setAllReportings] = useState([])
  const [allPres, setAllPres] = useState([])
  const [allSigs, setAllSigs] = useState([])
  const [allRdv, setAllRdv] = useState([])
  const [allCv, setAllCv] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: rep }, { data: pres }, { data: sigs }, { data: rdv }, { data: cv }] = await Promise.all([
        supabase.from('cr_reporting').select('*').eq('annee', annee),
        supabase.from('cr_presentations').select('*').eq('annee', annee),
        supabase.from('cr_signatures').select('*').eq('annee', annee),
        supabase.from('cr_rendez_vous').select('*').eq('annee', annee),
        supabase.from('cr_cv_proposes').select('*').eq('annee', annee),
      ])
      setAllReportings(rep || [])
      setAllPres(pres || [])
      setAllSigs(sigs || [])
      setAllRdv(rdv || [])
      setAllCv(cv || [])
      setLoading(false)
    }
    load()
  }, [annee])

  useEffect(() => {
    const repMap = {}
    CR_LIST.forEach(cr => {
      const rows = allReportings.filter(r => r.cr_nom === cr && r.semaine === semaine)
      repMap[cr] = {
        nb_entretiens:        rows.reduce((a,r)=>a+(r.nb_entretiens||0),0),
        nb_candidats_valides: rows.reduce((a,r)=>a+(r.nb_candidats_valides||0),0),
        nb_cv_envoyes:        rows.reduce((a,r)=>a+(r.nb_cv_envoyes||0),0),
        nb_presentations:     rows.reduce((a,r)=>a+(r.nb_presentations||0),0),
        nb_signatures:        rows.reduce((a,r)=>a+(r.nb_signatures||0),0),
      }
    })
    setReportings(repMap)
  }, [semaine, allReportings])

  const total = key => CR_LIST.reduce((acc, cr) => acc + (reportings[cr]?.[key] || 0), 0)
  const prev  = key => {
    const prevMap = {}
    CR_LIST.forEach(cr => {
      const rows = allReportings.filter(r => r.cr_nom === cr && r.semaine === semaine - 1)
      prevMap[cr] = rows.reduce((a,r)=>a+(r[key]||0),0)
    })
    return CR_LIST.reduce((acc,cr) => acc + (prevMap[cr]||0), 0)
  }

  // Tendance 6 semaines
  const trend = Array.from({ length: 6 }, (_, i) => {
    const w = semaine - 5 + i
    const rows = allReportings.filter(r => r.semaine === w)
    return {
      name: 'S' + w,
      Entretiens:   rows.reduce((a,r)=>a+(r.nb_entretiens||0),0),
      Présentations:rows.reduce((a,r)=>a+(r.nb_presentations||0),0),
      Signatures:   rows.reduce((a,r)=>a+(r.nb_signatures||0),0),
    }
  })

  // Classement semaine : RDV=1pt, Prez=3pts, Sign=6pts
  const ranking = CR_LIST.map(cr => {
    const rows = allReportings.filter(r => r.cr_nom === cr && r.semaine === semaine)
    const rdv  = rows.reduce((a,r)=>a+(r.nb_entretiens||0),0)
    const prez = rows.reduce((a,r)=>a+(r.nb_presentations||0),0)
    const sign = rows.reduce((a,r)=>a+(r.nb_signatures||0),0)
    return { name: cr, score: rdv * 1 + prez * 3 + sign * 6 }
  }).filter(r => r.score > 0).sort((a,b) => b.score - a.score)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F6E56' }}>👥 Recrutement</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setSemaine(s => Math.max(1, s-1))} style={{ padding: '3px 8px', background: '#E1F5EE', border: '1px solid #A7F3D0', borderRadius: 7, fontSize: 13, cursor: 'pointer', color: '#0F6E56' }}>‹</button>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0F6E56' }}>S{semaine}</span>
          <button onClick={() => setSemaine(s => Math.min(semaineCourante, s+1))} disabled={semaine === semaineCourante} style={{ padding: '3px 8px', background: '#E1F5EE', border: '1px solid #A7F3D0', borderRadius: 7, fontSize: 13, cursor: semaine === semaineCourante ? 'default' : 'pointer', color: '#0F6E56', opacity: semaine === semaineCourante ? 0.4 : 1 }}>›</button>
        </div>
      </div>

      {/* Toggle Équipe / Focus CR */}
      <div style={{ display: 'flex', background: '#E8F5F2', borderRadius: 10, padding: 3, marginBottom: 14, border: '1px solid #A7F3D0' }}>
        {[['equipe', '📊 Équipe'], ['focus', '👤 Focus CR']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: view === id ? 700 : 400, background: view === id ? '#0F6E56' : 'transparent', color: view === id ? '#fff' : '#0F6E56', cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#0F6E56', fontSize: 12 }}>Chargement...</div>
      ) : view === 'equipe' ? (
        <>
          {/* KPIs équipe */}
          <SectionTitle title="KPIs semaine" color="#0F6E56" icon="📊" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
            {RH_KPIS.map(k => {
              const presRows = allPres.filter(r => r.semaine === semaine)
              const sigRows  = allSigs.filter(r => r.semaine === semaine)
              const validRows = allRdv.filter(r => r.semaine === semaine && r.valide)
              const rdvRows = allRdv.filter(r => r.semaine === semaine)
              const cvRows = allCv.filter(r => r.semaine === semaine)
              if (k.key === 'nb_entretiens') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={total(k.key)} color={k.color} bg={k.bg} previous={semaine > 1 ? prev(k.key) : undefined} rows={rdvRows} />
              )
              if (k.key === 'nb_candidats_valides') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={total(k.key)} color={k.color} bg={k.bg} previous={semaine > 1 ? prev(k.key) : undefined} rows={validRows} />
              )
              if (k.key === 'nb_cv_envoyes') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={total(k.key)} color={k.color} bg={k.bg} previous={semaine > 1 ? prev(k.key) : undefined} rows={cvRows} />
              )
              if (k.key === 'nb_presentations') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={total(k.key)} color={k.color} bg={k.bg} previous={semaine > 1 ? prev(k.key) : undefined} rows={presRows} />
              )
              if (k.key === 'nb_signatures') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={total(k.key)} color={k.color} bg={k.bg} previous={semaine > 1 ? prev(k.key) : undefined} rows={sigRows} />
              )
              return <KpiCard key={k.key} label={k.label} value={total(k.key)} color={k.color} bg={k.bg} previous={semaine > 1 ? prev(k.key) : undefined} />
            })}
          </div>

          {/* Tendance */}
          <SectionTitle title="Tendance 6 semaines" color="#0F6E56" icon="📈" />
          <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              {[['#534AB7','Entretiens'],['#633806','Présentations'],['#72243E','Signatures']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: c, fontWeight: 600 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }}></div>{l}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#085041' }} />
                <YAxis tick={{ fontSize: 10, fill: '#085041' }} />
                <Tooltip />
                <Line type="monotone" dataKey="Entretiens" stroke="#534AB7" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Présentations" stroke="#633806" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="Signatures" stroke="#72243E" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="2 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Classement */}
          <SectionTitle title={`Classement S${semaine}`} color="#0F6E56" icon="🏆" />
          <div style={{ fontSize: 10, color: '#085041', opacity: 0.7, marginBottom: 8 }}>RDV=1pt · Prez=3pts · Sign=6pts</div>
          <Podium ranking={ranking} accentColor="#0F6E56" bgGradient="linear-gradient(180deg,#F0FDF9,#E1F5EE)" borderColor="#A7F3D0" />
        </>
      ) : (
        <FocusCR allReportings={allReportings} allPres={allPres} allSigs={allSigs} allRdv={allRdv} allCv={allCv} semaine={semaine} annee={annee} key={semaine} />
      )}
    </div>
  )
}

function FocusCR({ allReportings, allPres, allSigs, allRdv, allCv, semaine, annee }) {
  const [selectedCR, setSelectedCR] = useState(null)
  const [crIndex, setCrIndex] = useState(0)
  const [viewMode, setViewMode] = useState('semaine')

  const getStats = (cr, s) => {
    const rows = allReportings.filter(r => r.cr_nom === cr && r.semaine === s)
    return {
      nb_entretiens:        rows.reduce((a,r)=>a+(r.nb_entretiens||0),0),
      nb_candidats_valides: rows.reduce((a,r)=>a+(r.nb_candidats_valides||0),0),
      nb_cv_envoyes:        rows.reduce((a,r)=>a+(r.nb_cv_envoyes||0),0),
      nb_presentations:     rows.reduce((a,r)=>a+(r.nb_presentations||0),0),
      nb_signatures:        rows.reduce((a,r)=>a+(r.nb_signatures||0),0),
    }
  }

  const getAnnualStats = (cr) => {
    const rows = allReportings.filter(r => r.cr_nom === cr)
    return {
      nb_entretiens:        rows.reduce((a,r)=>a+(r.nb_entretiens||0),0),
      nb_candidats_valides: rows.reduce((a,r)=>a+(r.nb_candidats_valides||0),0),
      nb_cv_envoyes:        rows.reduce((a,r)=>a+(r.nb_cv_envoyes||0),0),
      nb_presentations:     rows.reduce((a,r)=>a+(r.nb_presentations||0),0),
      nb_signatures:        rows.reduce((a,r)=>a+(r.nb_signatures||0),0),
    }
  }

  const trend = selectedCR ? Array.from({ length: 6 }, (_, i) => {
    const w = semaine - 5 + i
    const s = getStats(selectedCR, w)
    return { name: 'S' + w, Entretiens: s.nb_entretiens, Présentations: s.nb_presentations, Signatures: s.nb_signatures }
  }) : []

  if (!selectedCR) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {CR_LIST.map((cr, i) => {
        const [bg, fg] = CR_COLORS[i % CR_COLORS.length]
        return (
          <div key={cr} onClick={() => { setSelectedCR(cr); setCrIndex(i); setViewMode('semaine') }}
            style={{ background: bg, borderRadius: 12, padding: '12px 8px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: fg, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>
              {cr.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: fg }}>{cr}</div>
          </div>
        )
      })}
    </div>
  )

  const couleur = CR_COLORS[crIndex % CR_COLORS.length]
  const stats     = getStats(selectedCR, semaine)
  const statsPrev = getStats(selectedCR, semaine - 1)
  const statsAnn  = getAnnualStats(selectedCR)
  const p = key => semaine > 1 ? statsPrev[key] : undefined

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: couleur[0], borderRadius: 12, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: couleur[1], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          {selectedCR.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: couleur[1] }}>{selectedCR}</div>
          <div style={{ fontSize: 10, color: couleur[1], opacity: 0.7 }}>Chargée de recrutement</div>
        </div>
        <button onClick={() => setSelectedCR(null)} style={{ background: 'none', border: `1px solid ${couleur[1]}40`, borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: couleur[1] }}>← Retour</button>
      </div>

      <div style={{ display: 'flex', background: couleur[0], borderRadius: 10, padding: 3, marginBottom: 14, border: `1px solid ${couleur[1]}30` }}>
        {[['semaine', '📅 Semaine'], ['annuel', '📊 Annuel']].map(([id, label]) => (
          <button key={id} onClick={() => setViewMode(id)} style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: viewMode === id ? 700 : 400, background: viewMode === id ? couleur[1] : 'transparent', color: viewMode === id ? '#fff' : couleur[1], cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'semaine' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            {RH_KPIS.map(k => {
              if (k.key === 'nb_entretiens') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={stats[k.key]} color={k.color} bg={k.bg} previous={p(k.key)}
                  rows={allRdv.filter(r => r.cr_nom === selectedCR && r.semaine === semaine)} />
              )
              if (k.key === 'nb_candidats_valides') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={stats[k.key]} color={k.color} bg={k.bg} previous={p(k.key)}
                  rows={allRdv.filter(r => r.cr_nom === selectedCR && r.semaine === semaine && r.valide)} />
              )
              if (k.key === 'nb_cv_envoyes') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={stats[k.key]} color={k.color} bg={k.bg} previous={p(k.key)}
                  rows={allCv.filter(r => r.cr_nom === selectedCR && r.semaine === semaine)} />
              )
              if (k.key === 'nb_presentations') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={stats[k.key]} color={k.color} bg={k.bg} previous={p(k.key)}
                  rows={allPres.filter(r => r.cr_nom === selectedCR && r.semaine === semaine)} />
              )
              if (k.key === 'nb_signatures') return (
                <KpiCardDetailRH key={k.key} label={k.label} value={stats[k.key]} color={k.color} bg={k.bg} previous={p(k.key)}
                  rows={allSigs.filter(r => r.cr_nom === selectedCR && r.semaine === semaine)} />
              )
              return <KpiCard key={k.key} label={k.label} value={stats[k.key]} color={k.color} bg={k.bg} previous={p(k.key)} />
            })}
          </div>
          <SectionTitle title="Évolution" color={couleur[1]} icon="📈" />
          <div style={{ background: couleur[0], borderRadius: 12, padding: 12, marginBottom: 14, border: `1px solid ${couleur[1]}20` }}>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: couleur[1] }} />
                <YAxis tick={{ fontSize: 10, fill: couleur[1] }} />
                <Tooltip />
                <Line type="monotone" dataKey="Entretiens" stroke="#534AB7" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Présentations" stroke="#633806" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="Signatures" stroke="#72243E" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="2 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {RH_KPIS.map(k => {
            if (k.key === 'nb_entretiens') return (
              <KpiCardDetailRH key={k.key} label={k.label + ' (annuel)'} value={statsAnn[k.key]} color={k.color} bg={k.bg}
                rows={allRdv.filter(r => r.cr_nom === selectedCR)} />
            )
            if (k.key === 'nb_candidats_valides') return (
              <KpiCardDetailRH key={k.key} label={k.label + ' (annuel)'} value={statsAnn[k.key]} color={k.color} bg={k.bg}
                rows={allRdv.filter(r => r.cr_nom === selectedCR && r.valide)} />
            )
            if (k.key === 'nb_cv_envoyes') return (
              <KpiCardDetailRH key={k.key} label={k.label + ' (annuel)'} value={statsAnn[k.key]} color={k.color} bg={k.bg}
                rows={allCv.filter(r => r.cr_nom === selectedCR)} />
            )
            if (k.key === 'nb_presentations') return (
              <KpiCardDetailRH key={k.key} label={k.label + ' (annuel)'} value={statsAnn[k.key]} color={k.color} bg={k.bg}
                rows={allPres.filter(r => r.cr_nom === selectedCR)} />
            )
            if (k.key === 'nb_signatures') return (
              <KpiCardDetailRH key={k.key} label={k.label + ' (annuel)'} value={statsAnn[k.key]} color={k.color} bg={k.bg}
                rows={allSigs.filter(r => r.cr_nom === selectedCR)} />
            )
            return <KpiCard key={k.key} label={k.label + ' (annuel)'} value={statsAnn[k.key]} color={k.color} bg={k.bg} />
          })}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────
export default function DashboardManager() {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [selectedWeek, setSelectedWeek] = useState(semaine)
  const [saisies, setSaisies] = useState([])
  const [iaList, setIaList] = useState([])
  const [p1Data, setP1Data] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showReunion, setShowReunion] = useState(false)
  const [cvProposes, setCvProposes] = useState([])

  const load = async () => {
    const [{ data: all }, { data: ia }, { data: p1 }, { data: cv }] = await Promise.all([
      supabase.from('saisies').select('*, ia(nom)').eq('annee', annee),
      supabase.from('ia').select('*').order('nom'),
      supabase.from('p1').select('*, ia(nom)').eq('annee', annee),
      supabase.from('cr_cv_proposes').select('*').eq('annee', annee),
    ])
    setSaisies(all || [])
    setIaList(ia || [])
    setP1Data(p1 || [])
    setCvProposes(cv || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const app = document.querySelector('.app')
    if (app) app.classList.add('wide')
    return () => { if (app) app.classList.remove('wide') }
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 28 }}>⏳</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Chargement du dashboard...</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', overflow: 'hidden' }}>

      {/* Bouton réunion */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', flexShrink: 0 }}>
        <button onClick={() => setShowReunion(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🗓 Préparer la réunion — S{selectedWeek - 1}
        </button>
      </div>

      {/* Split panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, borderRight: '2px solid var(--color-border-tertiary)', overflow: 'hidden' }}>
          <PanneauCommerce
            saisies={saisies}
            iaList={iaList}
            p1Data={p1Data}
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            semaine={semaine}
            annee={annee}
            refreshKey={refreshKey}
            onRefresh={() => { load(); setRefreshKey(k => k + 1) }}
          />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <PanneauRecrutement semaine={selectedWeek} setSemaine={setSelectedWeek} />
        </div>
      </div>

      {/* Modale réunion */}
      {showReunion && (
        <ModalReunion
          saisies={saisies}
          iaList={iaList}
          selectedWeek={selectedWeek - 1}
          cvProposes={cvProposes}
          onClose={() => setShowReunion(false)}
        />
      )}
    </div>
  )
}

function ModalReunion({ saisies, iaList, selectedWeek, cvProposes, onClose }) {

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const weekData = saisies.filter(s => s.semaine === selectedWeek)
  const prevData = saisies.filter(s => s.semaine === selectedWeek - 1)
  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)

  const iasFiltrees = iaList.filter(ia => ia.nom !== 'Anthony' && !ia.nom.toLowerCase().includes('p1'))

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#1a1a2e', zIndex: 9999, overflowY: 'auto', padding: '24px 16px' }}>
      <div style={{ background: '#1a1a2e', borderRadius: 18, width: '100%', maxWidth: 960, margin: '0 auto' }}>

        {/* Header modale */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>🗓 Réunion — Semaine {selectedWeek}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Synthèse par collaborateur · Commerce</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#fff' }}>✕ Fermer</button>
        </div>

        {/* Fiches IA */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, background: '#1a1a2e', borderRadius: '0 0 18px 18px' }}>
          {iasFiltrees.map((ia, idx) => {
            const data = weekData.filter(s => s.ia_id === ia.id)
            const prev = prevData.filter(s => s.ia_id === ia.id)
            const prevPrevData = saisies.filter(s => s.ia_id === ia.id && s.semaine === selectedWeek - 1)
            const attente = sum(data, 'attente_retour')
            const attentePrez = sum(data, 'attente_retour_prez')
            const prezAMonter = sum(data, 'presentations_a_monter')
            const prezRealisees = sum(data, 'presentations')
            const prezAMonterSemPrev = sum(prevPrevData, 'presentations_a_monter')
            const rdv = sum(data, 'total_rdv')
            const sign = sum(data, 'signatures')

            // CV proposés par les CR à cette IA cette semaine
            const cvCetteIA = cvProposes.filter(cv =>
              cv.semaine === selectedWeek &&
              cv.ias_concernees && cv.ias_concernees.toLowerCase().includes(ia.nom.toLowerCase())
            )

            const [bg, fg] = AVATAR_COLORS[idx % AVATAR_COLORS.length]
            const hasAlert = attente > 3 || prezAMonter > 2 || cvCetteIA.length > 0

            return (
              <div key={ia.id} style={{ background: bg, borderRadius: 14, padding: '16px', border: `2px solid ${hasAlert ? fg : bg}` }}>
                {/* En-tête fiche */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {ia.nom.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: fg }}>{ia.nom}</div>
                    <div style={{ fontSize: 10, color: fg, opacity: 0.7 }}>S{selectedWeek}</div>
                  </div>
                  {sign > 0 && <span style={{ fontSize: 16 }}>🎉</span>}
                </div>

                {/* KPIs clés S-1 */}
                <div style={{ fontSize: 10, fontWeight: 700, color: fg, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>S{selectedWeek}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                  {[
                    { label: 'Prez réalisées', val: prezRealisees, icon: '✅', alert: false },
                    { label: 'Attente retour', val: attentePrez, icon: '📨', alert: attentePrez > 2 },
                    { label: 'Prez à monter', val: prezAMonter, icon: '📋', alert: prezAMonter > 2 },
                  ].map(k => (
                    <div key={k.label} style={{ background: k.alert ? '#FEF3C7' : 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 4px', textAlign: 'center', border: k.alert ? '1px solid #F59E0B' : 'none' }}>
                      <div style={{ fontSize: 14 }}>{k.icon}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: k.alert ? '#92400E' : fg }}>{k.val}</div>
                      <div style={{ fontSize: 8, color: k.alert ? '#92400E' : fg, opacity: 0.75, lineHeight: 1.2 }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Prez à monter S-2 */}
                <div style={{ fontSize: 10, fontWeight: 700, color: fg, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>S{selectedWeek - 1} — suivi</div>
                <div style={{ background: prezAMonterSemPrev > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📋</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: prezAMonterSemPrev > 0 ? fg : fg, opacity: prezAMonterSemPrev === 0 ? 0.4 : 1 }}>{prezAMonterSemPrev}</div>
                    <div style={{ fontSize: 10, color: fg, opacity: 0.7 }}>prez à monter déclarées en S{selectedWeek - 1}</div>
                  </div>
                  {prezAMonterSemPrev > 0 && prezRealisees > 0 && (
                    <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#065F46' }}>→ {prezRealisees}</div>
                      <div style={{ fontSize: 9, color: '#065F46', opacity: 0.8 }}>réalisées</div>
                    </div>
                  )}
                </div>

                {/* CV proposés par les CR */}
                {cvCetteIA.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 8, padding: '10px', border: `1px solid ${fg}30` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: fg, marginBottom: 6 }}>👥 CV proposés par recrutement ({cvCetteIA.length})</div>
                    {cvCetteIA.map((cv, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: i < cvCetteIA.length - 1 ? `1px solid ${fg}15` : 'none' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: fg, flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: fg }}>{cv.identite_candidat}</span>
                          {cv.profil && <span style={{ fontSize: 11, color: fg, opacity: 0.7, marginLeft: 6 }}>{cv.profil}</span>}
                          <span style={{ fontSize: 10, color: fg, opacity: 0.6, marginLeft: 6 }}>· {cv.cr_nom}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Aucune activité */}
                {attentePrez === 0 && prezAMonter === 0 && prezRealisees === 0 && prezAMonterSemPrev === 0 && cvCetteIA.length === 0 && (
                  <div style={{ textAlign: 'center', fontSize: 11, color: fg, opacity: 0.5, fontStyle: 'italic', padding: '8px 0' }}>
                    Aucune activité déclarée
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
