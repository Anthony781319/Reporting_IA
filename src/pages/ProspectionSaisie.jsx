import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const RDV_OBJET_OPTIONS = [
  { value: 'decouverte',   label: 'Découverte' },
  { value: 'presentation', label: 'Présentation' },
  { value: 'prospect',     label: 'Prospect' },
  { value: 'client',       label: 'Client' },
]
const OBJET_COLORS = { decouverte: '#0F6E56', presentation: '#993556', prospect: '#534AB7', client: '#BA7517' }

const emptyForm = { nom: '', prenom: '', fonction: '', client: '', objet_meeting: '', date_rdv: '', heure_rdv: '', modalite: 'physique' }

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--color-bg-secondary)', border: '0.5px solid var(--color-border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--color-text)', outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      {children}
    </div>
  )
}

function todayISO() { return new Date().toISOString().slice(0, 10) }

export default function ProspectionSaisie({ iaId, iaName }) {
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    const start = todayISO() + 'T00:00:00'
    const end = todayISO() + 'T23:59:59'
    const { data } = await supabase.from('rdv_programmes').select('*').eq('ia_id', iaId).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false })
    setList(data || [])
    setLoaded(true)
  }

  useEffect(() => { if (iaId) load() }, [iaId])

  const complete = form.nom.trim() && form.prenom.trim() && form.client.trim() && form.objet_meeting && form.date_rdv && form.heure_rdv && form.modalite

  const submit = async () => {
    if (!complete) return
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase.from('rdv_programmes').insert({
      ia_id: iaId,
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      fonction: form.fonction.trim() || null,
      client: form.client.trim(),
      objet_meeting: form.objet_meeting,
      date_rdv: form.date_rdv,
      heure_rdv: form.heure_rdv,
      modalite: form.modalite,
    }).select().single()
    if (data) {
      setList(l => [data, ...l])
      setForm(emptyForm)
    } else {
      setError(err?.message || "Erreur d'enregistrement, réessaie.")
    }
    setSaving(false)
  }

  const remove = async (id) => {
    await supabase.from('rdv_programmes').delete().eq('id', id)
    setList(l => l.filter(r => r.id !== id))
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>📞</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>Saisie RDV — Prospection</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{iaName}</div>
      </div>

      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>Nouveau RDV</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Field label="Nom *">
            <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Dupont" style={inputStyle} />
          </Field>
          <Field label="Prénom *">
            <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Jean" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Field label="Fonction">
            <input value={form.fonction} onChange={e => setForm(f => ({ ...f, fonction: e.target.value }))} placeholder="DRH, Directeur IT..." style={inputStyle} />
          </Field>
          <Field label="Client *">
            <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Raison sociale" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Field label="Typologie *">
            <select value={form.objet_meeting} onChange={e => setForm(f => ({ ...f, objet_meeting: e.target.value }))} style={inputStyle}>
              <option value="">Sélectionner...</option>
              {RDV_OBJET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Modalité *">
            <select value={form.modalite} onChange={e => setForm(f => ({ ...f, modalite: e.target.value }))} style={inputStyle}>
              <option value="physique">🤝 Physique</option>
              <option value="teams">💻 Teams</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Field label="Date *">
            <input type="date" value={form.date_rdv} onChange={e => setForm(f => ({ ...f, date_rdv: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="Heure *">
            <input type="time" value={form.heure_rdv} onChange={e => setForm(f => ({ ...f, heure_rdv: e.target.value }))} style={inputStyle} />
          </Field>
        </div>

        <button onClick={submit} disabled={saving || !complete}
          style={{ width: '100%', padding: 13, background: (saving || !complete) ? 'var(--color-border)' : '#534AB7', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: (saving || !complete) ? 'default' : 'pointer' }}>
          {saving ? 'Enregistrement...' : '✓ Enregistrer le RDV'}
        </button>
        {error && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8 }}>
        Mes RDV saisis aujourd'hui {loaded ? `(${list.length})` : ''}
      </div>
      {loaded && list.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '10px 0' }}>Aucun RDV saisi pour l'instant.</div>
      )}
      {list.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {r.prenom} {r.nom}{r.fonction ? ` · ${r.fonction}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>🏢 {r.client}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>📅 {new Date(r.date_rdv + 'T00:00:00').toLocaleDateString('fr-FR')} à {r.heure_rdv?.slice(0, 5)}</span>
              {r.objet_meeting && (
                <span style={{ fontSize: 10, fontWeight: 700, color: OBJET_COLORS[r.objet_meeting], background: (OBJET_COLORS[r.objet_meeting] || '#534AB7') + '18', borderRadius: 5, padding: '1px 6px' }}>
                  {RDV_OBJET_OPTIONS.find(o => o.value === r.objet_meeting)?.label || r.objet_meeting}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => remove(r.id)} title="Supprimer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 15, flexShrink: 0 }}>
            <i className="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
      ))}
    </div>
  )
}
