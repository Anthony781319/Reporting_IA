import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const METRICS = [
  { key: 'total_rdv',        label: 'Rendez-vous',      color: '#6D28D9', bg: '#EDE9FE' },
  { key: 'presentations',    label: 'Présentations',    color: '#1E40AF', bg: '#DBEAFE' },
  { key: 'signatures',       label: 'Signatures',       color: '#9D174D', bg: '#FCE7F3' },
  { key: 'demarrages',       label: 'Démarrages',       color: '#065F46', bg: '#D1FAE5' },
  { key: 'fins_de_mission',  label: 'Fins de mission',  color: '#92400E', bg: '#FEF3C7' },
]

const SEMESTRES = [
  { id: 1, label: '1er semestre', from: 1,  to: 26 },
  { id: 2, label: '2e semestre',  from: 27, to: 53 },
]

// exclut les comptes techniques de la table ia (mêmes règles que le reste de l'appli)
const isBM = (ia) => ia.nom !== 'Anthony' && ia.nom !== 'P1 of the week' && ia.nom !== 'RH' && ia.type !== 'cr' && ia.statut !== 'ancien'

const STORAGE_KEY = 'bilanEquipe_excludedIds'
const round1 = (n) => Math.round(n * 10) / 10

const loadExcluded = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
const saveExcluded = (ids) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {}
}

// ─────────────────────────────────────────────
// UI PIECES
// ─────────────────────────────────────────────
function MetricCard({ label, avg, total, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color, opacity: 0.75, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{avg}</div>
      <div style={{ fontSize: 11, color, opacity: 0.6 }}>moy. / BM · {total} total</div>
    </div>
  )
}

function MetricChart({ metric, rows, teamAvg }) {
  const data = rows.map(r => ({ nom: r.nom, valeur: r[metric.key] || 0 }))
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
        {metric.label}
        <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8, fontSize: 12 }}>
          moyenne équipe : {teamAvg}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
          <YAxis type="category" dataKey="nom" width={90} tick={{ fontSize: 12, fill: 'var(--color-text)' }} />
          <Tooltip formatter={(v) => [v, metric.label]} />
          <ReferenceLine x={teamAvg} stroke="#888" strokeDasharray="4 4" label={{ value: 'moy.', position: 'top', fontSize: 11, fill: '#888' }} />
          <Bar dataKey="valeur" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.valeur >= teamAvg ? metric.color : metric.color + '80'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MembreFilter({ allBms, excludedIds, onToggle, onResetAll }) {
  const [open, setOpen] = useState(false)
  const nbExclus = excludedIds.length

  return (
    <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 12, padding: '10px 14px', marginBottom: 20 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, padding: 0 }}>
        <span>
          <i className="ti ti-filter" aria-hidden="true" style={{ marginRight: 6 }}></i>
          Membres pris en compte
          {nbExclus > 0 && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 6 }}>({nbExclus} exclu{nbExclus > 1 ? 's' : ''})</span>}
        </span>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true"></i>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allBms.map(ia => {
              const excluded = excludedIds.includes(ia.id)
              return (
                <button key={ia.id} onClick={() => onToggle(ia.id)}
                  style={{
                    borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: excluded ? '1px solid var(--color-border)' : '1px solid transparent',
                    background: excluded ? 'transparent' : '#DBEAFE',
                    color: excluded ? 'var(--color-text-muted)' : '#1E40AF',
                    textDecoration: excluded ? 'line-through' : 'none',
                  }}>
                  {ia.nom}
                </button>
              )
            })}
          </div>
          {nbExclus > 0 && (
            <button onClick={onResetAll} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Tout réinclure
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function BilanEquipe() {
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [semestreId, setSemestreId] = useState(1)
  const [allBms, setAllBms] = useState([])
  const [saisies, setSaisies] = useState([])
  const [excludedIds, setExcludedIds] = useState(loadExcluded)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const semestre = SEMESTRES.find(s => s.id === semestreId)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    async function fetchData() {
      const [{ data: saisiesData, error: err1 }, { data: iaList, error: err2 }] = await Promise.all([
        supabase.from('saisies').select('*').eq('annee', annee).gte('semaine', semestre.from).lte('semaine', semestre.to),
        supabase.from('ia').select('*').order('nom'),
      ])

      if (!active) return
      if (err1 || err2) { setError((err1 || err2).message); setLoading(false); return }

      setAllBms((iaList || []).filter(isBM))
      setSaisies(saisiesData || [])
      setLoading(false)
    }

    fetchData()
    return () => { active = false }
  }, [annee, semestreId])

  const toggleExcluded = (id) => {
    setExcludedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      saveExcluded(next)
      return next
    })
  }
  const resetAll = () => { setExcludedIds([]); saveExcluded([]) }

  const activeBms = allBms.filter(ia => !excludedIds.includes(ia.id))

  const rows = activeBms.map(ia => {
    const mine = saisies.filter(s => s.ia_id === ia.id)
    const out = { id: ia.id, nom: ia.nom }
    METRICS.forEach(m => { out[m.key] = mine.reduce((sum, s) => sum + (s[m.key] || 0), 0) })
    return out
  }).sort((a, b) => a.nom.localeCompare(b.nom))

  const teamAverages = {}
  METRICS.forEach(m => {
    const total = rows.reduce((s, r) => s + (r[m.key] || 0), 0)
    teamAverages[m.key] = rows.length ? round1(total / rows.length) : 0
  })

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Bilan équipe</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            Comparatif des BM · {semestre.label} {annee}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={semestreId} onChange={e => setSemestreId(Number(e.target.value))}
            style={{ borderRadius: 8, padding: '6px 10px', fontSize: 13, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
            {SEMESTRES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(Number(e.target.value))}
            style={{ borderRadius: 8, padding: '6px 10px', fontSize: 13, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
            {[annee - 1, annee, annee + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {!loading && allBms.length > 0 && (
        <MembreFilter allBms={allBms} excludedIds={excludedIds} onToggle={toggleExcluded} onResetAll={resetAll} />
      )}

      {error && <div style={{ color: '#B91C1C', fontSize: 13, marginBottom: 12 }}>❌ {error}</div>}
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Aucune donnée sur cette période pour les membres sélectionnés.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
            {METRICS.map(m => (
              <MetricCard key={m.key} label={m.label} avg={teamAverages[m.key]}
                total={rows.reduce((s, r) => s + (r[m.key] || 0), 0)} color={m.color} bg={m.bg} />
            ))}
          </div>

          {METRICS.map(m => (
            <MetricChart key={m.key} metric={m} rows={rows} teamAvg={teamAverages[m.key]} />
          ))}
        </>
      )}
    </div>
  )
}
