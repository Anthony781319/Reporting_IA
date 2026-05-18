import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const Section = ({ title, color, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 12, fontWeight: 500, color, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
    <div style={{ background: 'var(--color-background-primary)', border: `1.5px solid ${color}40`, borderRadius: 12, padding: 14 }}>
      {children}
    </div>
  </div>
)

const Counter = ({ label, value, onChange, color = '#534AB7' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${color}`, background: 'transparent', color, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}
      >−</button>
      <span style={{ fontSize: 18, fontWeight: 600, minWidth: 24, textAlign: 'center', color }}>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${color}`, background: 'transparent', color, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}
      >+</button>
    </div>
  </div>
)

const TotalField = ({ label, value, color }) => (
  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
    <span style={{ fontSize: 16, fontWeight: 600, color }}>{value}</span>
  </div>
)

const emptyForm = {
  decouvertes: 0, prospects: 0, clients: 0, presentations: 0,
  besoins_detectes: 0, rdv_candidats: 0, cv_envoyes: 0,
  attente_retour: 0, attente_retour_prez: 0, besoins_sans_solution: 0,
  signatures: 0, demarrages: 0, fins_de_mission: 0, presentations_a_monter: 0,
}

export default function Saisie({ iaId, iaName }) {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const [selectedWeek, setSelectedWeek] = useState(semaine)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [p1List, setP1List] = useState([])
  const [newP1, setNewP1] = useState('')
  const [savingP1, setSavingP1] = useState(false)

  const totalRdv = form.decouvertes + form.prospects + form.clients + form.presentations
  const totalPipe = form.besoins_sans_solution + form.attente_retour_prez + form.attente_retour

  useEffect(() => {
    if (!iaId) return
    const load = async () => {
      setLoading(true)
      const [{ data }, { data: p1Data }] = await Promise.all([
        supabase.from('saisies').select('*').eq('ia_id', iaId).eq('semaine', selectedWeek).eq('annee', annee).single(),
        supabase.from('p1').select('*').eq('ia_id', iaId).eq('semaine', selectedWeek).eq('annee', annee)
      ])
      if (data) {
        setForm({
          decouvertes: data.decouvertes || 0, prospects: data.prospects || 0,
          clients: data.clients || 0, presentations: data.presentations || 0,
          besoins_detectes: data.besoins_detectes || 0, rdv_candidats: data.rdv_candidats || 0,
          cv_envoyes: data.cv_envoyes || 0, attente_retour: data.attente_retour || 0,
          attente_retour_prez: data.attente_retour_prez || 0, besoins_sans_solution: data.besoins_sans_solution || 0,
          signatures: data.signatures || 0, demarrages: data.demarrages || 0,
          fins_de_mission: data.fins_de_mission || 0, presentations_a_monter: data.presentations_a_monter || 0,
        })
      } else { setForm(emptyForm) }
      setP1List(p1Data || [])
      setLoading(false)
    }
    load()
  }, [iaId, selectedWeek])

  const set = key => val => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('saisies').upsert({
      ia_id: iaId, semaine: selectedWeek, annee, ...form,
      total_rdv: totalRdv, presentation_planifiee: totalPipe,
    }, { onConflict: 'ia_id,semaine,annee' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const addP1 = async () => {
    if (!newP1.trim()) return
    setSavingP1(true)
    const { data } = await supabase.from('p1').insert({
      ia_id: iaId, semaine: selectedWeek, annee, description: newP1.trim()
    }).select().single()
    if (data) setP1List(l => [...l, data])
    setNewP1('')
    setSavingP1(false)
  }

  const removeP1 = async (id) => {
    await supabase.from('p1').delete().eq('id', id)
    setP1List(l => l.filter(p => p.id !== id))
  }

  if (!iaId) return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
      Va dans l'onglet <strong>Admin</strong> et sélectionne ton nom pour commencer.
    </div>
  )

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Bonjour {iaName} 👋</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{annee}</div>
        </div>
        <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8 }}>
          {Array.from({ length: semaine }, (_, i) => i + 1).reverse().map(w => (
            <option key={w} value={w}>{w === semaine ? `Semaine ${w} (en cours)` : `Semaine ${w}`}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 24 }}>Chargement...</div>
      ) : (
        <>
          <Section title="RDV Commerciaux" color="#534AB7">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <Counter label="Découvertes" value={form.decouvertes} onChange={set('decouvertes')} color="#534AB7" />
              <Counter label="Prospects" value={form.prospects} onChange={set('prospects')} color="#534AB7" />
              <Counter label="Clients" value={form.clients} onChange={set('clients')} color="#534AB7" />
              <Counter label="Présentations" value={form.presentations} onChange={set('presentations')} color="#534AB7" />
            </div>
            <TotalField label="Total RDV (automatique)" value={totalRdv} color="#534AB7" />
          </Section>

          <Section title="Gestion du Pipe" color="#0F6E56">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <Counter label="Besoins Détectés" value={form.besoins_detectes} onChange={set('besoins_detectes')} color="#0F6E56" />
              <Counter label="RDV Candidat" value={form.rdv_candidats} onChange={set('rdv_candidats')} color="#0F6E56" />
              <Counter label="Solutions Envoyées" value={form.cv_envoyes} onChange={set('cv_envoyes')} color="#0F6E56" />
              <Counter label="Attente Réponse Client" value={form.attente_retour} onChange={set('attente_retour')} color="#0F6E56" />
              <Counter label="Attente Retour Prez" value={form.attente_retour_prez} onChange={set('attente_retour_prez')} color="#0F6E56" />
              <Counter label="Besoins sans solution" value={form.besoins_sans_solution} onChange={set('besoins_sans_solution')} color="#0F6E56" />
            </div>
            <TotalField label="Total Pipe (automatique)" value={totalPipe} color="#0F6E56" />
          </Section>

          <Section title="Résultats" color="#993556">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <Counter label="Signatures" value={form.signatures} onChange={set('signatures')} color="#993556" />
              <Counter label="Démarrages" value={form.demarrages} onChange={set('demarrages')} color="#993556" />
              <Counter label="Fins de mission" value={form.fins_de_mission} onChange={set('fins_de_mission')} color="#993556" />
              <Counter label="Présentations à monter" value={form.presentations_a_monter} onChange={set('presentations_a_monter')} color="#993556" />
            </div>
          </Section>

          {/* BLOC P1 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#BA7517', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Priorités P1
            </div>
            <div style={{ background: 'var(--color-background-primary)', border: '1.5px solid #BA751740', borderRadius: 12, padding: 14 }}>
              {p1List.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FAEEDA', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>🎯</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#633806', lineHeight: 1.5 }}>{p.description}</span>
                  <button onClick={() => removeP1(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BA7517', fontSize: 16, flexShrink: 0, padding: 2 }}>×</button>
                </div>
              ))}
              <textarea
                value={newP1}
                onChange={e => setNewP1(e.target.value)}
                placeholder="Ex: Ingénieur production, compétences Ansible, anglais courant..."
                rows={3}
                style={{ width: '100%', borderRadius: 8, padding: '10px 12px', fontSize: 13, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'inherit', marginTop: p1List.length > 0 ? 8 : 0 }}
              />
              <button
                onClick={addP1}
                disabled={savingP1 || !newP1.trim()}
                style={{ marginTop: 8, width: '100%', padding: '10px', background: newP1.trim() ? '#BA7517' : 'var(--color-background-secondary)', color: newP1.trim() ? '#ffffff' : 'var(--color-text-secondary)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: newP1.trim() ? 'pointer' : 'default' }}
              >
                {savingP1 ? 'Ajout...' : '+ Ajouter un P1'}
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', padding: 13, background: saved ? '#0F6E56' : '#534AB7', color: saved ? '#E1F5EE' : '#EEEDFE', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background 0.3s' }}
          >
            {saving ? 'Enregistrement...' : saved ? '✓ Semaine enregistrée !' : `Enregistrer la semaine ${selectedWeek}`}
          </button>
        </>
      )}
    </div>
  )
}
