import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const AVATAR_COLORS = [
  ['#EEEDFE','#3C3489'],['#E1F5EE','#085041'],['#FAEEDA','#633806'],
  ['#FBEAF0','#72243E'],['#F1EFE8','#444441'],['#E6F1FB','#0C447C'],
]

export default function Equipe() {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [equipe, setEquipe] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(semaine)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: ia } = await supabase.from('ia').select('*').order('nom')
      const { data: saisies } = await supabase.from('saisies').select('*').eq('annee', annee)

      const result = (ia || []).map((i, idx) => {
        const all = (saisies || []).filter(s => s.ia_id === i.id)
        const week = all.find(s => s.semaine === selectedWeek)
        const totalRdv = all.reduce((s, d) => s + (d.total_rdv || 0), 0)
        const totalBesoins = all.reduce((s, d) => s + (d.besoins_detectes || 0), 0)
        const totalSignatures = all.reduce((s, d) => s + (d.signatures || 0), 0)
        const totalDemarrages = all.reduce((s, d) => s + (d.demarrages || 0), 0)
        const totalPresentations = all.reduce((s, d) => s + (d.presentations || 0), 0)
        const atteinte = totalSignatures > 0 ? Math.round((totalSignatures / Math.max(totalRdv, 1)) * 100) : 0

        return {
          ...i,
          colorIdx: idx % AVATAR_COLORS.length,
          week_rdv: week?.total_rdv || 0,
          week_cv: week?.cv_envoyes || 0,
          totalRdv, totalBesoins, totalSignatures, totalDemarrages, totalPresentations, atteinte
        }
      })
      setEquipe(result)
      setLoading(false)
    }
    load()
  }, [selectedWeek])

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  const barData = equipe.map(i => ({ name: i.nom.slice(0, 5), rdv: i.totalRdv })).sort((a, b) => b.rdv - a.rdv)

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Vue semaine</span>
        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(parseInt(e.target.value))}
          style={{ fontSize: 12, padding: '4px 8px' }}
        >
          {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
            <option key={w} value={w}>Semaine {w}</option>
          ))}
        </select>
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '8px 12px', background: 'var(--color-background-secondary)', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          <div>IA</div><div style={{ textAlign: 'right' }}>RDV</div><div style={{ textAlign: 'right' }}>CV</div><div style={{ textAlign: 'right' }}>Pipe</div>
        </div>
        {equipe.map((ia, i) => {
          const [bg, fg] = AVATAR_COLORS[ia.colorIdx]
          return (
            <div key={ia.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 12px', borderTop: '0.5px solid var(--color-border-tertiary)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                  {ia.nom.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13 }}>{ia.nom}</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>{ia.week_rdv}</div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>{ia.week_cv}</div>
              <div style={{ textAlign: 'right', fontSize: 13, color: '#534AB7', fontWeight: 500 }}>{ia.totalRdv}</div>
            </div>
          )
        })}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 12px', borderTop: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Total</div>
          <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{equipe.reduce((s, i) => s + i.week_rdv, 0)}</div>
          <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{equipe.reduce((s, i) => s + i.week_cv, 0)}</div>
          <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: '#534AB7' }}>{equipe.reduce((s, i) => s + i.totalRdv, 0)}</div>
        </div>
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Total RDV annuel par IA</div>
        <ResponsiveContainer width="100%" height={equipe.length * 36 + 20}>
          <BarChart data={barData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#888780' }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#888780' }} width={45} />
            <Tooltip />
            <Bar dataKey="rdv" fill="#534AB7" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: 'var(--color-background-secondary)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Statistiques annuelles</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '8px 12px', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <div>IA</div><div style={{ textAlign: 'right' }}>RDV</div><div style={{ textAlign: 'right' }}>Signa.</div><div style={{ textAlign: 'right' }}>Obj.</div>
        </div>
        {equipe.map(ia => {
          const color = ia.atteinte >= 40 ? '#0F6E56' : ia.atteinte >= 20 ? '#BA7517' : '#A32D2D'
          const bg = ia.atteinte >= 40 ? '#EAF3DE' : ia.atteinte >= 20 ? '#FAEEDA' : '#FCEBEB'
          return (
            <div key={ia.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 12px', borderTop: '0.5px solid var(--color-border-tertiary)', alignItems: 'center' }}>
              <div style={{ fontSize: 13 }}>{ia.nom}</div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>{ia.totalRdv}</div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>{ia.totalSignatures}</div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: bg, color, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 10 }}>{ia.atteinte}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
