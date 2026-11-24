import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const ACCENT = '#4338CA'
const ACCENT_SOFT = '#EEF0FF'
const BORDER = '#E5E1DC'
const TITLE_COLOR = '#2B2A28'
const TEXT_SECONDARY = '#6B6A66'
const BG_PAGE = '#FAFAF9'

const CATEGORIE_STYLE = {
  'Prod':              { color: '#0F6E56', bg: '#E1F5EE', icon: 'ti-briefcase' },
  'Prod forfait':       { color: '#1D4ED8', bg: '#DBEAFE', icon: 'ti-file-invoice' },
  'ITC':                { color: '#B45309', bg: '#FEF3E2', icon: 'ti-clock-pause' },
  'Maladie':            { color: '#B91C1C', bg: '#FCEBEB', icon: 'ti-first-aid-kit' },
  'Cas RH':             { color: '#7C3AED', bg: '#F3E8FF', icon: 'ti-alert-triangle' },
  'Sortie':             { color: '#6B7280', bg: '#F1F0EE', icon: 'ti-door-exit' },
  'Sortie périmètre':   { color: '#9CA3AF', bg: '#F5F5F4', icon: 'ti-logout-2' },
}
const DEFAULT_CAT_STYLE = { color: '#6B6A66', bg: '#F1EFE8', icon: 'ti-user' }
// Catégories exclues du "Total effectif" (elles restent affichées comme vignettes, juste pas comptées dedans)
const CATEGORIES_HORS_EFFECTIF = ['Sortie', 'Sortie périmètre']
// Catégories comptées dans le "Total effectif" (liste explicite, pour ne jamais inclure Sortie / Sortie périmètre par erreur)
const CATEGORIES_EFFECTIF = ['Prod', 'Prod forfait', 'ITC', 'Maladie', 'Cas RH']
// Catégories 100% salariés par nature -- pas besoin du détail salarié/sous-traitant dessus
const CATEGORIES_SANS_DETAIL_CONTRAT = ['ITC', 'Maladie', 'Cas RH']

const todayISO = () => new Date().toISOString().slice(0, 10)
const addDaysISO = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const diffDaysISO = (fromISO, toISO) => Math.round((new Date(toISO + 'T00:00:00') - new Date(fromISO + 'T00:00:00')) / 86400000)
const formatDateFR = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const initials = (nom, prenom) => `${(nom || '?')[0] || ''}${(prenom || '')[0] || ''}`.toUpperCase()
// Couleur de la date de fin selon l'urgence (jours restants depuis la date de référence affichée)
const dateFinStyle = (joursRestants) => {
  if (joursRestants === null) return { color: '#9CA3AF' }
  if (joursRestants <= 7) return { color: '#B91C1C', fontWeight: 700 }
  if (joursRestants <= 30) return { color: '#B45309', fontWeight: 600 }
  return { color: '#6B6A66' }
}

