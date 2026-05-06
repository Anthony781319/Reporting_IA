import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const COLORS = ['#534AB7','#0F6E56','#BA7517','#993556','#888780','#185FA5','#3B6D11','#D85A30']

export default function Dashboard() {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [saisies, setSaisies] = useState([])
  const [iaList, setIaList] = useState([])
  const [weekData, setWeekData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: ia }, { data: all }] = await Promise.all([
        supabase.from('ia').select('*').order('nom'),
        supabase.from('saisies').select('*, ia(nom)').eq('annee', annee)
      ])
      setIaList(ia || [])
      setSaisies(all || [])

      const thisWeek = (all || []).filter(s => s.semaine === semaine)
      setWeekData(thisWeek)
      setLoading(false)
    }
    load()
  }, [])

  const totalRdv = weekData.reduce((s, d) => s + (d.total_rdv || 0), 0)
  const totalCv = weekData.reduce((s, d) => s + (d.cv_envoyes || 0), 0)
  const totalBesoins = weekData.reduce((s, d) => s + (d.besoins_detectes || 0), 0)
  const totalSignatures = weekData.reduce((s, d) => s + (d.signatures || 0), 0)

  const weekTrend = Array.from({ length: 6 }, (_, i) => {
    const w = semaine - 5 + i
    const ws = saisies.filter(s => s.semaine === w)
    return {
      name: `S${w}`,
      RDV: ws.reduce((s, d) => s + (d.total_rdv || 0), 0),
      CV: ws.reduce((s, d) => s + (d.cv_envoyes || 0), 0),
    }
  })

  const ranking = [...weekData]
    .sort((a, b) => (b.total_rdv || 0) - (a.total_rdv || 0))
    .slice(0, 6)
    .map(d => ({ name: d.ia?.nom || '?', rdv: d.total_rdv || 0 }))

  const pipeData = [
    { name: 'Pipe total', value: weekData.reduce((s, d) => s + (d.total_rdv || 0), 0) },
    { name: 'Besoins', value: totalBesoins },
    { name: 'Présentations', value: weekData.reduce((s, d) => s + (d.presentations || 0), 0) },
  ]

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Semaine en cours</span>
        <span style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20 }}>Semaine {semaine}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'RDV semaine', value: totalRdv, color: '#534AB7' },
          { label: 'CV envoyés', value: totalCv, color: '#0F6E56' },
          { label: 'Besoins détectés', value: totalBesoins, color: '#BA7517' },
          { label: 'Signatures', value: totalSignatures, color: '#993556' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>RDV & CV — 6 dernières semaines</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          {[['#534AB7','RDV'],['#0F6E56','CV envoyés']].map(([c,l]) => (
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
            <Line type="monotone" dataKey="CV" stroke="#0F6E56" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Top IA — RDV cette semaine</div>
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
              <div style={{ height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length], width: `${Math.round((r.rdv / (ranking[0]?.rdv || 1)) * 100)}%` }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, width: 20, textAlign: 'right' }}>{r.rdv}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Répartition du pipe</div>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={pipeData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
              {pipeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
