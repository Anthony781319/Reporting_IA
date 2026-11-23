import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const ACCENT = '#4338CA'
const BORDER = '#E5E1DC'
const TITLE_COLOR = '#2B2A28'
const TEXT_SECONDARY = '#6B6A66'

const CATEGORIE_COLORS = {
  'Prod': '#0F6E56', 'ITC': '#B45309', 'Maladie': '#B91C1C',
  'Cas RH': '#7C3AED', 'Sortie': '#6B7280', 'Sortie périmètre': '#9CA3AF',
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const addDaysISO = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const formatDateFR = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

export default function Prod2027() {
  const [refDate, setRefDate] = useState(todayISO())
  const [rows, setRows] = useState([])
  const [statuts, setStatuts] = useState([])
  const [managers, setManagers] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
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
    for (const r of rows) { const cat = r.statut?.categorie || '—'; byCategorie[cat] = (byCategorie[cat] || 0) + 1 }
    return { total: rows.length, byCategorie }
  }, [rows])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const term = search.trim().toLowerCase()
    return rows.filter(r => `${r.collaborateur?.nom} ${r.collaborateur?.prenom}`.toLowerCase().includes(term))
  }, [rows, search])

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
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '24px 32px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: TITLE_COLOR }}>Prod 2027</div>
          <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 }}>Effectif et statut de chaque collaborateur à une date donnée</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 12, color: TEXT_SECONDARY }}>Au</label>
          <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER, fontSize: 14 }} />
          <button onClick={openNouveau}
            style={{ padding: '10px 16px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Ajouter un collaborateur
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: '0 0 120px', border: '1.5px solid ' + ACCENT, borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>{stats.total}</div>
          <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 }}>Total</div>
        </div>
        {Object.entries(stats.byCategorie).map(([cat, count]) => {
          const color = CATEGORIE_COLORS[cat] || '#6B6A66'
          return (
            <div key={cat} style={{ flex: '0 0 140px', border: '1.5px solid ' + color + '50', background: color + '10', borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: 11, color, marginTop: 2 }}>{cat}</div>
            </div>
          )
        })}
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un nom..."
        style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid ' + BORDER, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }} />

      {loadError && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{loadError}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 40 }}>Chargement...</div>
      ) : filteredRows.length === 0 ? (
        <div style={{ textAlign: 'center', color: TEXT_SECONDARY, padding: 40, border: '1px solid ' + BORDER, borderRadius: 12 }}>
          Aucun collaborateur pour cette date.
        </div>
      ) : (
        <div style={{ border: '1px solid ' + BORDER, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAF9F7', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_SECONDARY }}>Nom</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_SECONDARY }}>Contrat</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_SECONDARY }}>Statut</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_SECONDARY }}>Manager</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_SECONDARY }}>Client</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_SECONDARY }}>Depuis le</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: TEXT_SECONDARY }}>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(r => {
                const color = CATEGORIE_COLORS[r.statut?.categorie] || '#6B6A66'
                return (
                  <tr key={r.id} onClick={() => openCloture(r)}
                    style={{ borderTop: '1px solid ' + BORDER, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAF9F7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: TITLE_COLOR }}>{r.collaborateur?.nom} {r.collaborateur?.prenom}</td>
                    <td style={{ padding: '12px 16px', color: TEXT_SECONDARY }}>{r.collaborateur?.type_contrat}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: color + '18', color }}>
                        {r.statut?.nom}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: TEXT_SECONDARY }}>{r.manager?.nom || '—'}</td>
                    <td style={{ padding: '12px 16px', color: TEXT_SECONDARY }}>{r.client?.nom || '—'}</td>
                    <td style={{ padding: '12px 16px', color: TEXT_SECONDARY }}>{formatDateFR(r.date_debut)}</td>
                    <td style={{ padding: '12px 16px', color: TEXT_SECONDARY, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.commentaire || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {managingRow && form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: TITLE_COLOR, marginBottom: 4 }}>
              {form.isNew ? 'Ajouter un collaborateur' : `Nouveau statut — ${form.nom} ${form.prenom}`}
            </div>
            <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 18 }}>
              {form.isNew ? 'Crée une fiche et sa première période de statut.' : "Clôture la période en cours et ouvre la nouvelle."}
            </div>

            {form.isNew && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Nom</div>
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Prénom</div>
                  <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            {form.isNew && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Type de contrat</div>
                <select value={form.type_contrat} onChange={e => setForm({ ...form, type_contrat: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER }}>
                  <option value="salarié">Salarié</option>
                  <option value="Sous traitant">Sous traitant</option>
                </select>
              </div>
            )}

            {!form.isNew && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Fin de la période actuelle</div>
                <input type="date" value={form.ancienne_date_fin} onChange={e => setForm({ ...form, ancienne_date_fin: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Nouveau statut</div>
              <select value={form.statut_id} onChange={e => setForm({ ...form, statut_id: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER }}>
                <option value="">— Choisir —</option>
                {statuts.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Manager</div>
                <select value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER }}>
                  <option value="">—</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Client</div>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER }}>
                  <option value="">—</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Date de début</div>
                <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>
                  Date de fin {selectedStatut?.date_fin_obligatoire ? '(obligatoire)' : '(optionnelle)'}
                </div>
                <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>Commentaire</div>
              <textarea value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} rows={2}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + BORDER, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {saveMsg && <div style={{ color: '#A32D2D', background: '#FCEBEB', padding: '9px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{saveMsg}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ padding: '10px 18px', background: '#fff', color: TEXT_SECONDARY, border: '1px solid ' + BORDER, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={save} disabled={!canSave || saving}
                style={{ padding: '10px 18px', background: canSave ? ACCENT : '#D9D6D0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: canSave ? 'pointer' : 'default' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
