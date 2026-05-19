import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const isValidP1 = p => p.profil?.trim() || p.description?.trim()

const P1Card = ({ p, faded = false }) => {
  const border = faded ? '#B4B2A9' : '#534AB7'
  const header = faded ? '#888780' : '#534AB7'
  const tileBg = faded ? '#F5F5F4' : '#F5F4FD'
  const tileLabel = faded ? '#B4B2A9' : '#7F77DD'
  const tileValue = faded ? '#888780' : '#3C3489'
  const titleColor = faded ? '#444441' : '#26215C'

  if (p.description && !p.profil) {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${border}`, marginBottom: 10 }}>
        <div style={{ background: header, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.description}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${border}`, marginBottom: 10 }}>
      <div style={{ padding: '12px 14px', background: '#fff', borderBottom: `1px solid ${border}20` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: titleColor, marginBottom: 3 }}>{p.profil}</div>
        {p.client && <div style={{ fontSize: 12, color: header, fontWeight: 600 }}>🏢 {p.client}</div>}
      </div>
      <div style={{ padding: '10px 12px', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {p.experience && (
          <div style={{ background: tileBg, borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ fontSize: 10, color: tileLabel, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📅 Expérience</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tileValue, marginTop: 2 }}>{p.experience}</div>
          </div>
        )}
        {p.salaire_max && (
          <div style={{ background: tileBg, borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ fontSize: 10, color: tileLabel, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💰 Salaire max</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tileValue, marginTop: 2 }}>{p.salaire_max}</div>
          </div>
        )}
        {p.technologies && (
          <div style={{ background: tileBg, borderRadius: 8, padding: '7px 10px', gridColumn: 'span 2' }}>
            <div style={{ fontSize: 10, color: tileLabel, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💻 Technologies</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tileValue, marginTop: 2 }}>{p.technologies}</div>
          </div>
        )}
        {p.langues && (
          <div style={{ background: tileBg, borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ fontSize: 10, color: tileLabel, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🌍 Langues</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tileValue, marginTop: 2 }}>{p.langues}</div>
          </div>
        )}
        {p.lieu && (
          <div style={{ background: tileBg, borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ fontSize: 10, color: tileLabel, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📍 Lieu</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tileValue, marginTop: 2 }}>{p.lieu}</div>
          </div>
        )}
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>🎯 P1 of the week</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>Priorités de recrutement</div>
        </div>
        <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))} style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8 }}>
          {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
            <option key={w} value={w}>{w === semaine ? `S${w} (en cours)` : `Semaine ${w}`}</option>
          ))}
        </select>
      </div>

      <div style={{ background: '#534AB712', borderLeft: '3px solid #534AB7', borderRadius: '8px 8px 0 0', padding: '12px 16px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#534AB7' }}>📋 P1 de la semaine — S{selectedWeek - 1}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>{p1Data.length} priorité{p1Data.length > 1 ? 's' : ''} active{p1Data.length > 1 ? 's' : ''}</div>
      </div>

      <div style={{ border: '1px solid #534AB725', borderTop: 'none', borderRadius: '0 0 10px 10px', marginBottom: 24, overflow: 'hidden' }}>
        {iaWithP1.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Aucun P1 saisi pour cette semaine</div>
        ) : iaWithP1.map((nom, idx) => (
          <div key={nom} style={{ borderBottom: idx < iaWithP1.length - 1 ? '1px solid #534AB715' : 'none' }}>
            <div style={{ padding: '12px 16px', background: '#534AB7', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {nom.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{nom}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{currentGrouped[nom].length} P1</div>
              </div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--color-background-primary)' }}>
              {currentGrouped[nom].map(p => <P1Card key={p.id} p={p} />)}
            </div>
          </div>
        ))}
      </div>

      {iaWithPrevP1.length > 0 && (
        <>
          <div style={{ background: '#88878012', borderLeft: '3px solid #888780', borderRadius: '8px 8px 0 0', padding: '12px 16px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#888780' }}>🕐 P1 semaine précédente — S{selectedWeek - 2}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>{prevP1Data.length} priorité{prevP1Data.length > 1 ? 's' : ''}</div>
          </div>
          <div style={{ border: '1px solid #88878025', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
            {iaWithPrevP1.map((nom, idx) => (
              <div key={nom} style={{ borderBottom: idx < iaWithPrevP1.length - 1 ? '1px solid #f0eeea' : 'none' }}>
                <div style={{ padding: '12px 16px', background: '#888780', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{nom}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{prevGrouped[nom].length} P1</div>
                  </div>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--color-background-primary)' }}>
                  {prevGrouped[nom].map(p => <P1Card key={p.id} p={p} faded />)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
