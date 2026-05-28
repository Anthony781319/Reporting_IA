import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const AVATAR_COLORS = [
  ['#EDE9FE','#6D28D9'],['#D1FAE5','#065F46'],['#FEF3C7','#92400E'],
  ['#FCE7F3','#9D174D'],['#DBEAFE','#1E40AF'],['#DCFCE7','#166534'],
  ['#F3F4F6','#374151'],['#FFE4E6','#9F1239'],['#E0F2FE','#0369A1'],
  ['#FEF9C3','#854D0E'],
]

const Trend = ({ current, previous }) => {
  if (previous === undefined || previous === null) return null
  const diff = current - previous
  if (diff === 0) return <span style={{ fontSize: 11, color: '#888780' }}>—</span>
  const up = diff > 0
  return <span style={{ fontSize: 12, fontWeight: 700, color: up ? '#065F46' : '#991B1B' }}>{up ? '↑ +' : '↓ '}{diff}</span>
}

const KpiCard = ({ label, value, color, bg, previous }) => (
  <div style={{ background: bg || color + '12', borderRadius: 12, padding: '12px 14px' }}>
    <div style={{ fontSize: 11, color, fontWeight: 600, opacity: 0.75, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      <div style={{ paddingBottom: 3 }}><Trend current={value} previous={previous} /></div>
    </div>
    {previous !== undefined && <div style={{ fontSize: 10, color, opacity: 0.55, marginTop: 4 }}>Préc. : {previous}</div>}
  </div>
)

const SectionHeader = ({ title, subtitle, color, icon }) => (
  <div style={{ marginBottom: 12, marginTop: 12 }}>
    <div style={{ fontSize: 17, fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.3px' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>{title}
    </div>
    {subtitle && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3, fontWeight: 500 }}>{subtitle}</div>}
  </div>
)

const WeekSelector = ({ selectedWeek, semaine, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <button onClick={() => onChange(w => Math.max(1, w - 1))} style={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>‹</button>
    <select value={selectedWeek} onChange={e => onChange(parseInt(e.target.value))} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, fontWeight: 600, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)' }}>
      {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
        <option key={w} value={w}>{w === semaine ? 'S' + w + ' (en cours)' : 'Semaine ' + w}</option>
      ))}
    </select>
    <button onClick={() => onChange(w => Math.min(semaine, w + 1))} disabled={selectedWeek === semaine} style={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 8, padding: '4px 10px', cursor: selectedWeek === semaine ? 'default' : 'pointer', fontSize: 14, opacity: selectedWeek === semaine ? 0.4 : 1 }}>›</button>
  </div>
)

const isValidP1 = p => p.profil && p.profil.trim() || p.description && p.description.trim()

