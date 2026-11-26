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
  'ITC disponible':     { color: '#B45309', bg: '#FEF3E2', icon: 'ti-clock-pause' },
  'ITC redémarrage':    { color: '#0E7490', bg: '#E0F2FE', icon: 'ti-repeat' },
  'ITC sortie':         { color: '#C2410C', bg: '#FFEDD5', icon: 'ti-logout' },
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
const CATEGORIES_SANS_DETAIL_CONTRAT = ['ITC disponible', 'ITC redémarrage', 'ITC sortie', 'Maladie', 'Cas RH']
// Au sein de la catégorie ITC, sous-type affiché en tuile séparée selon des mots-clés du nom du statut
// (comparaison insensible à la casse, sans dépendre d'un caractère d'apostrophe précis)
const itcSousTuile = (statutNom) => {
  const n = (statutNom || '').toLowerCase()
  if (n.includes('redémarrage') || n.includes('redemarrage')) return 'ITC redémarrage'
  if (n.includes('sortie')) return 'ITC sortie'
  return 'ITC disponible'
}
// Clé de regroupement utilisée pour les tuiles et le filtre cliquable -- identique à la catégorie,
// sauf pour ITC qui est éclaté en 3 tuiles distinctes (disponible / redémarrage / sortie)
const tuileKey = (r) => {
  const cat = r.statut?.categorie || '—'
  return cat === 'ITC' ? itcSousTuile(r.statut?.nom) : cat
}
// "Intercontrats qui coûtent" : disponibles + en redémarrage (signés mais pas encore repartis) + en sortie d'effectif
// (pas encore sortis) + KRH. Seule la maladie, dans ce même ensemble élargi, ne coûte pas (prise en charge hors Consort).
const TUILES_QUI_COUTENT = ['ITC disponible', 'ITC redémarrage', 'ITC sortie', 'Cas RH']
const TUILES_NE_COUTENT_PAS = ['Maladie']
// Les 4 tuiles regroupées à la suite du bandeau "Improductifs", dans cet ordre précis
const TUILES_BANDEAU_IMPRODUCTIFS = ['ITC disponible', 'ITC redémarrage', 'Maladie', 'Cas RH']

// Toutes ces fonctions de date raisonnent en UTC pur (jamais via l'heure locale du navigateur +
// toISOString, qui décale la date d'un jour dans un fuseau horaire en avance sur UTC comme la France).
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const addDaysISO = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
const diffDaysISO = (fromISO, toISO) => Math.round((new Date(toISO + 'T00:00:00') - new Date(fromISO + 'T00:00:00')) / 86400000)
const formatDateFR = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const initials = (nom, prenom) => `${(nom || '?')[0] || ''}${(prenom || '')[0] || ''}`.toUpperCase()

// Export CSV (ouvre nativement dans Excel, pas de librairie à installer) -- séparateur point-virgule
// pour qu'Excel en version française découpe bien les colonnes automatiquement.
const csvEscape = (v) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const telechargerCSV = (nomFichier, entetes, lignes) => {
  const corps = [entetes, ...lignes].map(ligne => ligne.map(csvEscape).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + corps], { type: 'text/csv;charset=utf-8;' }) // BOM -- accents correctement affichés dans Excel
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nomFichier
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
// Couleur de la date de fin selon l'urgence (jours restants depuis la date de référence affichée)
const dateFinStyle = (joursRestants) => {
  if (joursRestants === null) return { color: '#9CA3AF' }
  if (joursRestants <= 7) return { color: '#B91C1C', fontWeight: 700 }
  if (joursRestants <= 30) return { color: '#B45309', fontWeight: 600 }
  return { color: '#6B6A66' }
}

const MOIS_LABELS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
const firstDayOfMonthISO = (annee, mois) => `${annee}-${String(mois).padStart(2, '0')}-01`
const lastDayOfMonthISO = (annee, mois) => new Date(Date.UTC(annee, mois, 0)).toISOString().slice(0, 10) // jour 0 du mois suivant = dernier jour de ce mois (UTC pur, pas d'heure locale)
const fmtNum = (v) => (v === null || v === undefined ? '—' : (Number.isInteger(v) ? v : v.toFixed(1)))
const isActiveOn = (p, dateISO) => p.date_debut <= dateISO && (!p.date_fin || p.date_fin >= dateISO)

