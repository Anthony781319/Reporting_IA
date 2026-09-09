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
    <div style={{ background: 'var(--color-background-primary)', border: '1.5px solid ' + color + '40', borderRadius: 12, padding: 14 }}>
      {children}
    </div>
  </div>
)

const Counter = ({ label, value, onChange, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid ' + color, background: 'transparent', color, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>-</button>
      <span style={{ fontSize: 18, fontWeight: 600, minWidth: 24, textAlign: 'center', color }}>{value}</span>
      <button onClick={() => onChange(value + 1)}
        style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid ' + color, background: 'transparent', color, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>+</button>
    </div>
  </div>
)

const TotalField = ({ label, value, color }) => (
  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + color + '20', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
    <span style={{ fontSize: 16, fontWeight: 600, color }}>{value}</span>
  </div>
)

// Champs par type
const DETAIL_FIELDS = {
  signature:    [{ key: 'nom_prenom', label: 'Nom / Prénom', placeholder: 'Ex: Jean Dupont' }, { key: 'client', label: 'Client', placeholder: 'Nom du client' }, { key: 'tjm', label: 'TJM', placeholder: 'Ex: 550€' }, { key: 'date_signature', label: 'Date de signature', type: 'date' }, { key: 'date', label: 'Date de démarrage envisagée', type: 'date' }],
  presentation: [{ key: 'nom_prenom', label: 'Nom / Prénom', placeholder: 'Ex: Jean Dupont' }, { key: 'client', label: 'Client', placeholder: 'Nom du client' }, { key: 'date', label: 'Date de présentation', type: 'date' }],
  demarrage:    [{ key: 'nom_prenom', label: 'Nom / Prénom', placeholder: 'Ex: Jean Dupont' }, { key: 'client', label: 'Client', placeholder: 'Nom du client' }, { key: 'tjm', label: 'TJM', placeholder: 'Ex: 550€' }, { key: 'date', label: 'Date de démarrage', type: 'date' }],
  fin_mission:  [{ key: 'nom_prenom', label: 'Nom / Prénom', placeholder: 'Ex: Jean Dupont' }, { key: 'client', label: 'Client', placeholder: 'Nom du client' }, { key: 'date', label: 'Date de fin de mission', type: 'date' }],
}

const DETAIL_CONFIG = {
  signature:    { label: 'Signatures',       color: '#9D174D', bg: '#FCE7F3', icon: '✍️' },
  presentation: { label: 'Présentations',    color: '#1E40AF', bg: '#DBEAFE', icon: '📋' },
  demarrage:    { label: 'Démarrages',       color: '#065F46', bg: '#D1FAE5', icon: '🚀' },
  fin_mission:  { label: 'Fins de mission',  color: '#92400E', bg: '#FEF3C7', icon: '🏁' },
}

const DetailAccordion = ({ type, count, iaId, semaine, annee }) => {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState([])
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cfg = DETAIL_CONFIG[type]
  const fields = DETAIL_FIELDS[type]

  useEffect(() => {
    if (count > 0) fetchDetails()
  }, [count, semaine])

  const fetchDetails = async () => {
    const { data } = await supabase.from('details_resultats').select('*').eq('ia_id', iaId).eq('semaine', semaine).eq('annee', annee).eq('type', type).order('created_at')
    if (data) setDetails(data)
  }

  const addDetail = async () => {
    const required = fields.filter(f => f.key === 'nom_prenom' || f.key === 'client')
    if (required.some(f => !form[f.key]?.trim())) return
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase.from('details_resultats').insert({ ia_id: iaId, semaine, annee, type, ...form }).select().single()
    if (data) {
      setDetails(d => [...d, data])
      setForm({})
    } else {
      setError(err?.message ? `Erreur d'enregistrement : ${err.message}` : "Erreur d'enregistrement, réessaie ou préviens ton manager.")
    }
    setSaving(false)
  }

  const removeDetail = async (id) => {
    await supabase.from('details_resultats').delete().eq('id', id)
    setDetails(d => d.filter(x => x.id !== id))
  }

  if (count === 0) return null

  return (
    <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${cfg.color}40` }}>
      {/* Header accordion */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: cfg.bg, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{cfg.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>Détail {cfg.label}</span>
          <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.color, color: '#fff', fontSize: 11, fontWeight: 700 }}>
            {details.length}/{count}
          </span>
        </div>
        <span style={{ fontSize: 18, color: cfg.color, fontWeight: 700 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ background: 'var(--color-background-primary)', padding: 14 }}>

          {/* Liste des détails existants */}
          {details.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: cfg.bg, borderRadius: 10, marginBottom: 6 }}>
              <i className="ti ti-user" style={{ fontSize: 16, color: cfg.color, flexShrink: 0 }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: cfg.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nom_prenom || '—'}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                  {d.client && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cfg.color, opacity: 0.7 }}><i className="ti ti-building" style={{ fontSize: 12 }} aria-hidden="true" />{d.client}</span>}
                  {d.tjm && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cfg.color, opacity: 0.7 }}><i className="ti ti-coin" style={{ fontSize: 12 }} aria-hidden="true" />{d.tjm}</span>}
                  {d.date_signature && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cfg.color, opacity: 0.7 }}><i className="ti ti-signature" style={{ fontSize: 12 }} aria-hidden="true" />Signé le {new Date(d.date_signature).toLocaleDateString('fr-FR')}</span>}
                  {d.date && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cfg.color, opacity: 0.7 }}><i className="ti ti-calendar" style={{ fontSize: 12 }} aria-hidden="true" />{type === 'signature' ? 'Démarrage envisagé ' : ''}{new Date(d.date).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
              <button onClick={() => removeDetail(d.id)}
                style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#991B1B', fontSize: 12, flexShrink: 0 }}>✕</button>
            </div>
          ))}

          {/* Formulaire ajout */}
          {details.length < count && (
            <div style={{ background: `${cfg.color}08`, borderRadius: 10, padding: 12, border: `1px dashed ${cfg.color}40` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                + Ajouter un détail ({details.length + 1}/{count})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: fields.length > 2 ? '1fr 1fr' : '1fr', gap: 8 }}>
                {fields.map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 11, color: cfg.color, opacity: 0.8, marginBottom: 4, fontWeight: 500 }}>{f.label}</label>
                    <input type={f.type || 'text'} placeholder={f.placeholder || f.label}
                      value={form[f.key] || ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${cfg.color}40`, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={addDetail} disabled={saving}
                style={{ marginTop: 10, width: '100%', padding: '9px', background: cfg.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Ajout...' : '+ Ajouter'}
              </button>
              {error && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12 }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          {details.length >= count && details.length > 0 && (
            <div style={{ textAlign: 'center', padding: '8px', fontSize: 12, color: cfg.color, fontWeight: 600 }}>
              ✅ Tous les détails sont renseignés
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const emptyForm = {
  besoins_detectes: 0, rdv_candidats: 0, cv_envoyes: 0,
  attente_retour: 0, attente_retour_prez: 0, besoins_sans_solution: 0,
  signatures: 0, demarrages: 0, fins_de_mission: 0, presentations_a_monter: 0,
}

const RDV_OBJET_OPTIONS = [
  { value: 'prospect',     label: 'Prospect' },
  { value: 'decouverte',   label: 'Découverte' },
  { value: 'client',       label: 'Client' },
  { value: 'presentation', label: 'Présentation' },
]
const OBJET_COLORS = { prospect: '#534AB7', decouverte: '#0F6E56', client: '#BA7517', presentation: '#993556' }

const emptyRdv = { client: '', nom: '', prenom: '', fonction: '', date_meeting: '', objet_meeting: '', compte_rendu: '' }

const rdvLabelStyle = { display: 'block', fontSize: 11, color: '#534AB7', opacity: 0.8, marginBottom: 4, fontWeight: 500 }
const rdvInputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #534AB740', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }

const RdvTable = ({ list, onRemove }) => {
  if (list.length === 0) return null
  return (
    <div style={{ overflowX: 'auto', marginBottom: 12, borderRadius: 10, border: '1px solid #534AB720' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#534AB708' }}>
            <th style={{ padding: '8px' }}>Objet</th>
            <th style={{ padding: '8px' }}>Client</th>
            <th style={{ padding: '8px' }}>Contact</th>
            <th style={{ padding: '8px' }}>Fonction</th>
            <th style={{ padding: '8px' }}>Date</th>
            <th style={{ padding: '8px' }}>Compte rendu</th>
            <th style={{ padding: '8px' }}></th>
          </tr>
        </thead>
        <tbody>
          {list.map(r => {
            const color = OBJET_COLORS[r.objet_meeting] || '#534AB7'
            const objetLabel = RDV_OBJET_OPTIONS.find(o => o.value === r.objet_meeting)?.label || r.objet_meeting
            return (
              <tr key={r.id} style={{ borderTop: '1px solid #534AB720' }}>
                <td style={{ padding: '8px' }}><span style={{ padding: '2px 8px', borderRadius: 20, background: color, color: '#fff', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{objetLabel}</span></td>
                <td style={{ padding: '8px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.client || '—'}</td>
                <td style={{ padding: '8px', color: 'var(--color-text-primary)' }}>{[r.prenom, r.nom].filter(Boolean).join(' ') || '—'}</td>
                <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{r.fonction || '—'}</td>
                <td style={{ padding: '8px', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{r.date_meeting ? new Date(r.date_meeting).toLocaleDateString('fr-FR') : '—'}</td>
                <td style={{ padding: '8px', color: 'var(--color-text-secondary)', fontStyle: 'italic', maxWidth: 280 }}>{r.compte_rendu || ''}</td>
                <td style={{ padding: '8px' }}>
                  {onRemove && <button onClick={() => onRemove(r.id)} style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#991B1B', fontSize: 12 }}>✕</button>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const emptyP1 = { client: '', profil: '', experience: '', technologies: '', salaire_max: '', langues: '', lieu: '' }

const P1_STEPS = [
  { key: 'profil',       label: 'Profil recherche',   placeholder: 'Ex: Ingenieur DevOps senior', color: '#534AB7', num: 1 },
  { key: 'client',       label: 'Client',              placeholder: 'Nom du client',               color: '#0F6E56', num: 2 },
  { key: 'experience',   label: 'Experience requise',  placeholder: 'Ex: 5 ans minimum',           color: '#BA7517', num: 3 },
  { key: 'technologies', label: 'Technologies',        placeholder: 'Ex: Ansible, Kubernetes',     color: '#993556', num: 4 },
  { key: 'salaire_max',  label: 'Salaire max',         placeholder: 'Ex: 55k',                    color: '#185FA5', num: 5 },
  { key: 'langues',      label: 'Langues',             placeholder: 'Ex: Anglais, Francais',       color: '#185FA5', num: 6 },
  { key: 'lieu',         label: 'Lieu de mission',     placeholder: 'Ex: Paris / Remote',          color: '#5F5E5A', num: 7 },
]

const P1Card = ({ p, onRemove }) => {
  if (p.description && !p.profil) {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #534AB7', marginBottom: 10 }}>
        <div style={{ background: '#534AB7', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1 }}>{p.description}</span>
          {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20, lineHeight: 1, padding: 0 }}>x</button>}
        </div>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #534AB7', marginBottom: 10 }}>
      <div style={{ padding: '12px 14px', background: '#fff', borderBottom: '1px solid #534AB720', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#26215C', marginBottom: 3 }}>{p.profil}</div>
          {p.client && <div style={{ fontSize: 12, color: '#534AB7', fontWeight: 600 }}>🏢 {p.client}</div>}
        </div>
        {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#534AB7', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}>x</button>}
      </div>
      <div style={{ padding: '10px 12px', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {p.experience && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📅 Experience</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.experience}</div></div>}
        {p.salaire_max && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💰 Salaire max</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.salaire_max}</div></div>}
        {p.technologies && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px', gridColumn: 'span 2' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💻 Technologies</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.technologies}</div></div>}
        {p.langues && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🌍 Langues</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.langues}</div></div>}
        {p.lieu && <div style={{ background: '#F5F4FD', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📍 Lieu</div><div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginTop: 2 }}>{p.lieu}</div></div>}
      </div>
    </div>
  )
}

export default function Saisie({ iaId, iaName, managerMode = false }) {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()
  const allowedWeeks = managerMode
  ? Array.from({ length: semaine }, (_, i) => ({ value: semaine - i, label: semaine - i === semaine ? 'Semaine ' + semaine + ' (en cours)' : 'Semaine ' + (semaine - i) }))
  : semaine > 1
    ? [{ value: semaine, label: 'Semaine ' + semaine + ' (en cours)' }, { value: semaine - 1, label: 'Semaine ' + (semaine - 1) + ' (precedente)' }]
    : [{ value: semaine, label: 'Semaine ' + semaine + ' (en cours)' }]

  const [selectedWeek, setSelectedWeek] = useState(semaine)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [p1List, setP1List] = useState([])
  const [newP1, setNewP1] = useState(emptyP1)
  const [savingP1, setSavingP1] = useState(false)
  const [rdvList, setRdvList] = useState([])
  const [newRdv, setNewRdv] = useState(emptyRdv)
  const [savingRdv, setSavingRdv] = useState(false)
  const [errorRdv, setErrorRdv] = useState('')
  const [contactSuggestions, setContactSuggestions] = useState([])
  const [selectedContactId, setSelectedContactId] = useState(null)

  const rdvCounts = {
    decouvertes:   rdvList.filter(r => r.objet_meeting === 'decouverte').length,
    prospects:     rdvList.filter(r => r.objet_meeting === 'prospect').length,
    clients:       rdvList.filter(r => r.objet_meeting === 'client').length,
    presentations: rdvList.filter(r => r.objet_meeting === 'presentation').length,
  }
  const totalRdv = rdvList.length
  const totalPipe = form.besoins_sans_solution + form.attente_retour_prez + form.attente_retour
  const p1Complete = P1_STEPS.every(s => newP1[s.key] && newP1[s.key].trim())
  const rdvComplete = newRdv.client.trim() && newRdv.nom.trim() && newRdv.date_meeting && newRdv.objet_meeting

  useEffect(() => {
    if (!iaId) return
    const load = async () => {
      setLoading(true)
      const [{ data }, { data: p1Data }, { data: rdvData }] = await Promise.all([
        supabase.from('saisies').select('*').eq('ia_id', iaId).eq('semaine', selectedWeek).eq('annee', annee).single(),
        supabase.from('p1').select('*').eq('ia_id', iaId).eq('semaine', selectedWeek).eq('annee', annee),
        supabase.from('rdv_details').select('*').eq('ia_id', iaId).eq('semaine', selectedWeek).eq('annee', annee).order('created_at'),
      ])
      if (data) {
        setForm({
          besoins_detectes: data.besoins_detectes || 0, rdv_candidats: data.rdv_candidats || 0,
          cv_envoyes: data.cv_envoyes || 0, attente_retour: data.attente_retour || 0,
          attente_retour_prez: data.attente_retour_prez || 0, besoins_sans_solution: data.besoins_sans_solution || 0,
          signatures: data.signatures || 0, demarrages: data.demarrages || 0,
          fins_de_mission: data.fins_de_mission || 0, presentations_a_monter: data.presentations_a_monter || 0,
        })
      } else { setForm(emptyForm) }
      setP1List(p1Data || [])
      setRdvList(rdvData || [])
      setNewRdv(emptyRdv)
      setSelectedContactId(null)
      setContactSuggestions([])
      setLoading(false)
    }
    load()
  }, [iaId, selectedWeek])

  // Recherche de contacts existants pendant la saisie du nom (avec un petit délai pour ne pas spammer la base)
  useEffect(() => {
    const term = newRdv.nom.trim()
    if (selectedContactId || term.length < 2) { setContactSuggestions([]); return }
    const timeout = setTimeout(async () => {
      const { data: matches } = await supabase.from('contacts').select('*').ilike('nom', `%${term}%`).limit(5)
      if (!matches || matches.length === 0) { setContactSuggestions([]); return }
      const ids = matches.map(c => c.id)
      const { data: history } = await supabase.from('rdv_details').select('contact_id, client, date_meeting').in('contact_id', ids).order('date_meeting', { ascending: false })
      const withHistory = matches.map(c => {
        const last = (history || []).find(h => h.contact_id === c.id)
        return { ...c, lastClient: last?.client, lastDate: last?.date_meeting }
      })
      setContactSuggestions(withHistory)
    }, 300)
    return () => clearTimeout(timeout)
  }, [newRdv.nom, selectedContactId])

  const pickContact = (c) => {
    setSelectedContactId(c.id)
    setNewRdv(r => ({ ...r, nom: c.nom, prenom: c.prenom || '' }))
    setContactSuggestions([])
  }

  const set = key => val => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('saisies').upsert(
      { ia_id: iaId, semaine: selectedWeek, annee, ...form,
        decouvertes: rdvCounts.decouvertes, prospects: rdvCounts.prospects, clients: rdvCounts.clients, presentations: rdvCounts.presentations,
        total_rdv: totalRdv, presentation_planifiee: totalPipe },
      { onConflict: 'ia_id,semaine,annee' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const addRdv = async () => {
    if (!rdvComplete) return
    setSavingRdv(true)
    setErrorRdv('')

    // Si on n'a pas cliqué sur un contact existant, on en crée un nouveau (identité = nom + prénom uniquement)
    let contactId = selectedContactId
    if (!contactId) {
      const { data: newContact, error: contactErr } = await supabase.from('contacts')
        .insert({ nom: newRdv.nom.trim(), prenom: newRdv.prenom.trim() || null }).select().single()
      if (contactErr) {
        setErrorRdv(`Erreur contact : ${contactErr.message}`)
        setSavingRdv(false)
        return
      }
      contactId = newContact.id
    }

    const { data, error: err } = await supabase.from('rdv_details').insert({ ia_id: iaId, semaine: selectedWeek, annee, ...newRdv, contact_id: contactId }).select().single()
    if (data) {
      setRdvList(l => [...l, data])
      setNewRdv(emptyRdv)
      setSelectedContactId(null)
    } else {
      setErrorRdv(err?.message ? `Erreur d'enregistrement : ${err.message}` : "Erreur d'enregistrement, réessaie ou préviens ton manager.")
    }
    setSavingRdv(false)
  }

  const removeRdv = async (id) => {
    await supabase.from('rdv_details').delete().eq('id', id)
    setRdvList(l => l.filter(r => r.id !== id))
  }

  const addP1 = async () => {
    if (!p1Complete) return
    setSavingP1(true)
    const { data } = await supabase.from('p1').insert({ ia_id: iaId, semaine: selectedWeek, annee, ...newP1 }).select().single()
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
      Va dans l'onglet <strong>Admin</strong> et selectionne ton nom pour commencer.
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
          {allowedWeeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 24 }}>Chargement...</div>
      ) : (
        <div>
          <Section title="RDV Commerciaux" color="#534AB7">
            <RdvTable list={rdvList} onRemove={removeRdv} />

            <div style={{ background: '#534AB708', borderRadius: 10, padding: 12, border: '1px dashed #534AB740' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                + Ajouter un RDV
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={rdvLabelStyle}>Client</label>
                  <input type="text" placeholder="Nom du client" value={newRdv.client} onChange={e => setNewRdv(r => ({ ...r, client: e.target.value }))} style={rdvInputStyle} />
                </div>
                <div>
                  <label style={rdvLabelStyle}>Objet du meeting</label>
                  <select value={newRdv.objet_meeting} onChange={e => setNewRdv(r => ({ ...r, objet_meeting: e.target.value }))} style={rdvInputStyle}>
                    <option value="">Choisir...</option>
                    {RDV_OBJET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={rdvLabelStyle}>Nom</label>
                  <input type="text" placeholder="Nom" value={newRdv.nom} autoComplete="off"
                    onChange={e => { setNewRdv(r => ({ ...r, nom: e.target.value })); setSelectedContactId(null) }}
                    style={rdvInputStyle} />
                  {selectedContactId && (
                    <div style={{ fontSize: 10, color: '#0F6E56', marginTop: 3, fontWeight: 600 }}>✓ Contact déjà connu, historique lié</div>
                  )}
                  {!selectedContactId && contactSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--color-background-primary)', border: '1.5px solid #534AB7', borderRadius: 8, marginTop: 2, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                      {contactSuggestions.map(c => (
                        <div key={c.id} onClick={() => pickContact(c)}
                          style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #534AB720', fontSize: 12 }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{[c.prenom, c.nom].filter(Boolean).join(' ')}</div>
                          {c.lastClient && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                              déjà vu chez {c.lastClient}{c.lastDate ? ' le ' + new Date(c.lastDate).toLocaleDateString('fr-FR') : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={rdvLabelStyle}>Prénom</label>
                  <input type="text" placeholder="Prénom" value={newRdv.prenom} onChange={e => setNewRdv(r => ({ ...r, prenom: e.target.value }))} style={rdvInputStyle} />
                </div>
                <div>
                  <label style={rdvLabelStyle}>Fonction</label>
                  <input type="text" placeholder="Ex: DRH, Directeur IT..." value={newRdv.fonction} onChange={e => setNewRdv(r => ({ ...r, fonction: e.target.value }))} style={rdvInputStyle} />
                </div>
                <div>
                  <label style={rdvLabelStyle}>Date du meeting</label>
                  <input type="date" value={newRdv.date_meeting} onChange={e => setNewRdv(r => ({ ...r, date_meeting: e.target.value }))} style={rdvInputStyle} />
                </div>
              </div>
              <label style={rdvLabelStyle}>Mini compte rendu</label>
              <textarea placeholder="Resume rapide du meeting..." value={newRdv.compte_rendu} onChange={e => setNewRdv(r => ({ ...r, compte_rendu: e.target.value }))} rows={2}
                style={{ ...rdvInputStyle, resize: 'vertical' }} />
              <button onClick={addRdv} disabled={savingRdv || !rdvComplete}
                style={{ marginTop: 10, width: '100%', padding: '9px', background: rdvComplete ? '#534AB7' : 'var(--color-background-secondary)', color: rdvComplete ? '#fff' : 'var(--color-text-secondary)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: rdvComplete ? 'pointer' : 'default' }}>
                {savingRdv ? 'Ajout...' : '+ Ajouter ce RDV'}
              </button>
              {errorRdv && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12 }}>
                  ⚠️ {errorRdv}
                </div>
              )}
            </div>

            <TotalField label="Total RDV (automatique)" value={totalRdv} color="#534AB7" />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <span>Découvertes : {rdvCounts.decouvertes}</span>
              <span>Prospects : {rdvCounts.prospects}</span>
              <span>Clients : {rdvCounts.clients}</span>
              <span>Présentations : {rdvCounts.presentations}</span>
            </div>
            {/* Accordion détail présentations (candidat présenté), toujours liée aux RDV de type Présentation */}
            <DetailAccordion type="presentation" count={rdvCounts.presentations} iaId={iaId} semaine={selectedWeek} annee={annee} />
          </Section>

          <Section title="Gestion du Pipe" color="#0F6E56">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <Counter label="Besoins Detectes"      value={form.besoins_detectes}     onChange={set('besoins_detectes')}     color="#0F6E56" />
              <Counter label="RDV Candidat"           value={form.rdv_candidats}        onChange={set('rdv_candidats')}        color="#0F6E56" />
              <Counter label="Solutions Envoyees"     value={form.cv_envoyes}           onChange={set('cv_envoyes')}           color="#0F6E56" />
              <Counter label="Attente Reponse Client" value={form.attente_retour}       onChange={set('attente_retour')}       color="#0F6E56" />
              <Counter label="Attente Retour Prez"   value={form.attente_retour_prez}  onChange={set('attente_retour_prez')}  color="#0F6E56" />
              <Counter label="Besoins sans solution" value={form.besoins_sans_solution} onChange={set('besoins_sans_solution')} color="#0F6E56" />
            </div>
            <TotalField label="Total Pipe (automatique)" value={totalPipe} color="#0F6E56" />
          </Section>

          <Section title="Resultats" color="#993556">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <Counter label="Signatures"      value={form.signatures}             onChange={set('signatures')}            color="#993556" />
              <Counter label="Demarrages"      value={form.demarrages}             onChange={set('demarrages')}            color="#993556" />
              <Counter label="Fins de mission" value={form.fins_de_mission}        onChange={set('fins_de_mission')}       color="#993556" />
              <Counter label="Pres. a monter"  value={form.presentations_a_monter} onChange={set('presentations_a_monter')} color="#993556" />
            </div>
            {/* Accordions détails résultats */}
            <DetailAccordion type="signature"   count={form.signatures}      iaId={iaId} semaine={selectedWeek} annee={annee} />
            <DetailAccordion type="demarrage"   count={form.demarrages}      iaId={iaId} semaine={selectedWeek} annee={annee} />
            <DetailAccordion type="fin_mission" count={form.fins_de_mission} iaId={iaId} semaine={selectedWeek} annee={annee} />
          </Section>

          {/* P1 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#BA7517', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priorites P1</div>
            <div style={{ background: 'var(--color-background-primary)', border: '1.5px solid #BA751740', borderRadius: 12, padding: 14 }}>
              {p1List.filter(p => (p.profil && p.profil.trim()) || (p.description && p.description.trim())).map(p => (
                <P1Card key={p.id} p={p} onRemove={() => removeP1(p.id)} />
              ))}
              <div style={{ marginBottom: 12 }}>
                {P1_STEPS.map(step => {
                  if (step.key === 'langues') return null
                  const langStep = P1_STEPS.find(s => s.key === 'langues')
                  const isSalaireLangues = step.key === 'salaire_max'
                  return (
                    <div key={step.key} style={{ display: 'flex', gap: 0, marginBottom: 8, alignItems: 'stretch', borderRadius: 10, overflow: 'hidden', border: '1.5px solid ' + step.color }}>
                      <div style={{ width: 40, background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{step.num}</div>
                      </div>
                      <div style={{ flex: 1, background: step.color + '12', padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: step.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{step.label}</div>
                        {isSalaireLangues ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input type="text" value={newP1[step.key]} onChange={e => setNewP1(p => ({ ...p, [step.key]: e.target.value }))} placeholder={step.placeholder} style={{ borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: '1px solid ' + step.color + '40', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                            <input type="text" value={newP1['langues']} onChange={e => setNewP1(p => ({ ...p, langues: e.target.value }))} placeholder={langStep.placeholder} style={{ borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: '1px solid ' + step.color + '40', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                          </div>
                        ) : (
                          <input type="text" value={newP1[step.key]} onChange={e => setNewP1(p => ({ ...p, [step.key]: e.target.value }))} placeholder={step.placeholder} style={{ width: '100%', borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: '1px solid ' + step.color + '40', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
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
            {saving ? 'Enregistrement...' : saved ? 'Semaine enregistree !' : 'Enregistrer la semaine ' + selectedWeek}
          </button>
        </div>
      )}
    </div>
  )
}
