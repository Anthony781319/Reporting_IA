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

const todayISO = () => new Date().toISOString().slice(0, 10)
const addDaysISO = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const formatDateFR = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const initials = (nom, prenom) => `${(nom || '?')[0] || ''}${(prenom || '')[0] || ''}`.toUpperCase()

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
  const [managingRow, setManagingRow] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

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

  const stats = useMemo(() => {
    const byCategorie = {}
    let total = 0
    for (const r of rows) {
      const cat = r.statut?.categorie || '—'
      byCategorie[cat] = (byCategorie[cat] || 0) + 1
      if (!CATEGORIES_HORS_EFFECTIF.includes(cat)) total += 1
    }
    return { total, byCategorie }
  }, [rows])

  const filteredRows = useMemo(() => {
    let result = rows
    if (selectedCategorie) result = result.filter(r => (r.statut?.categorie || '—') === selectedCategorie)
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter(r => `${r.collaborateur?.nom} ${r.collaborateur?.prenom}`.toLowerCase().includes(term))
    }
    return result
  }, [rows, search, selectedCategorie])

  const toggleCategorie = (cat) => setSelectedCategorie(prev => (prev === cat ? null : cat))

  const openCloture = (row) => {
    setManagingRow(row)
    setForm({ isNew: false, nom: row.collaborateur?.nom || '', prenom: row.collaborateur?.prenom || '',
      ancienne_date_fin: refDate, statut_id: '', manager_id: row.manager?.id || '', client_id: row.client?.id || '',
      date_debut: addDaysISO(refDate, 1), date_fin: '', commentaire: '' })
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
  const canSave = !!(form && form.statut_id && form.date_debut && form.nom.trim() &&
    (!selectedStatut?.date_fin_obligatoire || form.date_fin))

  const save = async () => {
    if (!canSave) return
    setSaving(true); setSaveMsg('')
    try {
      let collaborateurId = managingRow?.collaborateur_id
      if (form.isNew) {
        const { data: newCollab, error: collabErr } = await supabase.from('collaborateurs')
          .insert({ nom: form.nom.trim(), prenom: form.prenom.trim(), type_contrat: form.type_contrat }).select().single()
        if (collabErr) throw collabErr
        collaborateurId = newCollab.id
      } else {
        const { error: closeErr } = await supabase.from('periodes').update({ date_fin: form.ancienne_date_fin }).eq('id', managingRow.id)
        if (closeErr) throw closeErr
        collaborateurId = managingRow.collaborateur_id
      }
      const { error: insErr } = await supabase.from('periodes').insert({
        collaborateur_id: collaborateurId, statut_id: form.statut_id,
        manager_id: form.manager_id || null, client_id: form.client_id || null,
        date_debut: form.date_debut, date_fin: form.date_fin || null, commentaire: form.commentaire.trim() || null,
      })
      if (insErr) throw insErr
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

        {/* Bandeau de chiffres clés, pleine largeur, répartis uniformément -- cliquables pour filtrer la liste */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
          <div onClick={() => setSelectedCategorie(null)}
            style={{ flex: '1 1 160px', background: '#fff', border: '1.5px solid ' + (selectedCategorie === null ? ACCENT : BORDER), borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: ACCENT_SOFT, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
              <i className="ti ti-users" aria-hidden="true"></i>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1.1 }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>Total effectif</div>
            </div>
          </div>
          {Object.entries(stats.byCategorie).map(([cat, count]) => {
            const st = CATEGORIE_STYLE[cat] || DEFAULT_CAT_STYLE
            const isSelected = selectedCategorie === cat
            return (
              <div key={cat} onClick={() => toggleCategorie(cat)}
                style={{ flex: '1 1 160px', background: '#fff', border: '1.5px solid ' + (isSelected ? st.color : BORDER), borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: isSelected ? `0 0 0 3px ${st.color}22` : '0 1px 2px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'all 0.12s' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
                  <i className={`ti ${st.icon}`} aria-hidden="true"></i>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1.1 }}>{count}</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>{cat}</div>
                </div>
              </div>
            )
          })}
        </div>

        {loadError && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{loadError}</div>}

        {/* Tableau pleine largeur */}
        <div style={{ background: '#fff', border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid ' + BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: TITLE_COLOR }}>
              Collaborateurs au {formatDateFR(refDate)}{selectedCategorie ? ` — ${selectedCategorie}` : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedCategorie && (
                <button onClick={() => setSelectedCategorie(null)}
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
                  <th style={{ padding: '10px 22px', fontSize: 11.5, fontWeight: 600, color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => {
                  const st = CATEGORIE_STYLE[r.statut?.categorie] || DEFAULT_CAT_STYLE
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
              {form.isNew ? 'Ajouter un collaborateur' : `Nouveau statut — ${form.nom} ${form.prenom}`}
            </div>
            <div style={{ fontSize: 12.5, color: TEXT_SECONDARY, marginBottom: 20 }}>
              {form.isNew ? 'Crée une fiche et sa première période de statut.' : "Clôture la période en cours et ouvre la nouvelle."}
            </div>

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

            {!form.isNew && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Fin de la période actuelle</div>
                <input type="date" value={form.ancienne_date_fin} onChange={e => setForm({ ...form, ancienne_date_fin: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6, fontWeight: 500 }}>Nouveau statut</div>
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
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid ' + BORDER }}>
                  <option value="">—</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
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

            {saveMsg && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '9px 12px', borderRadius: 9, marginBottom: 14, fontSize: 13 }}>{saveMsg}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
      )}
    </div>
  )
}