// Une ligne du tableau Budget : un libellé à gauche (figé, colonne collante) + 12 cellules mensuelles.
// `editable` + `onStartEdit`/`onSaveEdit` gèrent l'édition inline des deux lignes de budget.
// `lists` (un tableau de périodes par mois) + `onDrillDown` rendent la ligne cliquable pour voir le détail nominatif.
// `warn` (un tableau de booléens par mois) signale une incohérence de calcul à vérifier (petit point rouge).
function BudgetRow({ label, values, bold, editable, editingMois, editValue, setEditValue, onStartEdit, onSaveEdit, cellColor, fige, lists, onDrillDown, warn }) {
  const clickable = editable || !!lists
  return (
    <tr style={{ borderTop: '1px solid ' + BORDER }}>
      <td style={{ padding: '9px 14px', fontSize: 12.5, fontWeight: bold ? 700 : 500, color: TITLE_COLOR, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
        {label}
      </td>
      {values.map((v, i) => {
        const mois = i + 1
        const isEditing = editable && editingMois === mois
        const color = cellColor ? cellColor(v) : (bold ? TITLE_COLOR : TEXT_SECONDARY)
        const handleClick = () => {
          if (editable && !fige) return onStartEdit(mois, v)
          if (lists && onDrillDown) return onDrillDown(label, mois, lists[i] || [])
        }
        return (
          <td key={mois} onClick={handleClick}
            style={{ padding: '9px 8px', textAlign: 'center', fontSize: 12.5, fontWeight: bold ? 700 : 500, color, position: 'relative',
              cursor: clickable && (!editable || !fige) ? 'pointer' : 'default',
              background: editable ? (fige ? '#F1EFE8' : ACCENT_SOFT) : 'transparent', minWidth: 46 }}>
            {isEditing ? (
              <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={onSaveEdit}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                style={{ width: 44, padding: '2px 3px', borderRadius: 5, border: '1px solid ' + ACCENT, fontSize: 12.5, textAlign: 'center' }} />
            ) : (
              <span style={{ textDecoration: lists && !editable ? 'underline' : 'none', textDecorationColor: BORDER, textUnderlineOffset: 3 }}>
                {fmtNum(v)}
              </span>
            )}
            {warn && warn[i] && !isEditing && (
              <span title="Incohérence détectée entre le calcul direct et l'effectif début + mouvements -- à vérifier"
                style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#DC2626' }} />
            )}
          </td>
        )
      })}
    </tr>
  )
}

// Modale de détail nominatif : liste des collaborateurs qui composent un chiffre du tableau Budget.
function DrillDownModal({ info, onClose }) {
  if (!info) return null
  const exporter = () => {
    const entetes = ['Nom', 'Prénom', 'Statut', 'Date début', 'Date fin']
    const lignes = info.liste.map(p => [
      p.collaborateur?.nom, p.collaborateur?.prenom, p.statut?.nom || '',
      formatDateFR(p.date_debut), p.date_fin ? formatDateFR(p.date_fin) : 'en cours',
    ])
    const nomFichier = info.titre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') + '.csv'
    telechargerCSV(nomFichier, entetes, lignes)
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,15,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 26, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: TITLE_COLOR }}>{info.titre}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TEXT_SECONDARY, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>{info.liste.length} personne{info.liste.length > 1 ? 's' : ''}</div>
          {info.liste.length > 0 && (
            <button onClick={exporter}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1px solid ' + BORDER, background: '#fff', color: TITLE_COLOR }}>
              <i className="ti ti-file-spreadsheet" aria-hidden="true"></i> Exporter (Excel)
            </button>
          )}
        </div>
        {info.liste.length === 0 ? (
          <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 20 }}>Personne.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {info.liste.map((p, i) => (
              <div key={i} style={{ border: '1px solid ' + BORDER, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontWeight: 600, color: TITLE_COLOR, fontSize: 13 }}>{p.collaborateur?.nom} {p.collaborateur?.prenom}</span>
                <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                  {p.statut?.nom || '—'} · du {formatDateFR(p.date_debut)} {p.date_fin ? `au ${formatDateFR(p.date_fin)}` : '(en cours)'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BudgetTab() {
  const [annee, setAnnee] = useState(2026)
  const [anneesDisponibles, setAnneesDisponibles] = useState([2026, 2027])
  const [budgetRows, setBudgetRows] = useState([])
  const [periodes, setPeriodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editingCell, setEditingCell] = useState(null) // { champ: 'budget_prod' | 'budget_itc', mois }
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('budget_mensuel').select('annee').then(({ data }) => {
      const uniques = [...new Set((data || []).map(r => r.annee))].sort((a, b) => a - b)
      if (uniques.length) setAnneesDisponibles(uniques)
    })
  }, [])

  const loadBudget = async (an) => {
    setLoading(true); setLoadError('')
    // On élargit la borne basse d'un jour (31/12 de l'année précédente) : l'effectif
    // "début de mois" de janvier se calcule désormais la veille (31/12 n-1), donc il faut
    // que les périodes actives ce jour-là soient bien remontées par la requête.
    const [{ data: b, error: bErr }, { data: p, error: pErr }] = await Promise.all([
      supabase.from('budget_mensuel').select('*').eq('annee', an).order('mois'),
      supabase.from('periodes')
        .select('date_debut,date_fin,demarrage_technique,statut:statuts(categorie,nom),collaborateur:collaborateurs(nom,prenom,type_contrat)')
        .lte('date_debut', `${an}-12-31`)
        .or(`date_fin.is.null,date_fin.gte.${an - 1}-12-31`),
    ])
    if (bErr) { setLoadError(`Erreur de chargement du budget : ${bErr.message}`); setLoading(false); return }
    if (pErr) { setLoadError(`Erreur de chargement des périodes : ${pErr.message}`); setLoading(false); return }
    setBudgetRows(b || [])
    setPeriodes(p || [])
    setLoading(false)
  }

  useEffect(() => { loadBudget(annee) }, [annee])

  const monthly = useMemo(() => {
    const prodPeriodes = periodes.filter(p => p.statut?.categorie === 'Prod')
    // "ITC avec coûts" = les 3 sous-statuts ITC + Cas RH (KRH) -- tout ce qui "coûte" au sens du
    // dashboard Prod existant (TUILES_QUI_COUTENT). Seule Maladie n'est pas comptée ici.
    const itcPeriodes = periodes.filter(p => ['ITC', 'Cas RH'].includes(p.statut?.categorie))
    const inactifPeriodes = periodes.filter(p => ['ITC', 'Maladie', 'Cas RH'].includes(p.statut?.categorie))

    const rows = []
    for (let m = 1; m <= 12; m++) {
      const debutMoisISO = firstDayOfMonthISO(annee, m) // 1er du mois
      const finISO = lastDayOfMonthISO(annee, m)

      // Règle : une fin de mission est rattachée au mois qui contient sa date de fin elle-même --
      // le 31 décembre compte sur décembre, pas sur janvier -- même si la personne reste
      // techniquement active jusqu'à cette date incluse.
      const estSortieDuMois = (p) => p.date_fin && p.date_fin >= debutMoisISO && p.date_fin <= finISO
      // Sous-ensemble des sorties du mois qui laissent VRAIMENT un poste vide dès le lendemain
      // (date de fin strictement avant le dernier jour). Une personne qui termine le dernier jour
      // du mois travaille encore ce jour-là : elle compte comme une sortie du mois (ci-dessus),
      // mais reste dans l'effectif fin de mois (ci-dessous), donc elle ne doit pas être
      // soustraite deux fois dans le contrôle de cohérence.
      const estSortieAvantFinMois = (p) => p.date_fin && p.date_fin >= debutMoisISO && p.date_fin < finISO
      // "Effectif début de mois" = tout le monde actif AU 1er du mois inclus -- qu'il s'agisse
      // d'un vrai démarrage ce jour-là ou d'un simple ancrage technique (lancement de l'outil,
      // bascule IMS). "Démarrages du mois" / "ITC en +" ne compte que les arrivées STRICTEMENT
      // après le 1er (à partir du 2). Un même démarrage ne peut donc plus jamais être compté
      // dans les deux à la fois, et on n'a plus besoin de qualifier chaque personne une par une.
      const estDemarrageDuMois = (p) => p.date_debut > debutMoisISO && p.date_debut <= finISO

      const debutProdList = prodPeriodes.filter(p => isActiveOn(p, debutMoisISO))
      const debutSTTList = debutProdList.filter(p => p.collaborateur?.type_contrat === 'Sous traitant')
      const demarragesList = prodPeriodes.filter(estDemarrageDuMois)
      const sortiesList = prodPeriodes.filter(estSortieDuMois)
      const accroissement = demarragesList.length - sortiesList.length
      // "Effectif fin de mois" = actif le dernier jour du mois INCLUS -- une personne qui termine
      // sa mission le 31 travaille encore ce jour-là, donc elle reste comptée ici.
      const finProdList = prodPeriodes.filter(p => isActiveOn(p, finISO))
      const finProd = finProdList.length
      const sortiesAvantFinList = prodPeriodes.filter(estSortieAvantFinMois)
      // Indicateur de cohérence : ce total doit toujours coller à "début + démarrages - sorties
      // avant le dernier jour" (les sorties du dernier jour ne se soustraient pas, puisqu'elles
      // restent dans l'effectif fin de mois) -- le petit point rouge signale une vraie anomalie
      // de données, à vérifier au cas par cas.
      const warnFinProd = finProd !== (debutProdList.length + demarragesList.length - sortiesAvantFinList.length)

      const itcDebutList = itcPeriodes.filter(p => isActiveOn(p, debutMoisISO))
      const itcEnPlusList = itcPeriodes.filter(estDemarrageDuMois)
      const itcEnMoinsList = itcPeriodes.filter(estSortieDuMois)
      const itcEnMoinsAvantFinList = itcPeriodes.filter(estSortieAvantFinMois)
      const itcFinList = itcPeriodes.filter(p => isActiveOn(p, finISO))
      const itcFin = itcFinList.length
      const warnItcFin = itcFin !== (itcDebutList.length + itcEnPlusList.length - itcEnMoinsAvantFinList.length)

      const inactifDebutList = inactifPeriodes.filter(p => isActiveOn(p, debutMoisISO))
      const inactifFinList = inactifPeriodes.filter(p => isActiveOn(p, finISO))

      const budgetRow = budgetRows.find(b => b.mois === m) || null
      const budgetProd = budgetRow ? budgetRow.budget_prod : null
      const budgetItc = budgetRow ? budgetRow.budget_itc : null

      rows.push({
        mois: m,
        debutProd: debutProdList.length, debutProdList,
        debutSTT: debutSTTList.length, debutSTTList,
        demarrages: demarragesList.length, demarragesList,
        sorties: sortiesList.length, sortiesList,
        accroissement,
        finProd, finProdList, warnFinProd,
        budgetProd, ecartProd: budgetProd != null ? finProd - budgetProd : null,
        inactifDebut: inactifDebutList.length, inactifDebutList,
        itcDebut: itcDebutList.length, itcDebutList,
        itcEnPlus: itcEnPlusList.length, itcEnPlusList,
        itcEnMoins: itcEnMoinsList.length, itcEnMoinsList,
        itcFin, itcFinList, warnItcFin,
        inactifFin: inactifFinList.length, inactifFinList,
        budgetItc, ecartItc: budgetItc != null ? itcFin - budgetItc : null,
      })
    }
    return rows
  }, [periodes, budgetRows, annee])

  const [drillDown, setDrillDown] = useState(null) // { titre, liste }
  const openDrillDown = (label, mois, liste) => {
    setDrillDown({ titre: `${label} -- ${MOIS_LABELS[mois - 1]} ${annee}`, liste })
  }
  const closeDrillDown = () => setDrillDown(null)

  const fige = !!budgetRows[0]?.fige

  const startEdit = (champ) => (mois, valeurActuelle) => {
    setEditingCell({ champ, mois })
    setEditValue(valeurActuelle != null ? String(valeurActuelle) : '0')
  }

  const saveEdit = async () => {
    if (!editingCell) return
    const { mois, champ } = editingCell
    setEditingCell(null)
    const valeur = editValue.trim() === '' ? 0 : Number(editValue.replace(',', '.'))
    if (Number.isNaN(valeur)) return
    setSaving(true)
    try {
      const existing = budgetRows.find(b => b.mois === mois)
      if (existing) {
        const { error } = await supabase.from('budget_mensuel').update({ [champ]: valeur }).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('budget_mensuel').insert({ annee, mois, budget_prod: 0, budget_itc: 0, [champ]: valeur })
        if (error) throw error
      }
      await loadBudget(annee)
    } catch (e) { setLoadError(`Erreur d'enregistrement : ${e.message}`) }
    setSaving(false)
  }

  const toggleFige = async () => {
    const nouvelEtat = !fige
    if (!window.confirm(nouvelEtat
      ? `Figer le budget ${annee} ? Les chiffres ne seront plus modifiables depuis l'interface tant que tu ne les dé-figes pas.`
      : `Dé-figer le budget ${annee} pour pouvoir le modifier à nouveau ?`)) return
    setSaving(true)
    try {
      const { error } = await supabase.from('budget_mensuel').update({ fige: nouvelEtat }).eq('annee', annee)
      if (error) throw error
      await loadBudget(annee)
    } catch (e) { setLoadError(`Erreur : ${e.message}`) }
    setSaving(false)
  }

  const ecartColor = (v) => (v === null || v === undefined ? TEXT_SECONDARY : v < 0 ? '#B91C1C' : v > 0 ? '#0F6E56' : TEXT_SECONDARY)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: TITLE_COLOR }}>Budget vs réel</div>
          <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 2 }}>Effectif Prod (AT) et Intercontrat (avec coûts), mois par mois -- même format que le suivi envoyé à la direction</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4, background: '#F1EFE8', borderRadius: 9, padding: 3 }}>
            {anneesDisponibles.map(a => (
              <button key={a} onClick={() => setAnnee(a)}
                style={{ padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  background: annee === a ? '#fff' : 'transparent', color: annee === a ? TITLE_COLOR : TEXT_SECONDARY,
                  boxShadow: annee === a ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                {a}
              </button>
            ))}
          </div>
          <button onClick={toggleFige} disabled={saving || budgetRows.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              border: '1px solid ' + (fige ? '#FBD9A8' : BORDER), background: fige ? '#FFFAF0' : '#fff', color: fige ? '#B45309' : TEXT_SECONDARY }}>
            <i className={`ti ${fige ? 'ti-lock' : 'ti-lock-open'}`} aria-hidden="true"></i>
            {fige ? 'Budget figé -- cliquer pour modifier' : 'Figer ce budget'}
          </button>
        </div>
      </div>

      {loadError && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{loadError}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 50 }}>Chargement...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4, position: 'sticky', left: 0, background: ACCENT_SOFT, zIndex: 2 }}>Prod (AT)</th>
                {MOIS_LABELS.map(l => (
                  <th key={l} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <BudgetRow label="Effectif début de mois" values={monthly.map(m => m.debutProd)} lists={monthly.map(m => m.debutProdList)} onDrillDown={openDrillDown} />
              <BudgetRow label="Dont sous-traitants" values={monthly.map(m => m.debutSTT)} lists={monthly.map(m => m.debutSTTList)} onDrillDown={openDrillDown} />
              <BudgetRow label="Démarrages du mois" values={monthly.map(m => m.demarrages)} lists={monthly.map(m => m.demarragesList)} onDrillDown={openDrillDown} />
              <BudgetRow label="Fins de mission du mois" values={monthly.map(m => m.sorties)} lists={monthly.map(m => m.sortiesList)} onDrillDown={openDrillDown} />
              <BudgetRow label="Accroissement net" values={monthly.map(m => m.accroissement)} cellColor={ecartColor} />
              <BudgetRow label="Effectif fin de mois" values={monthly.map(m => m.finProd)} bold lists={monthly.map(m => m.finProdList)} onDrillDown={openDrillDown} warn={monthly.map(m => m.warnFinProd)} />
              <BudgetRow label="Budget Prod" values={monthly.map(m => m.budgetProd)}
                editable fige={fige} editingMois={editingCell?.champ === 'budget_prod' ? editingCell.mois : null} editValue={editValue}
                setEditValue={setEditValue} onStartEdit={startEdit('budget_prod')} onSaveEdit={saveEdit} />
              <BudgetRow label="Écart Prod vs Budget" values={monthly.map(m => m.ecartProd)} bold cellColor={ecartColor} />
            </tbody>
          </table>

          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', borderTop: '2px solid ' + BORDER }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4, position: 'sticky', left: 0, background: '#FFF7ED', zIndex: 2 }}>Intercontrat</th>
                {MOIS_LABELS.map(l => (
                  <th key={l} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9A3412', background: '#FFF7ED', textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <BudgetRow label="Total inactifs début de mois" values={monthly.map(m => m.inactifDebut)} lists={monthly.map(m => m.inactifDebutList)} onDrillDown={openDrillDown} />
              <BudgetRow label="Dont ITC + Cas RH avec coûts début de mois" values={monthly.map(m => m.itcDebut)} lists={monthly.map(m => m.itcDebutList)} onDrillDown={openDrillDown} />
              <BudgetRow label="ITC + Cas RH avec coûts en +" values={monthly.map(m => m.itcEnPlus)} lists={monthly.map(m => m.itcEnPlusList)} onDrillDown={openDrillDown} />
              <BudgetRow label="ITC + Cas RH avec coûts en -" values={monthly.map(m => m.itcEnMoins)} lists={monthly.map(m => m.itcEnMoinsList)} onDrillDown={openDrillDown} />
              <BudgetRow label="ITC + Cas RH avec coûts fin de mois" values={monthly.map(m => m.itcFin)} bold lists={monthly.map(m => m.itcFinList)} onDrillDown={openDrillDown} warn={monthly.map(m => m.warnItcFin)} />
              <BudgetRow label="Total inactifs fin de mois" values={monthly.map(m => m.inactifFin)} lists={monthly.map(m => m.inactifFinList)} onDrillDown={openDrillDown} />
              <BudgetRow label="Budget ITC (avec coûts)" values={monthly.map(m => m.budgetItc)}
                editable fige={fige} editingMois={editingCell?.champ === 'budget_itc' ? editingCell.mois : null} editValue={editValue}
                setEditValue={setEditValue} onStartEdit={startEdit('budget_itc')} onSaveEdit={saveEdit} />
              <BudgetRow label="Écart ITC vs Budget" values={monthly.map(m => m.ecartItc)} bold cellColor={ecartColor} />
            </tbody>
          </table>
        </div>
      )}

      <DrillDownModal info={drillDown} onClose={closeDrillDown} />
    </div>
  )
}

// Onglet "IA" -- performance de chaque Ingénieur d'Affaires (champ "manager" de l'outil) sur la
// population Prod (AT) uniquement : effectif en début et fin d'année, démarrages et fins de
// mission dans l'année. Même règle de comptage que l'onglet Budget (1er du mois/année inclus
// dans "début", démarrages à partir du lendemain).
function IaTab() {
  const annee = 2027
  const [periodes, setPeriodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [drillDown, setDrillDown] = useState(null)

  const loadData = async (an) => {
    setLoading(true); setLoadError('')
    const { data, error } = await supabase.from('periodes')
      .select('date_debut,date_fin,manager:managers(nom),statut:statuts(categorie),collaborateur:collaborateurs(nom,prenom)')
      .lte('date_debut', `${an}-12-31`)
      .or(`date_fin.is.null,date_fin.gte.${an}-01-01`)
    if (error) { setLoadError(`Erreur de chargement : ${error.message}`); setLoading(false); return }
    setPeriodes((data || []).filter(p => p.statut?.categorie === 'Prod'))
    setLoading(false)
  }

  useEffect(() => { loadData(annee) }, [annee])

  const debutAnneeISO = `${annee}-01-01`
  const finAnneeISO = `${annee}-12-31`

  const parIa = useMemo(() => {
    const noms = new Set(periodes.map(p => p.manager?.nom || 'Non renseigné'))
    return [...noms].sort((a, b) => {
      if (a === 'Non renseigné') return 1
      if (b === 'Non renseigné') return -1
      return a.localeCompare(b)
    }).map(nom => {
      const mine = periodes.filter(p => (p.manager?.nom || 'Non renseigné') === nom)
      const debutList = mine.filter(p => isActiveOn(p, debutAnneeISO))
      const demarragesList = mine.filter(p => p.date_debut > debutAnneeISO && p.date_debut <= finAnneeISO)
      // Une fin de mission compte sur l'année qui contient sa date de fin elle-même (le 31/12 compte
      // sur l'année en cours, pas sur la suivante) -- même règle que l'onglet Budget.
      const sortiesList = mine.filter(p => p.date_fin && p.date_fin >= debutAnneeISO && p.date_fin <= finAnneeISO)
      // "Effectif fin" = actif le 31/12 INCLUS -- une personne qui termine ce jour-là travaille
      // encore, donc elle reste comptée ici (même si elle compte aussi comme une sortie ci-dessus).
      const finList = mine.filter(p => isActiveOn(p, finAnneeISO))
      return { nom, debutList, demarragesList, sortiesList, finList }
    })
  }, [periodes, annee])

  const openDrillDown = (nomIa, label, liste) => setDrillDown({ titre: `${label} -- ${nomIa} (${annee})`, liste })

  const Cell = ({ liste, onClick }) => (
    <td onClick={onClick}
      style={{ padding: '10px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: TITLE_COLOR,
        cursor: 'pointer', borderLeft: '1px solid ' + BORDER }}>
      <span style={{ textDecoration: 'underline', textDecorationColor: BORDER, textUnderlineOffset: 3 }}>{liste.length}</span>
    </td>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: TITLE_COLOR }}>Performance par IA</div>
          <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 2 }}>Prod (AT) uniquement, {annee} -- clique sur un chiffre pour voir la liste des collaborateurs concernés</div>
        </div>
      </div>

      {loadError && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{loadError}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 50 }}>Chargement...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4, background: ACCENT_SOFT }}>IA</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, textTransform: 'uppercase', letterSpacing: 0.4, borderLeft: '1px solid ' + BORDER }}>Effectif début {annee}</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, textTransform: 'uppercase', letterSpacing: 0.4, borderLeft: '1px solid ' + BORDER }}>Démarrages</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, textTransform: 'uppercase', letterSpacing: 0.4, borderLeft: '1px solid ' + BORDER }}>Fins de mission</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, textTransform: 'uppercase', letterSpacing: 0.4, borderLeft: '1px solid ' + BORDER }}>Effectif fin {annee}</th>
              </tr>
            </thead>
            <tbody>
              {parIa.map(ia => (
                <tr key={ia.nom} style={{ borderTop: '1px solid ' + BORDER }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: ia.nom === 'Non renseigné' ? '#B45309' : TITLE_COLOR, whiteSpace: 'nowrap' }}>{ia.nom}</td>
                  <Cell liste={ia.debutList} onClick={() => openDrillDown(ia.nom, `Effectif début ${annee}`, ia.debutList)} />
                  <Cell liste={ia.demarragesList} onClick={() => openDrillDown(ia.nom, 'Démarrages', ia.demarragesList)} />
                  <Cell liste={ia.sortiesList} onClick={() => openDrillDown(ia.nom, 'Fins de mission', ia.sortiesList)} />
                  <Cell liste={ia.finList} onClick={() => openDrillDown(ia.nom, `Effectif fin ${annee}`, ia.finList)} />
                </tr>
              ))}
              {parIa.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: TEXT_SECONDARY }}>Aucune donnée Prod pour {annee}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {parIa.some(ia => ia.nom === 'Non renseigné' && (ia.debutList.length || ia.demarragesList.length || ia.finList.length)) && (
        <div style={{ fontSize: 12, color: '#B45309', marginTop: 10 }}>
          "Non renseigné" regroupe les périodes sans IA rattachée en base -- probablement un trou de saisie sur d'anciennes données plutôt qu'une vraie absence de responsable.
        </div>
      )}

      <DrillDownModal info={drillDown} onClose={() => setDrillDown(null)} />
    </div>
  )
}

