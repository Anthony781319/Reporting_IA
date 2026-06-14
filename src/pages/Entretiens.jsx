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
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${c.border}`, background: c.bg, color: c.color, fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none', appearance: 'none', minWidth: 140, textAlign: 'center' }}>
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
  const [loadingCR, setLoadingCR] = useState(false)
  const [crGenere, setCrGenere] = useState('')
  const [crEnvoye, setCrEnvoye] = useState(false)
  const [crPrecedent, setCrPrecedent] = useState('')
  const [showCrPrecedent, setShowCrPrecedent] = useState(false)
  const [showRetardInput, setShowRetardInput] = useState({})
  const [retardForm, setRetardForm] = useState({})
  const [orientationCR, setOrientationCR] = useState('factuel')

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
      const dernierCR = e.find(ent => ent.cr_genere)
      if (dernierCR?.cr_genere) setCrPrecedent(dernierCR.cr_genere)
    }
    const { data: a } = await supabase.from('actions_1to1').select('*').eq('ia_id', iaId).order('created_at', { ascending: false })
    if (a) setActions(a)
  }

  const handleSelectIA = (ia, index) => {
    setAnimating(true)
    setCrGenere(''); setCrEnvoye(false); setCrPrecedent(''); setShowCrPrecedent(false)
    setShowRetardInput({}); setRetardForm({}); setOrientationCR('factuel')
    setTimeout(() => {
      setIaSelectionnee(ia); setIaIndex(index); setMenuActif('semaine'); setMsg('')
      fetchData(ia.id); setAnimating(false)
    }, 200)
  }

  const handleRetour = () => {
    setAnimating(true)
    setTimeout(() => {
      setIaSelectionnee(null); setSaisies([]); setEntretiens([]); setNotations({}); setActions([])
      setCrGenere(''); setCrEnvoye(false); setCrPrecedent(''); setShowCrPrecedent(false)
      setShowRetardInput({}); setRetardForm({}); setOrientationCR('factuel'); setAnimating(false)
    }, 200)
  }

  const nbSemaines = () => Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
  const totalYTD = (col) => saisies.reduce((acc, s) => acc + (s[col] || 0), 0)
  const objectifRdv = nbSemaines() * 8
  const tauxKPI = (num, den) => { const n = totalYTD(num), d = totalYTD(den); return d ? Math.round((n / d) * 100) : 0 }
  const semaineCourante = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
  const saisiesSemaine = saisies.filter(s => s.semaine === semaineCourante)

  // ── Analyse proratisée signatures semestre ──
  const currentSemestre = semaineCourante <= 26 ? 1 : 2
  const semaineDebutSemestre = currentSemestre === 1 ? 1 : 27
  const weeksElapsed = Math.max(1, semaineCourante - semaineDebutSemestre + 1)
  const weeksInSemester = 26
  const objectifSignatures = 10
  const saisiesSemestre = saisies.filter(s => s.semaine >= semaineDebutSemestre && s.semaine <= semaineCourante)
  const totalSignaturesSemestre = saisiesSemestre.reduce((acc, s) => acc + (s.signatures || 0), 0)
  const expectedSoFar = Math.round((weeksElapsed / weeksInSemester) * objectifSignatures * 10) / 10
  const pctVsExpected = expectedSoFar > 0 ? Math.round((totalSignaturesSemestre / expectedSoFar) * 100) : 100
  const pctVsObjectif = Math.min(Math.round((totalSignaturesSemestre / objectifSignatures) * 100), 100)

  const getSignatureStatus = () => {
    if (weeksElapsed <= 2) return { label: 'Début de semestre', color: '#6B7280', bg: '#F3F4F6', icon: '🏁' }
    if (pctVsExpected >= 110) return { label: 'En avance', color: '#065F46', bg: '#D1FAE5', icon: '🚀' }
    if (pctVsExpected >= 85) return { label: 'Dans les clous', color: '#065F46', bg: '#D1FAE5', icon: '✅' }
    if (pctVsExpected >= 60) return { label: 'Légèrement en retard', color: '#854D0E', bg: '#FEF9C3', icon: '⚠️' }
    if (pctVsExpected >= 35) return { label: 'En retard significatif', color: '#C2410C', bg: '#FFEDD5', icon: '🟠' }
    return { label: 'Très en retard', color: '#991B1B', bg: '#FEE2E2', icon: '🔴' }
  }
  const sigStatus = getSignatureStatus()

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
      ia_id: iaSelectionnee.id, entretien_id: entretiens[0]?.id || null,
      description: nouvelleAction.description, responsable: nouvelleAction.responsable,
      echeance: nouvelleAction.echeance || null, statut: 'en_cours'
    })
    setNouvelleAction({ description: '', responsable: 'ia', echeance: '' })
    fetchData(iaSelectionnee.id)
  }

  const toggleStatut = async (id, statut) => {
    await supabase.from('actions_1to1').update({ statut: statut === 'en_cours' || statut === 'en_retard' ? 'fait' : 'en_cours', motif_retard: null }).eq('id', id)
    fetchData(iaSelectionnee.id)
  }

  const marquerEnRetard = async (id) => {
    const motif = retardForm[id] || ''
    if (!motif.trim()) return
    const { error } = await supabase.from('actions_1to1').update({ statut: 'en_retard', motif_retard: motif }).eq('id', id)
    if (!error) {
      setShowRetardInput(prev => ({ ...prev, [id]: false }))
      setRetardForm(prev => ({ ...prev, [id]: '' }))
      await fetchData(iaSelectionnee.id)
    }
  }

  const supprimerAction = async (id) => {
    await supabase.from('actions_1to1').delete().eq('id', id)
    fetchData(iaSelectionnee.id)
  }

  const ORIENTATIONS = [
    { id: 'encourageant', icon: '🌟', label: 'Encourageant', desc: 'Stats difficiles mais on booste le moral' },
    { id: 'factuel',      icon: '⚖️', label: 'Factuel',       desc: 'Compte-rendu neutre et objectif' },
    { id: 'ferme',        icon: '🔴', label: 'Ferme',          desc: 'Recadrage clair, documentation sous-performance' },
  ]

  const genererCR = async () => {
    setLoadingCR(true); setCrGenere(''); setMsg('')
    try {
      const actionsTexte = actions
        .filter(a => a.statut === 'en_cours')
        .map((a, i) => `${i + 1}. ${a.description} (${a.responsable === 'ia' ? iaSelectionnee.nom : 'Manager'})${a.echeance ? ` — échéance : ${new Date(a.echeance).toLocaleDateString('fr-FR')}` : ''}`)
        .join('\n')

      const actionsEnRetard = actions
        .filter(a => a.statut === 'en_retard')
        .map((a, i) => `${i + 1}. ${a.description} (${a.responsable === 'ia' ? iaSelectionnee.nom : 'Manager'}) — MOTIF : ${a.motif_retard || 'non précisé'}`)
        .join('\n')

      const semSaisie = saisiesSemaine.reduce((acc, s) => ({
        rdv: acc.rdv + (s.total_rdv || 0), pres: acc.pres + (s.presentations || 0),
        besoins: acc.besoins + (s.besoins_detectes || 0), sign: acc.sign + (s.signatures || 0),
      }), { rdv: 0, pres: 0, besoins: 0, sign: 0 })

      const contextePrecedent = crPrecedent.trim()
        ? `\nCONTEXTE — CR PRÉCÉDENT :\n${crPrecedent.trim()}\n\nFais référence à l'évolution depuis le dernier point : progrès, points restants à travailler, actions tenues ou non.`
        : ''

      const orientationInstructions = {
        encourageant: `\nTON SOUHAITÉ : Encourageant et motivant. Même si les stats sont en deçà des attentes, valorise les efforts, identifie les signaux positifs et donne de l'élan pour la suite. Reste factuel mais termine sur une note d'espoir et de confiance.`,
        factuel: `\nTON SOUHAITÉ : Neutre et factuel. Présente les faits tels qu'ils sont, sans sur-interpréter dans un sens ou dans l'autre. Direct et professionnel.`,
        ferme: `\nTON SOUHAITÉ : Ferme et documenté. Les résultats sont insuffisants et doivent être nommés clairement. Ce CR peut servir de base à un suivi RH. Sois précis sur les manquements, les attentes non atteintes et les conséquences possibles si la situation ne s'améliore pas. Reste professionnel mais sans ambiguïté.`,
      }

      const prompt = `Tu es un assistant manager professionnel. Rédige un compte-rendu de point individuel avec ${iaSelectionnee.nom}, Ingénieur d'affaires dans une ESN spécialisée IT/Télécom/Cybersécurité.
${orientationInstructions[orientationCR]}
${contextePrecedent}

DONNÉES SEMAINE ${semaineCourante} :
- RDV : ${semSaisie.rdv} | Présentations : ${semSaisie.pres} | Besoins : ${semSaisie.besoins} | Signatures : ${semSaisie.sign}

NOTATIONS MANAGER :
- RDV : ${notations['rdv'] || 'non renseigné'} | Présentation : ${notations['presentation'] || 'non renseigné'} | Signature : ${notations['signature'] || 'non renseigné'}

STATS YTD :
- RDV : ${totalYTD('total_rdv')} / objectif ${objectifRdv} (${Math.round(totalYTD('total_rdv') / Math.max(objectifRdv, 1) * 100)}%)
- Taux besoins/RDV : ${tauxKPI('besoins_detectes', 'total_rdv')}%
- Taux présentations/besoins : ${tauxKPI('presentations', 'besoins_detectes')}%
- Taux signatures/présentations : ${tauxKPI('signatures', 'presentations')}%

SIGNATURES SEMESTRE ${currentSemestre} :
- Réalisées : ${totalSignaturesSemestre} / objectif ${objectifSignatures}
- Attendu à ce stade (semaine ${weeksElapsed}/${weeksInSemester} du semestre) : ${expectedSoFar}
- Statut : ${sigStatus.label} (${pctVsExpected}% du rythme attendu)

ACTIONS EN COURS :
${actionsTexte || 'Aucune'}

ACTIONS EN RETARD :
${actionsEnRetard || 'Aucune'}

Structure du CR :
1. Résumé du point (2-3 phrases)${crPrecedent ? ', avec référence à l\'évolution' : ''}
2. Analyse de la performance semaine et tendance semestre
3. Actions définies (responsables + échéances)
4. Si actions en retard, les mentionner explicitement avec le motif
5. Conclusion adaptée au ton demandé

Tutoiement. Sois direct et pragmatique.`

      const response = await fetch('/api/generate-cr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await response.json()
      const texte = data.content?.[0]?.text
      if (texte) setCrGenere(texte)
      else setMsg('❌ Erreur lors de la génération.')
    } catch { setMsg('❌ Erreur lors de la génération du CR.') }
    setLoadingCR(false)
  }

  const envoyerCR = async () => {
    if (!crGenere) return
    try {
      await fetch('https://default1d593042a69d49e08d1c0daf8ac171.7b.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/357caf7470f146f98e8fd5a4d037d9d0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=fKdByb-sInxK81dYFVlHGLKzZFbKrZsc875yPXRxFFw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: iaSelectionnee.email, nom: iaSelectionnee.nom,
          cr: crGenere.replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>').replace(/## (.*?)(\n|$)/g, '<h2>$1</h2>').replace(/# (.*?)(\n|$)/g, '<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>'),
          date: new Date().toLocaleDateString('fr-FR')
        })
      })
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase.from('entretiens').select('id').eq('ia_id', iaSelectionnee.id).eq('date_entretien', today).single()
      if (existing?.id) {
        await supabase.from('entretiens').update({ cr_genere: crGenere, cr_envoye: true }).eq('id', existing.id)
      } else {
        await supabase.from('entretiens').insert({ ia_id: iaSelectionnee.id, date_entretien: today, cr_genere: crGenere, cr_envoye: true, notations: JSON.stringify(notations) })
      }
      setCrEnvoye(true); setMsg(`✅ CR envoyé à ${iaSelectionnee.nom} !`)
      fetchData(iaSelectionnee.id)
    } catch { setMsg('❌ Erreur lors de l\'envoi.') }
  }

  const menus = [
    { id: 'semaine', icon: '📅', label: 'Semaine' },
    { id: 'ytd',     icon: '📊', label: 'Stats YTD' },
    { id: 'kpi',     icon: '🎯', label: 'KPI' },
    { id: 'actions', icon: '✅', label: 'Actions' },
    { id: 'cr',      icon: '✉️', label: 'CR' },
  ]

  const couleurIA = iaSelectionnee ? getColor(iaIndex) : null
  const pctRdv = Math.min(Math.round((totalYTD('total_rdv') / Math.max(objectifRdv, 1)) * 100), 100)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', fontFamily: 'inherit' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .fade-in { animation: fadeIn 0.25s ease forwards; }
        .fade-out { animation: fadeOut 0.2s ease forwards; }
        .pulse { animation: pulse 1.5s ease infinite; }
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
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Sélectionne un ingénieur d'affaires</div>
            </div>
          )}
        </div>

        {!iaSelectionnee && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
            {ias.map((ia, i) => {
              const c = getColor(i)
              return (
                <div key={ia.id} onClick={() => handleSelectIA(ia, i)}
                  style={{ background: c.bg, borderRadius: 16, padding: '20px 12px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.color, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
                    {ia.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{ia.nom}</div>
                </div>
              )
            })}
          </div>
        )}

        {iaSelectionnee && (
          <>
            {msg && (
              <div style={{ padding: '10px 14px', background: msg.startsWith('❌') ? '#FEE2E2' : '#D1FAE5', borderRadius: 10, fontSize: 13, marginBottom: 16, color: msg.startsWith('❌') ? '#991B1B' : '#065F46', fontWeight: 500 }}>
                {msg}
              </div>
            )}

            <div className="top-nav" style={{ display: 'none', gap: 6, marginBottom: 24, background: 'var(--color-background-secondary)', padding: 6, borderRadius: 14, border: '1px solid var(--color-border-tertiary)' }}>
              {menus.map(m => (
                <button key={m.id} onClick={() => setMenuActif(m.id)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s', background: menuActif === m.id ? couleurIA.color : 'transparent', color: menuActif === m.id ? '#fff' : 'var(--color-text-secondary)' }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            <div className="content-pad" style={{ paddingBottom: 24 }}>

              {/* ── SEMAINE ── */}
              {menuActif === 'semaine' && (
                <div className="fade-in">
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
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 14, padding: '20px', border: '1px solid var(--color-border-tertiary)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Notation semaine {semaineCourante}</div>
                    {[
                      { key: 'rdv', label: 'RDV', options: NOTATION_RDV },
                      { key: 'presentation', label: 'Présentation', options: NOTATION_RDV },
                      { key: 'signature', label: 'Signature', options: NOTATION_SIGN },
                    ].map((item, i) => (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--color-border-tertiary)' : 'none' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
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
                    <div style={{ fontSize: 11, color: '#6D28D9', opacity: 0.7, marginTop: 6 }}>{nbSemaines()} semaines × 8 = {objectifRdv} RDV attendus</div>
                  </div>
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
                    { label: 'Signatures / Présentations', num: 'signatures', den: 'presentations', key: 'kpi_sign_prez', color: '#9D174D', bg: '#FCE7F3' },
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

                  {/* ── 4ème KPI : Signatures semestre avec analyse proratisée ── */}
                  <div style={{ background: sigStatus.bg, borderRadius: 14, padding: '18px 20px', marginBottom: 12, border: `1.5px solid ${sigStatus.color}30` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: sigStatus.color, opacity: 0.8, marginBottom: 4 }}>
                          Signatures S{currentSemestre} — objectif {objectifSignatures}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <div style={{ fontSize: 34, fontWeight: 800, color: sigStatus.color, letterSpacing: '-1px' }}>{totalSignaturesSemestre}</div>
                          <div style={{ fontSize: 14, color: sigStatus.color, opacity: 0.6 }}>/ {objectifSignatures}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ padding: '4px 10px', borderRadius: 20, background: sigStatus.color, color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          {sigStatus.icon} {sigStatus.label}
                        </div>
                        <div style={{ fontSize: 11, color: sigStatus.color, opacity: 0.7 }}>{pctVsObjectif}% de l'objectif final</div>
                      </div>
                    </div>

                    {/* Barre vs objectif total */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: sigStatus.color, fontWeight: 600, marginBottom: 4 }}>Progression vs objectif final</div>
                      <div style={{ height: 8, borderRadius: 4, background: `${sigStatus.color}22` }}>
                        <div style={{ height: '100%', borderRadius: 4, background: sigStatus.color, width: `${pctVsObjectif}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>

                    {/* Analyse proratisée */}
                    {weeksElapsed > 2 && (
                      <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '10px 14px', border: `1px solid ${sigStatus.color}20` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: sigStatus.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                          📊 Analyse à date — S{weeksElapsed}/{weeksInSemester} du semestre
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: sigStatus.color }}>{totalSignaturesSemestre}</div>
                            <div style={{ fontSize: 10, color: sigStatus.color, opacity: 0.7 }}>Réalisées</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: sigStatus.color }}>{expectedSoFar}</div>
                            <div style={{ fontSize: 10, color: sigStatus.color, opacity: 0.7 }}>Attendues à date</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: sigStatus.color }}>{pctVsExpected}%</div>
                            <div style={{ fontSize: 10, color: sigStatus.color, opacity: 0.7 }}>Du rythme attendu</div>
                          </div>
                        </div>
                        {totalSignaturesSemestre < expectedSoFar && (
                          <div style={{ marginTop: 8, fontSize: 11, color: sigStatus.color, fontStyle: 'italic' }}>
                            ↳ Il manque {(expectedSoFar - totalSignaturesSemestre).toFixed(1)} signature(s) par rapport au rythme attendu à cette période
                          </div>
                        )}
                        {totalSignaturesSemestre >= expectedSoFar && (
                          <div style={{ marginTop: 8, fontSize: 11, color: sigStatus.color, fontStyle: 'italic' }}>
                            ↳ {totalSignaturesSemestre === 0 ? 'Normal en début de semestre' : `${(totalSignaturesSemestre - expectedSoFar).toFixed(1)} signature(s) d'avance sur le rythme`}
                          </div>
                        )}
                      </div>
                    )}
                    {weeksElapsed <= 2 && (
                      <div style={{ fontSize: 12, color: sigStatus.color, fontStyle: 'italic', marginTop: 4 }}>
                        🏁 Semestre tout juste démarré — l'analyse de rythme sera disponible à partir de la semaine 3
                      </div>
                    )}
                  </div>

                  <button onClick={sauvegarderNotations} disabled={saving}
                    style={{ width: '100%', padding: '12px', background: couleurIA.color, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                    {saving ? 'Sauvegarde…' : '💾 Sauvegarder les notations'}
                  </button>
                </div>
              )}

              {/* ── ACTIONS ── */}
              {menuActif === 'actions' && (
                <div className="fade-in">
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div style={{ padding: '6px 14px', borderRadius: 20, background: '#FEF9C3', color: '#854D0E', fontSize: 13, fontWeight: 700 }}>⏳ {actions.filter(a => a.statut === 'en_cours').length} en cours</div>
                    <div style={{ padding: '6px 14px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B', fontSize: 13, fontWeight: 700 }}>🔴 {actions.filter(a => a.statut === 'en_retard').length} en retard</div>
                    <div style={{ padding: '6px 14px', borderRadius: 20, background: '#D1FAE5', color: '#065F46', fontSize: 13, fontWeight: 700 }}>✅ {actions.filter(a => a.statut === 'fait').length} terminées</div>
                  </div>

                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 16, padding: '20px', border: `2px dashed ${couleurIA.color}44`, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: couleurIA.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>+</div>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Nouvelle action</span>
                    </div>
                    <input placeholder="Décris l'action à mener…" value={nouvelleAction.description}
                      onChange={e => setNouvelleAction({ ...nouvelleAction, description: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && ajouterAction()}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--color-border-tertiary)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {['ia', 'manager'].map(r => (
                        <button key={r} onClick={() => setNouvelleAction({ ...nouvelleAction, responsable: r })}
                          style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${nouvelleAction.responsable === r ? couleurIA.color : 'var(--color-border-tertiary)'}`, background: nouvelleAction.responsable === r ? `${couleurIA.color}18` : 'transparent', color: nouvelleAction.responsable === r ? couleurIA.color : 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          {r === 'ia' ? `👤 ${iaSelectionnee.nom}` : '🧑‍💼 Manager'}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="date" value={nouvelleAction.echeance} onChange={e => setNouvelleAction({ ...nouvelleAction, echeance: e.target.value })}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--color-border-tertiary)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: 13 }} />
                      <button onClick={ajouterAction} style={{ flex: 1, padding: '8px 16px', background: couleurIA.color, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        Ajouter →
                      </button>
                    </div>
                  </div>

                  {/* En cours */}
                  {actions.filter(a => a.statut === 'en_cours').length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>⏳ En cours</div>
                      {actions.filter(a => a.statut === 'en_cours').map(a => {
                        const isIA = a.responsable === 'ia'
                        const echeanceDate = a.echeance ? new Date(a.echeance) : null
                        const joursRestants = echeanceDate ? Math.ceil((echeanceDate - new Date()) / (1000 * 60 * 60 * 24)) : null
                        const echeanceUrgente = joursRestants !== null && joursRestants <= 3
                        return (
                          <div key={a.id} style={{ borderRadius: 14, padding: '14px 16px', marginBottom: 10, background: isIA ? '#EDE9FE' : '#FFF7ED', border: `1.5px solid ${isIA ? '#C4B5FD' : '#FED7AA'}` }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: isIA ? '#6D28D9' : '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                                {isIA ? iaSelectionnee.nom.slice(0, 2).toUpperCase() : 'MG'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 6, lineHeight: 1.4 }}>{a.description}</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: isIA ? '#DDD6FE' : '#FFEDD5', color: isIA ? '#5B21B6' : '#C2410C' }}>
                                    {isIA ? iaSelectionnee.nom : 'Manager'}
                                  </span>
                                  {echeanceDate && (
                                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: echeanceUrgente ? '#FEE2E2' : '#F3F4F6', color: echeanceUrgente ? '#991B1B' : '#6B7280' }}>
                                      {echeanceUrgente ? '🔴 ' : '📅 '}{echeanceDate.toLocaleDateString('fr-FR')}
                                      {joursRestants === 0 ? " · Aujourd'hui" : joursRestants === 1 ? ' · Demain' : joursRestants < 0 ? ` · ${Math.abs(joursRestants)}j de retard` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                                <button onClick={() => toggleStatut(a.id, a.statut)} style={{ padding: '5px 10px', background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Fait</button>
                                <button onClick={() => setShowRetardInput(prev => ({ ...prev, [a.id]: !prev[a.id] }))} style={{ padding: '5px 10px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🔴 Retard</button>
                                <button onClick={() => supprimerAction(a.id)} style={{ padding: '5px 10px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>✕</button>
                              </div>
                            </div>
                            {showRetardInput[a.id] && (
                              <div style={{ marginTop: 12, padding: '12px', background: '#FEE2E2', borderRadius: 10, border: '1px solid #FCA5A5' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 8 }}>🔴 Motif du retard (obligatoire)</div>
                                <input placeholder="Explique pourquoi cette action est en retard…"
                                  value={retardForm[a.id] || ''}
                                  onChange={e => setRetardForm(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button onClick={() => marquerEnRetard(a.id)} style={{ flex: 1, padding: '8px', background: '#991B1B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                    Confirmer le retard
                                  </button>
                                  <button onClick={() => setShowRetardInput(prev => ({ ...prev, [a.id]: false }))} style={{ padding: '8px 14px', background: 'none', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* En retard */}
                  {actions.filter(a => a.statut === 'en_retard').length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>🔴 En retard</div>
                      {actions.filter(a => a.statut === 'en_retard').map(a => {
                        const isIA = a.responsable === 'ia'
                        return (
                          <div key={a.id} style={{ borderRadius: 14, padding: '14px 16px', marginBottom: 10, background: '#FFF1F2', border: '1.5px solid #FCA5A5' }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                                {isIA ? iaSelectionnee.nom.slice(0, 2).toUpperCase() : 'MG'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 4, lineHeight: 1.4 }}>{a.description}</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FEE2E2', color: '#991B1B' }}>🔴 En retard</span>
                                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#F3F4F6', color: '#374151' }}>{isIA ? iaSelectionnee.nom : 'Manager'}</span>
                                </div>
                                {a.motif_retard && (
                                  <div style={{ fontSize: 12, color: '#991B1B', background: '#FEE2E2', padding: '6px 10px', borderRadius: 8, fontStyle: 'italic' }}>
                                    💬 {a.motif_retard}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                                <button onClick={() => toggleStatut(a.id, a.statut)} style={{ padding: '5px 10px', background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Fait</button>
                                <button onClick={async () => { await supabase.from('actions_1to1').update({ statut: 'en_cours', motif_retard: null }).eq('id', a.id); fetchData(iaSelectionnee.id) }} style={{ padding: '5px 10px', background: '#FEF9C3', color: '#854D0E', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>↩ En cours</button>
                                <button onClick={() => supprimerAction(a.id)} style={{ padding: '5px 10px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>✕</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Terminées */}
                  {actions.filter(a => a.statut === 'fait').length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>✅ Terminées</div>
                      {actions.filter(a => a.statut === 'fait').map(a => (
                        <div key={a.id} style={{ borderRadius: 14, padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', background: '#F0FFF4', border: '1.5px solid #A7F3D0', opacity: 0.8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✓</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: '#374151', textDecoration: 'line-through', opacity: 0.7 }}>{a.description}</div>
                            <div style={{ fontSize: 11, color: '#065F46', marginTop: 2, fontWeight: 500 }}>{a.responsable === 'ia' ? iaSelectionnee.nom : 'Manager'}</div>
                          </div>
                          <button onClick={() => toggleStatut(a.id, a.statut)} style={{ padding: '4px 10px', background: 'none', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Réouvrir</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {actions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                      Aucune action définie pour {iaSelectionnee.nom}
                    </div>
                  )}
                </div>
              )}

              {/* ── CR ── */}
              {menuActif === 'cr' && (
                <div className="fade-in">
                  <div style={{ background: `${couleurIA.color}12`, border: `1.5px solid ${couleurIA.color}30`, borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: couleurIA.color, marginBottom: 4 }}>Compte-rendu du point individuel</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      Génère un CR basé sur les notations, les actions et les stats de {iaSelectionnee.nom}, puis envoie-le par email.
                    </div>
                  </div>

                  {/* CR précédent */}
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, border: '1px solid var(--color-border-tertiary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showCrPrecedent ? 12 : 0 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>🕐 CR du point précédent</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {crPrecedent ? '✅ Chargé automatiquement — modifiable' : 'Colle le CR précédent pour un meilleur contexte'}
                        </div>
                      </div>
                      <button onClick={() => setShowCrPrecedent(!showCrPrecedent)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${couleurIA.color}40`, background: showCrPrecedent ? `${couleurIA.color}15` : 'none', color: couleurIA.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {showCrPrecedent ? '▲ Réduire' : '▼ Voir / Modifier'}
                      </button>
                    </div>
                    {showCrPrecedent && (
                      <textarea value={crPrecedent} onChange={e => setCrPrecedent(e.target.value)} placeholder="Colle ici le CR du point précédent…"
                        style={{ width: '100%', padding: '12px', borderRadius: 10, border: `1.5px solid ${couleurIA.color}30`, background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: 12, minHeight: 150, boxSizing: 'border-box', lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }} />
                    )}
                    {crPrecedent && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#065F46' }} />
                        <span style={{ fontSize: 11, color: '#065F46', fontWeight: 500 }}>Ce CR sera utilisé pour contextualiser la génération</span>
                      </div>
                    )}
                  </div>

                  {/* ── Orientation du CR ── */}
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, border: '1px solid var(--color-border-tertiary)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🎯 Comment orienter ce CR ?</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ORIENTATIONS.map(o => (
                        <div key={o.id} onClick={() => setOrientationCR(o.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                            border: orientationCR === o.id ? `2px solid ${couleurIA.color}` : '1.5px solid var(--color-border-tertiary)',
                            background: orientationCR === o.id ? `${couleurIA.color}10` : 'var(--color-background)' }}>
                          <div style={{ fontSize: 22, flexShrink: 0 }}>{o.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: orientationCR === o.id ? couleurIA.color : 'var(--color-text-primary)' }}>{o.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{o.desc}</div>
                          </div>
                          {orientationCR === o.id && (
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: couleurIA.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#fff', fontSize: 11 }}>✓</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Récap données */}
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, border: '1px solid var(--color-border-tertiary)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Données du point</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {[{ label: 'RDV', val: notations['rdv'] }, { label: 'Présentation', val: notations['presentation'] }, { label: 'Signature', val: notations['signature'] }].map(n => {
                        const colorMap = { insuffisant: '#FEE2E2', moyen: '#FEF9C3', bon: '#D1FAE5', RAS: '#F3F4F6', excellent: '#D1FAE5' }
                        const textMap = { insuffisant: '#991B1B', moyen: '#854D0E', bon: '#065F46', RAS: '#374151', excellent: '#065F46' }
                        return (
                          <div key={n.label} style={{ padding: '6px 12px', borderRadius: 10, background: n.val ? colorMap[n.val] : '#F3F4F6', fontSize: 12, fontWeight: 600, color: n.val ? textMap[n.val] : '#9CA3AF' }}>
                            {n.label} : {n.val || '—'}
                          </div>
                        )
                      })}
                      <div style={{ padding: '6px 12px', borderRadius: 10, background: '#EDE9FE', fontSize: 12, fontWeight: 600, color: '#6D28D9' }}>
                        {actions.filter(a => a.statut === 'en_cours').length} action(s)
                      </div>
                      {actions.filter(a => a.statut === 'en_retard').length > 0 && (
                        <div style={{ padding: '6px 12px', borderRadius: 10, background: '#FEE2E2', fontSize: 12, fontWeight: 600, color: '#991B1B' }}>
                          🔴 {actions.filter(a => a.statut === 'en_retard').length} en retard
                        </div>
                      )}
                      <div style={{ padding: '6px 12px', borderRadius: 10, background: sigStatus.bg, fontSize: 12, fontWeight: 600, color: sigStatus.color }}>
                        {sigStatus.icon} Signatures S{currentSemestre} : {sigStatus.label}
                      </div>
                    </div>
                  </div>

                  {!crGenere && (
                    <button onClick={genererCR} disabled={loadingCR}
                      style={{ width: '100%', padding: '14px', background: loadingCR ? '#9CA3AF' : couleurIA.color, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loadingCR ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
                      {loadingCR
                        ? <span className="pulse">✨ Génération en cours…</span>
                        : `✨ Générer le CR — Ton : ${ORIENTATIONS.find(o => o.id === orientationCR)?.label}`}
                    </button>
                  )}

                  {crGenere && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                        CR généré — modifiable avant envoi
                      </div>
                      <textarea value={crGenere} onChange={e => setCrGenere(e.target.value)}
                        style={{ width: '100%', padding: '14px', borderRadius: 12, border: `1.5px solid ${couleurIA.color}40`, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, minHeight: 220, boxSizing: 'border-box', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }} />
                      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button onClick={genererCR} disabled={loadingCR}
                          style={{ flex: 1, padding: '11px', background: 'none', color: couleurIA.color, border: `1.5px solid ${couleurIA.color}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          🔄 Régénérer
                        </button>
                        <button onClick={envoyerCR} disabled={crEnvoye}
                          style={{ flex: 2, padding: '11px', background: crEnvoye ? '#D1FAE5' : '#065F46', color: crEnvoye ? '#065F46' : '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: crEnvoye ? 'not-allowed' : 'pointer' }}>
                          {crEnvoye ? `✅ Envoyé à ${iaSelectionnee.nom}` : `📨 Envoyer à ${iaSelectionnee.nom}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bottom-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--color-background-secondary)', borderTop: '1px solid var(--color-border-tertiary)', padding: '8px 16px 20px', justifyContent: 'space-around', zIndex: 100 }}>
              {menus.map(m => (
                <button key={m.id} onClick={() => setMenuActif(m.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 10, color: menuActif === m.id ? couleurIA.color : 'var(--color-text-secondary)', fontWeight: menuActif === m.id ? 700 : 400 }}>
                  <span style={{ fontSize: 18 }}>{m.icon}</span>
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
