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

const KpiCard = ({ label, value, color }) => (
  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 500, color }}>{value}</div>
  </div>
)

const PipeCard = ({ label, value, color, icon }) => (
  <div style={{
    background: 'var(--color-background-primary)',
    border: `1.5px solid ${color}30`,
    borderRadius: 12, padding: '14px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10
  }}>
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color }}>{value}</div>
    </div>
    <div style={{ fontSize: 28, opacity: 0.4 }}>{icon}</div>
  </div>
)

export default function Dashboard() {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [saisies, setSaisies] = useState([])
  const [weekData, setWeekData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: all } = await supabase
        .from('saisies').select('*, ia(nom)').eq('annee', annee)
      setSaisies(all || [])
      setWeekData((all || []).filter(s => s.semaine === semaine))
      setLoading(false)
    }
    load()
  }, [])

  const sum = (key) => weekData.reduce((s, d) => s + (d[key] || 0), 0)

  // Courbe activité commerciale
  const weekTrend = Array.from({ length: 6 }, (_, i) => {
    const w = semaine - 5 + i
    const ws = saisies.filter(s => s.semaine === w)
    return {
      name: `S${w}`,
      RDV: ws.reduce((s, d) => s + (d.total_rdv || 0), 0),
      Présentations: ws.reduce((s, d) => s + (d.presentations || 0), 0),
      Signatures: ws.reduce((s, d) => s + (d.signatures || 0), 0),
    }
  })

  // Classement pondéré
  const ranking = [...weekData]
    .map(d => ({
      name: d.ia?.nom || '?',
      score: (d.total_rdv || 0) * 1 + (d.presentations || 0) * 2 + (d.signatures || 0) * 3,
      rdv: d.total_rdv || 0,
      prez: d.presentations || 0,
      signatures: d.signatures || 0,
    }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Semaine en cours</span>
        <span style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20 }}>Semaine {semaine}</span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
        <KpiCard label="RDV semaine" value={sum('total_rdv')} color="#534AB7" />
        <KpiCard label="Présentations" value={sum('presentations')} color="#185FA5" />
        <KpiCard label="Signatures" value={sum('signatures')} color="#993556" />
        <KpiCard label="Démarrages" value={sum('demarrages')} color="#0F6E56" />
        <KpiCard label="Fins de mission" value={sum('fins_de_mission')} color="#BA7517" />
        <KpiCard label="Solutions envoyées" value={sum('cv_envoyes')} color="#3B6D11" />
        <KpiCard label="Besoins détectés" value={sum('besoins_detectes')} color="#D85A30" />
      </div>

      {/* Courbe activité commerciale */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Activité commerciale — 6 semaines</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          {[['#534AB7','RDV'],['#185FA5','Présentations'],['#993556','Signatures']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }}></div>{l}
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
      </div>

      {/* Classement pondéré */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Classement — Score pondéré</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 12 }}>1 RDV = 1pt · 1 Prez = 2pts · 1 Signature = 3pts</div>
        {ranking.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '12px 0' }}>Aucune saisie cette semaine</div>
        ) : ranking.map((r, i) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 14 }}>{i + 1}</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#3C3489', flexShrink: 0 }}>
              {r.name.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ flex: 1, fontSize: 13 }}>{r.name}</span>
            <div style={{ flex: 2, height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length], width: `${Math.round((r.score / (ranking[0]?.score || 1)) * 100)}%` }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, width: 28, textAlign: 'right', color: COLORS[i % COLORS.length] }}>{r.score}pts</span>
          </div>
        ))}
      </div>

      {/* Pipe — 3 cartes */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>État du pipe</div>
        <PipeCard
          label="Besoins totaux détectés"
          value={sum('besoins_detectes')}
          color="#534AB7"
          icon="🎯"
        />
        <PipeCard
          label="En attente réponse client"
          value={sum('attente_retour')}
          color="#BA7517"
          icon="⏳"
        />
        <PipeCard
          label="Présentations en attente retour"
          value={sum('attente_retour_prez')}
          color="#993556"
          icon="📋"
        />
      </div>
    </div>
  )
}
