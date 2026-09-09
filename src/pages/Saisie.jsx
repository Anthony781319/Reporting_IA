import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

// Eclaircit une couleur hexa vers du pastel (pour du texte lisible sur fond sombre)
const lighten = (hex, amt) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const mix = c => Math.round(c + (255 - c) * amt)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

const TEXT_STRONG = '#F5F4F8'
const TEXT_MUTED = '#ACA9BA'

const Section = ({ title, color, bg, icon, plain, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
      {icon && (
        <div style={{ width: 28, height: 28, borderRadius: 9, background: color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16, color: lighten(color, 0.3) }} aria-hidden="true" />
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 700, color: lighten(color, 0.35), textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
    </div>
    {plain ? (
      <div>{children}</div>
    ) : (
      <div style={{ background: bg || (color + '12'), border: '1.5px solid ' + color + '40', borderRadius: 18, padding: 20, boxShadow: '0 6px 24px rgba(0,0,0,0.3)' }}>
        {children}
      </div>
    )}
  </div>
)

const Counter = ({ label, value, onChange, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_MUTED, textAlign: 'center' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid ' + lighten(color, 0.3), background: 'transparent', color: lighten(color, 0.3), fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>-</button>
      <span style={{ fontSize: 22, fontWeight: 700, minWidth: 30, textAlign: 'center', color: lighten(color, 0.3) }}>{value}</span>
      <button onClick={() => onChange(value + 1)}
        style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid ' + lighten(color, 0.3), background: 'transparent', color: lighten(color, 0.3), fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>+</button>
    </div>
  </div>
)

const TotalField = ({ label, value, color }) => (
  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid ' + color + '35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_MUTED }}>{label}</span>
    <span style={{ fontSize: 20, fontWeight: 700, color: lighten(color, 0.3) }}>{value}</span>
  </div>
)

// Champs par type
const DETAIL_FIELDS = {
  signature:    [{ key: 'nom_prenom', label: 'Nom / Prénom', placeholder: 'Ex: Jean Dupont' }, { key: 'client', label: 'Client', placeholder: 'Nom du client' }, { key: 'tjm', label: 'TJM', placeholder: 'Ex: 550€' }, { key: 'date_signature', label: 'Date de signature', type: 'date' }, { key: 'date', label: 'Date de démarrage envisagée', type: 'date' }],
  presentation: [{ key: 'nom_prenom', label: 'Nom / Prénom', placeholder: 'Ex: Jean Dupont' }, { key: 'client', label: 'Client', placeholder: 'Nom du client' }, { key: 'date', label: 'Date de présentation', type: 'date' }],
  demarrage:    [{ key: 'nom_prenom', label: 'Nom / Prénom', placeholder: 'Ex: Jean Dupont' }, { key: 'client', label: 'Client', placeholder: 'Nom du client' }, { key: 'tjm', label: 'TJM', placeholder: 'Ex: 550€' }, { key: 'date', label: 'Date de démarrage', type: 'date' }],
  fin_mission:  [{ key: 'nom_prenom', label: 'Nom / Prénom', placeholder: 'Ex: Jean Dupont' }, { key: 'client', label: 'Client', placeholder: 'Nom du client' }, { key: 'date', label: 'Date de fin de mission', type: 'date' }],
}

// color = teinte claire (texte/icônes sur fond sombre), fill = teinte saturée (pastilles pleines + texte blanc), bg = fond sombre de la ligne/du header
const DETAIL_CONFIG = {
  signature:    { label: 'Signatures',       color: '#F472A8', fill: '#9D174D', bg: '#2A1520', icon: '✍️' },
  presentation: { label: 'Présentations',    color: '#7CA8F0', fill: '#1E40AF', bg: '#141F35', icon: '📋' },
  demarrage:    { label: 'Démarrages',       color: '#4ED8A8', fill: '#065F46', bg: '#0F241D', icon: '🚀' },
  fin_mission:  { label: 'Fins de mission',  color: '#F0B860', fill: '#92400E', bg: '#2A1D10', icon: '🏁' },
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
    <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${cfg.color}50` }}>
      {/* Header accordion */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: cfg.bg, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{cfg.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>Détail {cfg.label}</span>
          <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.fill, color: '#fff', fontSize: 11, fontWeight: 700 }}>
            {details.length}/{count}
          </span>
        </div>
        <span style={{ fontSize: 18, color: cfg.color, fontWeight: 700 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ background: cfg.bg, padding: 14 }}>

          {/* Liste des détails existants */}
          {details.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 6 }}>
              <i className="ti ti-user" style={{ fontSize: 16, color: cfg.color, flexShrink: 0 }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_STRONG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nom_prenom || '—'}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                  {d.client && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cfg.color, opacity: 0.85 }}><i className="ti ti-building" style={{ fontSize: 12 }} aria-hidden="true" />{d.client}</span>}
                  {d.tjm && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cfg.color, opacity: 0.85 }}><i className="ti ti-coin" style={{ fontSize: 12 }} aria-hidden="true" />{d.tjm}</span>}
                  {d.date_signature && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cfg.color, opacity: 0.85 }}><i className="ti ti-signature" style={{ fontSize: 12 }} aria-hidden="true" />Signé le {new Date(d.date_signature).toLocaleDateString('fr-FR')}</span>}
                  {d.date && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cfg.color, opacity: 0.85 }}><i className="ti ti-calendar" style={{ fontSize: 12 }} aria-hidden="true" />{type === 'signature' ? 'Démarrage envisagé ' : ''}{new Date(d.date).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
              <button onClick={() => removeDetail(d.id)}
                style={{ background: 'rgba(248,113,113,0.15)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#F87171', fontSize: 12, flexShrink: 0 }}>✕</button>
            </div>
          ))}

          {/* Formulaire ajout */}
          {details.length < count && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, border: `1px dashed ${cfg.color}50` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                + Ajouter un détail ({details.length + 1}/{count})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: fields.length > 2 ? '1fr 1fr' : '1fr', gap: 8 }}>
                {fields.map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 11, color: cfg.color, opacity: 0.9, marginBottom: 4, fontWeight: 500 }}>{f.label}</label>
                    <input type={f.type || 'text'} placeholder={f.placeholder || f.label}
                      value={form[f.key] || ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${cfg.color}40`, background: 'rgba(255,255,255,0.06)', color: TEXT_STRONG, fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={addDetail} disabled={saving}
                style={{ marginTop: 10, width: '100%', padding: '9px', background: cfg.fill, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Ajout...' : '+ Ajouter'}
              </button>
              {error && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#FCA5A5', fontSize: 12 }}>
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

const emptyRdv = { client: '', entite: '', nom: '', prenom: '', fonction: '', date_meeting: '', objet_meeting: '', compte_rendu: '', email: '', telephone: '' }

const RDV_COLOR = '#534AB7'
const rdvLabelStyle = { display: 'block', fontSize: 12, color: lighten(RDV_COLOR, 0.35), marginBottom: 5, fontWeight: 600 }
const rdvInputStyle = { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: TEXT_STRONG, fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }

const RdvTable = ({ list, onRemove }) => {
  if (list.length === 0) return null
  return (
    <div style={{ overflowX: 'auto', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 820 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <th style={{ padding: '0 8px 10px' }}>Objet</th>
            <th style={{ padding: '0 8px 10px' }}>Client</th>
            <th style={{ padding: '0 8px 10px' }}>Entité</th>
            <th style={{ padding: '0 8px 10px' }}>Contact</th>
            <th style={{ padding: '0 8px 10px' }}>Fonction</th>
            <th style={{ padding: '0 8px 10px' }}>Date</th>
            <th style={{ padding: '0 8px 10px' }}>Compte rendu</th>
            <th style={{ padding: '0 8px 10px' }}></th>
          </tr>
        </thead>
        <tbody>
          {list.map(r => {
            const color = OBJET_COLORS[r.objet_meeting] || '#534AB7'
            const objetLabel = RDV_OBJET_OPTIONS.find(o => o.value === r.objet_meeting)?.label || r.objet_meeting
            return (
              <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ padding: '10px 8px' }}><span style={{ padding: '3px 10px', borderRadius: 20, background: color, color: '#fff', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{objetLabel}</span></td>
                <td style={{ padding: '10px 8px', fontWeight: 600, color: TEXT_STRONG }}>{r.client || '—'}</td>
                <td style={{ padding: '10px 8px', color: TEXT_MUTED }}>{r.entite || '—'}</td>
                <td style={{ padding: '10px 8px', color: TEXT_STRONG }}>{[r.prenom, r.nom].filter(Boolean).join(' ') || '—'}</td>
                <td style={{ padding: '10px 8px', color: TEXT_MUTED }}>{r.fonction || '—'}</td>
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', color: TEXT_MUTED }}>{r.date_meeting ? new Date(r.date_meeting).toLocaleDateString('fr-FR') : '—'}</td>
                <td style={{ padding: '10px 8px', color: TEXT_MUTED, fontStyle: 'italic', maxWidth: 280 }}>{r.compte_rendu || ''}</td>
                <td style={{ padding: '10px 8px' }}>
                  {onRemove && <button onClick={() => onRemove(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: 14, opacity: 0.85 }}>✕</button>}
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

const P1_COLOR = '#BA7517'
const P1_STEPS = [
  { key: 'profil',       label: 'Profil recherche',   placeholder: 'Ex: Ingenieur DevOps senior', color: P1_COLOR, num: 1 },
  { key: 'client',       label: 'Client',              placeholder: 'Nom du client',               color: P1_COLOR, num: 2 },
  { key: 'experience',   label: 'Experience requise',  placeholder: 'Ex: 5 ans minimum',           color: P1_COLOR, num: 3 },
  { key: 'technologies', label: 'Technologies',        placeholder: 'Ex: Ansible, Kubernetes',     color: P1_COLOR, num: 4 },
  { key: 'salaire_max',  label: 'Salaire max',         placeholder: 'Ex: 55k',                    color: P1_COLOR, num: 5 },
  { key: 'langues',      label: 'Langues',             placeholder: 'Ex: Anglais, Francais',       color: P1_COLOR, num: 6 },
  { key: 'lieu',         label: 'Lieu de mission',     placeholder: 'Ex: Paris / Remote',          color: P1_COLOR, num: 7 },
]

const P1Card = ({ p, onRemove }) => {
  if (p.description && !p.profil) {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${P1_COLOR}`, marginBottom: 10 }}>
        <div style={{ background: P1_COLOR, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1 }}>{p.description}</span>
          {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20, lineHeight: 1, padding: 0 }}>x</button>}
        </div>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${P1_COLOR}60`, marginBottom: 10 }}>
      <div style={{ padding: '12px 14px', background: 'transparent', borderBottom: `1px solid ${P1_COLOR}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_STRONG, marginBottom: 3 }}>{p.profil}</div>
          {p.client && <div style={{ fontSize: 12, color: lighten(P1_COLOR, 0.3), fontWeight: 600 }}>🏢 {p.client}</div>}
        </div>
        {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: lighten(P1_COLOR, 0.3), fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}>x</button>}
      </div>
      <div style={{ padding: '10px 12px', background: 'transparent', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {p.experience && <div style={{ background: P1_COLOR + '18', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: lighten(P1_COLOR, 0.3), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📅 Experience</div><div style={{ fontSize: 12, fontWeight: 700, color: TEXT_STRONG, marginTop: 2 }}>{p.experience}</div></div>}
        {p.salaire_max && <div style={{ background: P1_COLOR + '18', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: lighten(P1_COLOR, 0.3), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💰 Salaire max</div><div style={{ fontSize: 12, fontWeight: 700, color: TEXT_STRONG, marginTop: 2 }}>{p.salaire_max}</div></div>}
        {p.technologies && <div style={{ background: P1_COLOR + '18', borderRadius: 8, padding: '7px 10px', gridColumn: 'span 2' }}><div style={{ fontSize: 10, color: lighten(P1_COLOR, 0.3), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💻 Technologies</div><div style={{ fontSize: 12, fontWeight: 700, color: TEXT_STRONG, marginTop: 2 }}>{p.technologies}</div></div>}
        {p.langues && <div style={{ background: P1_COLOR + '18', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: lighten(P1_COLOR, 0.3), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🌍 Langues</div><div style={{ fontSize: 12, fontWeight: 700, color: TEXT_STRONG, marginTop: 2 }}>{p.langues}</div></div>}
        {p.lieu && <div style={{ background: P1_COLOR + '18', borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: lighten(P1_COLOR, 0.3), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📍 Lieu</div><div style={{ fontSize: 12, fontWeight: 700, color: TEXT_STRONG, marginTop: 2 }}>{p.lieu}</div></div>}
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
  // Pour un nouveau contact (pas encore rattaché), on exige au moins un email ou un téléphone
  const needsContactInfo = !selectedContactId && !newRdv.email.trim() && !newRdv.telephone.trim()
  const rdvComplete = newRdv.client.trim() && newRdv.nom.trim() && newRdv.date_meeting && newRdv.objet_meeting && newRdv.compte_rendu.trim() && !needsContactInfo

  // Débloque la largeur du conteneur global (par défaut limité à 480px, pensé pour mobile)
  useEffect(() => {
    const app = document.querySelector('.app')
    if (app) app.classList.add('wide')
    return () => { if (app) app.classList.remove('wide') }
  }, [])

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
    setNewRdv(r => ({ ...r, nom: c.nom, prenom: c.prenom || '', email: c.email || '', telephone: c.telephone || '' }))
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

    // Si on n'a pas cliqué sur un contact existant, on en crée un nouveau (identité = nom + prénom, avec un email et/ou un téléphone)
    let contactId = selectedContactId
    if (!contactId) {
      const { data: newContact, error: contactErr } = await supabase.from('contacts')
        .insert({ nom: newRdv.nom.trim(), prenom: newRdv.prenom.trim() || null, email: newRdv.email.trim() || null, telephone: newRdv.telephone.trim() || null })
        .select().single()
      if (contactErr) {
        setErrorRdv(`Erreur contact : ${contactErr.message}`)
        setSavingRdv(false)
        return
      }
      contactId = newContact.id
    }

    // email/telephone ne concernent que le contact, pas la table rdv_details
    const { email, telephone, ...rdvFields } = newRdv
    const { data, error: err } = await supabase.from('rdv_details').insert({ ia_id: iaId, semaine: selectedWeek, annee, ...rdvFields, contact_id: contactId }).select().single()
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
          <Section title="RDV Commerciaux" color="#534AB7" bg="#211F30" icon="ti-calendar-event">
            <RdvTable list={rdvList} onRemove={removeRdv} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <i className="ti ti-plus" style={{ fontSize: 14, color: lighten(RDV_COLOR, 0.35) }} aria-hidden="true" />
                <div style={{ fontSize: 12, fontWeight: 700, color: lighten(RDV_COLOR, 0.35), textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ajouter un RDV</div>
              </div>

              {/* Ligne 1 : contexte du rendez-vous */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: '2 1 220px' }}>
                  <label style={rdvLabelStyle}>Client *</label>
                  <input type="text" placeholder="Ex: BNP Paribas, RATP (raison sociale)" value={newRdv.client} onChange={e => setNewRdv(r => ({ ...r, client: e.target.value }))} style={rdvInputStyle} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={rdvLabelStyle}>Entité / BU</label>
                  <input type="text" placeholder="Ex: ITGP, TSI..." value={newRdv.entite} onChange={e => setNewRdv(r => ({ ...r, entite: e.target.value }))} style={rdvInputStyle} />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={rdvLabelStyle}>Objet du meeting *</label>
                  <select value={newRdv.objet_meeting} onChange={e => setNewRdv(r => ({ ...r, objet_meeting: e.target.value }))} style={rdvInputStyle}>
                    <option value="" style={{ background: '#2B2940', color: TEXT_STRONG }}>Choisir...</option>
                    {RDV_OBJET_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#2B2940', color: TEXT_STRONG }}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={rdvLabelStyle}>Date du meeting *</label>
                  <input type="date" value={newRdv.date_meeting} onChange={e => setNewRdv(r => ({ ...r, date_meeting: e.target.value }))} style={rdvInputStyle} />
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 16px' }} />

              {/* Ligne 2 : identité du contact */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: '1 1 180px', position: 'relative' }}>
                  <label style={rdvLabelStyle}>Nom *</label>
                  <input type="text" placeholder="Nom" value={newRdv.nom} autoComplete="off"
                    onChange={e => { setNewRdv(r => ({ ...r, nom: e.target.value })); setSelectedContactId(null) }}
                    style={rdvInputStyle} />
                  {selectedContactId && (
                    <div style={{ fontSize: 10, color: lighten('#0F6E56', 0.3), marginTop: 3, fontWeight: 600 }}>✓ Contact déjà connu, historique lié</div>
                  )}
                  {!selectedContactId && contactSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#2B2940', border: '1.5px solid ' + lighten(RDV_COLOR, 0.2), borderRadius: 8, marginTop: 2, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.45)' }}>
                      {contactSuggestions.map(c => (
                        <div key={c.id} onClick={() => pickContact(c)}
                          style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
                          <div style={{ fontWeight: 600, color: TEXT_STRONG }}>{[c.prenom, c.nom].filter(Boolean).join(' ')}</div>
                          {c.lastClient && (
                            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                              déjà vu chez {c.lastClient}{c.lastDate ? ' le ' + new Date(c.lastDate).toLocaleDateString('fr-FR') : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={rdvLabelStyle}>Prénom</label>
                  <input type="text" placeholder="Prénom" value={newRdv.prenom} onChange={e => setNewRdv(r => ({ ...r, prenom: e.target.value }))} style={rdvInputStyle} />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={rdvLabelStyle}>Fonction</label>
                  <input type="text" placeholder="Ex: DRH, Directeur IT..." value={newRdv.fonction} onChange={e => setNewRdv(r => ({ ...r, fonction: e.target.value }))} style={rdvInputStyle} />
                </div>
              </div>

              {/* Ligne 3 : coordonnées, mises en avant pour un nouveau contact via un simple liseré (pas de carte) */}
              <div style={{ borderLeft: '3px solid ' + (!selectedContactId ? lighten('#0F6E56', 0.2) : 'rgba(255,255,255,0.18)'), paddingLeft: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: !selectedContactId ? lighten('#0F6E56', 0.3) : TEXT_MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedContactId ? 'Coordonnées du contact' : 'Nouveau contact — coordonnées *'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: '1 1 220px' }}>
                    <label style={rdvLabelStyle}>Email</label>
                    <input type="email" placeholder="prenom.nom@client.com" value={newRdv.email} onChange={e => setNewRdv(r => ({ ...r, email: e.target.value }))} style={rdvInputStyle} />
                  </div>
                  <div style={{ flex: '1 1 220px' }}>
                    <label style={rdvLabelStyle}>Téléphone</label>
                    <input type="tel" placeholder="06 12 34 56 78" value={newRdv.telephone} onChange={e => setNewRdv(r => ({ ...r, telephone: e.target.value }))} style={rdvInputStyle} />
                  </div>
                </div>
                {needsContactInfo && newRdv.nom.trim() && (
                  <div style={{ fontSize: 11, color: lighten('#BA7517', 0.3), fontWeight: 600, marginTop: 10 }}>
                    ⚠️ Renseigne au moins un email ou un téléphone pour ce nouveau contact.
                  </div>
                )}
              </div>

              <label style={rdvLabelStyle}>Mini compte rendu *</label>
              <textarea placeholder="Resume rapide du meeting..." value={newRdv.compte_rendu} onChange={e => setNewRdv(r => ({ ...r, compte_rendu: e.target.value }))} rows={2}
                style={{ ...rdvInputStyle, resize: 'vertical' }} />
              <button onClick={addRdv} disabled={savingRdv || !rdvComplete}
                style={{ marginTop: 14, width: '100%', padding: '11px', background: rdvComplete ? RDV_COLOR : 'transparent', color: rdvComplete ? '#fff' : TEXT_MUTED, border: rdvComplete ? 'none' : '1.5px solid rgba(255,255,255,0.16)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: rdvComplete ? 'pointer' : 'default' }}>
                {savingRdv ? 'Ajout...' : '+ Ajouter ce RDV'}
              </button>
              {errorRdv && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#FCA5A5', fontSize: 12 }}>
                  ⚠️ {errorRdv}
                </div>
              )}
            </div>

            <TotalField label="Total RDV (automatique)" value={totalRdv} color="#534AB7" />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 11, color: TEXT_MUTED }}>
              <span>Découvertes : {rdvCounts.decouvertes}</span>
              <span>Prospects : {rdvCounts.prospects}</span>
              <span>Clients : {rdvCounts.clients}</span>
              <span>Présentations : {rdvCounts.presentations}</span>
            </div>
            {/* Accordion détail présentations (candidat présenté), toujours liée aux RDV de type Présentation */}
            <DetailAccordion type="presentation" count={rdvCounts.presentations} iaId={iaId} semaine={selectedWeek} annee={annee} />
          </Section>

          <Section title="Gestion du Pipe" color="#0F6E56" bg="#122420" icon="ti-filter">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <Counter label="Besoins Detectes"      value={form.besoins_detectes}     onChange={set('besoins_detectes')}     color="#0F6E56" />
              <Counter label="RDV Candidat"           value={form.rdv_candidats}        onChange={set('rdv_candidats')}        color="#0F6E56" />
              <Counter label="Solutions Envoyees"     value={form.cv_envoyes}           onChange={set('cv_envoyes')}           color="#0F6E56" />
              <Counter label="Attente Reponse Client" value={form.attente_retour}       onChange={set('attente_retour')}       color="#0F6E56" />
              <Counter label="Attente Retour Prez"   value={form.attente_retour_prez}  onChange={set('attente_retour_prez')}  color="#0F6E56" />
              <Counter label="Besoins sans solution" value={form.besoins_sans_solution} onChange={set('besoins_sans_solution')} color="#0F6E56" />
            </div>
            <TotalField label="Total Pipe (automatique)" value={totalPipe} color="#0F6E56" />
          </Section>

          <Section title="Resultats" color="#993556" bg="#2A1922" icon="ti-trophy">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
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

          <Section title="Priorités P1" color={P1_COLOR} bg="#2A2116" icon="ti-target">
            {p1List.filter(p => (p.profil && p.profil.trim()) || (p.description && p.description.trim())).map(p => (
              <P1Card key={p.id} p={p} onRemove={() => removeP1(p.id)} />
            ))}
            <div style={{ marginBottom: 12 }}>
              {P1_STEPS.map(step => {
                if (step.key === 'langues') return null
                const langStep = P1_STEPS.find(s => s.key === 'langues')
                const isSalaireLangues = step.key === 'salaire_max'
                return (
                  <div key={step.key} style={{ display: 'flex', gap: 0, marginBottom: 8, alignItems: 'stretch', borderRadius: 10, overflow: 'hidden', border: '1.5px solid ' + step.color + '60' }}>
                    <div style={{ width: 40, background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{step.num}</div>
                    </div>
                    <div style={{ flex: 1, background: 'transparent', padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: lighten(step.color, 0.3), marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{step.label}</div>
                      {isSalaireLangues ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <input type="text" value={newP1[step.key]} onChange={e => setNewP1(p => ({ ...p, [step.key]: e.target.value }))} placeholder={step.placeholder} style={{ borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: '1px solid ' + step.color + '50', background: 'rgba(255,255,255,0.06)', color: TEXT_STRONG, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                          <input type="text" value={newP1['langues']} onChange={e => setNewP1(p => ({ ...p, langues: e.target.value }))} placeholder={langStep.placeholder} style={{ borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: '1px solid ' + step.color + '50', background: 'rgba(255,255,255,0.06)', color: TEXT_STRONG, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                      ) : (
                        <input type="text" value={newP1[step.key]} onChange={e => setNewP1(p => ({ ...p, [step.key]: e.target.value }))} placeholder={step.placeholder} style={{ width: '100%', borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, border: '1px solid ' + step.color + '50', background: 'rgba(255,255,255,0.06)', color: TEXT_STRONG, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={addP1} disabled={savingP1 || !p1Complete}
              style={{ width: '100%', padding: '11px', background: p1Complete ? P1_COLOR : 'rgba(255,255,255,0.08)', color: p1Complete ? '#ffffff' : TEXT_MUTED, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: p1Complete ? 'pointer' : 'default' }}>
              {savingP1 ? 'Ajout...' : '+ Ajouter ce P1'}
            </button>
          </Section>

          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: 13, background: saved ? '#0F6E56' : '#534AB7', color: saved ? '#E1F5EE' : '#EEEDFE', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background 0.3s' }}>
            {saving ? 'Enregistrement...' : saved ? 'Semaine enregistree !' : 'Enregistrer la semaine ' + selectedWeek}
          </button>
        </div>
      )}
    </div>
  )
}
