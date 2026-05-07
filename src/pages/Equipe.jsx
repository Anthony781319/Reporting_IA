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

const Avatar = ({ nom, idx }) => {
  const [bg, fg] = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
      {nom.slice(0, 2).toUpperCase()}
    </div>
  )
}

const Badge = ({ value, good, neutral }) => {
  let color, bg
  if (neutral || value === '—') { color = '#888780'; bg = '#F1EFE8' }
  else if (good) { color = '#0F6E56'; bg = '#E1F5EE' }
  else { color = '#BA7517'; bg = '#FAEEDA' }
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {value}
    </span>
  )
}

const SectionHeader = ({ title, subtitle, color, icon }) => (
  <div style={{
    background: `${color}12`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '8px 8px 0 0',
    padding: '10px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{icon} {title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  </div>
)

const Table = ({ headers, rows, totals, accentColor }) => (
  <div style={{ overflowX: 'auto', border: `1px solid ${accentColor}25`, borderTop: 'none', borderRadius: '0 0 10px 10px', marginBottom: 20 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 480 }}>
      <thead>
        <tr style={{ background: `${accentColor}10` }}>
          {headers.map((h, i) => (
            <th key={i} style={{
              padding: '8px 10px',
              textAlign: i === 0 ? 'left' : 'center',
              color: accentColor,
              fontWeight: 600,
              fontSize: 11,
              whiteSpace: 'nowrap',
              borderBottom: `1px solid ${accentColor}25`
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? 'var(--color-background-primary)' : `${accentColor}05` }}>
            {row.map((cell, j) => (
              <td key={j} style={{
                padding: '9px 10px',
                textAlign: j === 0 ? 'left' : 'center',
                borderBottom: `0.5px solid ${accentColor}15`,
                color: 'var(--color-text-primary)',
                fontWeight: j === 0 ? 500 : 400
              }}>{cell}</td>
            ))}
          </tr>
        ))}
        {totals && (
          <tr style={{ background: `${accentColor}12`, fontWeight: 700, borderTop: `1.5px solid ${accentColor}30` }}>
            {totals.map((cell, j) => (
              <td key={j} style={{ padding: '9px 10px', textAlign: j === 0 ? 'left' : 'center', color: j === 0 ? 'var(--color-text-primary)' : accentColor }}>
                {cell}
              </td>
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

        const totalRdv = all.reduce((s, d) => s + (d.total_rdv || 0), 0)
        const totalBesoins = all.reduce((s, d) => s + (d.besoins_detectes || 0), 0)
        const totalAttenteClient = all.reduce((s, d) => s + (d.attente_retour || 0), 0)
        const totalPrez = all.reduce((s, d) => s + (d.presentations || 0), 0)
        const totalSignatures = all.reduce((s, d) => s + (d.signatures || 0), 0)
        const totalDemarrages = all.reduce((s, d) => s + (d.demarrages || 0), 0)
        const score = totalRdv * 1 + totalPrez * 1.5 + totalSignatures * 2 + totalDemarrages * 3

        return {
          ...i, colorIdx: idx % AVATAR_COLORS.length,
          w_rdv: week.total_rdv || 0,
          w_prez: week.presentations || 0,
          w_sign: week.signatures || 0,
          w_fin: week.fins_de_mission || 0,
          w_bss: week.besoins_sans_solution || 0,
          w_arc: week.attente_retour || 0,
          w_arp: week.attente_retour_prez || 0,
          totalRdv, totalBesoins, totalAttenteClient,
          totalPrez, totalSignatures, totalDemarrages, score,
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
  const barData = ranking.map(i => ({ name: i.nom.slice(0, 5), score: Math.round(i.score * 10) / 10 }))

  const nameCell = (ia) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar nom={ia.nom} idx={ia.colorIdx} />
      <span>{ia.nom}</span>
    </div>
  )

  return (
    <div style={{ padding: '14px 16px' }}>

      {/* Vue semaine */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Vue hebdomadaire</div>
        <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))} style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8 }}>
          {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
            <option key={w} value={w}>{w === semaine ? `S${w} (en cours)` : `Semaine ${w}`}</option>
          ))}
        </select>
      </div>

      <SectionHeader title="Activité commerciale & Pipe" color="#534AB7" icon="📊" subtitle={`Semaine ${selectedWeek} — ${annee}`} />
      <Table
        accentColor="#534AB7"
        headers={['IA', 'RDV', 'Prez', 'Sign.', 'Fin M.', 'BSS', 'Att. Client', 'Att. Prez']}
        rows={equipe.map(ia => [
          nameCell(ia),
          ia.w_rdv, ia.w_prez, ia.w_sign, ia.w_fin, ia.w_bss, ia.w_arc, ia.w_arp
        ])}
        totals={['Total',
          equipe.reduce((s, i) => s + i.w_rdv, 0),
          equipe.reduce((s, i) => s + i.w_prez, 0),
          equipe.reduce((s, i) => s + i.w_sign, 0),
          equipe.reduce((s, i) => s + i.w_fin, 0),
          equipe.reduce((s, i) => s + i.w_bss, 0),
          equipe.reduce((s, i) => s + i.w_arc, 0),
          equipe.reduce((s, i) => s + i.w_arp, 0),
        ]}
      />

      {/* Cumul annuel */}
      <SectionHeader title="Cumul annuel" color="#0F6E56" icon="📈" subtitle={`Depuis le début de l'année ${annee}`} />
      <Table
        accentColor="#0F6E56"
        headers={['IA', 'RDV', 'Besoins', 'Att. Client', 'Prez', 'Sign.', 'Démarr.']}
        rows={equipe.map(ia => [
          nameCell(ia),
          ia.totalRdv, ia.totalBesoins, ia.totalAttenteClient,
          ia.totalPrez, ia.totalSignatures, ia.totalDemarrages
        ])}
        totals={['Total',
          equipe.reduce((s, i) => s + i.totalRdv, 0),
          equipe.reduce((s, i) => s + i.totalBesoins, 0),
          equipe.reduce((s, i) => s + i.totalAttenteClient, 0),
          equipe.reduce((s, i) => s + i.totalPrez, 0),
          equipe.reduce((s, i) => s + i.totalSignatures, 0),
          equipe.reduce((s, i) => s + i.totalDemarrages, 0),
        ]}
      />

      {/* Ratios */}
      <SectionHeader title="Statistiques & Ratios" color="#BA7517" icon="🎯" subtitle="Besoins/RDV · Prez/ARC · Sign./Prez · Objectif" />
      <Table
        accentColor="#BA7517"
        headers={['IA', 'Bes./RDV', 'Prez/ARC', 'Sign./Prez', 'Obj. Sign. (20)']}
        rows={equipe.map(ia => [
          nameCell(ia),
          <Badge value={ia.ratioBesRdv} />,
          <Badge value={ia.ratioPrezArc} />,
          <Badge value={ia.ratioSignPrez} />,
          <Badge value={ia.ratioObj} good={ia.objGood} neutral={ia.ratioObj === '—'} />,
        ])}
      />

      {/* Classement pondéré */}
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
