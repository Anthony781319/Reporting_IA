import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const RDV_OBJET_LABELS = { prospect: 'Prospect', decouverte: 'Découverte', client: 'Client', presentation: 'Présentation' }

function ContactRow({ c, open, onToggle, onDelete, deleting }) {
  const label = [c.prenom, c.nom].filter(Boolean).join(' ') || '—'

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    const warning = c.nbRdv > 0
      ? `${label} a ${c.nbRdv} RDV enregistré${c.nbRdv > 1 ? 's' : ''}. Supprimer ce contact supprimera aussi son historique. Continuer ?`
      : `Supprimer le contact "${label}" ? Cette action est irréversible.`
    if (window.confirm(warning)) onDelete(c.id, label)
  }

  return (
    <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 12, marginBottom: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FCE7F3', color: '#BE185D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {(c.prenom?.[0] || c.nom?.[0] || '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
            {c.lastClient || '—'}{c.lastFonction && ` · ${c.lastFonction}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#BE185D' }}>{c.nbRdv} RDV</div>
          {c.lastDate && (
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>
              {new Date(c.lastDate).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
        <button onClick={handleDeleteClick} disabled={deleting} title="Supprimer ce contact"
          style={{ background: 'none', border: 'none', cursor: deleting ? 'default' : 'pointer', color: deleting ? 'var(--color-text-muted)' : '#BE185D', opacity: deleting ? 0.5 : 0.7, fontSize: 14, flexShrink: 0, padding: 4 }}>
          <i className="ti ti-trash" aria-hidden="true"></i>
        </button>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" style={{ color: 'var(--color-text-muted)', fontSize: 14, flexShrink: 0 }}></i>
      </div>

      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, paddingTop: 4, borderTop: '1px solid var(--color-border)', paddingBottom: 2 }}>
            {c.email && <span><i className="ti ti-mail" aria-hidden="true" style={{ marginRight: 4 }}></i>{c.email}</span>}
            {c.telephone && <span><i className="ti ti-phone" aria-hidden="true" style={{ marginRight: 4 }}></i>{c.telephone}</span>}
            {c.ias.length > 0 && <span><i className="ti ti-users" aria-hidden="true" style={{ marginRight: 4 }}></i>Rencontré par : {c.ias.join(', ')}</span>}
          </div>

          {c.history.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Aucun RDV enregistré</div>
          ) : (
            c.history.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 6, border: '1.5px solid #FBCFE8' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9D174D' }}>{r.client || '—'}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#9D174D', background: '#FCE7F3', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>
                    {RDV_OBJET_LABELS[r.objet_meeting] || r.objet_meeting}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  {r.date_meeting && <span style={{ fontSize: 10, color: '#BE185D', opacity: 0.75 }}>📅 {new Date(r.date_meeting).toLocaleDateString('fr-FR')}</span>}
                  {r.ia?.nom && <span style={{ fontSize: 10, color: '#BE185D', opacity: 0.75 }}>👤 {r.ia.nom}</span>}
                  {r.fonction && <span style={{ fontSize: 10, color: '#BE185D', opacity: 0.75 }}>💼 {r.fonction}</span>}
                </div>
                {r.compte_rendu && <div style={{ fontSize: 11, color: '#9D174D', opacity: 0.9, marginTop: 4, fontStyle: 'italic' }}>« {r.compte_rendu} »</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [rdvs, setRdvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [iaFilter, setIaFilter] = useState('')
  const [openId, setOpenId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    async function fetchData() {
      const [{ data: contactsData, error: err1 }, { data: rdvData, error: err2 }] = await Promise.all([
        supabase.from('contacts').select('*'),
        supabase.from('rdv_details').select('*, ia(nom)').order('date_meeting', { ascending: false }),
      ])
      if (!active) return
      if (err1 || err2) { setError((err1 || err2).message); setLoading(false); return }
      setContacts(contactsData || [])
      setRdvs(rdvData || [])
      setLoading(false)
    }

    fetchData()
    return () => { active = false }
  }, [])

  const rows = useMemo(() => {
    return contacts.map(c => {
      const history = rdvs
        .filter(r => r.contact_id === c.id)
        .sort((a, b) => new Date(b.date_meeting || 0) - new Date(a.date_meeting || 0))
      const last = history[0]
      const ias = [...new Set(history.map(h => h.ia?.nom).filter(Boolean))]
      return {
        ...c,
        history,
        nbRdv: history.length,
        lastClient: last?.client || '',
        lastFonction: last?.fonction || '',
        lastDate: last?.date_meeting || null,
        ias,
      }
    })
  }, [contacts, rdvs])

  const iaOptions = useMemo(() => [...new Set(rows.flatMap(r => r.ias))].sort(), [rows])

  const handleDelete = async (id, label) => {
    setDeletingId(id)
    // Un contact peut avoir des RDV liés (rdv_details.contact_id) : on les supprime d'abord pour éviter une erreur de clé étrangère.
    const { error: rdvErr } = await supabase.from('rdv_details').delete().eq('contact_id', id)
    if (rdvErr) { setError(`Erreur lors de la suppression des RDV de "${label}" : ${rdvErr.message}`); setDeletingId(null); return }
    const { error: contactErr } = await supabase.from('contacts').delete().eq('id', id)
    if (contactErr) { setError(`Erreur lors de la suppression de "${label}" : ${contactErr.message}`); setDeletingId(null); return }
    setContacts(cs => cs.filter(c => c.id !== id))
    setRdvs(rs => rs.filter(r => r.contact_id !== id))
    setDeletingId(null)
  }

  const filtered = rows
    .filter(r => {
      const term = search.trim().toLowerCase()
      const matchesSearch = !term || [r.nom, r.prenom, r.lastClient].filter(Boolean).some(v => v.toLowerCase().includes(term))
      const matchesIa = !iaFilter || r.ias.includes(iaFilter)
      return matchesSearch && matchesIa
    })
    .sort((a, b) => new Date(b.lastDate || 0) - new Date(a.lastDate || 0))

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Base Contacts</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            {contacts.length} contact{contacts.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un nom, une entreprise…"
            style={{ borderRadius: 8, padding: '6px 10px', fontSize: 13, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', minWidth: 220 }}
          />
          <select value={iaFilter} onChange={e => setIaFilter(e.target.value)}
            style={{ borderRadius: 8, padding: '6px 10px', fontSize: 13, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <option value="">Toutes les IA</option>
            {iaOptions.map(nom => <option key={nom} value={nom}>{nom}</option>)}
          </select>
        </div>
      </div>

      {error && <div style={{ color: '#B91C1C', fontSize: 13, marginBottom: 12 }}>❌ {error}</div>}
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Aucun contact ne correspond à ta recherche.</div>
      ) : (
        filtered.map(c => (
          <ContactRow key={c.id} c={c} open={openId === c.id} onToggle={() => setOpenId(id => id === c.id ? null : c.id)}
            onDelete={handleDelete} deleting={deletingId === c.id} />
        ))
      )}
    </div>
  )
}
