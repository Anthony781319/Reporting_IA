import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const Section = ({ title, color, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 12, fontWeight: 500, color, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {title}
    </div>
    <div style={{ background: 'var(--color-background-primary)', border: `1.5px solid ${color}40`, borderRadius: 12, padding: 14 }}>
      {children}
    </div>
  </div>
)

const Field = ({ label, value, onChange, readOnly, highlight }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>{label}</label>
    <input
      type="number" min="0"
      value={value}
      onChange={onChange ? e => onChange(parseInt(e.target.value) || 0) : undefined}
      readOnly={readOnly}
      style={{
        width: '100%', textAlign: 'center', fontWeight: highlight ? 500 : 400,
        background: readOnly ? 'var(--color-background-secondary)' : undefined,
        color: highlight ? '#534AB7' : undefined,
        cursor: readOnly ? 'default' : undefined
      }}
    />
  </div>
)

export default function Saisie({ iaId, iaName }) {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [form, setForm] = useState({
    decouvertes: 0, prospects: 0, clients: 0, presentations: 0,
    besoins_detectes: 0, rdv_candidats: 0, cv_envoyes: 0,
    attente_retour: 0, attente_retour_prez: 0, besoins_sans_solution: 0,
    signatures: 0, demarrages: 0, fins_de_mission: 0, presentations_a_monter: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const totalRdv = form.decouvertes + form.prospects + form.clients + form.presentations
  const totalPipe = form.besoins_sans_solution + form.attente_retour_prez + form.attente_retour

  useEffect(() => {
    if (!iaId) return
    const load = async () => {
      const { data } = await supabase
        .from('saisies').select('*')
        .eq('ia_id', iaId).eq('semaine', semaine).eq('annee', annee).single()
      if (data) setForm({
        decouvertes: data.decouvertes || 0,
        prospects: data.prospects || 0,
        clients: data.clients || 0,
        presentations: data.presentations || 0,
        besoins_detectes: data.besoins_detectes || 0,
        rdv_candidats: data.rdv_candidats || 0,
        cv_envoyes: data.cv_envoyes || 0,
        attente_retour: data.attente_retour || 0,
        attente_retour_prez: data.attente_retour_prez || 0,
        besoins_sans_solution: data.besoins_sans_solution || 0,
        signatures: data.signatures || 0,
        demarrages: data.demarrages || 0,
        fins_de_mission: data.fins_de_mission || 0,
        presentations_a_monter: data.presentations_a_monter || 0,
      })
      setLoading(false)
    }
    load()
  }, [iaId])

  const set = key => val => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('saisies').upsert({
      ia_id: iaId, semaine, annee,
      ...form,
      total_rdv: totalRdv,
      presentation_planifiee: totalPipe,
    }, { onConflict: 'ia_id,semaine,annee' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!iaId) return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
      Va dans l'onglet <strong>Admin</strong> et sélectionne ton nom pour commencer.
    </div>
  )

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Bonjour {iaName} 👋</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>Semaine {semaine} — {annee}</div>
        </div>
        <div style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20 }}>S{semaine}</div>
      </div>

      <Section title="RDV Commerciaux" color="#534AB7">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          <Field label="Découvertes" value={form.decouvertes} onChange={set('decouvertes')} />
          <Field label="Prospects" value={form.prospects} onChange={set('prospects')} />
          <Field label="Clients" value={form.clients} onChange={set('clients')} />
          <Field label="Présentations" value={form.presentations} onChange={set('presentations')} />
        </div>
        <Field label="Total RDV (automatique)" value={totalRdv} readOnly highlight />
      </Section>

      <Section title="Gestion du Pipe" color="#0F6E56">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          <Field label="Besoins Détectés" value={form.besoins_detectes} onChange={set('besoins_detectes')} />
          <Field label="RDV Candidat" value={form.rdv_candidats} onChange={set('rdv_candidats')} />
          <Field label="Solutions Envoyées" value={form.cv_envoyes} onChange={set('cv_envoyes')} />
          <Field label="Attente Réponse Client" value={form.attente_retour} onChange={set('attente_retour')} />
          <Field label="Attente Retour Prez" value={form.attente_retour_prez} onChange={set('attente_retour_prez')} />
          <Field label="Besoins sans solution" value={form.besoins_sans_solution} onChange={set('besoins_sans_solution')} />
        </div>
        <Field label="Total Pipe (automatique)" value={totalPipe} readOnly highlight />
      </Section>

      <Section title="Résultats" color="#993556">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          <Field label="Signatures" value={form.signatures} onChange={set('signatures')} />
          <Field label="Démarrages" value={form.demarrages} onChange={set('demarrages')} />
          <Field label="Fins de mission" value={form.fins_de_mission} onChange={set('fins_de_mission')} />
          <Field label="Présentations à monter" value={form.presentations_a_monter} onChange={set('presentations_a_monter')} />
        </div>
      </Section>

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
