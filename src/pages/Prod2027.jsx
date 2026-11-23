import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const ACCENT = '#4338CA'
const BORDER = '#E5E1DC'
const TITLE_COLOR = '#2B2A28'
const TEXT_SECONDARY = '#6B6A66'

const CATEGORIE_COLORS = {
  'Prod': '#0F6E56',
  'ITC': '#B45309',
  'Maladie': '#B91C1C',
  'Cas RH': '#7C3AED',
  'Sortie': '#6B7280',
  'Sortie périmètre': '#9CA3AF',
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const addDaysISO = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
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
    setLoading(true)
    setLoadError('')
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
    for (const r of rows) {
      const cat = r.statut?.categorie || '—'
      byCategorie[cat] = (byCategorie[cat] || 0) + 1
    }
    return { total: rows.length, byCategorie }
  }, [rows])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const term = search.trim().toLowerCase()
    return rows.filter(r => `${r.collaborateur?.nom} ${r.collaborateur?.prenom}`.toLowerCase().includes(term))
  }, [rows, search])

  const openCloture = (row) => {
    setManagingRow(row)
    setForm({
      isNew: false,
      nom: row.collaborateur?.nom || '', prenom: row.collaborateur?.prenom || '',
      ancienne_date_fin: refDate,
      statut_id: '', manager_id: row.manager?.id || '', client_id: row.client?.id || '',
      date_debut: addDaysISO(refDate, 1), date_fin: '', commentaire: '',
    })
    setSaveMsg('')
  }

  const openNouveau = () => {
    setManagingRow({ isNewCollab: true })
    setForm({
      isNew: true,
      nom: '', prenom: '', type_contrat: 'salarié',
      statut_id: '', manager_id: '', client_id: '',
      date_debut: refDate, date_fin: '', commentaire: '',
    })
    setSaveMsg('')
  }

  const closeModal = () => { setManagingRow(null); setForm(null); setSaveMsg('') }

  const selectedStatut = statuts.find(s => s.id === form?.statut_id)
  const canSave = !!(form && form.statut_id && form.date_debut && form.nom.trim() &&
    (!selectedStatut?.date_fin_obligatoire || form.date_fin))

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setSaveMsg('')
    try {
      let collaborateurId = managingRow?.collaborateur_id
      if (form.isNew) {
        const { data: newCollab, error: collabErr } = await supabase.from('collaborateurs')
          .insert({ nom: form.nom.trim(), prenom: form.prenom.trim(), type_contrat: form.type_contrat })
          .select().single()
        if (collabErr) throw collabErr
        collaborateurId = newCollab.id
      } else {
        const { error: closeErr } = await supabase.from('periodes')
          .update({ date_fin: form.ancienne_date_fin })
          .eq('id', managingRow.id)
        if (closeErr) throw closeErr
        collaborateurId = managingRow.collaborateur_id
      }
      const { error: insErr } = await supabase.from('periodes').insert({
        collaborateur_id: collaborateurId,
        statut_id: form.statut_id,
        manager_id: form.manager_id || null,
        client_id: form.client_id || null,
        date_debut: form.date_debut,
        date_fin: form.date_fin || null,
        commentaire: form.commentaire.trim() || null,
      })
      if (insErr) throw insErr
      await loadPeriodes(refDate)
      closeModal()
    } catch (e) {
      setSaveMsg(`Erreur : ${e.message}`)
    }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: TEXT_SECONDARY }}>Chargement...</div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Prod 2027</div>
          <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>Effectif et statut de chaque collaborateur à une date donnée</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: TEXT_SECONDARY }}>Au</label>
          <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 13 }} />
          <button onClick={openNouveau}
            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Ajouter un collaborateur
          </button>
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12.5, fontWeight: 600 }}>
          ⚠️ {loadError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ background: '#fff', border: `1.5px solid ${ACCENT}`, borderRadius: 12, padding: '10px 16px', minWidth: 90, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>{stats.total}</div>
          <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>Total</div>
        </div>
        {Object.entries(stats.byCategorie).map(([cat, count]) => (
          <div key={cat} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 16px', minWidth: 90, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: CATEGORIE_COLORS[cat] || TITLE_COLOR }}>{count}</div>
            <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>{cat}</div>
          </div>
        ))}
      </div>

      <input type="text" placeholder="Rechercher un nom..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 13, marginBottom: 12 }} />

      <div style={{ background: '#fff', border: `0.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        {filteredRows.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: TEXT_SECONDARY, fontSize: 13 }}>Aucun collaborateur pour cette date.</div>
        ) : filteredRows.map((r, i) => (
          <div key={r.id} onClick={() => openCloture(r)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : `0.5px solid ${BORDER}`, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: TITLE_COLOR }}>{r.collaborateur?.nom} {r.collaborateur?.prenom}</div>
              <div style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 2 }}>
                {r.manager?.nom ? `Manager : ${r.manager.nom}` : 'Pas de manager'}{r.client?.nom ? ` · Client : ${r.client.nom}` : ''}
                {r.date_fin ? ` · jusqu'au ${new Date(r.date_fin).toLocaleDateString('fr-FR')}` : ''}
              </div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 20, background: (CATEGORIE_COLORS[r.statut?.categorie] || TEXT_SECONDARY) + '20', color: CATEGORIE_COLORS[r.statut?.categorie] || TEXT_SECONDARY, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {r.statut?.nom}
            </span>
          </div>
        ))}
      </div>

      {managingRow && form && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TITLE_COLOR, marginBottom: 4 }}>
              {form.isNew ? '+ Ajouter un collaborateur' : `Nouvelle situation — ${form.nom} ${form.prenom}`}
            </div>
            <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 12 }}>
              {form.isNew ? "Crée le collaborateur et sa première période." : "Clôture la période en cours et ouvre la suivante."}
            </div>

            {form.isNew && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Nom *</label>
                  <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Prénom *</label>
                  <input type="text" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Type de contrat</label>
                  <select value={form.type_contrat} onChange={e => setForm(f => ({ ...f, type_contrat: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="salarié">Salarié</option>
                    <option value="Sous traitant">Sous traitant</option>
                  </select>
                </div>
              </div>
            )}

            {!form.isNew && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Date de fin de la période actuelle</label>
                <input type="date" value={form.ancienne_date_fin} onChange={e => setForm(f => ({ ...f, ancienne_date_fin: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            )}

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Nouveau statut *</label>
              <select value={form.statut_id} onChange={e => setForm(f => ({ ...f, statut_id: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">Choisir...</option>
                {statuts.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Manager</label>
                <select value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="">Aucun</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Client</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="">Aucun</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Date de début *</label>
                <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>
                  Date de fin{selectedStatut?.date_fin_obligatoire ? ' *' : selectedStatut ? ' (recommandée)' : ''}
                </label>
                <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'block', marginBottom: 4 }}>Commentaire</label>
              <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))} rows={2}
                style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: 8, borderRadius: 8, border: `0.5px solid ${BORDER}`, boxSizing: 'border-box' }} />
            </div>

            {saveMsg && (
              <div style={{ fontSize: 12, marginBottom: 10, color: '#A32D2D', padding: '6px 10px', background: '#FCEBEB', borderRadius: 6 }}>{saveMsg}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={closeModal}
                style={{ padding: '0 14px', background: 'none', border: `1.5px solid ${BORDER}`, color: TEXT_SECONDARY, borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={save} disabled={saving || !canSave}
                style={{ flex: 1, padding: 12, background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
