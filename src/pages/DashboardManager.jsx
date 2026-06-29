import { useState, useEffect, useRef } from 'react'
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

// ─────────────────────────────────────────────
// COMMERCE COMPONENTS (repris de Dashboard.jsx)
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

if (typeof window !== 'undefined' && !window.Chart) {
  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
  document.head.appendChild(script)
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#6D28D9' }}>💼 Commerce</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={onRefresh} style={{ padding: '3px 8px', background: '#EDE9FE', border: '1px solid #C4B5FD', borderRadius: 7, fontSize: 11, cursor: 'pointer', color: '#6D28D9' }}>🔄</button>
          <button onClick={() => setSelectedWeek(w => Math.max(1, w - 1))} style={{ padding: '3px 8px', background: '#EDE9FE', border: '1px solid #C4B5FD', borderRadius: 7, fontSize: 13, cursor: 'pointer', color: '#6D28D9' }}>‹</button>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9' }}>S{selectedWeek}</span>
          <button onClick={() => setSelectedWeek(w => Math.min(semaine, w + 1))} disabled={selectedWeek === semaine} style={{ padding: '3px 8px', background: '#EDE9FE', border: '1px solid #C4B5FD', borderRadius: 7, fontSize: 13, cursor: selectedWeek === semaine ? 'default' : 'pointer', color: '#6D28D9', opacity: selectedWeek === semaine ? 0.4 : 1 }}>›</button>
        </div>
      </div>

      {/* Toggle Équipe / Focus */}
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

          {ranking.length > 0 && (
            <>
              <SectionTitle title={`Classement S${selectedWeek}`} color="#9D174D" icon="🏆" />
              <div style={{ background: 'linear-gradient(180deg,#FFF1F2,#FCE7F3)', borderRadius: 12, padding: '12px', marginBottom: 16, border: '1px solid #FECDD3' }}>
                {ranking.map((r, i) => (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#BE185D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{r.name.slice(0,2).toUpperCase()}</div>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1F2937' }}>{r.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#9D174D' }}>{r.score % 1 === 0 ? r.score : r.score.toFixed(1)}pts</span>
                  </div>
                ))}
              </div>
            </>
          )}

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
  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)

  const iaData = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === selectedWeek) : []
  const iaPrev = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === selectedWeek - 1) : []
  const p = key => selectedWeek > 1 ? sum(iaPrev, key) : undefined

  if (!selectedIa) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {iaList.map((ia, i) => {
        const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
        return (
          <div key={ia.id} onClick={() => { setSelectedIa(ia); setIaIndex(i) }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: couleur[0], borderRadius: 12, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: couleur[1], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          {selectedIa.nom.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: couleur[1] }}>{selectedIa.nom}</div>
          <div style={{ fontSize: 10, color: couleur[1], opacity: 0.7 }}>IA — S{selectedWeek}</div>
        </div>
        <button onClick={() => setSelectedIa(null)} style={{ background: 'none', border: `1px solid ${couleur[1]}40`, borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: couleur[1] }}>← Retour</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <KpiCard label="RDV" value={sum(iaData, 'total_rdv')} color="#6D28D9" bg="#EDE9FE" previous={p('total_rdv')} />
        <KpiCard label="Solutions" value={sum(iaData, 'cv_envoyes')} color="#166534" bg="#DCFCE7" previous={p('cv_envoyes')} />
        <KpiCard label="Besoins" value={sum(iaData, 'besoins_detectes')} color="#9F1239" bg="#FFE4E6" previous={p('besoins_detectes')} />
        <KpiCard label="Pipe" color="#92400E" bg="#FEF3C7"
          value={sum(iaData, 'besoins_sans_solution') + sum(iaData, 'attente_retour') + sum(iaData, 'attente_retour_prez')}
          previous={selectedWeek > 1 ? sum(iaPrev, 'besoins_sans_solution') + sum(iaPrev, 'attente_retour') + sum(iaPrev, 'attente_retour_prez') : undefined} />
        <KpiCardDetail label="Présentations" value={sum(iaData, 'presentations')} color="#1E40AF" bg="#DBEAFE" previous={p('presentations')} type="presentation" semaine={selectedWeek} annee={annee} iaId={selectedIa.id} key={`fp-${selectedWeek}-${selectedIa.id}-${refreshKey}`} />
        <KpiCardDetail label="Signatures" value={sum(iaData, 'signatures')} color="#9D174D" bg="#FCE7F3" previous={p('signatures')} type="signature" semaine={selectedWeek} annee={annee} iaId={selectedIa.id} key={`fs-${selectedWeek}-${selectedIa.id}-${refreshKey}`} />
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// PANNEAU DROIT : RECRUTEMENT
// ─────────────────────────────────────────────
const pill = { border: '1px solid var(--color-border-tertiary)', borderRadius: 6, padding: '2px 8px', fontSize: 11 }
const detailCard = { background: 'var(--color-background-secondary)', borderRadius: 8, padding: '8px 10px', marginBottom: 5, fontSize: 12 }
const detailRow = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }

const RH_KPIS = [
  { label: 'Entretiens', key: 'nb_entretiens', color: '#534AB7', bg: '#EEEDFE' },
  { label: 'Candidats', key: 'nb_candidats_valides', color: '#085041', bg: '#E1F5EE' },
  { label: 'CV envoyés', key: 'nb_cv_envoyes', color: '#0C447C', bg: '#E6F1FB' },
  { label: 'Présentations', key: 'nb_presentations', color: '#633806', bg: '#FAEEDA' },
  { label: 'Signatures', key: 'nb_signatures', color: '#72243E', bg: '#FBEAF0' },
]

function PanneauRecrutement() {
  const annee = new Date().getFullYear()
  const semaineCourante = currentWeek()
  const [semaine, setSemaine] = useState(semaineCourante)
  const [mode, setMode] = useState('semaine')
  const [reportings, setReportings] = useState({})
  const [rdvs, setRdvs] = useState({})
  const [pres, setPres] = useState({})
  const [sigs, setSigs] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setExpanded(null)
      let repQ = supabase.from('cr_reporting').select('*').eq('annee', annee)
      let rdvQ = supabase.from('cr_rendez_vous').select('*').eq('annee', annee)
      let preQ = supabase.from('cr_presentations').select('*').eq('annee', annee)
      let sigQ = supabase.from('cr_signatures').select('*').eq('annee', annee)
      if (mode === 'semaine') {
        repQ = repQ.eq('semaine', semaine); rdvQ = rdvQ.eq('semaine', semaine)
        preQ = preQ.eq('semaine', semaine); sigQ = sigQ.eq('semaine', semaine)
      }
      const [{ data: rep }, { data: rdv }, { data: pr }, { data: sig }] = await Promise.all([repQ, rdvQ, preQ, sigQ])
      const repMap = {}
      CR_LIST.forEach(cr => {
        const rows = (rep || []).filter(r => r.cr_nom === cr)
        repMap[cr] = { nb_entretiens: rows.reduce((a,r)=>a+(r.nb_entretiens||0),0), nb_candidats_valides: rows.reduce((a,r)=>a+(r.nb_candidats_valides||0),0), nb_cv_envoyes: rows.reduce((a,r)=>a+(r.nb_cv_envoyes||0),0), nb_presentations: rows.reduce((a,r)=>a+(r.nb_presentations||0),0), nb_signatures: rows.reduce((a,r)=>a+(r.nb_signatures||0),0) }
      })
      setReportings(repMap)
      const rdvMap = {}, presMap = {}, sigMap = {}
      CR_LIST.forEach(cr => { rdvMap[cr]=(rdv||[]).filter(r=>r.cr_nom===cr); presMap[cr]=(pr||[]).filter(p=>p.cr_nom===cr); sigMap[cr]=(sig||[]).filter(s=>s.cr_nom===cr) })
      setRdvs(rdvMap); setPres(presMap); setSigs(sigMap)
      setLoading(false)
    }
    load()
  }, [semaine, annee, mode])

  const total = key => CR_LIST.reduce((acc, cr) => acc + (reportings[cr]?.[key] || 0), 0)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F6E56' }}>👥 Recrutement</div>
        <div style={{ display: 'flex', background: '#E1F5EE', borderRadius: 10, padding: 3, gap: 3, border: '1px solid #A7F3D0' }}>
          <button onClick={() => setMode('semaine')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer', background: mode === 'semaine' ? '#0F6E56' : 'none', color: mode === 'semaine' ? '#fff' : '#0F6E56', transition: 'all 0.2s' }}>Semaine</button>
          <button onClick={() => setMode('annee')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer', background: mode === 'annee' ? '#0F6E56' : 'none', color: mode === 'annee' ? '#fff' : '#0F6E56', transition: 'all 0.2s' }}>Année</button>
        </div>
      </div>

      {mode === 'semaine' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => setSemaine(s => Math.max(1, s-1))} style={{ padding: '4px 10px', background: '#E1F5EE', border: '1px solid #A7F3D0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#0F6E56' }}>←</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56', minWidth: 80, textAlign: 'center' }}>Semaine {semaine}</span>
          <button onClick={() => setSemaine(s => Math.min(52, s+1))} style={{ padding: '4px 10px', background: '#E1F5EE', border: '1px solid #A7F3D0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#0F6E56' }}>→</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#0F6E56', fontSize: 12 }}>Chargement...</div>
      ) : (
        <>
          {/* Totaux équipe */}
          <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px', marginBottom: 14, border: '1px solid #A7F3D0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#085041', marginBottom: 10 }}>🏆 Total équipe — {mode === 'semaine' ? `S${semaine}` : annee}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {RH_KPIS.map(k => (
                <div key={k.key} style={{ background: k.bg, borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{total(k.key)}</div>
                  <div style={{ fontSize: 9, color: k.color, marginTop: 2, fontWeight: 500, lineHeight: 1.2 }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Par CR */}
          {CR_LIST.map(cr => {
            const rep = reportings[cr] || {}
            const isOpen = expanded === cr
            return (
              <div key={cr} style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: '12px', marginBottom: 10, border: '1px solid var(--color-border-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 11 }}>
                      {cr.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{cr}</span>
                  </div>
                  {mode === 'semaine' && (
                    <button onClick={() => setExpanded(isOpen ? null : cr)} style={{ padding: '4px 8px', background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 7, cursor: 'pointer', fontSize: 10 }}>
                      {isOpen ? '▲' : '▼ Détail'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
                  {RH_KPIS.map(k => (
                    <div key={k.key} style={{ background: k.bg, borderRadius: 8, padding: '7px 4px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{rep[k.key] || 0}</div>
                      <div style={{ fontSize: 9, color: k.color, marginTop: 2, fontWeight: 500, lineHeight: 1.2 }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {isOpen && mode === 'semaine' && (
                  <div style={{ marginTop: 14 }}>
                    {/* RDV */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>📅 Rendez-vous</div>
                    {rdvs[cr]?.length > 0 ? rdvs[cr].map(r => (
                      <div key={r.id} style={detailCard}>
                        <div style={detailRow}>
                          <b style={{ fontSize: 12 }}>{r.identite_candidat}</b>
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.profil}</span>
                        </div>
                        <div style={detailRow}>
                          <span style={{ ...pill, background: r.valide ? '#E1F5EE' : '#FCEBEB', color: r.valide ? '#085041' : '#A32D2D' }}>{r.valide ? '✅ Validé' : '❌ Non validé'}</span>
                          {r.positionne_sur_besoins && <span style={pill}>📌 {r.positionne_sur_besoins}</span>}
                        </div>
                      </div>
                    )) : <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>Aucun RDV cette semaine</div>}

                    {/* Présentations */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, marginTop: 10 }}>📋 Présentations</div>
                    {pres[cr]?.length > 0 ? pres[cr].map(p => (
                      <div key={p.id} style={detailCard}>
                        <div style={detailRow}><b style={{ fontSize: 12 }}>{p.identite_candidat}</b><span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.profil}</span></div>
                        <div style={detailRow}>{p.date_presentation && <span style={pill}>📅 {p.date_presentation}</span>}{p.ia_concerne && <span style={pill}>👤 {p.ia_concerne}</span>}</div>
                      </div>
                    )) : <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>Aucune présentation cette semaine</div>}

                    {/* Signatures */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, marginTop: 10 }}>✍️ Signatures</div>
                    {sigs[cr]?.length > 0 ? sigs[cr].map(s => (
                      <div key={s.id} style={detailCard}>
                        <div style={detailRow}><b style={{ fontSize: 12 }}>{s.identite_candidat}</b><span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{s.profil}</span></div>
                        <div style={detailRow}>{s.salaire_envisage && <span style={pill}>💰 {s.salaire_envisage}</span>}{s.date_signature && <span style={pill}>📅 {s.date_signature}</span>}</div>
                      </div>
                    )) : <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>Aucune signature cette semaine</div>}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
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

useEffect(() => {
  const app = document.querySelector('.app')
  if (app) app.classList.add('wide')
  return () => { if (app) app.classList.remove('wide') }
}, [])

  

  const load = async () => {
    const [{ data: all }, { data: ia }, { data: p1 }] = await Promise.all([
      supabase.from('saisies').select('*, ia(nom)').eq('annee', annee),
      supabase.from('ia').select('*').order('nom'),
      supabase.from('p1').select('*, ia(nom)').eq('annee', annee)
    ])
    setSaisies(all || [])
    setIaList(ia || [])
    setP1Data(p1 || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 28 }}>⏳</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Chargement du dashboard...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 110px)', overflow: 'hidden', gap: 0 }}>
      {/* Séparateur visuel */}
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
        <PanneauRecrutement />
      </div>
    </div>
  )
}
