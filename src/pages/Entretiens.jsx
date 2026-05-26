import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const NOTATION_RDV = ['insuffisant', 'moyen', 'bon']
const NOTATION_SIGN = ['RAS', 'bon', 'excellent']

const AVATAR_COLORS = [
  { bg: '#EDE9FE', color: '#6D28D9' },
  { bg: '#D1FAE5', color: '#065F46' },
  { bg: '#FEF3C7', color: '#92400E' },
  { bg: '#FCE7F3', color: '#9D174D' },
  { bg: '#DBEAFE', color: '#1E40AF' },
  { bg: '#DCFCE7', color: '#166534' },
  { bg: '#F3F4F6', color: '#374151' },
  { bg: '#FFE4E6', color: '#9F1239' },
  { bg: '#E0F2FE', color: '#0369A1' },
  { bg: '#FEF9C3', color: '#854D0E' },
]

const getColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length]

const badgeNotation = (val) => {
  if (!val) return null
  const map = {
    insuffisant: { bg: '#FEE2E2', color: '#991B1B', label: '⚠ Insuffisant' },
    moyen:       { bg: '#FEF9C3', color: '#854D0E', label: '◎ Moyen' },
    bon:         { bg: '#D1FAE5', color: '#065F46', label: '✓ Bon' },
    RAS:         { bg: '#F3F4F6', color: '#374151', label: '— RAS' },
    excellent:   { bg: '#D1FAE5', color: '#065F46', label: '★ Excellent' },
  }
  const m = map[val]
  if (!m) return null
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

const SelectNotation = ({ value, options, onChange }) => {
  const colorMap = {
    insuffisant: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
    moyen:       { bg: '#FEF9C3', color: '#854D0E', border: '#FDE047' },
    bon:         { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
    RAS:         { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
    excellent:   { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  }
  const c = value ? colorMap[value] : { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' }
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${c.border}`,
        background: c.bg, color: c.color, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', outline: 'none', appearance: 'none', minWidth: 140, textAlign: 'center'
      }}
    >
      <option value="">— Choisir —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export default function Entretiens() {
  const [ias, setIas] = useState([])
  const [iaSelectionnee, setIaSelectionnee] = useState(null)
  const [iaIndex, setIaIndex] = useState(0)
  const [menuActif, setMenuActif] = useState('semaine')
  const [saisies, setSaisies] = useState([])
  const [entretiens, setEntretiens] = useState([])
  const [notations, setNotations] = useState({})
  const [actions, setActions] = useState([])
  const [nouvelleAction, setNouvelleAction] = useState({ description: '', responsable: 'ia', echeance: '' })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => { fetchIas() }, [])

  const fetchIas = async () => {
    const { data } = await supabase.from('ia').select('id, nom, email').order('nom')
    if (data) setIas(data)
  }

  const fetchData = async (iaId) => {
    const { data: s } = await supabase.from('saisies').select('*').eq('ia_id', iaId)
    if (s) setSaisies(s)
    const { data: e } = await supabase.from('entretiens').select('*, actions_1to1(*)').eq('ia_id', iaId).order('date_entretien', { ascending: false })
    if (e) {
      setEntretiens(e)
      const notMap = {}
      e.forEach(ent => { if (ent.notations) { try { Object.assign(notMap, JSON.parse(ent.notations)) } catch(err) {} } })
      setNotations(notMap)
    }
    const { data: a } = await supabase.from('actions_1to1').select('*').eq('ia_id', iaId).order('created_at', { ascending: false })
    if (a) setActions(a)
  }

  const handleSelectIA = (ia, index) => {
    setAnimating(true)
    setTimeout(() => {
      setIaSelectionnee(ia)
      setIaIndex(index)
      setMenuActif('semaine')
      setMsg('')
      fetchData(ia.id)
      setAnimating(false)
    }, 200)
  }

  const handleRetour = () => {
    setAnimating(true)
    setTimeout(() => {
      setIaSelectionnee(null)
      setSaisies([])
      setEntretiens([])
      setNotations({})
      setActions([])
      setAnimating(false)
    }, 200)
  }

  const nbSemaines = () => Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
  const totalYTD = (col) => saisies.reduce((acc, s) => acc + (s[col] || 0), 0)
  const objectifRdv = nbSemaines() * 8
  const tauxKPI = (num, den) => { const n = totalYTD(num), d = totalYTD(den); return d ? Math.round((n / d) * 100) : 0 }
  const semaineCourante = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
  const saisiesSemaine = saisies.filter(s => s.semaine === semaineCourante)

  const sauvegarderNotations = async () => {
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase.from('entretiens').select('id').eq('ia_id', iaSelectionnee.id).eq('date_entretien', today).single()
      if (existing?.id) {
        await supabase.from('entretiens').update({ notations: JSON.stringify(notations) }).eq('id', existing.id)
      } else {
        await supabase.from('entretiens').insert({ ia_id: iaSelectionnee.id, date_entretien: today, notations: JSON.stringify(notations), cr_envoye: false })
      }
      setMsg('✅ Notations sauvegardées')
      fetchData(iaSelectionnee.id)
    } catch { setMsg('❌ Erreur lors de la sauvegarde') }
    setSaving(false)
  }

  const ajouterAction = async () => {
    if (!nouvelleAction.description.trim()) return
    await supabase.from('actions_1to1').insert({
      ia_id: iaSelectionnee.id,
      entretien_id: entretiens[0]?.id || null,
      description: nouvelleAction.description,
      responsable: nouvelleAction.responsable,
      echeance: nouvelleAction.echeance || null,
      statut: 'en_cours'
    })
    setNouvelleAction({ description: '', responsable: 'ia', echeance: '' })
    fetchData(iaSelectionnee.id)
  }

  const toggleStatut = async (id, statut) => {
    await supabase.from('actions_1to1').update({ statut: statut === 'en_cours' ? 'fait' : 'en_cours' }).eq('id', id)
    fetchData(iaSelectionnee.id)
  }

  const supprimerAction = async (id) => {
    await supabase.from('actions_1to1').delete().eq('id', id)
    fetchData(iaSelectionnee.id)
  }

  const menus = [
    { id: 'semaine', icon: '📅', label: 'Semaine' },
    { id: 'ytd',     icon: '📊', label: 'Stats YTD' },
    { id: 'kpi',     icon: '🎯', label: 'KPI' },
    { id: 'actions', icon: '✅', label: 'Actions' },
  ]

  const couleurIA = iaSelectionnee ? getColor(iaIndex) : null

  const pctRdv = Math.min(Math.round((totalYTD('total_rdv') / Math.max(objectifRdv, 1)) * 100), 100)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', fontFamily: 'inherit' }}>

      {/* CSS animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        .fade-in { animation: fadeIn 0.25s ease forwards; }
        .fade-out { animation: fadeOut 0.2s ease forwards; }
        @media (min-width: 768px) { .bottom-nav { display: none !important; } .top-nav { display: flex !important; } .content-pad { padding-bottom: 24px !important; } }
        @media (max-width: 767px) { .top-nav { display: none !important; } .bottom-nav { display: flex !important; } .content-pad { padding-bottom: 90px !important; } }
      `}</style>

      <div className={animating ? 'fade-out' : 'fade-in'} style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          {iaSelectionnee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={handleRetour} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4, color: 'var(--color-text-secondary)' }}>←</button>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: couleurIA.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                {iaSelectionnee.nom.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>{iaSelectionnee.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Point individuel · {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>🤝 Points Individuels</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Sélectionne un Business Engineer</div>
            </div>
          )}
        </div>

        {/* SÉLECTION IA */}
        {!iaSelectionnee && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
            {ias.map((ia, i) => {
              const c = getColor(i)
              return (
                <div key={ia.id} onClick={() => handleSelectIA(ia, i)}
                  style={{ background: c.bg, borderRadius: 16, padding: '20px 12px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.color, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
                    {ia.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{ia.nom}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* CONTENU IA SÉLECTIONNÉE */}
        {iaSelectionnee && (
          <>
            {msg && (
              <div style={{ padding: '10px 14px', background: '#D1FAE5', borderRadius: 10, fontSize: 13, marginBottom: 16, color: '#065F46', fontWeight: 500 }}>
                {msg}
              </div>
            )}

            {/* NAV TOP (PC) */}
            <div className="top-nav" style={{ display: 'none', gap: 6, marginBottom: 24, background: 'var(--color-background-secondary)', padding: 6, borderRadius: 14, border: '1px solid var(--color-border-tertiary)' }}>
              {menus.map(m => (
                <button key={m.id} onClick={() => setMenuActif(m.id)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                    background: menuActif === m.id ? couleurIA.color : 'transparent',
                    color: menuActif === m.id ? '#fff' : 'var(--color-text-secondary)'
                  }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            <div className="content-pad" style={{ paddingBottom: 24 }}>

              {/* ── SEMAINE ── */}
              {menuActif === 'semaine' && (
                <div className="fade-in">
                  {/* Chiffres semaine */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'RDV', val: saisiesSemaine.reduce((a, s) => a + (s.total_rdv || 0), 0), color: '#6D28D9', bg: '#EDE9FE' },
                      { label: 'Présentations', val: saisiesSemaine.reduce((a, s) => a + (s.presentations || 0), 0), color: '#0369A1', bg: '#E0F2FE' },
                      { label: 'Besoins détectés', val: saisiesSemaine.reduce((a, s) => a + (s.besoins_detectes || 0), 0), color: '#065F46', bg: '#D1FAE5' },
                      { label: 'Signatures', val: saisiesSemaine.reduce((a, s) => a + (s.signatures || 0), 0), color: '#9D174D', bg: '#FCE7F3' },
                    ].map(item => (
                      <div key={item.label} style={{ background: item.bg, borderRadius: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: 30, fontWeight: 800, color: item.color, letterSpacing: '-1px' }}>{item.val}</div>
                        <div style={{ fontSize: 12, color: item.color, fontWeight: 500, opacity: 0.8, marginTop: 2 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Notations */}
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 14, padding: '20px', border: '1px solid var(--color-border-tertiary)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Notation semaine {semaineCourante}</div>
                    {[
                      { key: 'rdv', label: 'RDV', options: NOTATION_RDV },
                      { key: 'presentation', label: 'Présentation', options: NOTATION_RDV },
                      { key: 'signature', label: 'Signature', options: NOTATION_SIGN },
                    ].map((item, i) => (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--color-border-tertiary)' : 'none' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{item.label}</span>
                        <SelectNotation value={notations[item.key]} options={item.options} onChange={v => setNotations({ ...notations, [item.key]: v })} />
                      </div>
                    ))}
                    <button onClick={sauvegarderNotations} disabled={saving}
                      style={{ marginTop: 18, width: '100%', padding: '12px', background: couleurIA.color, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── YTD ── */}
              {menuActif === 'ytd' && (
                <div className="fade-in">
                  {/* Barre objectif RDV */}
                  <div style={{ background: '#EDE9FE', borderRadius: 14, padding: '20px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#6D28D9', letterSpacing: '-1.5px' }}>{totalYTD('total_rdv')}</div>
                        <div style={{ fontSize: 12, color: '#6D28D9', fontWeight: 500, opacity: 0.8 }}>RDV réalisés</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#6D28D9' }}>{pctRdv}%</div>
                        <div style={{ fontSize: 11, color: '#6D28D9', opacity: 0.7 }}>objectif {objectifRdv}</div>
                      </div>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(109,40,217,0.15)' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: pctRdv >= 80 ? '#6D28D9' : pctRdv >= 60 ? '#ECC94B' : '#FC8181', width: `${pctRdv}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#6D28D9', opacity: 0.7, marginTop: 6 }}>{nbSemaines()} semaines écoulées × 8 = {objectifRdv} RDV attendus</div>
                  </div>

                  {/* Autres stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Présentations', val: totalYTD('presentations'), color: '#0369A1', bg: '#E0F2FE' },
                      { label: 'Besoins', val: totalYTD('besoins_detectes'), color: '#065F46', bg: '#D1FAE5' },
                      { label: 'Signatures', val: totalYTD('signatures'), color: '#9D174D', bg: '#FCE7F3' },
                    ].map(item => (
                      <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: '14px' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: item.color }}>{item.val}</div>
                        <div style={{ fontSize: 11, color: item.color, fontWeight: 500, opacity: 0.8, marginTop: 2 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Notation YTD */}
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 14, padding: '20px', border: '1px solid var(--color-border-tertiary)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Notation globale YTD</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>RDV</span>
                      <SelectNotation value={notations['ytd_rdv']} options={NOTATION_RDV} onChange={v => setNotations({ ...notations, ytd_rdv: v })} />
                    </div>
                    <button onClick={sauvegarderNotations} disabled={saving}
                      style={{ marginTop: 18, width: '100%', padding: '12px', background: couleurIA.color, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── KPI ── */}
              {menuActif === 'kpi' && (
                <div className="fade-in">
                  {[
                    { label: 'Besoins détectés / RDV', num: 'besoins_detectes', den: 'total_rdv', key: 'kpi_besoins_rdv', color: '#6D28D9', bg: '#EDE9FE' },
                    { label: 'Présentations / Besoins', num: 'presentations', den: 'besoins_detectes', key: 'kpi_pres_besoins', color: '#0369A1', bg: '#E0F2FE' },
                    { label: 'Signatures / Besoins', num: 'signatures', den: 'besoins_detectes', key: 'kpi_sign_besoins', color: '#9D174D', bg: '#FCE7F3' },
                  ].map(kpi => {
                    const taux = tauxKPI(kpi.num, kpi.den)
                    return (
                      <div key={kpi.key} style={{ background: kpi.bg, borderRadius: 14, padding: '18px 20px', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: kpi.color, opacity: 0.8, marginBottom: 4 }}>{kpi.label}</div>
                            <div style={{ fontSize: 34, fontWeight: 800, color: kpi.color, letterSpacing: '-1px' }}>{taux}%</div>
                          </div>
                          <SelectNotation value={notations[kpi.key]} options={NOTATION_RDV} onChange={v => setNotations({ ...notations, [kpi.key]: v })} />
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: `${kpi.color}22` }}>
                          <div style={{ height: '100%', borderRadius: 3, background: kpi.color, width: `${Math.min(taux, 100)}%`, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={sauvegarderNotations} disabled={saving}
                    style={{ width: '100%', padding: '12px', background: couleurIA.color, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                    {saving ? 'Sauvegarde…' : '💾 Sauvegarder les notations'}
                  </button>
                </div>
              )}

              {/* ── ACTIONS ── */}
              {menuActif === 'actions' && (
                <div className="fade-in">
                  {/* Ajouter */}
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 14, padding: '18px', border: '1px solid var(--color-border-tertiary)', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Nouvelle action</div>
                    <input
                      placeholder={`Action pour ${iaSelectionnee.nom}…`}
                      value={nouvelleAction.description}
                      onChange={e => setNouvelleAction({ ...nouvelleAction, description: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={nouvelleAction.responsable} onChange={e => setNouvelleAction({ ...nouvelleAction, responsable: e.target.value })}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: 13 }}>
                        <option value="ia">{iaSelectionnee.nom}</option>
                        <option value="manager">Manager</option>
                      </select>
                      <input type="date" value={nouvelleAction.echeance} onChange={e => setNouvelleAction({ ...nouvelleAction, echeance: e.target.value })}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: 13 }} />
                    </div>
                    <button onClick={ajouterAction}
                      style={{ marginTop: 12, width: '100%', padding: '11px', background: couleurIA.color, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      + Ajouter
                    </button>
                  </div>

                  {/* En cours */}
                  {actions.filter(a => a.statut === 'en_cours').length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                        ⏳ En cours · {actions.filter(a => a.statut === 'en_cours').length}
                      </div>
                      {actions.filter(a => a.statut === 'en_cours').map(a => (
                        <div key={a.id} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 4 }}>{a.description}</div>
                            <div style={{ fontSize: 12, color: '#92400E' }}>
                              {a.responsable === 'ia' ? iaSelectionnee.nom : 'Manager'}
                              {a.echeance && ` · ${new Date(a.echeance).toLocaleDateString('fr-FR')}`}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => toggleStatut(a.id, a.statut)}
                              style={{ padding: '5px 12px', background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              ✓ Fait
                            </button>
                            <button onClick={() => supprimerAction(a.id)}
                              style={{ padding: '5px 10px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Terminées */}
                  {actions.filter(a => a.statut === 'fait').length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                        ✅ Terminées · {actions.filter(a => a.statut === 'fait').length}
                      </div>
                      {actions.filter(a => a.statut === 'fait').map(a => (
                        <div key={a.id} style={{ background: '#F0FFF4', border: '1px solid #A7F3D0', borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start', opacity: 0.75 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, color: '#374151', textDecoration: 'line-through' }}>{a.description}</div>
                            <div style={{ fontSize: 12, color: '#065F46', marginTop: 4 }}>{a.responsable === 'ia' ? iaSelectionnee.nom : 'Manager'}</div>
                          </div>
                          <button onClick={() => toggleStatut(a.id, a.statut)}
                            style={{ padding: '5px 10px', background: 'none', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                            Réouvrir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {actions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                      Aucune action pour {iaSelectionnee.nom}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NAV BOTTOM (MOBILE) */}
            <div className="bottom-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--color-background-secondary)', borderTop: '1px solid var(--color-border-tertiary)', padding: '8px 16px 20px', justifyContent: 'space-around', zIndex: 100 }}>
              {menus.map(m => (
                <button key={m.id} onClick={() => setMenuActif(m.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 10,
                    color: menuActif === m.id ? couleurIA.color : 'var(--color-text-secondary)',
                    fontWeight: menuActif === m.id ? 700 : 400
                  }}>
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
