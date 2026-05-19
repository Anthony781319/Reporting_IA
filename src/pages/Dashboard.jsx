import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const COLORS = ['#534AB7','#0F6E56','#BA7517','#993556','#888780','#185FA5','#3B6D11','#D85A30']

const AVATAR_COLORS = [
  ['#EEEDFE','#3C3489'],['#E1F5EE','#085041'],['#FAEEDA','#633806'],
  ['#FBEAF0','#72243E'],['#F1EFE8','#444441'],['#E6F1FB','#0C447C'],
]

const Trend = ({ current, previous }) => {
  if (previous === undefined || previous === null) return null
  const diff = current - previous
  if (diff === 0) return <span style={{ fontSize: 11, color: '#888780' }}>—</span>
  const up = diff > 0
  return <span style={{ fontSize: 11, fontWeight: 500, color: up ? '#0F6E56' : '#A32D2D' }}>{up ? '↑' : '↓'} {up ? '+' : ''}{diff}</span>
}

const KpiTile = ({ label, value, color, previous }) => (
  <div style={{ background: 'var(--color-background-primary)', borderRadius: 10, border: '0.5px solid var(--color-border-tertiary)', padding: '12px 14px' }}>
    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 4 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {previous !== undefined && <div style={{ paddingBottom: 2 }}><Trend current={value} previous={previous} /></div>}
    </div>
    {previous !== undefined && <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 3 }}>Préc. : {previous}</div>}
  </div>
)

const isValidP1 = p => p.profil?.trim() || p.description?.trim()

