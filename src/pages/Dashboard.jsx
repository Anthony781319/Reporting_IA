import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const COLORS = ['#534AB7','#0F6E56','#BA7517','#993556','#888780','#185FA5','#3B6D11','#D85A30']

const SectionHeader = ({ title, subtitle, color, icon }) => (
  <div style={{
    background: `${color}12`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '8px 8px 0 0',
    padding: '10px 14px',
  }}>
    <div style={{ fontSize: 13, fontWeight: 600, color }}>{icon} {title}</div>
    {subtitle && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{subtitle}</div>}
  </div>
)

const SectionBody = ({ color, children, noPadding }) => (
  <div style={{
    border: `1px solid ${color}25`,
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    padding: noPadding ? 0 : 14,
    marginBottom: 20,
    overflow: noPadding ? 'hidden' : undefined
  }}>
    {children}
  </div>
)

const Trend = ({ current, previous }) => {
  if (previous === undefined || previous === null) return null
  const diff = current - previous
  if (diff === 0) return <span style={{ fontSize: 11, color: '#888780' }}>= vs S{''}</span>
  const up = diff > 0
  return (
    <span style={{ fontSize: 11, fontWeight: 500, color: up ? '#0F6E56' : '#A32D2D' }}>
      {up ? '↑' : '↓'} {up ? '+' : ''}{diff}
    </span>
  )
}

const KpiCard = ({ label, value, color, previous }) => (
  <div style={{
    background: `${color}08`,
    border: `1px solid ${color}25`,
    borderRadius: 10, padding: '12px 14px',
    borderLeft: `3px solid ${color}`
  }}>
    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ fontSize: 26, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
      <div style={{ paddingBottom: 3 }}><Trend current={value} previous={previous} /></div>
    </div>
    {previous !== undefined && (
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
        Semaine préc. : {previous}
      </div>
    )}
  </div>
)