export default function Prod2027() {
  const [refDate, setRefDate] = useState(todayISO())
  const [rows, setRows] = useState([])
  const [statuts, setStatuts] = useState([])
  const [managers, setManagers] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategorie, setSelectedCategorie] = useState(null)
  const [alerteSeuil, setAlerteSeuil] = useState(30)
  const [showAlertesOnly, setShowAlertesOnly] = useState(false)
  const [managingRow, setManagingRow] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [historiqueFor, setHistoriqueFor] = useState(null)
  const [historiquePeriodes, setHistoriquePeriodes] = useState([])
  const [loadingHistorique, setLoadingHistorique] = useState(false)
  // Recherche "tout le monde" -- indépendante de la date affichée, pour retrouver quelqu'un sans statut actif à refDate
  const [globalResults, setGlobalResults] = useState([])

  const loadRefData = async () => {
    const [{ data: s }, { data: m }, { data: c }] = await Promise.all([
      supabase.from('statuts').select('*').order('nom'),
      supabase.from('managers').select('*').eq('actif', true).order('nom'),
      supabase.from('clients').select('*').order('nom'),
    ])
    setStatuts(s || []); setManagers(m || []); setClients(c || [])
  }

  const loadPeriodes = async (date) => {
    setLoading(true); setLoadError('')
    const { data, error } = await supabase.from('periodes')
      .select('*, collaborateur:collaborateurs(id,nom,prenom,type_contrat), statut:statuts(id,nom,categorie,date_fin_obligatoire), manager:managers(id,nom), client:clients(id,nom)')
      .lte('date_debut', date)
      .or(`date_fin.is.null,date_fin.gte.${date}`)
    if (error) { setLoadError(`Erreur de chargement : ${error.message}`); setLoading(false); return }
    const byCollab = new Map()
    for (const r of (data || [])) {
      const existing = byCollab.get(r.collaborateur_id)
      if (!existing || r.date_debut > existing.date_debut) byCollab.set(r.collaborateur_id, r)
    }
    setRows([...byCollab.values()].sort((a, b) => (a.collaborateur?.nom || '').localeCompare(b.collaborateur?.nom || '')))
    setLoading(false)
  }

  useEffect(() => { loadRefData() }, [])
  useEffect(() => { loadPeriodes(refDate) }, [refDate])

  // Recherche globale sur TOUS les collaborateurs (actifs ou non à la date affichée), avec un petit délai
  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) { setGlobalResults([]); return }
    let cancelled = false
    const handle = setTimeout(async () => {
      const { data } = await supabase.from('collaborateurs')
        .select('id,nom,prenom,type_contrat')
        .or(`nom.ilike.%${term}%,prenom.ilike.%${term}%`)
        .order('nom')
        .limit(15)
      if (!cancelled) setGlobalResults(data || [])
    }, 300)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [search])

  const stats = useMemo(() => {
    const byCategorie = {}
    let total = 0, totalSalarie = 0, totalSousTraitant = 0
    for (const r of rows) {
      const cat = r.statut?.categorie || '—'
      const isSalarie = r.collaborateur?.type_contrat === 'salarié'
      if (!byCategorie[cat]) byCategorie[cat] = { count: 0, salarie: 0, sousTraitant: 0 }
      byCategorie[cat].count += 1
      if (isSalarie) byCategorie[cat].salarie += 1; else byCategorie[cat].sousTraitant += 1
      if (CATEGORIES_EFFECTIF.includes(cat)) {
        total += 1
        if (isSalarie) totalSalarie += 1; else totalSousTraitant += 1
      }
    }
    // Fins de période proches de la date affichée (toujours >= refDate, vu le filtre de chargement)
    let alertesUrgentes = 0, alertesProches = 0
    for (const r of rows) {
      if (!r.date_fin) continue
      const j = diffDaysISO(refDate, r.date_fin)
      if (j <= 7) alertesUrgentes += 1
      else if (j <= alerteSeuil) alertesProches += 1
    }
    return { total, totalSalarie, totalSousTraitant, byCategorie, alertesUrgentes, alertesProches, alertesTotal: alertesUrgentes + alertesProches }
  }, [rows, alerteSeuil, refDate])

  const filteredRows = useMemo(() => {
    let result = rows
    if (selectedCategorie) result = result.filter(r => (r.statut?.categorie || '—') === selectedCategorie)
    if (showAlertesOnly) result = result.filter(r => r.date_fin && diffDaysISO(refDate, r.date_fin) <= alerteSeuil)
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter(r => `${r.collaborateur?.nom} ${r.collaborateur?.prenom}`.toLowerCase().includes(term))
    }
    return [...result].sort((a, b) => {
      if (showAlertesOnly) return (a.date_fin || '9999-99-99').localeCompare(b.date_fin || '9999-99-99')
      return (a.collaborateur?.nom || '').localeCompare(b.collaborateur?.nom || '')
    })
  }, [rows, search, selectedCategorie, showAlertesOnly, alerteSeuil, refDate])

  const toggleCategorie = (cat) => setSelectedCategorie(prev => (prev === cat ? null : cat))
  const toggleAlertesOnly = () => setShowAlertesOnly(prev => !prev)

  // Personnes trouvées par la recherche globale mais absentes de la liste active à refDate
  // (ex : période clôturée hier, personne qui n'a pas encore de nouveau statut)
  const resultatsHorsPeriode = useMemo(() => {
    const idsActifs = new Set(rows.map(r => r.collaborateur_id))
    return globalResults.filter(g => !idsActifs.has(g.id))
  }, [globalResults, rows])

  // collabRef : { collaborateur_id, nom, prenom } -- marche aussi bien pour quelqu'un d'actif à refDate que pour quelqu'un retrouvé via la recherche globale
  const openHistorique = async (collabRef) => {
    setHistoriqueFor(collabRef)
    setHistoriquePeriodes([]); setLoadingHistorique(true)
    const { data, error } = await supabase.from('periodes')
      .select('*, collaborateur:collaborateurs(id,nom,prenom,type_contrat), statut:statuts(id,nom,categorie,date_fin_obligatoire), manager:managers(id,nom), client:clients(id,nom)')
      .eq('collaborateur_id', collabRef.collaborateur_id)
      .order('date_debut', { ascending: false })
    if (!error) setHistoriquePeriodes(data || [])
    setLoadingHistorique(false)
  }
  const closeHistorique = () => { setHistoriqueFor(null); setHistoriquePeriodes([]) }
  const openPeriodeDepuisHistorique = (periodeRow) => { closeHistorique(); openCloture(periodeRow) }

  // Depuis la recherche globale : la personne n'a peut-être aucune période active à refDate (ex : période clôturée hier, pas encore de suite)
  // -- on lui crée directement une toute première/nouvelle période via le mode "nouveau statut" du formulaire.
  const openNouvellePeriodePourCollaborateur = (collab) => {
    setManagingRow({ collaborateur_id: collab.id, nom: collab.nom, prenom: collab.prenom })
    setForm({
      isNew: false, mode: 'nouveau',
      nom: collab.nom || '', prenom: collab.prenom || '',
      statut_id: '', manager_id: '', client_id: '', date_debut: '', date_fin: '', commentaire: '',
      ancienne_date_fin: refDate,
      new_statut_id: '', new_manager_id: '', new_client_id: '',
      new_date_debut: refDate, new_date_fin: '', new_commentaire: '',
    })
    setSaveMsg('')
  }

  const openCloture = (row) => {
    setManagingRow(row)
    setForm({
      isNew: false,
      mode: 'edit', // 'edit' = modifie cette période telle quelle ; 'nouveau' = clôture + ouvre une nouvelle période
      nom: row.collaborateur?.nom || '', prenom: row.collaborateur?.prenom || '',
      // Champs de la période actuelle, modifiables directement en mode "edit"
      statut_id: row.statut_id || '', manager_id: row.manager_id || '', client_id: row.client_id || '',
      date_debut: row.date_debut || '', date_fin: row.date_fin || '', commentaire: row.commentaire || '',
      // Champs utilisés uniquement en mode "nouveau" (clôture + nouvelle période)
      // -- si cette période est déjà clôturée (date_fin déjà posée), on part de sa vraie date de fin plutôt que de refDate,
      // pour ne pas écraser une date de clôture déjà correcte.
      ancienne_date_fin: row.date_fin || refDate,
      new_statut_id: '', new_manager_id: '', new_client_id: '',
      new_date_debut: addDaysISO(row.date_fin || refDate, 1), new_date_fin: '', new_commentaire: '',
    })
    setSaveMsg('')
  }

  const openNouveau = () => {
    setManagingRow({ isNewCollab: true })
    setForm({ isNew: true, nom: '', prenom: '', type_contrat: 'salarié',
      statut_id: '', manager_id: '', client_id: '', date_debut: refDate, date_fin: '', commentaire: '' })
    setSaveMsg('')
  }

  const closeModal = () => { setManagingRow(null); setForm(null); setSaveMsg('') }
  const selectedStatut = statuts.find(s => s.id === form?.statut_id)
  const selectedStatutNouveau = statuts.find(s => s.id === form?.new_statut_id)
  const canSave = !!form && (
    form.isNew
      ? !!(form.statut_id && form.date_debut && form.nom.trim() && (!selectedStatut?.date_fin_obligatoire || form.date_fin))
      : form.mode === 'edit'
        ? !!(form.statut_id && form.date_debut && (!selectedStatut?.date_fin_obligatoire || form.date_fin))
        : !!(form.new_statut_id && form.new_date_debut && form.ancienne_date_fin && (!selectedStatutNouveau?.date_fin_obligatoire || form.new_date_fin))
  )

  const save = async () => {
    if (!canSave) return
    setSaving(true); setSaveMsg('')
    try {
      if (form.isNew) {
        const { data: newCollab, error: collabErr } = await supabase.from('collaborateurs')
          .insert({ nom: form.nom.trim(), prenom: form.prenom.trim(), type_contrat: form.type_contrat }).select().single()
        if (collabErr) throw collabErr
        const { error: insErr } = await supabase.from('periodes').insert({
          collaborateur_id: newCollab.id, statut_id: form.statut_id,
          manager_id: form.manager_id || null, client_id: form.client_id || null,
          date_debut: form.date_debut, date_fin: form.date_fin || null, commentaire: form.commentaire.trim() || null,
        })
        if (insErr) throw insErr
      } else if (form.mode === 'edit') {
        // Modifie directement cette période (pas de clôture, pas de nouvelle ligne)
        const { error: updErr } = await supabase.from('periodes').update({
          statut_id: form.statut_id, manager_id: form.manager_id || null, client_id: form.client_id || null,
          date_debut: form.date_debut, date_fin: form.date_fin || null, commentaire: form.commentaire.trim() || null,
        }).eq('id', managingRow.id)
        if (updErr) throw updErr
      } else {
        // Clôture la période en cours (si elle existe) et ouvre une nouvelle période.
        // Pas de période en cours à clôturer quand on crée directement une première/nouvelle période
        // pour quelqu'un retrouvé via la recherche globale (managingRow.id absent dans ce cas).
        if (managingRow.id) {
          const { error: closeErr } = await supabase.from('periodes').update({ date_fin: form.ancienne_date_fin }).eq('id', managingRow.id)
          if (closeErr) throw closeErr
        }
        const { error: insErr } = await supabase.from('periodes').insert({
          collaborateur_id: managingRow.collaborateur_id, statut_id: form.new_statut_id,
          manager_id: form.new_manager_id || null, client_id: form.new_client_id || null,
          date_debut: form.new_date_debut, date_fin: form.new_date_fin || null, commentaire: form.new_commentaire.trim() || null,
        })
        if (insErr) throw insErr
      }
      await loadPeriodes(refDate); closeModal()
    } catch (e) { setSaveMsg(`Erreur : ${e.message}`) }
    setSaving(false)
  }

  const createClient = async (target) => { // target: 'edit' | 'nouveau' -- quel champ client remplir une fois créé
    const nom = window.prompt('Nom du nouveau client :')
    if (!nom || !nom.trim()) return
    setCreatingClient(true); setSaveMsg('')
    try {
      const { data, error } = await supabase.from('clients').insert({ nom: nom.trim() }).select().single()
      if (error) throw error
      setClients(prev => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)))
      if (target === 'edit') setForm(f => ({ ...f, client_id: data.id }))
      else setForm(f => ({ ...f, new_client_id: data.id }))
    } catch (e) { setSaveMsg(`Erreur création client : ${e.message}`) }
    setCreatingClient(false)
  }

  const deletePeriode = async () => {
    if (!managingRow?.id) return
    const nomComplet = `${form.nom} ${form.prenom}`.trim()
    const detail = `${managingRow.statut?.nom || 'ce statut'} (depuis le ${formatDateFR(managingRow.date_debut)})`
    if (!window.confirm(`Supprimer uniquement la période "${detail}" de ${nomComplet} ?\n\nSon historique précédent (les périodes d'avant) sera conservé. Seule cette ligne disparaît. Cette action est irréversible.`)) return
    setSaving(true); setSaveMsg('')
    try {
      const { error } = await supabase.from('periodes').delete().eq('id', managingRow.id)
      if (error) throw error
      await loadPeriodes(refDate); closeModal()
    } catch (e) { setSaveMsg(`Erreur : ${e.message}`) }
    setSaving(false)
  }

  const deleteCollaborateur = async () => {
    if (!managingRow?.collaborateur_id) return
    const nomComplet = `${form.nom} ${form.prenom}`.trim()
    if (!window.confirm(`Supprimer définitivement ${nomComplet} et tout son historique de statuts ? Cette action est irréversible.`)) return
    setSaving(true); setSaveMsg('')
    try {
      const { error: delPeriodesErr } = await supabase.from('periodes').delete().eq('collaborateur_id', managingRow.collaborateur_id)
      if (delPeriodesErr) throw delPeriodesErr
      const { error: delCollabErr } = await supabase.from('collaborateurs').delete().eq('id', managingRow.collaborateur_id)
      if (delCollabErr) throw delCollabErr
      await loadPeriodes(refDate); closeModal()
    } catch (e) { setSaveMsg(`Erreur : ${e.message}`) }
    setSaving(false)
  }

  return (
    <div style={{ width: '100%', minHeight: '100%', background: BG_PAGE, padding: '28px 36px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        {/* Barre du haut : titre + recherche + date + bouton, tout sur une ligne */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: TITLE_COLOR, letterSpacing: -0.3 }}>Prod 2027</div>
            <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 }}>Effectif et statut de chaque collaborateur à une date donnée</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_SECONDARY, fontSize: 15 }}></i>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un nom..."
                style={{ width: 220, padding: '10px 14px 10px 34px', borderRadius: 10, border: '1px solid ' + BORDER, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-calendar" aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_SECONDARY, fontSize: 15, pointerEvents: 'none' }}></i>
              <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)}
                style={{ padding: '10px 14px 10px 34px', borderRadius: 10, border: '1px solid ' + BORDER, fontSize: 13.5, background: '#fff' }} />
            </div>
            <button onClick={openNouveau}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(67,56,202,0.25)' }}>
              <i className="ti ti-plus" aria-hidden="true"></i> Ajouter un collaborateur
            </button>
          </div>
        </div>

        {/* Résultats trouvés par la recherche mais sans statut actif à la date affichée (ex : période clôturée, pas encore de suite) */}
        {resultatsHorsPeriode.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, padding: '12px 18px', borderRadius: 12, border: '1.5px solid #FBD9A8', background: '#FFFAF0' }}>
            <i className="ti ti-user-search" aria-hidden="true" style={{ color: '#B45309', fontSize: 17, marginTop: 2 }}></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginBottom: 8 }}>
                Également trouvé, mais sans statut actif au {formatDateFR(refDate)} (période close sans suite, par exemple) :
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {resultatsHorsPeriode.map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid ' + BORDER, borderRadius: 999, padding: '5px 6px 5px 12px' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: TITLE_COLOR }}>{g.nom} {g.prenom}</span>
                    <button onClick={() => openHistorique({ collaborateur_id: g.id, nom: g.nom, prenom: g.prenom })}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, border: 'none', background: '#F1EFE8', color: TEXT_SECONDARY, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                      <i className="ti ti-history" aria-hidden="true" style={{ fontSize: 12 }}></i> Historique
                    </button>
                    <button onClick={() => openNouvellePeriodePourCollaborateur(g)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, border: 'none', background: ACCENT_SOFT, color: ACCENT, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                      <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 12 }}></i> Nouvelle période
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bandeau de chiffres clés, pleine largeur, répartis uniformément -- cliquables pour filtrer la liste */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 10 }}>
          <div onClick={() => setSelectedCategorie(null)}
            style={{ flex: '1 1 180px', background: '#fff', border: '1.5px solid ' + (selectedCategorie === null ? ACCENT : BORDER), borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: ACCENT_SOFT, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
              <i className="ti ti-users" aria-hidden="true"></i>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1.1 }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>Total effectif</div>
              <div style={{ fontSize: 10.5, color: TEXT_SECONDARY, marginTop: 1 }}>dont {stats.totalSalarie} salarié{stats.totalSalarie > 1 ? 's' : ''} · {stats.totalSousTraitant} sous-traitant{stats.totalSousTraitant > 1 ? 's' : ''}</div>
            </div>
          </div>
          {Object.entries(stats.byCategorie).filter(([cat]) => !CATEGORIES_HORS_EFFECTIF.includes(cat)).map(([cat, d]) => {
            const st = CATEGORIE_STYLE[cat] || DEFAULT_CAT_STYLE
            const isSelected = selectedCategorie === cat
            return (
              <div key={cat} onClick={() => toggleCategorie(cat)}
                style={{ flex: '1 1 180px', background: '#fff', border: '1.5px solid ' + (isSelected ? st.color : BORDER), borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: isSelected ? `0 0 0 3px ${st.color}22` : '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'all 0.12s' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
                  <i className={`ti ${st.icon}`} aria-hidden="true"></i>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1.1 }}>{d.count}</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>{cat}</div>
                  {!CATEGORIES_SANS_DETAIL_CONTRAT.includes(cat) && (
                    <div style={{ fontSize: 10.5, color: TEXT_SECONDARY, marginTop: 1 }}>dont {d.salarie} salarié{d.salarie > 1 ? 's' : ''} · {d.sousTraitant} sous-traitant{d.sousTraitant > 1 ? 's' : ''}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Alerte fins de période proches -- bandeau visible, cliquable pour filtrer, avec seuil réglable */}
        <div onClick={toggleAlertesOnly}
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 14, padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
            border: '1.5px solid ' + (showAlertesOnly ? '#B45309' : (stats.alertesTotal > 0 ? '#FBD9A8' : BORDER)),
            background: showAlertesOnly ? '#FEF3E2' : (stats.alertesTotal > 0 ? '#FFFAF0' : '#fff'),
            boxShadow: showAlertesOnly ? '0 0 0 3px #B4530922' : '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: stats.alertesUrgentes > 0 ? '#FCEBEB' : '#FEF3E2', color: stats.alertesUrgentes > 0 ? '#B91C1C' : '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true"></i>
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: TITLE_COLOR }}>
              {stats.alertesTotal} fin{stats.alertesTotal > 1 ? 's' : ''} de période à venir
              {stats.alertesUrgentes > 0 && <span style={{ color: '#B91C1C' }}> — dont {stats.alertesUrgentes} à moins de 7 jours</span>}
            </div>
            <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>
              {showAlertesOnly ? 'Clique pour revenir à la liste complète' : 'Clique pour voir uniquement ces collaborateurs'}
            </div>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: TEXT_SECONDARY }}>
            Alerter si fin dans les
            <select value={alerteSeuil} onChange={e => setAlerteSeuil(Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid ' + BORDER, fontSize: 12.5, background: '#fff' }}>
              <option value={7}>7 jours</option>
              <option value={15}>15 jours</option>
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>
        </div>

        {/* Sorties : peu d'intérêt au quotidien, affichées en discret sous les vignettes principales */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 24, fontSize: 12 }}>
          <span style={{ color: TEXT_SECONDARY }}>Hors effectif :</span>
          {Object.entries(stats.byCategorie).filter(([cat]) => CATEGORIES_HORS_EFFECTIF.includes(cat)).map(([cat, d]) => {
            const st = CATEGORIE_STYLE[cat] || DEFAULT_CAT_STYLE
            const isSelected = selectedCategorie === cat
            return (
              <button key={cat} onClick={() => toggleCategorie(cat)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, border: '1px solid ' + (isSelected ? st.color : BORDER), background: isSelected ? st.bg : '#fff', color: isSelected ? st.color : TEXT_SECONDARY, fontSize: 12, cursor: 'pointer' }}>
                {cat} <strong>{d.count}</strong>
              </button>
            )
          })}
        </div>

        {loadError && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{loadError}</div>}

        {/* Tableau pleine largeur */}
        <div style={{ background: '#fff', border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid ' + BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: TITLE_COLOR }}>
              Collaborateurs au {formatDateFR(refDate)}{selectedCategorie ? ` — ${selectedCategorie}` : ''}{showAlertesOnly ? ` — fins de période ≤ ${alerteSeuil}j` : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(selectedCategorie || showAlertesOnly) && (
                <button onClick={() => { setSelectedCategorie(null); setShowAlertesOnly(false) }}
                  style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  Réinitialiser
                </button>
              )}
              <div style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>{filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}</div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 50 }}>Chargement...</div>
          ) : filteredRows.length === 0 ? (
            <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 50 }}>Aucun collaborateur pour cette date.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '10px 22px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Collaborateur</th>
                  <th style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Contrat</th>
                  <th style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Statut</th>
                  <th style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Manager</th>
                  <th style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Client</th>
                  <th style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Depuis le</th>
                  <th style={{ padding: '10px 16px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Fin de période</th>
                  <th style={{ padding: '10px 22px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => {
                  const st = CATEGORIE_STYLE[r.statut?.categorie] || DEFAULT_CAT_STYLE
                  const joursRestants = r.date_fin ? diffDaysISO(refDate, r.date_fin) : null
                  return (
                    <tr key={r.id} onClick={() => openCloture(r)}
                      style={{ borderTop: '1px solid ' + BORDER, cursor: 'pointer', background: i % 2 === 1 ? '#FCFCFB' : '#fff', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = ACCENT_SOFT}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#FCFCFB' : '#fff'}>
                      <td style={{ padding: '13px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
                            {initials(r.collaborateur?.nom, r.collaborateur?.prenom)}
                          </div>
                          <span style={{ fontWeight: 600, color: TITLE_COLOR }}>{r.collaborateur?.nom} {r.collaborateur?.prenom}</span>
                          <button onClick={e => { e.stopPropagation(); openHistorique({ collaborateur_id: r.collaborateur_id, nom: r.collaborateur?.nom || '', prenom: r.collaborateur?.prenom || '' }) }} title="Voir tout l'historique de ce collaborateur"
                            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: TEXT_SECONDARY, cursor: 'pointer', padding: 3, borderRadius: 6 }}
                            onMouseEnter={e => { e.currentTarget.style.background = BORDER }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                            <i className="ti ti-history" aria-hidden="true" style={{ fontSize: 15 }}></i>
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', color: TEXT_SECONDARY }}>{r.collaborateur?.type_contrat}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>
                          {r.statut?.nom}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', color: TEXT_SECONDARY }}>{r.manager?.nom || '—'}</td>
                      <td style={{ padding: '13px 16px', color: TEXT_SECONDARY }}>{r.client?.nom || '—'}</td>
                      <td style={{ padding: '13px 16px', color: TEXT_SECONDARY, whiteSpace: 'nowrap' }}>{formatDateFR(r.date_debut)}</td>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap', ...dateFinStyle(joursRestants) }}>
                        {r.date_fin ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {joursRestants <= 7 && <i className="ti ti-alert-triangle" aria-hidden="true" style={{ fontSize: 12 }}></i>}
                            {formatDateFR(r.date_fin)}
                            {joursRestants <= alerteSeuil && <span style={{ fontSize: 10.5, fontWeight: 500 }}>&nbsp;({joursRestants}j)</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '13px 22px', color: TEXT_SECONDARY, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.commentaire || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {managingRow && form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,15,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: TITLE_COLOR, marginBottom: 4 }}>
              {form.isNew ? 'Ajouter un collaborateur' : `${form.nom} ${form.prenom}`}
            </div>
            <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginBottom: form.isNew ? 20 : 14 }}>
              {form.isNew
                ? 'Crée une fiche et sa première période de statut.'
                : form.mode === 'edit' ? "Modifie directement les informations de cette période (statut, manager, client, dates, commentaire)." : "Clôture la période en cours et ouvre une nouvelle période."}
            </div>

            {!form.isNew && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: '#F1EFE8', borderRadius: 10, padding: 4 }}>
                <button onClick={() => setForm(f => ({ ...f, mode: 'edit' }))}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    background: form.mode === 'edit' ? '#fff' : 'transparent', color: form.mode === 'edit' ? TITLE_COLOR : TEXT_SECONDARY,
                    boxShadow: form.mode === 'edit' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                  Modifier cette période
                </button>
                <button onClick={() => setForm(f => ({ ...f, mode: 'nouveau' }))}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    background: form.mode === 'nouveau' ? '#fff' : 'transparent', color: form.mode === 'nouveau' ? TITLE_COLOR : TEXT_SECONDARY,
                    boxShadow: form.mode === 'nouveau' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                  Clôturer / nouveau statut
                </button>
              </div>
            )}

            {form.isNew && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Nom</div>
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Prénom</div>
                  <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            {form.isNew && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Type de contrat</div>
                <select value={form.type_contrat} onChange={e => setForm({ ...form, type_contrat: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                  <option value="salarié">Salarié</option>
                  <option value="Sous traitant">Sous traitant</option>
                </select>
              </div>
            )}

            {(form.isNew || form.mode === 'edit') && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Statut</div>
                  <select value={form.statut_id} onChange={e => setForm({ ...form, statut_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                    <option value="">— Choisir —</option>
                    {statuts.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Manager</div>
                    <select value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                      <option value="">—</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Client</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                        style={{ flex: 1, width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                        <option value="">—</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                      <button type="button" onClick={() => createClient('edit')} disabled={creatingClient} title="Créer un nouveau client"
                        style={{ padding: '0 12px', borderRadius: 9, border: '1px solid ' + BORDER, background: '#fff', color: ACCENT, fontSize: 16, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Date de début</div>
                    <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>
                      Date de fin {selectedStatut?.date_fin_obligatoire ? '(obligatoire)' : '(optionnelle)'}
                    </div>
                    <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Commentaire</div>
                  <textarea value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} rows={2}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </>
            )}

            {!form.isNew && form.mode === 'nouveau' && (
              <>
                {managingRow?.id ? (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Fin de la période actuelle</div>
                    <input type="date" value={form.ancienne_date_fin} onChange={e => setForm({ ...form, ancienne_date_fin: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 14, fontStyle: 'italic' }}>
                    {form.nom} {form.prenom} n'a aucun statut actif en ce moment : cette nouvelle période sera simplement ajoutée à son dossier.
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Nouveau statut</div>
                  <select value={form.new_statut_id} onChange={e => setForm({ ...form, new_statut_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                    <option value="">— Choisir —</option>
                    {statuts.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Manager</div>
                    <select value={form.new_manager_id} onChange={e => setForm({ ...form, new_manager_id: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                      <option value="">—</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Client</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={form.new_client_id} onChange={e => setForm({ ...form, new_client_id: e.target.value })}
                        style={{ flex: 1, width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                        <option value="">—</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                      <button type="button" onClick={() => createClient('nouveau')} disabled={creatingClient} title="Créer un nouveau client"
                        style={{ padding: '0 12px', borderRadius: 9, border: '1px solid ' + BORDER, background: '#fff', color: ACCENT, fontSize: 16, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Date de début</div>
                    <input type="date" value={form.new_date_debut} onChange={e => setForm({ ...form, new_date_debut: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>
                      Date de fin {selectedStatutNouveau?.date_fin_obligatoire ? '(obligatoire)' : '(optionnelle)'}
                    </div>
                    <input type="date" value={form.new_date_fin} onChange={e => setForm({ ...form, new_date_fin: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Commentaire</div>
                  <textarea value={form.new_commentaire} onChange={e => setForm({ ...form, new_commentaire: e.target.value })} rows={2}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </>
            )}

            {saveMsg && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '9px 12px', borderRadius: 9, marginBottom: 14, fontSize: 13 }}>{saveMsg}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: form.isNew ? 'flex-end' : 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              {!form.isNew && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {managingRow?.id && (
                    <button onClick={deletePeriode} disabled={saving}
                      title="Supprime uniquement cette ligne de statut ; l'historique précédent de la personne est conservé"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#fff', color: '#B45309', border: '1px solid #FBD9A8', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
                      <i className="ti ti-trash" aria-hidden="true"></i> Supprimer cette période
                    </button>
                  )}
                  <button onClick={deleteCollaborateur} disabled={saving}
                    title="Supprime la fiche et tout l'historique de la personne"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#fff', color: '#A32D2D', border: '1px solid #F3C9C9', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
                    <i className="ti ti-trash" aria-hidden="true"></i> Supprimer tout le collaborateur
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={closeModal} style={{ padding: '10px 18px', background: '#fff', color: TEXT_SECONDARY, border: '1px solid ' + BORDER, borderRadius: 9, fontSize: 13, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={save} disabled={!canSave || saving}
                  style={{ padding: '10px 18px', background: canSave ? ACCENT : '#D9D6D0', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: canSave ? 'pointer' : 'default' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {historiqueFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,15,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: TITLE_COLOR }}>{historiqueFor.nom} {historiqueFor.prenom}</div>
              <button onClick={closeHistorique} style={{ background: 'none', border: 'none', color: TEXT_SECONDARY, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginBottom: 20 }}>
              Historique complet des statuts, du plus récent au plus ancien. Clique sur une ligne pour la modifier.
            </div>

            {loadingHistorique ? (
              <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 30 }}>Chargement...</div>
            ) : historiquePeriodes.length === 0 ? (
              <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 30 }}>Aucune période trouvée.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historiquePeriodes.map(p => {
                  const st = CATEGORIE_STYLE[p.statut?.categorie] || DEFAULT_CAT_STYLE
                  return (
                    <div key={p.id} onClick={() => openPeriodeDepuisHistorique(p)}
                      style={{ border: '1px solid ' + BORDER, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = ACCENT_SOFT }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>
                          {p.statut?.nom}
                        </span>
                        <span style={{ fontSize: 12.5, color: TEXT_SECONDARY, fontWeight: 600 }}>
                          {formatDateFR(p.date_debut)} → {p.date_fin ? formatDateFR(p.date_fin) : 'en cours'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>
                        {p.manager?.nom || '—'} · {p.client?.nom || '—'}
                      </div>
                      {p.commentaire && <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 4, fontStyle: 'italic' }}>{p.commentaire}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