const P1Card = ({ p }) => {
  if (p.description && !p.profil) {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #534AB7', marginBottom: 10 }}>
        <div style={{ background: '#534AB7', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.description}</span>
        </div>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #534AB7', marginBottom: 10 }}>
      <div style={{ padding: '12px 14px', background: '#fff', borderBottom: '1px solid #534AB720' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#26215C', marginBottom: 3 }}>{p.profil}</div>
        {p.client && <div style={{ fontSize: 12, color: '#534AB7', fontWeight: 600 }}>🏢 {p.client}</div>}
      </div>
      <div style={{ padding: '10px 12px', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {p.experience && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📅 Expérience</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.experience}</div></div>}
        {p.salaire_max && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💰 Salaire max</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.salaire_max}</div></div>}
        {p.technologies && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px', gridColumn: 'span 2' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💻 Technologies</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.technologies}</div></div>}
        {p.langues && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🌍 Langues</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.langues}</div></div>}
        {p.lieu && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📍 Lieu</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.lieu}</div></div>}
      </div>
    </div>
  )
}

const SectionTitle = ({ title, subtitle }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</div>
    {subtitle && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{subtitle}</div>}
  </div>
)

const Card = ({ children, style = {} }) => (
  <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)', padding: 14, marginBottom: 14, ...style }}>
    {children}
  </div>
)

function VueEquipe({ saisies, selectedWeek, semaine, annee, p1Data }) {
  const weekData = saisies.filter(s => s.semaine === selectedWeek)
  const prevData = saisies.filter(s => s.semaine === selectedWeek - 1)
  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)
  const p = (key) => selectedWeek > 1 ? sum(prevData, key) : undefined

  const weekTrend = Array.from({ length: 6 }, (_, i) => {
    const w = selectedWeek - 5 + i
    const ws = saisies.filter(s => s.semaine === w)
    return { name: `S${w}`, RDV: ws.reduce((s, d) => s + (d.total_rdv || 0), 0), Présentations: ws.reduce((s, d) => s + (d.presentations || 0), 0), Signatures: ws.reduce((s, d) => s + (d.signatures || 0), 0) }
  })

  const ranking = [...weekData].map(d => ({ name: d.ia?.nom || '?', score: (d.total_rdv||0)*1 + (d.presentations||0)*2 + (d.signatures||0)*3 })).filter(d => d.score > 0).sort((a,b) => b.score - a.score).slice(0, 6)
  const validP1 = p1Data.filter(p => p.semaine === selectedWeek && isValidP1(p))

  return (
    <>
      {/* Header sombre */}
      <div style={{ background: '#26215C', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Vue d'ensemble</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Semaine {selectedWeek} · {new Date().getFullYear()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          {[
            { label: 'RDV', value: sum(weekData, 'total_rdv'), prev: p('total_rdv') },
            { label: 'Signatures', value: sum(weekData, 'signatures'), prev: p('signatures') },
            { label: 'Démarrages', value: sum(weekData, 'demarrages'), prev: p('demarrages') },
          ].map((item, i) => (
            <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#AFA9EC', lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{item.label}</div>
              {item.prev !== undefined && (
                <div style={{ fontSize: 10, marginTop: 3 }}>
                  <Trend current={item.value} previous={item.prev} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs secondaires */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
        <KpiTile label="Présentations"      value={sum(weekData,'presentations')}        color="#185FA5" previous={p('presentations')} />
        <KpiTile label="Solutions envoyées" value={sum(weekData,'cv_envoyes')}           color="#BA7517" previous={p('cv_envoyes')} />
        <KpiTile label="Besoins détectés"   value={sum(weekData,'besoins_detectes')}     color="#D85A30" previous={p('besoins_detectes')} />
        <KpiTile label="Fins de mission"    value={sum(weekData,'fins_de_mission')}      color="#993556" previous={p('fins_de_mission')} />
        <KpiTile label="Pipe total"         value={sum(weekData,'besoins_sans_solution')+sum(weekData,'attente_retour')+sum(weekData,'attente_retour_prez')} color="#3B6D11" previous={selectedWeek > 1 ? sum(prevData,'besoins_sans_solution')+sum(prevData,'attente_retour')+sum(prevData,'attente_retour_prez') : undefined} />
        <KpiTile label="Prés. à monter"    value={sum(weekData,'presentations_a_monter')} color="#888780" previous={p('presentations_a_monter')} />
        <KpiTile label="P1 actifs"         value={validP1.length} color="#7F77DD" previous={p1Data.filter(p => p.semaine===selectedWeek-1 && isValidP1(p)).length} />
        <KpiTile label="RDV Candidats"     value={sum(weekData,'rdv_candidats')} color="#534AB7" previous={p('rdv_candidats')} />
      </div>

      {/* Graphique activité */}
      <Card>
        <SectionTitle title="📈 Activité commerciale" subtitle={`6 semaines autour de S${selectedWeek}`} />
        <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          {[['#534AB7','RDV'],['#185FA5','Présentations'],['#993556','Signatures']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }}></div>{l}
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={140}>
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
      </Card>

      {/* Classement */}
      <Card>
        <SectionTitle title={`🏆 Classement S${selectedWeek}`} subtitle="1 RDV=1pt · 1 Prez=2pts · 1 Sign.=3pts" />
        {ranking.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13, padding: '12px 0' }}>Aucune saisie cette semaine</div>
        ) : ranking.map((r, i) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', marginBottom: 6, background: i % 2 === 0 ? 'var(--color-background-secondary)' : 'var(--color-background-primary)', borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, width: 24, textAlign: 'center' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: AVATAR_COLORS[i%AVATAR_COLORS.length][0], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: AVATAR_COLORS[i%AVATAR_COLORS.length][1], flexShrink: 0 }}>{r.name.slice(0,2).toUpperCase()}</div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: i < 3 ? 600 : 400 }}>{r.name}</span>
            <div style={{ flex: 2, height: 5, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: COLORS[i%COLORS.length], width: `${Math.round((r.score/(ranking[0]?.score||1))*100)}%` }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, width: 40, textAlign: 'right', color: COLORS[i%COLORS.length] }}>{r.score}pts</span>
          </div>
        ))}
      </Card>

      {/* État du pipe */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <SectionTitle title="🎯 État du pipe" subtitle={`Photo de la semaine ${selectedWeek}`} />
        </div>
        {[
          { label: 'Besoins sans solution',           key: 'besoins_sans_solution', color: '#534AB7', icon: '🔍' },
          { label: 'En attente réponse client',       key: 'attente_retour',        color: '#BA7517', icon: '⏳' },
          { label: 'Présentations en attente retour', key: 'attente_retour_prez',   color: '#993556', icon: '📋' },
        ].map((item, idx) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: idx < 2 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
            <span style={{ fontSize: 20, marginRight: 12 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{sum(weekData, item.key)}</div>
                {selectedWeek > 1 && <Trend current={sum(weekData, item.key)} previous={sum(prevData, item.key)} />}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* P1 */}
      {validP1.length > 0 && (
        <Card>
          <SectionTitle title={`🎯 Priorités P1 — S${selectedWeek}`} subtitle={`${validP1.length} priorité(s) active(s)`} />
          {Object.entries(
            validP1.reduce((acc, p) => {
              const nom = p.ia?.nom || '?'
              if (!acc[nom]) acc[nom] = []
              acc[nom].push(p)
              return acc
            }, {})
          ).map(([nom, ps]) => (
            <div key={nom} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#534AB7', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{nom.slice(0,2).toUpperCase()}</div>
                {nom}
              </div>
              {ps.map(p => <P1Card key={p.id} p={p} />)}
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

function VueFocusIA({ saisies, iaList, selectedWeek, semaine }) {
  const [selectedIa, setSelectedIa] = useState(null)
  const iaData = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === selectedWeek) : []
  const iaPrev = selectedIa ? saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === selectedWeek - 1) : []
  const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)

  const iaTrend = selectedIa ? Array.from({ length: 6 }, (_, i) => {
    const w = selectedWeek - 5 + i
    const ws = saisies.filter(s => s.ia_id === selectedIa.id && s.semaine === w)
    return { name: `S${w}`, RDV: ws.reduce((s,d) => s+(d.total_rdv||0),0), Signatures: ws.reduce((s,d) => s+(d.signatures||0),0) }
  }) : []

  const p = (key) => selectedWeek > 1 ? sum(iaPrev, key) : undefined

  return (
    <>
      <Card>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10, fontWeight: 500 }}>Sélectionne un ingénieur d'affaires</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
          {iaList.map((ia, i) => {
            const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const isSelected = selectedIa?.id === ia.id
            return (
              <div key={ia.id} onClick={() => setSelectedIa(ia)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: isSelected ? '2px solid #534AB7' : '0.5px solid var(--color-border-tertiary)', background: isSelected ? '#EEEDFE' : 'transparent', transition: 'all 0.15s' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, flexShrink: 0 }}>{ia.nom.slice(0,2).toUpperCase()}</div>
                <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#3C3489' : 'var(--color-text-primary)' }}>{ia.nom}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {!selectedIa ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13, padding: '32px 0' }}>👆 Sélectionne un IA pour voir son détail</div>
      ) : (
        <>
          {/* Header sombre Focus IA */}
          <div style={{ background: '#26215C', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 14 }}>{selectedIa.nom} — S{selectedWeek}</div>
            <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              {[
                { label: 'RDV', value: sum(iaData,'total_rdv'), prev: p('total_rdv') },
                { label: 'Signatures', value: sum(iaData,'signatures'), prev: p('signatures') },
                { label: 'Démarrages', value: sum(iaData,'demarrages'), prev: p('demarrages') },
              ].map((item, i) => (
                <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#AFA9EC', lineHeight: 1 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{item.label}</div>
                  {item.prev !== undefined && <div style={{ fontSize: 10, marginTop: 3 }}><Trend current={item.value} previous={item.prev} /></div>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
            <KpiTile label="Présentations"      value={sum(iaData,'presentations')}  color="#185FA5" previous={p('presentations')} />
            <KpiTile label="Solutions envoyées" value={sum(iaData,'cv_envoyes')}     color="#BA7517" previous={p('cv_envoyes')} />
            <KpiTile label="Besoins détectés"   value={sum(iaData,'besoins_detectes')} color="#D85A30" previous={p('besoins_detectes')} />
            <KpiTile label="Pipe total"         value={sum(iaData,'besoins_sans_solution')+sum(iaData,'attente_retour')+sum(iaData,'attente_retour_prez')} color="#3B6D11" previous={selectedWeek>1?sum(iaPrev,'besoins_sans_solution')+sum(iaPrev,'attente_retour')+sum(iaPrev,'attente_retour_prez'):undefined} />
          </div>

          <Card>
            <SectionTitle title="📈 Évolution RDV & Signatures" subtitle="6 dernières semaines" />
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={iaTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888780' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888780' }} />
                <Tooltip />
                <Line type="monotone" dataKey="RDV" stroke="#534AB7" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Signatures" stroke="#993556" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="2 2" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <SectionTitle title="🎯 État du pipe" subtitle={`Photo de la semaine ${selectedWeek}`} />
            </div>
            {[
              { label: 'Besoins sans solution',           key: 'besoins_sans_solution', color: '#534AB7', icon: '🔍' },
              { label: 'En attente réponse client',       key: 'attente_retour',        color: '#BA7517', icon: '⏳' },
              { label: 'Présentations en attente retour', key: 'attente_retour_prez',   color: '#993556', icon: '📋' },
            ].map((item, idx) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: idx < 2 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                <span style={{ fontSize: 20, marginRight: 12 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{sum(iaData, item.key)}</div>
                    {selectedWeek > 1 && <Trend current={sum(iaData,item.key)} previous={sum(iaPrev,item.key)} />}
                  </div>
                </div>
              </div>
            ))}
          </Card>
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
      setIaList((ia || []).filter(i => i.nom !== 'Anthony' && i.nom !== 'P1 of the week' && i.nom !== 'RH'))
      setP1Data(p1 || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 16px' }}>
      {/* Sélecteur semaine */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14, gap: 8 }}>
        <button onClick={() => setSelectedWeek(w => Math.max(1, w - 1))} style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>‹</button>
        <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, fontWeight: 500 }}>
          {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
            <option key={w} value={w}>{w === semaine ? `S${w} (en cours)` : `Semaine ${w}`}</option>
          ))}
        </select>
        <button onClick={() => setSelectedWeek(w => Math.min(semaine, w + 1))} disabled={selectedWeek === semaine} style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, padding: '4px 10px', cursor: selectedWeek === semaine ? 'default' : 'pointer', fontSize: 14, opacity: selectedWeek === semaine ? 0.4 : 1 }}>›</button>
      </div>

      {/* Toggle Équipe / Focus IA */}
      <div style={{ display: 'flex', background: 'var(--color-background-secondary)', borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {[['equipe', '👥 Équipe'], ['focus', '👤 Focus IA']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: view === id ? 600 : 400, background: view === id ? '#26215C' : 'transparent', color: view === id ? '#AFA9EC' : 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'equipe' ? (
        <VueEquipe saisies={saisies} selectedWeek={selectedWeek} semaine={semaine} annee={annee} p1Data={p1Data} />
      ) : (
        <VueFocusIA saisies={saisies} iaList={iaList} selectedWeek={selectedWeek} semaine={semaine} />
      )}
    </div>
  )
}
