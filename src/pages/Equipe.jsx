import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const AVATAR_COLORS = [
  ['#EEEDFE','#3C3489'],['#E1F5EE','#085041'],['#FAEEDA','#633806'],
  ['#FBEAF0','#72243E'],['#F1EFE8','#444441'],['#E6F1FB','#0C447C'],
]
const COLORS = ['#534AB7','#0F6E56','#BA7517','#993556','#888780','#185FA5','#3B6D11','#D85A30']

const Avatar = ({ nom, idx }) => {
  const [bg, fg] = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
      {nom.slice(0, 2).toUpperCase()}
    </div>
  )
}

const SectionHeader = ({ title, subtitle, color, icon }) => (
  <div style={{ background: `${color}12`, borderLeft: `3px solid ${color}`, borderRadius: '8px 8px 0 0', padding: '10px 14px' }}>
    <div style={{ fontSize: 13, fontWeight: 600, color }}>{icon} {title}</div>
    {subtitle && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{subtitle}</div>}
  </div>
)

export default function Equipe() {
  const annee = new Date().getFullYear()
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: ia } = await supabase.from('ia').select('*').order('nom')
      const { data: saisies } = await supabase.from('saisies').select('*').eq('annee', annee)

      const result = (ia || []).map((i, idx) => {
        const all = (saisies || []).filter(s => s.ia_id === i.id)
        const totalRdv        = all.reduce((s, d) => s + (d.total_rdv     || 0), 0)
        const totalPrez       = all.reduce((s, d) => s + (d.presentations || 0), 0)
        const totalSignatures = all.reduce((s, d) => s + (d.signatures    || 0), 0)
        const totalDemarrages = all.reduce((s, d) => s + (d.demarrages    || 0), 0)
        const score = totalRdv * 1 + totalPrez * 1.5 + totalSignatures * 2 + totalDemarrages * 3
        return { ...i, colorIdx: idx % AVATAR_COLORS.length, score }
      })

      setEquipe(result)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  const ranking = [...equipe].sort((a, b) => b.score - a.score)
  const barData  = ranking.map(i => ({ name: i.nom.slice(0, 5), score: Math.round(i.score * 10) / 10 }))

  return (
    <div style={{ padding: '14px 16px' }}>
      <SectionHeader title="Classement annuel pondéré" color="#993556" icon="🏆" subtitle="RDV=1pt · Prez=1.5pts · Sign.=2pts · Démarr.=3pts" />
      <div style={{ border: '1px solid #99355625', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 14, marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={equipe.length * 30 + 20}>
          <BarChart data={barData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#888780' }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#888780' }} width={42} />
            <Tooltip formatter={(v) => [v + ' pts', 'Score']} />
            <Bar dataKey="score" fill="#993556" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div style={{ marginTop: 14 }}>
          {ranking.map((ia, i) => (
            <div key={ia.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', marginBottom: 6,
              background: i === 0 ? '#FBEAF010' : i % 2 === 0 ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
              borderRadius: 8,
              border: i === 0 ? '1px solid #99355625' : '1px solid transparent'
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? '#993556' : 'var(--color-text-secondary)', width: 20 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
              </span>
              <Avatar nom={ia.nom} idx={ia.colorIdx} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: i < 3 ? 600 : 400 }}>{ia.nom}</span>
              <div style={{ flex: 2, height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length], width: `${Math.round((ia.score / (ranking[0]?.score || 1)) * 100)}%`, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, width: 45, textAlign: 'right', color: COLORS[i % COLORS.length] }}>
                {Math.round(ia.score * 10) / 10}pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
