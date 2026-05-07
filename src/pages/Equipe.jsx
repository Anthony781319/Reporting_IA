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

const COLORS = ['#534AB7','#0F6E56','#BA7517','#993556','#888780','#185FA5','#3B6D11','#D85A30']

const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) + '%' : '—'

const Badge = ({ value, good }) => {
  const color = good ? '#0F6E56' : value === '—' ? '#888780' : '#BA7517'
  const bg = good ? '#E1F5EE' : value === '—' ? '#F1EFE8' : '#FAEEDA'
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 10 }}>
      {value}
    </span>
  )
}

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '20px 0 12px' }}>
    {children}
  </div>
)

const ScrollTable = ({ headers, rows, totals }) => (
  <div style={{ overflowX: 'auto', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, marginBottom: 6 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}>
      <thead>
        <tr style={{ background: 'var(--color-background-secondary)' }}>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '8px 10px', textAlign: i === 0 ? 'left' : 'right', color: 'var(--color-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '9px 10px', textAlign: j === 0 ? 'left' : 'right', color: 'var(--color-text-primary)' }}>{cell}</td>
            ))}
          </tr>
        ))}
        {totals && (
          <tr style={{ borderTop: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', fontWeight: 500 }}>
            {totals.map((cell, j) => (
              <td key={j} style={{ padding: '9px 10px', textAlign: j === 0 ? 'left' : 'right' }}>{cell}</td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  </div>
)

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
        const week = all.find(s => s.semaine === selectedWeek) || {}

        // Cumul annuel
        const totalRdv = all.reduce((s, d) => s + (d.total_rdv || 0), 0)
        const totalBesoins = all.reduce((s, d) => s + (d.besoins_detectes || 0), 0)
        const totalAttenteClient = all.reduce((s, d) => s + (d.attente_retour || 0), 0)
        const totalPrez = all.reduce((s, d) => s + (d.presentations || 0), 0)
        const totalSignatures = all.reduce((s, d) => s + (d.signatures || 0), 0)
        const totalDemarrages = all.reduce((s, d) => s + (d.demarrages || 0), 0)

        // Score pondéré annuel
        const score = totalRdv * 1 + totalPrez * 1.5 + totalSignatures * 2 + totalDemarrages * 3

        return {
          ...i,
          colorIdx: idx % AVATAR_COLORS.length,
          // Vue semaine
          w_rdv: week.total_rdv || 0,
          w_prez: week.presentations || 0,
          w_sign: week.signatures || 0,
          w_fin: week.fins_de_mission || 0,
          w_bss: week.besoins_sans_solution || 0,
          w_arc: week.attente_retour || 0,
          w_arp: week.attente_retour_prez || 0,
          // Cumul
          totalRdv, totalBesoins, totalAttenteClient,
          totalPrez, totalSignatures, totalDemarrages,
          score,
          // Ratios
          ratioBesRdv: pct(totalBesoins, totalRdv),
          ratioPrezArc: pct(totalPrez, totalAttenteClient),
          ratioSignPrez: pct(totalSignatures, totalPrez),
          ratioObj: pct(totalSignatures, 10),
          objGood: totalSignatures >= 10,
        }
      })

      setEquipe(result)
      setLoading(false)
    }
    load()
  }, [selectedWeek])

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  const ranking = [...equipe].sort((a, b) => b.score - a.score)

  const weekTotals = [
    'Total',
    equipe.reduce((s, i) => s + i.w_rdv, 0),
    equipe.reduce((s, i) => s + i.w_prez, 0),
    equipe.reduce((s, i) => s + i.w_sign, 0),
    equipe.reduce((s, i) => s + i.w_fin, 0),
    equipe.reduce((s, i) => s + i.w_bss, 0),
    equipe.reduce((s, i) => s + i.w_arc, 0),
    equipe.reduce((s, i) => s + i.w_arp, 0),
  ]

  const annualTotals = [
    'Total',
    equipe.reduce((s, i) => s + i.totalRdv, 0),
    equipe.reduce((s, i) => s + i.totalBesoins, 0),
    equipe.reduce((s, i) => s + i.totalAttenteClient, 0),
    equipe.reduce((s, i) => s + i.totalPrez, 0),
    equipe.reduce((s, i) => s + i.totalSignatures, 0),
    equipe.reduce((s, i) => s + i.totalDemarrages, 0),
  ]

  const barData = ranking.map(i => ({ name: i.nom.slice(0, 5), score: Math.round(i.score * 10) / 10 }))

  return (
    <div style={{ padding: '14px 16px' }}>

      {/* Sélecteur semaine */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <SectionTitle>Vue semaine</SectionTitle>
        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(parseInt(e.target.value))}
          style={{ fontSize: 12, padding: '4px 8px' }}
        >
          {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
            <option key={w} value={w}>S{w}</option>
          ))}
        </select>
      </div>

      <ScrollTable
        headers={['IA', 'RDV', 'Prez', 'Sign.', 'Fin M.', 'BSS', 'Att. Client', 'Att. Prez']}
        rows={equipe.map((ia, i) => {
          const [bg, fg] = AVATAR_COLORS[ia.colorIdx]
          return [
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, flexShrink: 0 }}>
                {ia.nom.slice(0, 2).toUpperCase()}
              </div>
              {ia.nom}
            </div>,
            ia.w_rdv, ia.w_prez, ia.w_sign, ia.w_fin, ia.w_bss, ia.w_arc, ia.w_arp
          ]
        })}
        totals={weekTotals}
      />

      {/* Cumul annuel */}
      <SectionTitle>Cumul annuel {annee}</SectionTitle>
      <ScrollTable
        headers={['IA', 'RDV', 'Besoins', 'Att. Client', 'Prez', 'Sign.', 'Démarr.']}
        rows={equipe.map(ia => {
          const [bg, fg] = AVATAR_COLORS[ia.colorIdx]
          return [
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, flexShrink: 0 }}>
                {ia.nom.slice(0, 2).toUpperCase()}
              </div>
              {ia.nom}
            </div>,
            ia.totalRdv, ia.totalBesoins, ia.totalAttenteClient,
            ia.totalPrez, ia.totalSignatures, ia.totalDemarrages
          ]
        })}
        totals={annualTotals}
      />

      {/* Ratios */}
      <SectionTitle>Statistiques & Ratios</SectionTitle>
      <ScrollTable
        headers={['IA', 'Bes./RDV', 'Prez/ARC', 'Sign./Prez', 'Obj. Sign.']}
        rows={equipe.map(ia => {
          const [bg, fg] = AVATAR_COLORS[ia.colorIdx]
          return [
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, flexShrink: 0 }}>
                {ia.nom.slice(0, 2).toUpperCase()}
              </div>
              {ia.nom}
            </div>,
            <Badge value={ia.ratioBesRdv} />,
            <Badge value={ia.ratioPrezArc} />,
            <Badge value={ia.ratioSignPrez} />,
            <Badge value={ia.ratioObj} good={ia.objGood} />,
          ]
        })}
      />

      {/* Classement pondéré */}
      <SectionTitle>Classement annuel pondéré</SectionTitle>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
        RDV=1pt · Prez=1.5pts · Sign.=2pts · Démarr.=3pts
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <ResponsiveContainer width="100%" height={equipe.length * 32 + 20}>
          <BarChart data={barData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#888780' }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#888780' }} width={40} />
            <Tooltip formatter={(v) => [v + ' pts', 'Score']} />
            <Bar dataKey="score" fill="#534AB7" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {ranking.map((ia, i) => (
        <div key={ia.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 14 }}>{i + 1}</span>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: AVATAR_COLORS[ia.colorIdx][0], color: AVATAR_COLORS[ia.colorIdx][1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
            {ia.nom.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ flex: 1, fontSize: 13 }}>{ia.nom}</span>
          <div style={{ flex: 2, height: 6, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length], width: `${Math.round((ia.score / (ranking[0]?.score || 1)) * 100)}%` }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, width: 40, textAlign: 'right', color: COLORS[i % COLORS.length] }}>{Math.round(ia.score * 10) / 10}pts</span>
        </div>
      ))}
    </div>
  )
}