// Onglet "Compte Client" -- effectif Prod (AT) par client : effectif actuel, et effectif
// au 1er janvier 2027 pour se projeter sur le début de la période.
function CompteClientTab() {
  const [periodes, setPeriodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [drillDown, setDrillDown] = useState(null)

  useEffect(() => {
    setLoading(true); setLoadError('')
    supabase.from('periodes')
      .select('date_debut,date_fin,client:clients(nom),statut:statuts(categorie),collaborateur:collaborateurs(nom,prenom)')
      .lte('date_debut', '2027-12-31')
      .or('date_fin.is.null,date_fin.gte.2027-01-01')
      .then(({ data, error }) => {
        if (error) { setLoadError(`Erreur de chargement : ${error.message}`); setLoading(false); return }
        setPeriodes((data || []).filter(p => p.statut?.categorie === 'Prod'))
        setLoading(false)
      })
  }, [])

  const parClient = useMemo(() => {
    const noms = new Set(periodes.map(p => p.client?.nom || 'Sans client'))
    const today = todayISO()
    const items = [...noms].map(nom => {
      const mine = periodes.filter(p => (p.client?.nom || 'Sans client') === nom)
      const actuelList = mine.filter(p => isActiveOn(p, today))
      const janvier2027List = mine.filter(p => isActiveOn(p, '2027-01-01'))
      return { nom, actuel: actuelList.length, actuelList, janvier2027: janvier2027List.length, janvier2027List }
    })
    return items.sort((a, b) => b.actuel - a.actuel || a.nom.localeCompare(b.nom))
  }, [periodes])

  const openDrillDown = (label, nomClient, liste) => setDrillDown({ titre: `${label} -- ${nomClient}`, liste })

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: TITLE_COLOR }}>Compte Client</div>
        <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 2 }}>Effectif Prod (AT) par client -- clique sur un chiffre pour voir la liste des collaborateurs concernés</div>
      </div>

      {loadError && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{loadError}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 50 }}>Chargement...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4, background: ACCENT_SOFT }}>Client</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, textTransform: 'uppercase', letterSpacing: 0.4, borderLeft: '1px solid ' + BORDER }}>Effectif actuel</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, textTransform: 'uppercase', letterSpacing: 0.4, borderLeft: '1px solid ' + BORDER }}>Effectif au 1er janvier 2027</th>
              </tr>
            </thead>
            <tbody>
              {parClient.map(c => (
                <tr key={c.nom} style={{ borderTop: '1px solid ' + BORDER }}>
                  <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600, color: c.nom === 'Sans client' ? '#B45309' : TITLE_COLOR, whiteSpace: 'nowrap' }}>{c.nom}</td>
                  <td onClick={() => openDrillDown('Effectif actuel', c.nom, c.actuelList)}
                    style={{ padding: '9px 10px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: TITLE_COLOR, borderLeft: '1px solid ' + BORDER, cursor: 'pointer' }}>
                    <span style={{ textDecoration: 'underline', textDecorationColor: BORDER, textUnderlineOffset: 3 }}>{c.actuel}</span>
                  </td>
                  <td onClick={() => openDrillDown('Effectif au 1er janvier 2027', c.nom, c.janvier2027List)}
                    style={{ padding: '9px 10px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: TITLE_COLOR, borderLeft: '1px solid ' + BORDER, cursor: 'pointer' }}>
                    <span style={{ textDecoration: 'underline', textDecorationColor: BORDER, textUnderlineOffset: 3 }}>{c.janvier2027}</span>
                  </td>
                </tr>
              ))}
              {parClient.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: TEXT_SECONDARY }}>Aucune donnée Prod.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <DrillDownModal info={drillDown} onClose={() => setDrillDown(null)} />
    </div>
  )
}

