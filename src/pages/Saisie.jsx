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
      <button onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${color}`, background: 'transparent', color, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>−</button>
      <span style={{ fontSize: 18, fontWeight: 600, minWidth: 24, textAlign: 'center', color }}>{value}</span>
      <button onClick={() => onChange(value + 1)}
        style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${color}`, background: 'transparent', color, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>+</button>
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

const emptyP1 = { client: '', profil: '', experience: '', technologies: '', salaire_max: '', langues: '', lieu: '' }

const P1_STEPS = [
  { key: 'profil',       label: 'Profil recherché',  placeholder: 'Ex: Ingénieur DevOps senior', color: '#534AB7', textColor: '#3C3489', num: 1 },
  { key: 'client',       label: 'Client',             placeholder: 'Nom du client',               color: '#0F6E56', textColor: '#085041', num: 2 },
  { key: 'experience',   label: 'Expérience requise', placeholder: 'Ex: 5 ans minimum',           color: '#BA7517', textColor: '#633806', num: 3 },
  { key: 'technologies', label: 'Technologies',       placeholder: 'Ex: Ansible, Kubernetes',     color: '#993556', textColor: '#72243E', num: 4 },
  { key: 'salaire_max',  label: 'Salaire max',        placeholder: 'Ex: 55k€',                   color: '#185FA5', textColor: '#0C447C', num: 5 },
  { key: 'langues',      label: 'Langues',            placeholder: 'Ex: Anglais, Français',       color: '#185FA5', textColor: '#0C447C', num: 6 },
  { key: 'lieu',         label: 'Lieu de mission',    placeholder: 'Ex: Paris / Remote',          color: '#5F5E5A', textColor: '#444441', num: 7 },
]

const P1_TAGS = [
  { key: 'experience',   icon: '📅' },
  { key: 'technologies', icon: '💻' },
  { key: 'salaire_max',  icon: '💰' },
  { key: 'langues',      icon: '🌍' },
  { key: 'lieu',         icon: '📍' },
]

const P1_COLORS = [
  { header: '#534AB7', light: '#EEEDFE' },
  { header: '#0F6E56', light: '#E1F5EE' },
  { header: '#BA7517', light: '#FAEEDA' },
  { header: '#993556', light: '#FBEAF0' },
  { header: '#185FA5', light: '#E6F1FB' },
  { header: '#3B6D11', light: '#EAF3DE' },
]

