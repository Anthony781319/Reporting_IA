import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const isValidP1 = p => p.profil?.trim() || p.description?.trim()

const P1_TAGS = [
  { key: 'experience',   icon: '📅' },
  { key: 'technologies', icon: '💻' },
  { key: 'salaire_max',  icon: '💰' },
  { key: 'langues',      icon: '🌍' },
  { key: 'lieu',         icon: '📍' },
]

const P1_COLORS = [
  { header: '#534AB7', light: '#EEEDFE' },
  { header: '#0F6E56', light: '#E1F5EE' },
  { header: '#BA7517', light: '#FAEEDA' },
  { header: '#993556', light: '#FBEAF0' },
  { header: '#185FA5', light: '#E6F1FB' },
  { header: '#3B6D11', light: '#EAF3DE' },
]

const P1Card = ({ p, index = 0, faded = false }) => {
  const c = faded
    ? { header: '#888780', light: '#F1EFE8' }
    : P1_COLORS[index % P1_COLORS.length]

  if (p.description && !p.profil) {
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${c.header}`, marginBottom: 8 }}>
        <div style={{ background: c.header, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.description}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${c.header}`, marginBottom: 8 }}>
      <div style={{ background: c.header, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎯</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.profil}</div>
          {p.client && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>🏢 {p.client}</div>}
        </div>
      </div>
      <div style={{ background: c.light, padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {P1_TAGS.map(({ key, icon }) => p[key] ? (
          <div key={key} style={{ background: c.header, color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
            {icon} {p[key]}
          </div>
        ) : null)}
      </div>
    </div>
  )
}

export default function P1Page() {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [selectedWeek, setSelectedWeek] = useState(semaine)
  const [p1Data, setP1Data] = useState([])
  const [prevP1Data, setPrevP1Data] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: p1 }, { data: prevP1 }] = await Promise.all([
        supabase.from('p1').select('*, ia(nom)').eq('semaine', selectedWeek - 1).eq('annee', annee),
        supabase.from('p1').select('*, ia(nom)').eq('semaine', selectedWeek - 2).eq('annee', annee),
      ])
      setP1Data((p1 || []).filter(isValidP1))
      setPrevP1Data((prevP1 || []).filter(isValidP1))
      setLoading(false)
    }
    load()
  }, [selectedWeek])

  const groupByIA = (data) => {
    const grouped = {}
    data.forEach(p => {
      const nom = p.ia?.nom || 'Inconnu'
      if (!grouped[nom]) grouped[nom] = []
      grouped[nom].push(p)
    })
    return grouped
  }

  const currentGrouped = groupByIA(p1Data)
  const prevGrouped = groupByIA(prevP1Data)
  const iaWithP1 = Object.keys(currentGrouped).sort()
  const iaWithPrevP1 = Object.keys(prevGrouped).sort()

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '14px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>🎯 P1 of the week</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>Priorités de recrutement</div>
        </div>
        <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))} style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8 }}>
          {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
            <option key={w} value={w}>{w === semaine ? `S${w} (en cours)` : `Semaine ${w}`}</option>
          ))}
        </select>
      </div>

      {/* P1 semaine en cours */}
      <div style={{ background: '#BA751712', borderLeft: '3px solid #BA7517', borderRadius: '8px 8px 0 0', padding: '10px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#BA7517' }}>📋 P1 de la semaine — Priorités S{selectedWeek - 1}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{p1Data.length} priorité{p1Data.length > 1 ? 's' : ''} active{p1Data.length > 1 ? 's' : ''}</div>
      </div>

      <div style={{ border: '1px solid #BA751725', borderTop: 'none', borderRadius: '0 0 10px 10px', marginBottom: 20, overflow: 'hidden' }}>
        {iaWithP1.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            Aucun P1 saisi pour cette semaine
          </div>
        ) : iaWithP1.map((nom, idx) => (
          <div key={nom} style={{ borderBottom: idx < iaWithP1.length - 1 ? '1px solid #f0eeea' : 'none' }}>
            <div style={{ padding: '10px 14px', background: '#FAEEDA', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#BA7517', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                {nom.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#633806' }}>{nom}</span>
              <span style={{ fontSize: 11, color: '#BA7517', marginLeft: 4 }}>{currentGrouped[nom].length} P1</span>
            </div>
            <div style={{ padding: '10px 14px', background: '#fff' }}>
              {currentGrouped[nom].map((p, index) => (
                <P1Card key={p.id} p={p} index={index} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* P1 semaine précédente */}
      {iaWithPrevP1.length > 0 && (
        <>
          <div style={{ background: '#88878012', borderLeft: '3px solid #888780', borderRadius: '8px 8px 0 0', padding: '10px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#888780' }}>🕐 P1 semaine précédente — S{selectedWeek - 2}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{prevP1Data.length} priorité{prevP1Data.length > 1 ? 's' : ''}</div>
          </div>
          <div style={{ border: '1px solid #88878025', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
            {iaWithPrevP1.map((nom, idx) => (
              <div key={nom} style={{ borderBottom: idx < iaWithPrevP1.length - 1 ? '1px solid #f0eeea' : 'none' }}>
                <div style={{ padding: '10px 14px', background: '#f5f4f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#888780', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                    {nom.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#444441' }}>{nom}</span>
                  <span style={{ fontSize: 11, color: '#888780', marginLeft: 4 }}>{prevGrouped[nom].length} P1</span>
                </div>
                <div style={{ padding: '10px 14px', background: '#fff' }}>
                  {prevGrouped[nom].map((p, index) => (
                    <P1Card key={p.id} p={p} index={index} faded />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