export default function Prod2027() {
  // Onglets internes à la page (Prod = dashboard existant, Budget = nouvel onglet) --
  // totalement indépendant du système de login/tabs de l'app, comme le reste de ce module.
  const [activeTab, setActiveTab] = useState('prod')
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
  // Démarrages prévus (périodes futures déjà enregistrées, pas encore commencées) -- même fenêtre que les alertes de fin
  const [demarragesPrevus, setDemarragesPrevus] = useState([])
  const [loadingDemarrages, setLoadingDemarrages] = useState(false)
  const [showDemarragesModal, setShowDemarragesModal] = useState(false)
  const [managingRow, setManagingRow] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [creatingManager, setCreatingManager] = useState(false)
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

  // Périodes déjà enregistrées qui commencent APRÈS la date affichée (pas encore actives) -- pour vérifier
  // que les démarrages prévus (ex : fin d'ITC redémarrage -> reprise en Prod) se réalisent bien à la date prévue.
  const loadDemarrages = async (date, seuilJours) => {
    setLoadingDemarrages(true)
    const dateLimite = addDaysISO(date, seuilJours)
    // Un "démarrage" ne concerne que la Prod et la Prod forfait -- !inner sur statuts pour pouvoir filtrer dessus
    const { data, error } = await supabase.from('periodes')
      .select('*, collaborateur:collaborateurs(id,nom,prenom,type_contrat), statut:statuts!inner(id,nom,categorie,date_fin_obligatoire), manager:managers(id,nom), client:clients(id,nom)')
      .gt('date_debut', date)
      .lte('date_debut', dateLimite)
      .in('statut.categorie', ['Prod', 'Prod forfait'])
      .order('date_debut', { ascending: true })
    if (!error) setDemarragesPrevus(data || [])
    setLoadingDemarrages(false)
  }

  useEffect(() => { loadRefData() }, [])
  useEffect(() => { loadPeriodes(refDate) }, [refDate])
  useEffect(() => { loadDemarrages(refDate, alerteSeuil) }, [refDate, alerteSeuil])

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
    let improductifsCoute = 0, improductifsNeCoutePas = 0
    for (const r of rows) {
      const cat = r.statut?.categorie || '—'
      const tk = tuileKey(r)
      const isSalarie = r.collaborateur?.type_contrat === 'salarié'
      if (!byCategorie[tk]) byCategorie[tk] = { count: 0, salarie: 0, sousTraitant: 0 }
      byCategorie[tk].count += 1
      if (isSalarie) byCategorie[tk].salarie += 1; else byCategorie[tk].sousTraitant += 1
      if (CATEGORIES_EFFECTIF.includes(cat)) {
        total += 1
        if (isSalarie) totalSalarie += 1; else totalSousTraitant += 1
      }
      if (TUILES_QUI_COUTENT.includes(tk)) improductifsCoute += 1
      else if (TUILES_NE_COUTENT_PAS.includes(tk)) improductifsNeCoutePas += 1
    }
    const improductifsTotal = improductifsCoute + improductifsNeCoutePas
    // Fins de période proches de la date affichée (toujours >= refDate, vu le filtre de chargement)
    let alertesUrgentes = 0, alertesProches = 0
    for (const r of rows) {
      if (!r.date_fin) continue
      const j = diffDaysISO(refDate, r.date_fin)
      if (j <= 7) alertesUrgentes += 1
      else if (j <= alerteSeuil) alertesProches += 1
    }
    return {
      total, totalSalarie, totalSousTraitant, byCategorie,
      alertesUrgentes, alertesProches, alertesTotal: alertesUrgentes + alertesProches,
      improductifsCoute, improductifsNeCoutePas, improductifsTotal,
    }
  }, [rows, alerteSeuil, refDate])

  const filteredRows = useMemo(() => {
    let result = rows
    if (selectedCategorie === '__IMPRODUCTIFS__') {
      result = result.filter(r => TUILES_QUI_COUTENT.includes(tuileKey(r)) || TUILES_NE_COUTENT_PAS.includes(tuileKey(r)))
    } else if (selectedCategorie === '__PRODUCTION__') {
      result = result.filter(r => tuileKey(r) === 'Prod' || tuileKey(r) === 'Prod forfait')
    } else if (selectedCategorie) {
      result = result.filter(r => tuileKey(r) === selectedCategorie)
    } else {
      // Vue par défaut (Total effectif, rien de sélectionné) : les Sortie / Sortie périmètre restent
      // consultables uniquement à l'acte, via leur propre badge dans "Hors effectif"
      result = result.filter(r => !CATEGORIES_HORS_EFFECTIF.includes(tuileKey(r)))
    }
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

  const exporterPopulation = () => {
    const entetes = ['Nom', 'Prénom', 'Contrat', 'Statut', 'Catégorie', 'Manager', 'Client', 'Date début', 'Date fin', 'Commentaire']
    const lignes = filteredRows.map(r => [
      r.collaborateur?.nom, r.collaborateur?.prenom, r.collaborateur?.type_contrat,
      r.statut?.nom, r.statut?.categorie, r.manager?.nom, r.client?.nom,
      formatDateFR(r.date_debut), r.date_fin ? formatDateFR(r.date_fin) : 'en cours', r.commentaire,
    ])
    telechargerCSV(`collaborateurs_${refDate}.csv`, entetes, lignes)
  }

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
      await loadPeriodes(refDate); await loadDemarrages(refDate, alerteSeuil); closeModal()
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

  const createManager = async (target) => { // target: 'edit' | 'nouveau' -- quel champ manager remplir une fois créé
    const nom = window.prompt('Nom du nouveau manager :')
    if (!nom || !nom.trim()) return
    setCreatingManager(true); setSaveMsg('')
    try {
      const { data, error } = await supabase.from('managers').insert({ nom: nom.trim(), actif: true }).select().single()
      if (error) throw error
      setManagers(prev => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)))
      if (target === 'edit') setForm(f => ({ ...f, manager_id: data.id }))
      else setForm(f => ({ ...f, new_manager_id: data.id }))
    } catch (e) { setSaveMsg(`Erreur création manager : ${e.message}`) }
    setCreatingManager(false)
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
      await loadPeriodes(refDate); await loadDemarrages(refDate, alerteSeuil); closeModal()
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
      await loadPeriodes(refDate); await loadDemarrages(refDate, alerteSeuil); closeModal()
    } catch (e) { setSaveMsg(`Erreur : ${e.message}`) }
    setSaving(false)
  }

  return (
    <div style={{ width: '100%', minHeight: '100%', background: BG_PAGE, padding: '28px 36px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        {/* Onglets internes à la page Prod 2027 (Prod / Budget / IA / Compte Client) */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22, borderBottom: '1px solid ' + BORDER }}>
          {[
            { id: 'prod', label: 'Prod', icon: 'ti-layout-columns' },
            { id: 'budget', label: 'Budget', icon: 'ti-chart-line' },
            { id: 'ia', label: 'IA', icon: 'ti-user-star' },
            { id: 'client', label: 'Compte Client', icon: 'ti-building' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'none', border: 'none',
                borderBottom: '2.5px solid ' + (activeTab === t.id ? ACCENT : 'transparent'),
                color: activeTab === t.id ? ACCENT : TEXT_SECONDARY, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginBottom: -1 }}>
              <i className={`ti ${t.icon}`} aria-hidden="true"></i> {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'budget' && <BudgetTab />}
        {activeTab === 'ia' && <IaTab />}
        {activeTab === 'client' && <CompteClientTab />}

        {activeTab === 'prod' && (<>

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

        {/* Total effectif -- isolé tout en haut, bien visible, pour rester lisible indépendamment du reste */}
        <div onClick={() => setSelectedCategorie(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, padding: '18px 22px', borderRadius: 16, cursor: 'pointer',
            border: '1.5px solid ' + (selectedCategorie === null ? ACCENT : BORDER), background: '#fff',
            boxShadow: selectedCategorie === null ? `0 0 0 3px ${ACCENT}22` : '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: ACCENT_SOFT, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>
            <i className="ti ti-users" aria-hidden="true"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1.1 }}>{stats.total}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: TITLE_COLOR }}>Total effectif</div>
            </div>
            <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>dont {stats.totalSalarie} salarié{stats.totalSalarie > 1 ? 's' : ''} · {stats.totalSousTraitant} sous-traitant{stats.totalSousTraitant > 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Improductifs : bandeau raccourci + les 4 tuiles concernées à sa suite (disponible, redémarrage, maladie, KRH) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 10 }}>
          <div onClick={() => toggleCategorie('__IMPRODUCTIFS__')}
            style={{ flex: '1 1 280px', maxWidth: 340, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 14, cursor: 'pointer',
              border: '1.5px solid ' + (selectedCategorie === '__IMPRODUCTIFS__' ? '#9A3412' : '#FDBA74'),
              background: selectedCategorie === '__IMPRODUCTIFS__' ? '#FFEDD5' : '#FFF7ED',
              boxShadow: selectedCategorie === '__IMPRODUCTIFS__' ? '0 0 0 3px #9A341222' : '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FFEDD5', color: '#9A3412', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
              <i className="ti ti-coin" aria-hidden="true"></i>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1.1 }}>{stats.improductifsTotal}</div>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>Improductifs (ITC + KRH + Maladie)</div>
              <div style={{ fontSize: 10.5, color: TEXT_SECONDARY, marginTop: 1 }}>dont <strong style={{ color: '#9A3412' }}>{stats.improductifsCoute} coûtent</strong> · {stats.improductifsNeCoutePas} maladie</div>
            </div>
          </div>

          {TUILES_BANDEAU_IMPRODUCTIFS.map(cat => {
            const d = stats.byCategorie[cat] || { count: 0, salarie: 0, sousTraitant: 0 }
            const st = CATEGORIE_STYLE[cat] || DEFAULT_CAT_STYLE
            const isSelected = selectedCategorie === cat
            return (
              <div key={cat} onClick={() => toggleCategorie(cat)}
                style={{ flex: '1 1 150px', background: '#fff', border: '1.5px solid ' + (isSelected ? st.color : BORDER), borderRadius: 14, padding: '16px', display: 'flex', alignItems: 'center', gap: 11, boxShadow: isSelected ? `0 0 0 3px ${st.color}22` : '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'all 0.12s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  <i className={`ti ${st.icon}`} aria-hidden="true"></i>
                </div>
                <div>
                  <div style={{ fontSize: 21, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1.1 }}>{d.count}</div>
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 }}>{cat}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Production : qui produit aujourd'hui (Prod + Prod forfait réunis), puis le détail */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 10 }}>
          <div onClick={() => toggleCategorie('__PRODUCTION__')}
            style={{ flex: '1 1 180px', background: '#fff', border: '1.5px solid ' + (selectedCategorie === '__PRODUCTION__' ? '#0F6E56' : BORDER), borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: selectedCategorie === '__PRODUCTION__' ? '0 0 0 3px #0F6E5622' : '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#E1F5EE', color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
              <i className="ti ti-trending-up" aria-hidden="true"></i>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1.1 }}>{(stats.byCategorie['Prod']?.count || 0) + (stats.byCategorie['Prod forfait']?.count || 0)}</div>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>Personnes qui produisent</div>
              <div style={{ fontSize: 10.5, color: TEXT_SECONDARY, marginTop: 1 }}>dont {stats.byCategorie['Prod']?.count || 0} en régie/AT · {stats.byCategorie['Prod forfait']?.count || 0} au forfait</div>
            </div>
          </div>
          {Object.entries(stats.byCategorie).filter(([cat]) => !CATEGORIES_HORS_EFFECTIF.includes(cat) && !TUILES_BANDEAU_IMPRODUCTIFS.includes(cat)).map(([cat, d]) => {
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

        {/* Alertes de date : fins de période proches (moitié gauche) + démarrages prévus à vérifier (moitié droite),
            avec un seul seuil réglable partagé par les deux */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, fontSize: 12.5, color: TEXT_SECONDARY, marginBottom: 8 }}>
            Fenêtre d'alerte :
            <select value={alerteSeuil} onChange={e => setAlerteSeuil(Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid ' + BORDER, fontSize: 12.5, background: '#fff' }}>
              <option value={7}>7 jours</option>
              <option value={15}>15 jours</option>
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {/* Fins de période proches */}
            <div onClick={toggleAlertesOnly}
              style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
                border: '1.5px solid ' + (showAlertesOnly ? '#B45309' : (stats.alertesTotal > 0 ? '#FBD9A8' : BORDER)),
                background: showAlertesOnly ? '#FEF3E2' : (stats.alertesTotal > 0 ? '#FFFAF0' : '#fff'),
                boxShadow: showAlertesOnly ? '0 0 0 3px #B4530922' : '0 1px 2px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: stats.alertesUrgentes > 0 ? '#FCEBEB' : '#FEF3E2', color: stats.alertesUrgentes > 0 ? '#B91C1C' : '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
                <i className="ti ti-alert-triangle" aria-hidden="true"></i>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: TITLE_COLOR }}>
                  {stats.alertesTotal} fin{stats.alertesTotal > 1 ? 's' : ''} de période à venir
                  {stats.alertesUrgentes > 0 && <span style={{ color: '#B91C1C' }}> — dont {stats.alertesUrgentes} à moins de 7 jours</span>}
                </div>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>
                  {showAlertesOnly ? 'Clique pour revenir à la liste complète' : 'Clique pour voir uniquement ces collaborateurs'}
                </div>
              </div>
            </div>

            {/* Démarrages prévus -- périodes déjà enregistrées, pas encore commencées, à vérifier une fois la date passée */}
            <div onClick={() => setShowDemarragesModal(true)}
              style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
                border: '1.5px solid ' + (demarragesPrevus.length > 0 ? '#93C5FD' : BORDER),
                background: demarragesPrevus.length > 0 ? '#EFF6FF' : '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
                <i className="ti ti-player-play" aria-hidden="true"></i>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: TITLE_COLOR }}>
                  {demarragesPrevus.length} démarrage{demarragesPrevus.length > 1 ? 's' : ''} prévu{demarragesPrevus.length > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>
                  Clique pour voir le détail et vérifier qu'ils se sont bien réalisés
                </div>
              </div>
            </div>
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
              Collaborateurs au {formatDateFR(refDate)}{selectedCategorie ? ` — ${selectedCategorie === '__IMPRODUCTIFS__' ? 'Improductifs (ITC + KRH + Maladie)' : selectedCategorie === '__PRODUCTION__' ? 'Personnes qui produisent' : selectedCategorie}` : ''}{showAlertesOnly ? ` — fins de période ≤ ${alerteSeuil}j` : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(selectedCategorie || showAlertesOnly) && (
                <button onClick={() => { setSelectedCategorie(null); setShowAlertesOnly(false) }}
                  style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  Réinitialiser
                </button>
              )}
              <div style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>{filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}</div>
              {filteredRows.length > 0 && (
                <button onClick={exporterPopulation}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid ' + BORDER, background: '#fff', color: TITLE_COLOR }}>
                  <i className="ti ti-file-spreadsheet" aria-hidden="true"></i> Exporter (Excel)
                </button>
              )}
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

        </>)}
      </div>

      {activeTab === 'prod' && managingRow && form && (
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
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })}
                        style={{ flex: 1, width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                        <option value="">—</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                      </select>
                      <button type="button" onClick={() => createManager('edit')} disabled={creatingManager} title="Créer un nouveau manager"
                        style={{ padding: '0 12px', borderRadius: 9, border: '1px solid ' + BORDER, background: '#fff', color: ACCENT, fontSize: 16, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        +
                      </button>
                    </div>
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
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={form.new_manager_id} onChange={e => setForm({ ...form, new_manager_id: e.target.value })}
                        style={{ flex: 1, width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                        <option value="">—</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                      </select>
                      <button type="button" onClick={() => createManager('nouveau')} disabled={creatingManager} title="Créer un nouveau manager"
                        style={{ padding: '0 12px', borderRadius: 9, border: '1px solid ' + BORDER, background: '#fff', color: ACCENT, fontSize: 16, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        +
                      </button>
                    </div>
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

      {activeTab === 'prod' && historiqueFor && (
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

      {activeTab === 'prod' && showDemarragesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,15,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: TITLE_COLOR }}>Démarrages prévus</div>
              <button onClick={() => setShowDemarragesModal(false)} style={{ background: 'none', border: 'none', color: TEXT_SECONDARY, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginBottom: 20 }}>
              Périodes de Prod ou Prod forfait déjà enregistrées, qui commencent dans les {alerteSeuil} prochains jours (pas encore actives). Clique sur une ligne pour la vérifier ou l'ajuster.
            </div>

            {loadingDemarrages ? (
              <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 30 }}>Chargement...</div>
            ) : demarragesPrevus.length === 0 ? (
              <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 30 }}>Aucun démarrage prévu dans cette fenêtre.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {demarragesPrevus.map(p => {
                  const st = CATEGORIE_STYLE[p.statut?.categorie] || DEFAULT_CAT_STYLE
                  return (
                    <div key={p.id} onClick={() => { setShowDemarragesModal(false); openCloture(p) }}
                      style={{ border: '1px solid ' + BORDER, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = ACCENT_SOFT }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: TITLE_COLOR }}>{p.collaborateur?.nom} {p.collaborateur?.prenom}</span>
                        <span style={{ fontSize: 12.5, color: '#1D4ED8', fontWeight: 600 }}>Démarre le {formatDateFR(p.date_debut)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>
                          {p.statut?.nom}
                        </span>
                        <span style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>{p.manager?.nom || '—'} · {p.client?.nom || '—'}</span>
                      </div>
                      {p.commentaire && <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginTop: 6, fontStyle: 'italic' }}>{p.commentaire}</div>}
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