const P1Card = ({ p, index = 0, onRemove }) => {
  const c = P1_COLORS[index % P1_COLORS.length]
  if (p.description && !p.profil) {
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${c.header}`, marginBottom: 10 }}>
        <div style={{ background: c.header, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1 }}>{p.description}</span>
          {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>}
        </div>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${c.header}`, marginBottom: 10 }}>
      <div style={{ background: c.header, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎯</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.profil}</div>
          {p.client && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>🏢 {p.client}</div>}
        </div>
        {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>}
      </div>
      <div style={{ background: c.light, padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {P1_TAGS.map(({ key, icon }) => p[key] ? (
          <div key={key} style={{ background: c.header, color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
            {icon} {p[key]}
          </div>
        ) : null)}
      </div>
    </div>
  )
}

export default function Saisie({ iaId, iaName }) {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const allowedWeeks = semaine > 1
    ? [{ value: semaine, label: `Semaine ${semaine} (en cours)` }, { value: semaine - 1, label: `Semaine ${semaine - 1} (précédente)` }]
    : [{ value: semaine, label: `Semaine ${semaine} (en cours)` }]

  const [selectedWeek, setSelectedWeek] = useState(semaine)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [p1List, setP1List] = useState([])
  const [newP1, setNewP1] = useState(emptyP1)
  const [savingP1, setSavingP1] = useState(false)

  const totalRdv = form.decouvertes + form.prospects + form.clients + form.presentations
  const totalPipe = form.besoins_sans_solution + form.attente_retour_prez + form.attente_retour
  const p1Complete = P1_STEPS.every(({ key }) => newP1[key]?.trim())

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
    if (!p1Complete) return
    setSavingP1(true)
    const { data } = await supabase.from('p1').insert({
      ia_id: iaId, semaine: selectedWeek, annee, ...newP1
    }).select().single()
    if (data) setP1List(l => [...l, data])
    setNewP1(emptyP1)
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
          {allowedWeeks.map(w => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 24 }}>Chargement...</div>
      ) : (
        <>
          <Section title="RDV Commerciaux" color="#534AB7">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <Counter label="Découvertes"   value={form.decouvertes}   onChange={set('decouvertes')}   color="#534AB7" />
              <Counter label="Prospects"     value={form.prospects}     onChange={set('prospects')}     color="#534AB7" />
              <Counter label="Clients"       value={form.clients}       onChange={set('clients')}       color="#534AB7" />
              <Counter label="Présentations" value={form.presentations} onChange={set('presentations')} color="#534AB7" />
            </div>
            <TotalField label="Total RDV (automatique)" value={totalRdv} color="#534AB7" />
          </Section>

          <Section title="Gestion du Pipe" color="#0F6E56">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <Counter label="Besoins Détectés"       value={form.besoins_detectes}     onChange={set('besoins_detectes')}     color="#0F6E56" />
              <Counter label="RDV Candidat"            value={form.rdv_candidats}        onChange={set('rdv_candidats')}        color="#0F6E56" />
              <Counter label="Solutions Envoyées"      value={form.cv_envoyes}           onChange={set('cv_envoyes')}           color="#0F6E56" />
              <Counter label="Attente Réponse Client"  value={form.attente_retour}       onChange={set('attente_retour')}       color="#0F6E56" />
              <Counter label="Attente Retour Prez"     value={form.attente_retour_prez}  onChange={set('attente_retour_prez')}  color="#0F6E56" />
              <Counter label="Besoins sans solution"   value={form.besoins_sans_solution}onChange={set('besoins_sans_solution')}color="#0F6E56" />
            </div>
            <TotalField label="Total Pipe (automatique)" value={totalPipe} color="#0F6E56" />
          </Section>

          <Section title="Résultats" color="#993556">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <Counter label="Signatures"             value={form.signatures}            onChange={set('signatures')}            color="#993556" />
              <Counter label="Démarrages"             value={form.demarrages}            onChange={set('demarrages')}            color="#993556" />
              <Counter label="Fins de mission"        value={form.fins_de_mission}       onChange={set('fins_de_mission')}       color="#993556" />
              <Counter label="Présentations à monter" value={form.presentations_a_monter}onChange={set('presentations_a_monter')}color="#993556" />
            </div>
          </Section>

          {/* BLOC P1 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#BA7517', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Priorités P1
            </div>
            <div style={{ background: 'var(--color-background-primary)', border: '1.5px solid #BA751740', borderRadius: 12, padding: 14 }}>

              {p1List.filter(p => p.profil?.trim() || p.description?.trim()).map((p, index) => (
                <P1Card key={p.id} p={p} index={index} onRemove={() => removeP1(p.id)} />
              ))}

              {/* Formulaire wizard */}
              <div style={{ marginBottom: 12 }}>
                {P1_STEPS.map((step) => {
                  const isLangues = step.key === 'langues'
                  if (isLangues) return null
                  const langStep = P1_STEPS.find(s => s.key === 'langues')
                  const isSalaireLangues = step.key === 'salaire_max'
                  return (
                    <div key={step.key} style={{ display: 'flex', gap: 0, marginBottom: 8, alignItems: 'stretch', borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${step.color}` }}>
                      <div style={{ width: 40, background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{step.num}</div>
                      </div>
                      <div style={{ flex: 1, background: `${step.color}12`, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: step.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{step.label}</div>
                        {isSalaireLangues ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input type="text" value={newP1[step.key]}
                              onChange={e => setNewP1(p => ({ ...p, [step.key]: e.target.value }))}
                              placeholder={step.placeholder}
                              style={{ borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: `1px solid ${step.color}40`, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                            <input type="text" value={newP1['langues']}
                              onChange={e => setNewP1(p => ({ ...p, langues: e.target.value }))}
                              placeholder={langStep.placeholder}
                              style={{ borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: `1px solid ${step.color}40`, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                          </div>
                        ) : (
                          <input type="text" value={newP1[step.key]}
                            onChange={e => setNewP1(p => ({ ...p, [step.key]: e.target.value }))}
                            placeholder={step.placeholder}
                            style={{ width: '100%', borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: `1px solid ${step.color}40`, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button onClick={addP1} disabled={savingP1 || !p1Complete}
                style={{ width: '100%', padding: '11px', background: p1Complete ? '#BA7517' : 'var(--color-background-secondary)', color: p1Complete ? '#ffffff' : 'var(--color-text-secondary)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: p1Complete ? 'pointer' : 'default' }}>
                {savingP1 ? 'Ajout...' : '+ Ajouter ce P1'}
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: 13, background: saved ? '#0F6E56' : '#534AB7', color: saved ? '#E1F5EE' : '#EEEDFE', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background 0.3s' }}>
            {saving ? 'Enregistrement...' : saved ? '✓ Semaine enregistrée !' : `Enregistrer la semaine ${selectedWeek}`}
          </button>
        </>
      )}
    </div>
  )
}
