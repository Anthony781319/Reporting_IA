import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const fields = [
  { key: 'decouvertes', label: 'Découvertes' },
  { key: 'prospects', label: 'Prospects' },
  { key: 'clients', label: 'Clients' },
  { key: 'presentations', label: 'Présentations' },
  { key: 'total_rdv', label: 'Total RDV' },
  { key: 'rdv_candidats', label: 'RDV candidats' },
  { key: 'cv_envoyes', label: 'CV envoyés' },
  { key: 'besoins_detectes', label: 'Besoins détectés' },
  { key: 'besoins_sans_solution', label: 'Besoins sans solution' },
  { key: 'presentation_planifiee', label: 'Présentation planifiée' },
  { key: 'attente_retour', label: 'Attente retour client' },
  { key: 'signatures', label: 'Signatures' },
  { key: 'demarrages', label: 'Démarrages' },
  { key: 'fins_de_mission', label: 'Fins de mission' },
  { key: 'presentations_a_monter', label: 'Présentations à monter' },
]

export default function Saisie({ iaId, iaName }) {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [form, setForm] = useState(Object.fromEntries(fields.map(f => [f.key, 0])))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!iaId) return
    const load = async () => {
      const { data } = await supabase
        .from('saisies')
        .select('*')
        .eq('ia_id', iaId)
        .eq('semaine', semaine)
        .eq('annee', annee)
        .single()
      if (data) setForm(Object.fromEntries(fields.map(f => [f.key, data[f.key] ?? 0])))
      setLoading(false)
    }
    load()
  }, [iaId])

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: parseInt(val) || 0 }))

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('saisies').upsert({
      ia_id: iaId, semaine, annee, ...form
    }, { onConflict: 'ia_id,semaine,annee' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!iaId) return (
    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
      Sélectionne ton nom dans l'onglet Admin pour commencer.
    </div>
  )

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>Bonjour {iaName} 👋</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>Semaine {semaine} — {annee}</div>
        </div>
        <div style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20 }}>S{semaine}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input
              type="number" min="0"
              value={form[f.key]}
              onChange={e => handleChange(f.key, e.target.value)}
              style={{ width: '100%', textAlign: 'center', fontWeight: 500 }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: 13,
          background: saved ? '#0F6E56' : '#534AB7',
          color: saved ? '#E1F5EE' : '#EEEDFE',
          border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 500, cursor: 'pointer',
          transition: 'background 0.3s'
        }}
      >
        {saving ? 'Enregistrement...' : saved ? '✓ Semaine enregistrée !' : 'Enregistrer ma semaine'}
      </button>
    </div>
  )
}