export default function Dashboard() {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [selectedWeek, setSelectedWeek] = useState(semaine)
  const [saisies, setSaisies] = useState([])
  const [weekData, setWeekData] = useState([])
  const [prevData, setPrevData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: all } = await supabase
        .from('saisies').select('*, ia(nom)').eq('annee', annee)
      setSaisies(all || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!saisies.length) return
    setWeekData(saisies.filter(s => s.semaine === selectedWeek))
    setPrevData(saisies.filter(s => s.semaine === selectedWeek - 1))
  }, [selectedWeek, saisies])

  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)

  const weekTrend = Array.from({ length: 6 }, (_, i) => {
    const w = selectedWeek - 5 + i
    const ws = saisies.filter(s => s.semaine === w)
    return {
      name: `S${w}`,
      RDV: ws.reduce((s, d) => s + (d.total_rdv || 0), 0),
      Présentations: ws.reduce((s, d) => s + (d.presentations || 0), 0),
      Signatures: ws.reduce((s, d) => s + (d.signatures || 0), 0),
    }
  })

  const ranking = [...weekData]
    .map(d => ({
      name: d.ia?.nom || '?',
      score: (d.total_rdv || 0) * 1 + (d.presentations || 0) * 2 + (d.signatures || 0) * 3,
    }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  const isCurrentWeek = selectedWeek === semaine

  return (
    <div style={{ padding: '14px 16px' }}>

      {/* Header avec sélecteur */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Vue d'ensemble</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
            style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: 'var(--color-text-primary)' }}
          >‹</button>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(parseInt(e.target.value))}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, fontWeight: 500 }}
          >
            {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
              <option key={w} value={w}>{w === semaine ? `S${w} (en cours)` : `Semaine ${w}`}</option>
            ))}
          </select>
          <button
            onClick={() => setSelectedWeek(w => Math.min(semaine, w + 1))}
            disabled={selectedWeek === semaine}
            style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '4px 8px', cursor: selectedWeek === semaine ? 'default' : 'pointer', fontSize: 14, color: selectedWeek === semaine ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', opacity: selectedWeek === semaine ? 0.4 : 1 }}
          >›</button>
        </div>
      </div>

      {/* KPIs avec comparaison */}
      <SectionHeader
        title="Indicateurs clés"
        color="#534AB7"
        icon="📊"
        subtitle={`Semaine ${selectedWeek} ${selectedWeek > 1 ? `— vs semaine ${selectedWeek - 1}` : ''}`}
      />
      <SectionBody color="#534AB7">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          <KpiCard label="RDV semaine" value={sum(weekData, 'total_rdv')} color="#534AB7" previous={selectedWeek > 1 ? sum(prevData, 'total_rdv') : undefined} />
          <KpiCard label="Présentations" value={sum(weekData, 'presentations')} color="#185FA5" previous={selectedWeek > 1 ? sum(prevData, 'presentations') : undefined} />
          <KpiCard label="Signatures" value={sum(weekData, 'signatures')} color="#993556" previous={selectedWeek > 1 ? sum(prevData, 'signatures') : undefined} />
          <KpiCard label="Démarrages" value={sum(weekData, 'demarrages')} color="#0F6E56" previous={selectedWeek > 1 ? sum(prevData, 'demarrages') : undefined} />
          <KpiCard label="Fins de mission" value={sum(weekData, 'fins_de_mission')} color="#BA7517" previous={selectedWeek > 1 ? sum(prevData, 'fins_de_mission') : undefined} />
          <KpiCard label="Solutions envoyées" value={sum(weekData, 'cv_envoyes')} color="#3B6D11" previous={selectedWeek > 1 ? sum(prevData, 'cv_envoyes') : undefined} />
          <KpiCard label="Besoins détectés" value={sum(weekData, 'besoins_detectes')} color="#D85A30" previous={selectedWeek > 1 ? sum(prevData, 'besoins_detectes') : undefined} />
          <KpiCard label="Pipe total" value={sum(weekData, 'besoins_sans_solution') + sum(weekData, 'attente_retour') + sum(weekData, 'attente_retour_prez')} color="#534AB7" previous={selectedWeek > 1 ? sum(prevData, 'besoins_sans_solution') + sum(prevData, 'attente_retour') + sum(prevData, 'attente_retour_prez') : undefined} />
          <KpiCard label="Présentations à monter" value={sum(weekData, 'presentations_a_monter')} color="#888780" previous={selectedWeek > 1 ? sum(prevData, 'presentations_a_monter') : undefined} />
        </div>
      </SectionBody>

      {/* Courbe activité */}
      <SectionHeader title="Activité commerciale" color="#185FA5" icon="📈" subtitle={`Évolution sur les 6 semaines autour de S${selectedWeek}`} />
      <SectionBody color="#185FA5">
        <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          {[['#534AB7','RDV'],['#185FA5','Présentations'],['#993556','Signatures']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }}></div>{l}
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={weekTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888780' }} />
            <YAxis tick={{ fontSize: 11, fill: '#888780' }} />
            <Tooltip />
            <Line type="monotone" dataKey="RDV" stroke="#534AB7" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Présentations" stroke="#185FA5" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="Signatures" stroke="#993556" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="2 2" />
          </LineChart>
        </ResponsiveContainer>
      </SectionBody>

      {/* Classement */}
      <SectionHeader title={`Classement S${selectedWeek}`} color="#993556" icon="🏆" subtitle="1 RDV=1pt · 1 Prez=2pts · 1 Sign.=3pts" />
      <SectionBody color="#993556">
        {ranking.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13, padding: '12px 0' }}>Aucune saisie cette semaine</div>
        ) : ranking.map((r, i) => (
          <div key={r.name} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 6px', marginBottom: 6,
            background: i % 2 === 0 ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
            borderRadius: 8
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, width: 24, textAlign: 'center' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#3C3489', flexShrink: 0 }}>
              {r.name.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: i < 3 ? 600 : 400 }}>{r.name}</span>
            <div style={{ flex: 2, height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length], width: `${Math.round((r.score / (ranking[0]?.score || 1)) * 100)}%`, transition: 'width 0.5s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, width: 40, textAlign: 'right', color: COLORS[i % COLORS.length] }}>{r.score}pts</span>
          </div>
        ))}
      </SectionBody>

      {/* État du pipe */}
      <SectionHeader title="État du pipe" color="#BA7517" icon="🎯" subtitle={`Photo de la semaine ${selectedWeek}`} />
      <SectionBody color="#BA7517" noPadding>
        {[
          { label: 'Besoins sans solution', key: 'besoins_sans_solution', color: '#534AB7', icon: '🔍' },
          { label: 'En attente réponse client', key: 'attente_retour', color: '#BA7517', icon: '⏳' },
          { label: 'Présentations en attente retour', key: 'attente_retour_prez', color: '#993556', icon: '📋' },
        ].map((item, idx) => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: idx < 2 ? `0.5px solid ${item.color}15` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: item.color }}>{sum(weekData, item.key)}</div>
                  {selectedWeek > 1 && <Trend current={sum(weekData, item.key)} previous={sum(prevData, item.key)} />}
                </div>
              </div>
            </div>
          </div>
        ))}
      </SectionBody>

    </div>
  )
}
