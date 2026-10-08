import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─────────────────────────────────────────────
// Barème de points — séance de prospection du lundi
// ─────────────────────────────────────────────
const WEIGHTS = { decouverte: 2, presentation: 1.5, prospect: 1, client: 0.5 }
const OBJET_LABELS = { decouverte: 'Découverte', presentation: 'Présentation', prospect: 'Prospect', client: 'Client' }
const OBJET_COLORS = { decouverte: '#0F6E56', presentation: '#993556', prospect: '#534AB7', client: '#BA7517' }
const OBJET_ORDER = ['decouverte', 'presentation', 'prospect', 'client']

const SESSION_START_HOUR = 16
const SESSION_END_HOUR = 18

function getSessionWindow(now) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), SESSION_START_HOUR, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), SESSION_END_HOUR, 0, 0, 0)
  const isMonday = now.getDay() === 1
  let state = 'none'
  if (isMonday) state = now < start ? 'before' : now > end ? 'after' : 'live'
  return { start, end, isMonday, state }
}

function formatDuration(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return `${h}h${m.toString().padStart(2, '0')}`
}

function computeRanking(rows, iaList) {
  const byIa = {}
  for (const ia of iaList) {
    byIa[ia.id] = { ia_id: ia.id, nom: ia.nom || '—', points: 0, counts: { decouverte: 0, presentation: 0, prospect: 0, client: 0 } }
  }
  for (const r of (rows || [])) {
    if (!r || !r.ia_id) continue
    if (!byIa[r.ia_id]) byIa[r.ia_id] = { ia_id: r.ia_id, nom: r.ia?.nom || '—', points: 0, counts: { decouverte: 0, presentation: 0, prospect: 0, client: 0 } }
    const entry = byIa[r.ia_id]
    const w = WEIGHTS[r.objet_meeting] || 0
    entry.points += w
    if (entry.counts[r.objet_meeting] !== undefined) entry.counts[r.objet_meeting] += 1
  }
  return Object.values(byIa).sort((a, b) => b.points - a.points)
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Classement() {
  const [rows, setRows] = useState([])
  const [iaList, setIaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())
  const channelRef = useRef(null)

  const { start, end, state } = getSessionWindow(now)

  const load = async () => {
    try {
      const win = getSessionWindow(new Date())
      const [rdvRes, iaRes] = await Promise.all([
        supabase.from('rdv_programmes').select('*, ia(nom)').gte('created_at', win.start.toISOString()).lte('created_at', win.end.toISOString()),
        supabase.from('ia').select('*').order('nom'),
      ])
      if (rdvRes.error || iaRes.error) {
        setError((rdvRes.error || iaRes.error)?.message || "Erreur de chargement.")
      } else {
        setError('')
      }
      setRows(rdvRes.data || [])
      setIaList((iaRes.data || []).filter(i =>
        i && i.statut !== 'ancien' && i.type !== 'cr' && i.nom !== 'Anthony' && i.nom !== 'RH' &&
        !String(i.nom || '').toLowerCase().includes('p1')
      ))
    } catch (e) {
      setError(e?.message || "Erreur inattendue au chargement du classement.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    let channel = null
    try {
      channel = supabase
        .channel('classement-prospection')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv_programmes' }, () => { load() })
        .subscribe()
      channelRef.current = channel
    } catch (e) {
      // Le temps réel est un plus ; une app qui ne le supporte pas doit quand même afficher le classement.
    }
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(t)
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 28 }}>⏳</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Chargement du classement...</div>
    </div>
  )

  const ranking = computeRanking(rows, iaList)
  const maxPoints = Math.max(1, ranking[0]?.points || 0)

  const banner = (() => {
    if (state === 'none') return { bg: '#F3F4F6', border: '#E5E7EB', color: '#4B5563', icon: '📅', text: "Pas de séance de prospection aujourd'hui — rendez-vous chaque lundi entre 16h et 18h." }
    if (state === 'before') return { bg: '#FEF3C7', border: '#FDE68A', color: '#92400E', icon: '⏳', text: `La séance démarre dans ${formatDuration(start - now)} (16h00).` }
    if (state === 'live') return { bg: '#DCFCE7', border: '#BBF7D0', color: '#065F46', icon: '🔴', text: `EN DIRECT — fin de la séance dans ${formatDuration(end - now)}.`, live: true }
    return { bg: '#E0E7FF', border: '#C7D2FE', color: '#3730A3', icon: '✅', text: 'Séance terminée — résultat final du jour.' }
  })()

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>🏆</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)' }}>Classement Prospection</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Séance du lundi, 16h – 18h</div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12, marginBottom: 14 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
        background: banner.bg, border: `1px solid ${banner.border}`, color: banner.color,
        fontSize: 13, fontWeight: 600, marginBottom: 18,
      }}>
        <span style={banner.live ? { animation: 'classement-pulse 1.4s infinite' } : undefined}>{banner.icon}</span>
        {banner.text}
      </div>
      {banner.live && (
        <style>{`@keyframes classement-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
      )}

      {ranking.length === 0 ? (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', padding: '30px 0', fontStyle: 'italic' }}>
          Aucun BM actif trouvé.
        </div>
      ) : ranking.every(r => r.points === 0) ? (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', padding: '30px 0' }}>
          Aucun RDV saisi pour l'instant — à vos téléphones ! 💪
        </div>
      ) : null}

      {ranking.map((r, i) => (
        <div key={r.ia_id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12,
          background: i === 0 ? 'linear-gradient(135deg,#FEF9C3,#FEF3C7)' : 'var(--color-bg-secondary)',
          border: i === 0 ? '1px solid #FDE68A' : '1px solid var(--color-border)',
          marginBottom: 8,
        }}>
          <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 20 : 13, fontWeight: 700, color: 'var(--color-text-muted)', flexShrink: 0 }}>
            {MEDALS[i] || i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{r.nom}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {OBJET_ORDER.filter(k => r.counts[k] > 0).map(k => (
                <span key={k} style={{ fontSize: 10, fontWeight: 700, color: OBJET_COLORS[k], background: OBJET_COLORS[k] + '18', borderRadius: 5, padding: '1px 6px' }}>
                  {OBJET_LABELS[k]} · {r.counts[k]}
                </span>
              ))}
            </div>
            <div style={{ height: 4, background: '#00000010', borderRadius: 3, marginTop: 7, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--purple)', width: Math.round((r.points / maxPoints) * 100) + '%' }} />
            </div>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--purple)', flexShrink: 0, minWidth: 54, textAlign: 'right' }}>
            {r.points % 1 === 0 ? r.points : r.points.toFixed(1)} pts
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', opacity: 0.75, marginTop: 20 }}>
        Barème : Découverte 2 pts · Présentation 1,5 pt · Prospect 1 pt · Client 0,5 pt
      </div>
    </div>
  )
}