const P1Card = ({ p }) => {
  if (p.description && !p.profil) {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #6D28D9', marginBottom: 10 }}>
        <div style={{ background: '#6D28D9', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.description}</span>
        </div>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #6D28D9', marginBottom: 10 }}>
      <div style={{ padding: '12px 14px', background: '#EDE9FE', borderBottom: '1px solid #C4B5FD' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4C1D95', marginBottom: 3 }}>{p.profil}</div>
        {p.client && <div style={{ fontSize: 12, color: '#6D28D9', fontWeight: 600 }}>🏢 {p.client}</div>}
      </div>
      <div style={{ padding: '10px 12px', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {p.experience && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase' }}>📅 Expérience</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.experience}</div></div>}
        {p.salaire_max && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase' }}>💰 Salaire max</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.salaire_max}</div></div>}
        {p.technologies && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px', gridColumn: 'span 2' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase' }}>💻 Technologies</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.technologies}</div></div>}
        {p.langues && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase' }}>🌍 Langues</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.langues}</div></div>}
        {p.lieu && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase' }}>📍 Lieu</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.lieu}</div></div>}
      </div>
    </div>
  )
}

function VueEquipe({ saisies, selectedWeek, setSelectedWeek, semaine, annee, p1Data }) {
  const weekData = saisies.filter(s => s.semaine === selectedWeek)
  const prevData = saisies.filter(s => s.semaine === selectedWeek - 1)
  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)

  const weekTrend = Array.from({ length: 6 }, (_, i) => {
    const w = selectedWeek - 5 + i
    const ws = saisies.filter(s => s.semaine === w)
    return { name: 'S' + w, RDV: ws.reduce((s, d) => s + (d.total_rdv || 0), 0), Presentations: ws.reduce((s, d) => s + (d.presentations || 0), 0), Signatures: ws.reduce((s, d) => s + (d.signatures || 0), 0) }
  })

  const ranking = [...weekData].map(d => ({ name: d.ia && d.ia.nom || '?', score: (d.total_rdv || 0) * 1 + (d.presentations || 0) * 2 + (d.signatures || 0) * 3 })).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 6)
  const p = (key) => selectedWeek > 1 ? sum(prevData, key) : undefined
  const validP1ThisWeek = p1Data.filter(p => p.semaine === selectedWeek && isValidP1(p))

  const kpis = [
    { label: 'RDV', key: 'total_rdv', color: '#6D28D9', bg: '#EDE9FE' },
    { label: 'Présentations', key: 'presentations', color: '#1E40AF', bg: '#DBEAFE' },
    { label: 'Signatures', key: 'signatures', color: '#9D174D', bg: '#FCE7F3' },
    { label: 'Démarrages', key: 'demarrages', color: '#065F46', bg: '#D1FAE5' },
    { label: 'Fins de mission', key: 'fins_de_mission', color: '#92400E', bg: '#FEF3C7' },
    { label: 'Solutions envoyées', key: 'cv_envoyes', color: '#166534', bg: '#DCFCE7' },
    { label: 'Besoins détectés', key: 'besoins_detectes', color: '#9F1239', bg: '#FFE4E6' },
    { label: 'Prés. à monter', key: 'presentations_a_monter', color: '#374151', bg: '#F3F4F6' },
  ]

  return (
    <>
      {/* KPIs */}
      <SectionHeader title="Indicateurs clés" color="#6D28D9" icon="📊" subtitle={'Semaine ' + selectedWeek + (selectedWeek > 1 ? ' — vs S' + (selectedWeek - 1) : '')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 24 }}>
        {kpis.map(k => (
          <KpiCard key={k.key} label={k.label} value={sum(weekData, k.key)} color={k.color} bg={k.bg} previous={p(k.key)} />
        ))}
        <KpiCard label="Pipe total" color="#854D0E" bg="#FEF9C3"
          value={sum(weekData, 'besoins_sans_solution') + sum(weekData, 'attente_retour') + sum(weekData, 'attente_retour_prez')}
          previous={selectedWeek > 1 ? sum(prevData, 'besoins_sans_solution') + sum(prevData, 'attente_retour') + sum(prevData, 'attente_retour_prez') : undefined} />
        <KpiCard label="P1 actifs" color="#0369A1" bg="#E0F2FE"
          value={validP1ThisWeek.length}
          previous={p1Data.filter(p => p.semaine === selectedWeek - 1 && isValidP1(p)).length} />
      </div>

      {/* Graphique */}
      <SectionHeader title="Activité commerciale" color="#1E40AF" icon="📈" subtitle={'6 semaines autour de S' + selectedWeek} />
      <div style={{ background: '#DBEAFE', borderRadius: 14, padding: '16px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          {[['#6D28D9','RDV'],['#1E40AF','Présentations'],['#9D174D','Signatures']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#1E40AF', fontWeight: 600 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }}></div>{l}
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={weekTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#1E40AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#1E40AF' }} />
            <Tooltip />
            <Line type="monotone" dataKey="RDV" stroke="#6D28D9" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Presentations" stroke="#1E40AF" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="Signatures" stroke="#9D174D" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="2 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Classement */}
      <SectionHeader title={'Classement S' + selectedWeek} color="#9D174D" icon="🏆" subtitle="1 RDV=1pt · 1 Prez=2pts · 1 Sign.=3pts" />
      <div style={{ background: '#FCE7F3', borderRadius: 14, padding: '16px', marginBottom: 24 }}>
        {ranking.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9D174D', fontSize: 13, padding: '12px 0', opacity: 0.7 }}>Aucune saisie cette semaine</div>
        ) : ranking.map((r, i) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', marginBottom: 6, background: 'rgba(255,255,255,0.6)', borderRadius: 10 }}>
            <span style={{ fontSize: 16, width: 28, textAlign: 'center' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.'}</span>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#9D174D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{r.name.slice(0,2).toUpperCase()}</div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: i < 3 ? 700 : 400, color: '#1F2937' }}>{r.name}</span>
            <div style={{ flex: 2, height: 8, background: 'rgba(157,23,77,0.15)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: '#9D174D', width: Math.round((r.score / (ranking[0] && ranking[0].score || 1)) * 100) + '%', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, width: 44, textAlign: 'right', color: '#9D174D' }}>{r.score}pts</span>
          </div>
        ))}
      </div>

      {/* Pipe */}
      <SectionHeader title="État du pipe" color="#92400E" icon="🎯" subtitle={'Photo de la semaine ' + selectedWeek} />
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { label: 'Besoins sans solution', key: 'besoins_sans_solution', color: '#6D28D9', bg: '#EDE9FE', icon: '🔍' },
          { label: 'En attente réponse client', key: 'attente_retour', color: '#92400E', bg: '#FEF3C7', icon: '⏳' },
          { label: 'Présentations en attente retour', key: 'attente_retour_prez', color: '#9D174D', bg: '#FCE7F3', icon: '📋' },
        ].map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', background: item.bg, marginBottom: 8, borderRadius: 14 }}>
            <span style={{ fontSize: 22, marginRight: 14 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: item.color, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: item.color, letterSpacing: '-1px' }}>{sum(weekData, item.key)}</div>
                {selectedWeek > 1 && <Trend current={sum(weekData, item.key)} previous={sum(prevData, item.key)} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* P1 */}
      {validP1ThisWeek.length > 0 && (
        <>
          <SectionHeader title={'Priorités P1 — Semaine ' + selectedWeek} color="#6D28D9" icon="🎯" subtitle={validP1ThisWeek.length + ' priorité(s) active(s)'} />
          <div style={{ background: '#EDE9FE', borderRadius: 14, padding: 16, marginBottom: 24 }}>
            {Object.entries(
              validP1ThisWeek.reduce((acc, p) => {
                const nom = p.ia && p.ia.nom || '?'
                if (!acc[nom]) acc[nom] = []
                acc[nom].push(p)
                return acc
              }, {})
            ).map(([nom, ps]) => (
              <div key={nom} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6D28D9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{nom.slice(0,2).toUpperCase()}</div>
                  {nom}
                </div>
                {ps.map(p => <P1Card key={p.id} p={p} />)}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function VueFocusIA({ saisies, iaList, selectedWeek, semaine }) {
  const annee = new Date().getFullYear()
  const [selectedIa, setSelectedIa] = useState(null)
  const [iaIndex, setIaIndex] = useState(0)
  const [viewMode, setViewMode] = useState('semaine')

  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)

  const iaData   = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === selectedWeek) : []
  const iaPrev   = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === selectedWeek - 1) : []
  const iaAnnuel = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id) : []

  const iaTrend = selectedIa ? Array.from({ length: 6 }, (_, i) => {
    const w = selectedWeek - 5 + i
    const ws = saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === w)
    return { name: 'S' + w, RDV: ws.reduce((s, d) => s + (d.total_rdv || 0), 0), Signatures: ws.reduce((s, d) => s + (d.signatures || 0), 0) }
  }) : []

  const p = (key) => selectedWeek > 1 ? sum(iaPrev, key) : undefined
  const couleur = selectedIa ? AVATAR_COLORS[iaIndex % AVATAR_COLORS.length] : null

  const kpisSemaine = [
    { label: 'RDV', key: 'total_rdv', color: '#6D28D9', bg: '#EDE9FE' },
    { label: 'Présentations', key: 'presentations', color: '#1E40AF', bg: '#DBEAFE' },
    { label: 'Signatures', key: 'signatures', color: '#9D174D', bg: '#FCE7F3' },
    { label: 'Démarrages', key: 'demarrages', color: '#065F46', bg: '#D1FAE5' },
    { label: 'Solutions', key: 'cv_envoyes', color: '#166534', bg: '#DCFCE7' },
    { label: 'Besoins détectés', key: 'besoins_detectes', color: '#9F1239', bg: '#FFE4E6' },
    { label: 'Pipe total', key: null, color: '#92400E', bg: '#FEF3C7' },
    { label: 'Prés. à monter', key: 'presentations_a_monter', color: '#374151', bg: '#F3F4F6' },
  ]

  return (
    <>
      {/* Sélection IA */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {selectedIa ? '' : "Sélectionne un Ingénieur d'Affaires"}
        </div>

        {!selectedIa ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {iaList.map((ia, i) => {
              const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
              return (
                <div key={ia.id} onClick={() => { setSelectedIa(ia); setIaIndex(i) }}
                  style={{ background: bg, borderRadius: 16, padding: '16px 10px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: fg, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                    {ia.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: fg }}>{ia.nom}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: couleur[0], borderRadius: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: couleur[1], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
              {selectedIa.nom.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: couleur[1] }}>{selectedIa.nom}</div>
              <div style={{ fontSize: 11, color: couleur[1], opacity: 0.7 }}>Ingénieur d'Affaires</div>
            </div>
            <button onClick={() => setSelectedIa(null)}
              style={{ background: 'none', border: `1.5px solid ${couleur[1]}40`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: couleur[1] }}>
              Changer
            </button>
          </div>
        )}
      </div>

      {selectedIa && (
        <>
          {/* Toggle semaine / annuel */}
          <div style={{ display: 'flex', background: 'var(--color-background-secondary)', borderRadius: 12, padding: 4, marginBottom: 20, border: '1px solid var(--color-border-tertiary)' }}>
            {[['semaine', '📅 Semaine'], ['annuel', '📊 Cumulé annuel']].map(([id, label]) => (
              <button key={id} onClick={() => setViewMode(id)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: viewMode === id ? 700 : 400, background: viewMode === id ? couleur[1] : 'transparent', color: viewMode === id ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>

          {viewMode === 'semaine' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 24 }}>
                {kpisSemaine.map(k => (
                  <KpiCard key={k.label} label={k.label} color={k.color} bg={k.bg}
                    value={k.key ? sum(iaData, k.key) : sum(iaData, 'besoins_sans_solution') + sum(iaData, 'attente_retour') + sum(iaData, 'attente_retour_prez')}
                    previous={k.key ? p(k.key) : selectedWeek > 1 ? sum(iaPrev, 'besoins_sans_solution') + sum(iaPrev, 'attente_retour') + sum(iaPrev, 'attente_retour_prez') : undefined}
                  />
                ))}
              </div>

              <SectionHeader title="Évolution RDV & Signatures" color="#1E40AF" icon="📈" subtitle="6 dernières semaines" />
              <div style={{ background: '#DBEAFE', borderRadius: 14, padding: 16, marginBottom: 24 }}>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={iaTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#1E40AF' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#1E40AF' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="RDV" stroke="#6D28D9" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Signatures" stroke="#9D174D" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="2 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <SectionHeader title="État du pipe" color="#92400E" icon="🎯" subtitle={'Semaine ' + selectedWeek} />
              <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
                {[
                  { label: 'Besoins sans solution', key: 'besoins_sans_solution', color: '#6D28D9', bg: '#EDE9FE', icon: '🔍' },
                  { label: 'En attente réponse client', key: 'attente_retour', color: '#92400E', bg: '#FEF3C7', icon: '⏳' },
                  { label: 'Présentations en attente retour', key: 'attente_retour_prez', color: '#9D174D', bg: '#FCE7F3', icon: '📋' },
                ].map((item) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', background: item.bg, marginBottom: 8, borderRadius: 14 }}>
                    <span style={{ fontSize: 20, marginRight: 12 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: item.color, fontWeight: 600, opacity: 0.8 }}>{item.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{sum(iaData, item.key)}</div>
                        {selectedWeek > 1 && <Trend current={sum(iaData, item.key)} previous={sum(iaPrev, item.key)} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 24 }}>
                {[
                  { label: 'RDV total', key: 'total_rdv', color: '#6D28D9', bg: '#EDE9FE' },
                  { label: 'Présentations', key: 'presentations', color: '#1E40AF', bg: '#DBEAFE' },
                  { label: 'Signatures', key: 'signatures', color: '#9D174D', bg: '#FCE7F3' },
                  { label: 'Démarrages', key: 'demarrages', color: '#065F46', bg: '#D1FAE5' },
                  { label: 'Solutions', key: 'cv_envoyes', color: '#166534', bg: '#DCFCE7' },
                  { label: 'Besoins détectés', key: 'besoins_detectes', color: '#9F1239', bg: '#FFE4E6' },
                  { label: 'Fins de mission', key: 'fins_de_mission', color: '#92400E', bg: '#FEF3C7' },
                  { label: 'Pipe total', key: null, color: '#854D0E', bg: '#FEF9C3' },
                ].map(k => (
                  <KpiCard key={k.label} label={k.label} color={k.color} bg={k.bg}
                    value={k.key ? sum(iaAnnuel, k.key) : sum(iaAnnuel, 'besoins_sans_solution') + sum(iaAnnuel, 'attente_retour') + sum(iaAnnuel, 'attente_retour_prez')}
                  />
                ))}
              </div>

              <SectionHeader title="Évolution RDV & Signatures" color="#1E40AF" icon="📈" subtitle="6 dernières semaines" />
              <div style={{ background: '#DBEAFE', borderRadius: 14, padding: 16, marginBottom: 24 }}>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={iaTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#1E40AF' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#1E40AF' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="RDV" stroke="#6D28D9" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Signatures" stroke="#9D174D" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="2 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

export default function Dashboard() {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [view, setView] = useState('equipe')
  const [selectedWeek, setSelectedWeek] = useState(semaine)
  const [saisies, setSaisies] = useState([])
  const [iaList, setIaList] = useState([])
  const [p1Data, setP1Data] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    load()
  }, [])

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>Vue d'ensemble</div>
        <WeekSelector selectedWeek={selectedWeek} semaine={semaine} onChange={setSelectedWeek} />
      </div>

      {/* Toggle Équipe / Focus IA */}
      <div style={{ display: 'flex', background: 'var(--color-background-secondary)', borderRadius: 12, padding: 4, marginBottom: 20, border: '1px solid var(--color-border-tertiary)' }}>
        {[['equipe', "👥 Équipe"], ['focus', "👤 Focus IA"]].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: view === id ? 700 : 400, background: view === id ? '#6D28D9' : 'transparent', color: view === id ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'equipe' ? (
        <VueEquipe saisies={saisies} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} semaine={semaine} annee={annee} p1Data={p1Data} />
      ) : (
        <VueFocusIA saisies={saisies} iaList={iaList} selectedWeek={selectedWeek} semaine={semaine} />
      )}
    </div>
  )
}
