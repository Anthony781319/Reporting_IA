import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CR_LIST = ['Younes', 'Soundous', 'Zayneb', 'Shaymae', 'Soukaina']

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7)
}

export default function DashboardRH() {
  const annee = new Date().getFullYear()
  const [semaine, setSemaine] = useState(currentWeek())
  const [reportings, setReportings] = useState({})
  const [rdvs, setRdvs] = useState({})
  const [pres, setPres] = useState({})
  const [sigs, setSigs] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: rep }, { data: rdv }, { data: pr }, { data: sig }] = await Promise.all([
        supabase.from('cr_reporting').select('*').eq('semaine', semaine).eq('annee', annee),
        supabase.from('cr_rendez_vous').select('*').eq('semaine', semaine).eq('annee', annee),
        supabase.from('cr_presentations').select('*').eq('semaine', semaine).eq('annee', annee),
        supabase.from('cr_signatures').select('*').eq('semaine', semaine).eq('annee', annee),
      ])

      const repMap = {}
      CR_LIST.forEach(cr => {
        const found = (rep || []).find(r => r.cr_nom === cr)
        repMap[cr] = found || { nb_entretiens: 0, nb_candidats_valides: 0, nb_cv_envoyes: 0, nb_presentations: 0, nb_signatures: 0 }
      })
      setReportings(repMap)

      const rdvMap = {}
      const presMap = {}
      const sigMap = {}
      CR_LIST.forEach(cr => {
        rdvMap[cr] = (rdv || []).filter(r => r.cr_nom === cr)
        presMap[cr] = (pr || []).filter(p => p.cr_nom === cr)
        sigMap[cr] = (sig || []).filter(s => s.cr_nom === cr)
      })
      setRdvs(rdvMap)
      setPres(presMap)
      setSigs(sigMap)
      setLoading(false)
    }
    load()
  }, [semaine, annee])

  const total = (key) => CR_LIST.reduce((acc, cr) => acc + (reportings[cr]?.[key] || 0), 0)

  const kpis = [
    { label: 'Entretiens', key: 'nb_entretiens', color: '#534AB7', bg: '#EEEDFE' },
    { label: 'Candidats validés', key: 'nb_candidats_valides', color: '#085041', bg: '#E1F5EE' },
    { label: 'CV envoyés', key: 'nb_cv_envoyes', color: '#0C447C', bg: '#E6F1FB' },
    { label: 'Présentations', key: 'nb_presentations', color: '#633806', bg: '#FAEEDA' },
    { label: 'Signatures', key: 'nb_signatures', color: '#72243E', bg: '#FBEAF0' },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📊 Dashboard Recrutement</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{annee}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSemaine(s => Math.max(1, s - 1))} style={btnNav}>←</button>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 80, textAlign: 'center' }}>Semaine {semaine}</span>
          <button onClick={() => setSemaine(s => Math.min(52, s + 1))} style={btnNav}>→</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>Chargement...</div>
      ) : (
        <>
          <div style={sectionBox}>
            <div style={sectionTitle}>🏆 Total équipe</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {kpis.map(k => (
                <div key={k.key} style={{ background: k.bg, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{total(k.key)}</div>
                  <div style={{ fontSize: 11, color: k.color, marginTop: 4, fontWeight: 500 }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={sectionTitle2}>👤 Par chargé(e) de recrutement</div>

          {CR_LIST.map(cr => {
            const rep = reportings[cr] || {}
            const isOpen = expanded === cr
            return (
              <div key={cr} style={{ ...sectionBox, marginBottom: 12 }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>
                      {cr.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{cr}</span>
                  </div>
                  <button onClick={() => setExpanded(isOpen ? null : cr)} style={{ ...btnNav, fontSize: 12, padding: '6px 12px', borderRadius: 8 }}>
                    {isOpen ? '▲ Réduire' : '▼ Détail'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: isOpen ? 20 : 0 }}>
                  {kpis.map(k => (
                    <div key={k.key} style={{ background: k.bg, borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{rep[k.key] || 0}</div>
                      <div style={{ fontSize: 10, color: k.color, marginTop: 3, fontWeight: 500 }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {isOpen && (
                  <div>
                    <DetailSection title="📅 Rendez-vous" empty={!rdvs[cr] || rdvs[cr].length === 0}>
                      {(rdvs[cr] || []).map(r => (
                        <div key={r.id} style={detailCard}>
                          <div style={detailRow}>
                            <b>{r.identite_candidat}</b>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.profil}</span>
                          </div>
                          <div style={detailRow}>
                            <span style={{ ...pill, background: r.valide ? '#E1F5EE' : '#FCEBEB', color: r.valide ? '#085041' : '#A32D2D' }}>
                              {r.valide ? '✅ Validé' : '❌ Non validé'}
                            </span>
                            {r.positionne_sur_besoins && (
                              <span style={pill}>📌 {r.positionne_sur_besoins}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </DetailSection>

                    <DetailSection title="📋 Présentations" empty={!pres[cr] || pres[cr].length === 0}>
                      {(pres[cr] || []).map(p => (
                        <div key={p.id} style={detailCard}>
                          <div style={detailRow}>
                            <b>{p.identite_candidat}</b>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.profil}</span>
                          </div>
                          <div style={detailRow}>
                            {p.date_presentation && <span style={pill}>📅 {p.date_presentation}</span>}
                            {p.ia_concerne && <span style={pill}>👤 {p.ia_concerne}</span>}
                          </div>
                        </div>
                      ))}
                    </DetailSection>

                    <DetailSection title="✍️ Signatures" empty={!sigs[cr] || sigs[cr].length === 0}>
                      {(sigs[cr] || []).map(s => (
                        <div key={s.id} style={detailCard}>
                          <div style={detailRow}>
                            <b>{s.identite_candidat}</b>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.profil}</span>
                          </div>
                          <div style={detailRow}>
                            {s.salaire_envisage && <span style={pill}>💰 {s.salaire_envisage}</span>}
                            {s.date_signature && <span style={pill}>📅 {s.date_signature}</span>}
                          </div>
                        </div>
                      ))}
                    </DetailSection>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function DetailSection({ title, children, empty }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>{title}</div>
      {empty
        ? <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>Aucune entrée cette semaine</div>
        : children
      }
    </div>
  )
}

const sectionBox = { background: 'var(--color-background-primary)', borderRadius: 14, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const sectionTitle = { fontSize: 14, fontWeight: 600, marginBottom: 14 }
const sectionTitle2 = { fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-secondary)' }
const detailCard = { background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, fontSize: 13 }
const detailRow = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }
const pill = { border: '1px solid var(--color-border-tertiary)', borderRadius: 6, padding: '2px 8px', fontSize: 11 }
const btnNav = { padding: '8px 14px', background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, cursor: 'pointer', fontSize: 14 }
