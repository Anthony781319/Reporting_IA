import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

// Date du jour au format attendu par <input type="date"> (yyyy-mm-dd)
const todayISO = () => new Date().toISOString().slice(0, 10)

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

// Rendu "premium clair" : boutons -/+ à contour d'accent (var(--accent) héritée du .ui-panel parent),
// valeur en anthracite, libellé gris — utilisé par Gestion du Pipe et Résultats.
const Counter = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: RDV_TEXT, textAlign: 'center' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button className="ui-counter-btn" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span style={{ fontSize: 19, fontWeight: 800, minWidth: 26, textAlign: 'center', color: RDV_TITLE }}>{value}</span>
      <button className="ui-counter-btn" onClick={() => onChange(value + 1)}>+</button>
    </div>
  </div>
)

// Footer léger (fine séparation + bandeau très clair) pour le total automatique d'une carte de compteurs
const TotalField = ({ label, value, color }) => (
  <div className="ui-total-footer">
    <div className="ui-total-strip">
      <span className="ui-total-label">{label}</span>
      <span className="ui-total-value" style={{ color }}>{value}</span>
    </div>
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

const DetailAccordion = ({ type, count, iaId, semaine, annee, onCompletionChange }) => {
  const [open, setOpen] = useState(count > 0)
  const [details, setDetails] = useState([])
  const [form, setForm] = useState({})
  const [savedId, setSavedId] = useState(null)
  const [saveState, setSaveState] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [error, setError] = useState('')
  const saveTimeout = useRef(null)
  const prevCount = useRef(count)
  const cfg = DETAIL_CONFIG[type]
  const fields = DETAIL_FIELDS[type]

  // Garde-fou n°1 : le détail ne doit pas rester caché derrière un clic. Dès que le compteur augmente
  // (0 → 1, ou 1 → 2, etc.), on ouvre l'accordéon automatiquement pour que le formulaire soit visible
  // tout de suite, sans obliger à cliquer sur l'en-tête pour le découvrir.
  useEffect(() => {
    if (count > prevCount.current) setOpen(true)
    prevCount.current = count
  }, [count])

  useEffect(() => {
    if (count > 0) fetchDetails()
  }, [count, semaine])

  // Sécurité : en mode manager, on peut changer de semaine ou d'IA sans démonter ce composant. Une fiche
  // en cours de saisie (savedId) ne doit jamais continuer à être mise à jour une fois qu'on a changé de
  // contexte, sinon on écrirait la saisie de la semaine/IA suivante sur la fiche de la précédente.
  useEffect(() => {
    setForm({})
    setSavedId(null)
    setSaveState('idle')
    if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null }
  }, [semaine, iaId, type])

  useEffect(() => () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }, [])

  const fetchDetails = async () => {
    const { data } = await supabase.from('details_resultats').select('*').eq('ia_id', iaId).eq('semaine', semaine).eq('annee', annee).eq('type', type).order('created_at')
    if (data) setDetails(data)
  }

  // Garde-fou : ce qui est tapé s'enregistre tout seul, plus besoin de cliquer sur un bouton. Dès que
  // Nom/Prénom + Client sont renseignés, la fiche est créée en base ; toute modification d'un champ
  // ensuite (y compris après avoir quitté puis rouvert la page) met à jour cette même fiche. Si le
  // commercial ferme la page sans rien valider, ce qu'il a déjà tapé est déjà enregistré.
  const persist = async (currentForm, id) => {
    if (id) {
      setSaveState('saving')
      const { error: err } = await supabase.from('details_resultats').update(currentForm).eq('id', id)
      setSaveState(err ? 'error' : 'saved')
      if (err) setError(err.message ? `Erreur d'enregistrement : ${err.message}` : "Erreur d'enregistrement, réessaie ou préviens ton manager.")
      return
    }
    const required = fields.filter(f => f.key === 'nom_prenom' || f.key === 'client')
    if (required.some(f => !currentForm[f.key]?.trim())) return
    setSaveState('saving')
    setError('')
    const { data, error: err } = await supabase.from('details_resultats').insert({ ia_id: iaId, semaine, annee, type, ...currentForm }).select().single()
    if (data) {
      setSavedId(data.id)
      setSaveState('saved')
    } else {
      setSaveState('error')
      setError(err?.message ? `Erreur d'enregistrement : ${err.message}` : "Erreur d'enregistrement, réessaie ou préviens ton manager.")
    }
  }

  const handleFieldChange = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    setSaveState('idle')
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => persist(next, savedId), 700)
  }

  const handleFieldBlur = () => {
    if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null }
    persist(form, savedId)
  }

  // Purement local : une fois la fiche déjà enregistrée (savedId), on la fait passer dans la liste
  // affichée et on repart sur un formulaire vierge pour la suivante — aucune donnée n'est perdue si
  // ce bouton n'est jamais cliqué, la fiche reste enregistrée telle quelle.
  const finishEntry = () => {
    if (!savedId) return
    setDetails(d => [...d, { id: savedId, ia_id: iaId, semaine, annee, type, ...form }])
    setForm({})
    setSavedId(null)
    setSaveState('idle')
  }

  const removeDetail = async (id) => {
    await supabase.from('details_resultats').delete().eq('id', id)
    setDetails(d => d.filter(x => x.id !== id))
    if (id === savedId) { setSavedId(null); setForm({}); setSaveState('idle') }
  }

  const savedCount = details.length + (savedId ? 1 : 0)

  // Garde-fou n°2 : le parent (bouton "Enregistrer la semaine") est informé en direct de la complétude
  // de ce type de détail, pour pouvoir bloquer l'enregistrement tant qu'il manque une fiche.
  useEffect(() => {
    if (onCompletionChange) onCompletionChange(type, savedCount >= count)
  }, [savedCount, count, type])

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
            {savedCount}/{count}
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

          {/* Formulaire ajout — enregistrement automatique, pas de bouton "Ajouter" à cliquer.
              Reste affiché tant qu'une fiche est en cours de saisie (savedId), même si le total est déjà
              atteint côté "nom + client", pour laisser remplir les champs optionnels (TJM, dates...). */}
          {(details.length < count || savedId) && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, border: `1px dashed ${cfg.color}50` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fiche {savedCount + 1}/{count}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: cfg.color, opacity: 0.85 }}>
                  {saveState === 'saving' && '⏳ Enregistrement...'}
                  {saveState === 'saved' && '✓ Enregistré'}
                  {saveState === 'error' && '⚠️ Non enregistré'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: fields.length > 2 ? '1fr 1fr' : '1fr', gap: 8 }}>
                {fields.map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 11, color: cfg.color, opacity: 0.9, marginBottom: 4, fontWeight: 500 }}>{f.label}</label>
                    <input type={f.type || 'text'} placeholder={f.placeholder || f.label}
                      value={form[f.key] || ''}
                      onChange={e => handleFieldChange(f.key, e.target.value)}
                      onBlur={handleFieldBlur}
                      style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${cfg.color}40`, background: 'rgba(255,255,255,0.06)', color: TEXT_STRONG, fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              {savedId && (
                <button onClick={finishEntry}
                  style={{ marginTop: 10, width: '100%', padding: '9px', background: cfg.fill, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Fiche suivante
                </button>
              )}
              <div style={{ marginTop: 8, fontSize: 10.5, color: cfg.color, opacity: 0.7, fontStyle: 'italic' }}>
                Ce que tu remplis ici s'enregistre automatiquement, même si tu fermes la page avant d'avoir tout rempli.
              </div>
              {error && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#FCA5A5', fontSize: 12 }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          {details.length >= count && details.length > 0 && !savedId && (
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
const RDV_ACCENT_LIGHT = '#EEEDFE'
// Palette "SaaS premium" (texte foncé sur fond clair) pour toute la section RDV Commerciaux —
// distincte de TEXT_STRONG/TEXT_MUTED qui servent au reste de la page (texte clair sur fond sombre).
const RDV_TITLE = '#101828'
const RDV_TEXT = '#344054'
const RDV_TEXT_SECONDARY = '#667085'
const RDV_BORDER = '#EAECF0'

// Styles de la section "RDV Commerciaux" version premium (panneau clair) : quelques vraies règles CSS
// (focus, hover, responsive) que les styles inline ne permettent pas facilement. Scoping par préfixe
// de classe "rdv-" pour ne rien affecter en dehors de cette section.
const RdvPremiumStyles = () => (
  <style>{`
    .rdv-panel { background: #E3E6EC; border-radius: 16px; padding: 16px 18px 18px; box-shadow: 0 1px 3px rgba(16,24,40,0.08); }

    .rdv-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .rdv-section-icon { width: 26px; height: 26px; border-radius: 8px; background: ${RDV_ACCENT_LIGHT}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rdv-section-title { font-size: 13px; font-weight: 700; color: ${RDV_TITLE}; text-transform: uppercase; letter-spacing: 0.04em; }

    .rdv-kpi-row { display: flex; flex-wrap: wrap; align-items: baseline; margin: 0 0 14px; }
    .rdv-kpi-item { display: flex; align-items: baseline; gap: 5px; padding-right: 14px; margin-right: 14px; border-right: 1px solid ${RDV_BORDER}; }
    .rdv-kpi-item:last-child { border-right: none; margin-right: 0; padding-right: 0; }
    .rdv-kpi-value { font-size: 13.5px; font-weight: 700; color: ${RDV_TEXT}; }
    .rdv-kpi-label { font-size: 12.5px; font-weight: 500; color: ${RDV_TEXT_SECONDARY}; }

    .rdv-card { background: #fff; border: 1px solid ${RDV_BORDER}; border-radius: 14px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); }
    .rdv-card-header { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
    .rdv-card-icon { width: 26px; height: 26px; border-radius: 8px; background: ${RDV_ACCENT_LIGHT}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rdv-card-title { font-size: 14px; font-weight: 700; color: ${RDV_TITLE}; }

    .rdv-grid-1 { display: grid; grid-template-columns: 2fr 1.2fr 1.8fr 1fr; gap: 12px; margin-bottom: 12px; }
    .rdv-grid-2 { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 12px; margin-bottom: 12px; }
    .rdv-grid-3 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 860px) { .rdv-grid-1, .rdv-grid-2 { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .rdv-grid-1, .rdv-grid-2, .rdv-grid-3 { grid-template-columns: 1fr; } }

    .rdv-field { position: relative; }
    .rdv-field-label { display: block; font-size: 12px; font-weight: 600; color: ${RDV_TEXT}; margin-bottom: 5px; }
    .rdv-input { height: 44px; padding: 0 13px; border-radius: 9px; border: 1.5px solid ${RDV_BORDER}; background: #F9FAFB; color: ${RDV_TITLE}; font-size: 13.5px; width: 100%; box-sizing: border-box; font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
    .rdv-input::placeholder { color: #98A2B3; }
    .rdv-input:focus { outline: none; border-color: ${RDV_COLOR}; background: #fff; box-shadow: 0 0 0 3px ${RDV_COLOR}22; }
    select.rdv-input { cursor: pointer; }
    textarea.rdv-input { height: auto; min-height: 88px; padding: 11px 13px; resize: vertical; line-height: 1.45; }

    .rdv-suggestions { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; background: #fff; border: 1px solid ${RDV_BORDER}; border-radius: 10px; margin-top: 4px; overflow: hidden; box-shadow: 0 10px 30px rgba(16,24,40,0.14); max-height: 220px; overflow-y: auto; }
    .rdv-suggestion-item { padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #F3F4F6; font-size: 12.5px; }
    .rdv-suggestion-item:last-child { border-bottom: none; }
    .rdv-suggestion-item:hover { background: #F9FAFB; }

    .rdv-contact-zone { background: #FAFAFB; border: 1px solid #F2F4F7; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; }
    .rdv-contact-zone-title { font-size: 11px; font-weight: 700; color: ${RDV_TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }

    .rdv-cta-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
    .rdv-required-note { font-size: 12px; color: #98A2B3; }
    .rdv-btn-primary { height: 45px; padding: 0 28px; border-radius: 10px; background: ${RDV_COLOR}; color: #fff; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: background .15s ease, transform .05s ease; }
    .rdv-btn-primary:hover:not(:disabled) { background: #443B92; }
    .rdv-btn-primary:active:not(:disabled) { transform: scale(0.98); }
    .rdv-btn-primary:disabled { background: #EAECF0; color: #98A2B3; cursor: default; }

    .rdv-list-title { font-size: 11.5px; font-weight: 700; color: ${RDV_TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 0.06em; margin: 16px 0 4px; }
    .rdv-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 10px 2px; border-bottom: 1px solid ${RDV_BORDER}; }
    .rdv-item:last-child { border-bottom: none; }
    .rdv-item-main { min-width: 0; flex: 1; }
    .rdv-item-client { font-size: 13.5px; font-weight: 700; color: ${RDV_TITLE}; margin-bottom: 2px; }
    .rdv-item-meta { font-size: 12px; color: ${RDV_TEXT_SECONDARY}; margin-bottom: 2px; }
    .rdv-item-meta b { font-weight: 600; }
    .rdv-item-contact { font-size: 12px; color: ${RDV_TEXT_SECONDARY}; margin-bottom: 2px; }
    .rdv-item-cr { font-size: 12px; color: #98A2B3; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rdv-item-delete { flex-shrink: 0; background: none; border: none; cursor: pointer; color: #98A2B3; font-size: 12px; font-weight: 600; padding: 2px; white-space: nowrap; margin-top: 1px; }
    .rdv-item-delete:hover { color: #D92D20; }

    .rdv-empty { text-align: center; padding: 20px 12px; color: ${RDV_TEXT_SECONDARY}; }

    /* ── Classes génériques réutilisées par Positionnement / Gestion du Pipe / Résultats ──
       Même recette visuelle que RDV Commerciaux, mais paramétrée par variables CSS (--accent,
       --accent-light, --accent-ring) posées sur le conteneur .ui-panel de chaque section, pour que
       seul l'accent change d'un univers à l'autre (fond blanc partout). */
    .ui-panel { background: #E3E6EC; border: 1px solid #D5D9E0; border-radius: 16px; padding: 16px 18px 18px; box-shadow: 0 1px 3px rgba(16,24,40,0.06); }
    .ui-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .ui-section-icon { width: 26px; height: 26px; border-radius: 8px; background: var(--accent-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ui-section-icon i { color: var(--accent); font-size: 13px; }
    .ui-section-title { font-size: 13px; font-weight: 700; color: ${RDV_TITLE}; text-transform: uppercase; letter-spacing: 0.04em; }

    .ui-card { background: #fff; border: 1.5px solid ${RDV_BORDER}; border-radius: 14px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); }
    .ui-card-header { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
    .ui-card-icon { width: 26px; height: 26px; border-radius: 8px; background: var(--accent-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ui-card-icon i { color: var(--accent); font-size: 15px; }
    .ui-card-title { font-size: 14px; font-weight: 700; color: ${RDV_TITLE}; }

    .ui-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .ui-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 860px) { .ui-grid-3 { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .ui-grid-2, .ui-grid-3 { grid-template-columns: 1fr; } }

    .ui-field { position: relative; }
    .ui-field-label { display: block; font-size: 12px; font-weight: 600; color: ${RDV_TEXT}; margin-bottom: 5px; }
    .ui-input { height: 44px; padding: 0 13px; border-radius: 9px; border: 1.5px solid ${RDV_BORDER}; background: #F9FAFB; color: ${RDV_TITLE}; font-size: 13.5px; width: 100%; box-sizing: border-box; font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
    .ui-input::placeholder { color: #98A2B3; }
    .ui-input:focus { outline: none; border-color: var(--accent); background: #fff; box-shadow: 0 0 0 3px var(--accent-ring); }
    select.ui-input { cursor: pointer; }

    .ui-suggestions { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; background: #fff; border: 1px solid ${RDV_BORDER}; border-radius: 10px; margin-top: 4px; overflow: hidden; box-shadow: 0 10px 30px rgba(16,24,40,0.14); max-height: 220px; overflow-y: auto; }
    .ui-suggestion-item { padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #F3F4F6; font-size: 12.5px; font-weight: 600; color: ${RDV_TITLE}; }
    .ui-suggestion-item:last-child { border-bottom: none; }
    .ui-suggestion-item:hover { background: #F9FAFB; }

    .ui-cta-row { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
    .ui-btn-primary { height: 45px; padding: 0 26px; border-radius: 10px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: filter .15s ease, transform .05s ease; }
    .ui-btn-primary:hover:not(:disabled) { filter: brightness(0.92); }
    .ui-btn-primary:active:not(:disabled) { transform: scale(0.98); }
    .ui-btn-primary:disabled { background: #EAECF0; color: #98A2B3; cursor: default; }

    .ui-hint-ok { font-size: 10.5px; color: #12805C; margin-top: 4px; font-weight: 600; }
    .ui-hint-warn { font-size: 10.5px; color: #B42318; margin-top: 4px; font-weight: 600; }

    .ui-counter-btn { width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid var(--accent); background: #fff; color: var(--accent); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; transition: background .15s ease; }
    .ui-counter-btn:hover { background: var(--accent-light); }

    .ui-total-footer { margin-top: 14px; padding-top: 12px; border-top: 1px solid ${RDV_BORDER}; }
    .ui-total-strip { display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border-radius: 8px; padding: 9px 12px; }
    .ui-total-label { font-size: 12.5px; font-weight: 600; color: ${RDV_TEXT}; }
    .ui-total-value { font-size: 19px; font-weight: 800; }
  `}</style>
)

// Panneau clair générique (fond gris #E3E6EC uniforme, bordure fine, ombre subtile) partagé par toutes
// les sections — seul l'accent change d'un univers à l'autre via ces variables CSS.
const PremiumPanel = ({ accent, accentLight, accentRing, children }) => (
  <div className="ui-panel" style={{ '--accent': accent, '--accent-light': accentLight, '--accent-ring': accentRing }}>
    {children}
  </div>
)

const PremiumSectionHeader = ({ icon, title }) => (
  <div className="ui-section-header">
    <div className="ui-section-icon"><i className={`ti ${icon}`} aria-hidden="true" /></div>
    <div className="ui-section-title">{title}</div>
  </div>
)

// Ligne de KPI compacte (RDV total + répartition par objet), alimentée par rdvCounts/totalRdv déjà calculés
const RdvKpiRow = ({ total, counts }) => (
  <div className="rdv-kpi-row">
    <div className="rdv-kpi-item"><span className="rdv-kpi-value">{total}</span><span className="rdv-kpi-label">RDV cette semaine</span></div>
    <div className="rdv-kpi-item"><span className="rdv-kpi-value">{counts.decouvertes}</span><span className="rdv-kpi-label">Découvertes</span></div>
    <div className="rdv-kpi-item"><span className="rdv-kpi-value">{counts.prospects}</span><span className="rdv-kpi-label">Prospects</span></div>
    <div className="rdv-kpi-item"><span className="rdv-kpi-value">{counts.clients}</span><span className="rdv-kpi-label">Clients</span></div>
    <div className="rdv-kpi-item"><span className="rdv-kpi-value">{counts.presentations}</span><span className="rdv-kpi-label">{counts.presentations > 1 ? 'Présentations' : 'Présentation'}</span></div>
  </div>
)

// Liste compacte des RDV déjà enregistrés (remplace l'ancien tableau) : mini-cards, la plus récente en premier
const RdvRecentList = ({ list, onRemove }) => {
  if (list.length === 0) {
    return (
      <div className="rdv-empty">
        <div style={{ fontSize: 13, fontWeight: 600, color: RDV_TEXT }}>Aucun rendez-vous enregistré cette semaine</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>Ajoutez votre premier rendez-vous ci-dessus.</div>
      </div>
    )
  }
  const sorted = [...list].sort((a, b) => new Date(b.date_meeting || 0) - new Date(a.date_meeting || 0))
  return (
    <div>
      {sorted.map(r => {
        const color = OBJET_COLORS[r.objet_meeting] || RDV_COLOR
        const objetLabel = RDV_OBJET_OPTIONS.find(o => o.value === r.objet_meeting)?.label || r.objet_meeting
        const contact = [r.prenom, r.nom].filter(Boolean).join(' ')
        return (
          <div key={r.id} className="rdv-item">
            <div className="rdv-item-main">
              <div className="rdv-item-client">{r.client || '—'}</div>
              <div className="rdv-item-meta">
                <b style={{ color }}>{objetLabel}</b> · {r.date_meeting ? new Date(r.date_meeting).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
              </div>
              {(contact || r.fonction) && (
                <div className="rdv-item-contact">{contact || '—'}{r.fonction ? ' · ' + r.fonction : ''}{r.entite ? ' · ' + r.entite : ''}</div>
              )}
              {r.compte_rendu && <div className="rdv-item-cr">{r.compte_rendu}</div>}
            </div>
            {onRemove && <button className="rdv-item-delete" onClick={() => onRemove(r.id)}>Supprimer</button>}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// RDV PROGRAMMÉS (rendez-vous à venir, 2 prochaines semaines)
// Reporting hebdo de chaque IA : distinct de "RDV Commerciaux" (rétrospectif, rdv_details)
// et de la saisie "Prospection du lundi" (séance live 16h-18h, rdv_programmes aussi mais
// filtrée par created_at) — ici chaque IA déclare au fil de l'eau les RDV déjà pris pour les
// 2 prochaines semaines, visibles ensuite côté manager (carte "RDV programmés 14j").
// ─────────────────────────────────────────────
const RDVPROG_COLOR = '#2563EB'
const RDVPROG_ACCENT_LIGHT = '#EAF1FD'
const RDVPROG_ACCENT_RING = 'rgba(37,99,235,0.18)'

const emptyRdvProgramme = { nom: '', prenom: '', fonction: '', client: '', objet_meeting: '', date_rdv: '', heure_rdv: '', modalite: 'physique' }

function RdvProgrammesPanel({ iaId }) {
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyRdvProgramme)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    const today = todayISO()
    const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    const { data } = await supabase.from('rdv_programmes').select('*').eq('ia_id', iaId)
      .gte('date_rdv', today).lte('date_rdv', in14).order('date_rdv').order('heure_rdv')
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
      setList(l => [...l, data].sort((a, b) => (a.date_rdv + a.heure_rdv).localeCompare(b.date_rdv + b.heure_rdv)))
      setForm(emptyRdvProgramme)
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
    <PremiumPanel accent={RDVPROG_COLOR} accentLight={RDVPROG_ACCENT_LIGHT} accentRing={RDVPROG_ACCENT_RING}>
      <PremiumSectionHeader icon="ti-calendar-time" title="RDV programmés — 2 prochaines semaines" />

      <div className="ui-card">
        <div className="ui-card-header">
          <div className="ui-card-icon"><i className="ti ti-plus" aria-hidden="true" /></div>
          <div className="ui-card-title">Ajouter un RDV à venir</div>
        </div>

        <div className="ui-grid-2">
          <div className="ui-field">
            <label className="ui-field-label">Nom *</label>
            <input className="ui-input" type="text" placeholder="Dupont" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          </div>
          <div className="ui-field">
            <label className="ui-field-label">Prénom *</label>
            <input className="ui-input" type="text" placeholder="Jean" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
          </div>
        </div>

        <div className="ui-grid-2">
          <div className="ui-field">
            <label className="ui-field-label">Fonction</label>
            <input className="ui-input" type="text" placeholder="DRH, Directeur IT..." value={form.fonction} onChange={e => setForm(f => ({ ...f, fonction: e.target.value }))} />
          </div>
          <div className="ui-field">
            <label className="ui-field-label">Client *</label>
            <input className="ui-input" type="text" placeholder="Raison sociale" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} />
          </div>
        </div>

        <div className="ui-grid-3">
          <div className="ui-field">
            <label className="ui-field-label">Typologie *</label>
            <select className="ui-input" value={form.objet_meeting} onChange={e => setForm(f => ({ ...f, objet_meeting: e.target.value }))}>
              <option value="">Choisir...</option>
              {RDV_OBJET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ui-field">
            <label className="ui-field-label">Date *</label>
            <input className="ui-input" type="date" value={form.date_rdv} onChange={e => setForm(f => ({ ...f, date_rdv: e.target.value }))} />
          </div>
          <div className="ui-field">
            <label className="ui-field-label">Heure *</label>
            <input className="ui-input" type="time" value={form.heure_rdv} onChange={e => setForm(f => ({ ...f, heure_rdv: e.target.value }))} />
          </div>
        </div>

        <div className="ui-grid-2">
          <div className="ui-field">
            <label className="ui-field-label">Modalité *</label>
            <select className="ui-input" value={form.modalite} onChange={e => setForm(f => ({ ...f, modalite: e.target.value }))}>
              <option value="physique">🤝 Physique</option>
              <option value="teams">💻 Teams</option>
            </select>
          </div>
        </div>

        <div className="ui-cta-row">
          <span className="rdv-required-note">* Champs obligatoires</span>
          <button className="ui-btn-primary" onClick={submit} disabled={saving || !complete}>
            {saving ? 'Enregistrement...' : 'Enregistrer le RDV'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      <div className="rdv-list-title">RDV programmés{loaded ? ` (${list.length})` : ''}</div>
      {loaded && list.length === 0 && (
        <div className="rdv-empty">
          <div style={{ fontSize: 13, fontWeight: 600, color: RDV_TEXT }}>Aucun RDV programmé sur les 2 prochaines semaines</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>Ajoutez votre premier RDV ci-dessus.</div>
        </div>
      )}
      {list.map(r => {
        const color = OBJET_COLORS[r.objet_meeting] || RDVPROG_COLOR
        const objetLabel = RDV_OBJET_OPTIONS.find(o => o.value === r.objet_meeting)?.label || r.objet_meeting
        return (
          <div key={r.id} className="rdv-item">
            <div className="rdv-item-main">
              <div className="rdv-item-client">{r.client || '—'}</div>
              <div className="rdv-item-meta">
                <b style={{ color }}>{objetLabel}</b> · {r.date_rdv ? new Date(r.date_rdv + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'} à {r.heure_rdv?.slice(0, 5)} · {r.modalite === 'teams' ? '💻 Teams' : '🤝 Physique'}
              </div>
              {(r.prenom || r.nom || r.fonction) && (
                <div className="rdv-item-contact">{[r.prenom, r.nom].filter(Boolean).join(' ')}{r.fonction ? ' · ' + r.fonction : ''}</div>
              )}
            </div>
            <button className="rdv-item-delete" onClick={() => remove(r.id)}>Supprimer</button>
          </div>
        )
      })}
    </PremiumPanel>
  )
}

// Accents "Gestion du Pipe" (teal) et "Résultats" (bordeaux) : un accent + un fond très léger + une
// couleur de halo de focus, posés en variables CSS sur .ui-panel.
const PIPE_COLOR = '#2F8F83'
const PIPE_ACCENT_LIGHT = '#EFF8F6'
const PIPE_ACCENT_RING = 'rgba(47,143,131,0.18)'

const RESULTATS_COLOR = '#A4556A'
const RESULTATS_ACCENT_LIGHT = '#FBF2F4'
const RESULTATS_ACCENT_RING = 'rgba(164,85,106,0.18)'

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
  // Garde-fou : chaque DetailAccordion (présentations / signatures / démarrages / fins de mission)
  // signale ici s'il est complet (autant de fiches "nom + client" que le compteur affiché) ; "Enregistrer
  // la semaine" refuse de partir tant qu'il en manque, pour ne plus se retrouver avec un total déclaré
  // sans aucun détail derrière.
  const [detailComplete, setDetailComplete] = useState({})
  const [saveBlockedMsg, setSaveBlockedMsg] = useState('')
  const handleDetailCompletion = (detailType, complete) => {
    setDetailComplete(d => (d[detailType] === complete ? d : { ...d, [detailType]: complete }))
  }
  // Le message de blocage disparaît tout seul dès que tout redevient complet (pas besoin de recliquer sur "Enregistrer").
  useEffect(() => {
    if (saveBlockedMsg && Object.values(detailComplete).every(Boolean)) setSaveBlockedMsg('')
  }, [detailComplete])
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
      const [{ data }, { data: rdvData }] = await Promise.all([
        supabase.from('saisies').select('*').eq('ia_id', iaId).eq('semaine', selectedWeek).eq('annee', annee).single(),
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

  const DETAIL_TYPE_LABELS = { presentation: 'Présentations', signature: 'Signatures', demarrage: 'Démarrages', fin_mission: 'Fins de mission' }

  const handleSave = async () => {
    // Garde-fou : on refuse d'enregistrer la semaine tant qu'un compteur (présentations, signatures,
    // démarrages, fins de mission) n'a pas sa fiche détail (nom + client) correspondante — sinon on se
    // retrouve avec un total sans aucun nom derrière, comme ça arrivait avant.
    const missing = Object.entries(detailComplete).filter(([, ok]) => ok === false).map(([t]) => DETAIL_TYPE_LABELS[t] || t)
    if (missing.length > 0) {
      setSaveBlockedMsg(`Complète d'abord le détail (nom + client) de : ${missing.join(', ')} — ouvre la section correspondante ci-dessus.`)
      return
    }
    setSaveBlockedMsg('')
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

  if (!iaId) return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
      Va dans l'onglet <strong>Admin</strong> et selectionne ton nom pour commencer.
    </div>
  )

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
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
          <div style={{ marginBottom: 24 }}>
            <RdvPremiumStyles />
            <div className="rdv-panel">
              <div className="rdv-section-header">
                <div className="rdv-section-icon"><i className="ti ti-calendar-event" style={{ fontSize: 13, color: RDV_COLOR }} aria-hidden="true" /></div>
                <div className="rdv-section-title">RDV Commerciaux</div>
              </div>
              <RdvKpiRow total={totalRdv} counts={rdvCounts} />

            <div className="rdv-card">
              <div className="rdv-card-header">
                <div className="rdv-card-icon"><i className="ti ti-plus" style={{ fontSize: 15, color: RDV_COLOR }} aria-hidden="true" /></div>
                <div className="rdv-card-title">Ajouter un rendez-vous</div>
              </div>

              {/* Ligne 1 : contexte du rendez-vous */}
              <div className="rdv-grid-1">
                <div className="rdv-field">
                  <label className="rdv-field-label">Client *</label>
                  <input className="rdv-input" type="text" placeholder="Ex: BNP Paribas, RATP (raison sociale)" value={newRdv.client} onChange={e => setNewRdv(r => ({ ...r, client: e.target.value }))} />
                </div>
                <div className="rdv-field">
                  <label className="rdv-field-label">Entité / BU</label>
                  <input className="rdv-input" type="text" placeholder="Ex: ITGP, TSI..." value={newRdv.entite} onChange={e => setNewRdv(r => ({ ...r, entite: e.target.value }))} />
                </div>
                <div className="rdv-field">
                  <label className="rdv-field-label">Objet du meeting *</label>
                  <select className="rdv-input" value={newRdv.objet_meeting} onChange={e => setNewRdv(r => ({ ...r, objet_meeting: e.target.value }))}>
                    <option value="">Choisir...</option>
                    {RDV_OBJET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="rdv-field">
                  <label className="rdv-field-label">Date du meeting *</label>
                  <input className="rdv-input" type="date" value={newRdv.date_meeting} onChange={e => setNewRdv(r => ({ ...r, date_meeting: e.target.value }))} />
                </div>
              </div>

              {/* Ligne 2 : identité du contact */}
              <div className="rdv-grid-2">
                <div className="rdv-field">
                  <label className="rdv-field-label">Nom *</label>
                  <input className="rdv-input" type="text" placeholder="Nom" value={newRdv.nom} autoComplete="off"
                    onChange={e => { setNewRdv(r => ({ ...r, nom: e.target.value })); setSelectedContactId(null) }} />
                  {selectedContactId && (
                    <div style={{ fontSize: 10.5, color: '#0F6E56', marginTop: 5, fontWeight: 600 }}>✓ Contact déjà connu, historique lié</div>
                  )}
                  {!selectedContactId && contactSuggestions.length > 0 && (
                    <div className="rdv-suggestions">
                      {contactSuggestions.map(c => (
                        <div key={c.id} className="rdv-suggestion-item" onClick={() => pickContact(c)}>
                          <div style={{ fontWeight: 600, color: RDV_TITLE }}>{[c.prenom, c.nom].filter(Boolean).join(' ')}</div>
                          {c.lastClient && (
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                              déjà vu chez {c.lastClient}{c.lastDate ? ' le ' + new Date(c.lastDate).toLocaleDateString('fr-FR') : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rdv-field">
                  <label className="rdv-field-label">Prénom</label>
                  <input className="rdv-input" type="text" placeholder="Prénom" value={newRdv.prenom} onChange={e => setNewRdv(r => ({ ...r, prenom: e.target.value }))} />
                </div>
                <div className="rdv-field">
                  <label className="rdv-field-label">Fonction</label>
                  <input className="rdv-input" type="text" placeholder="Ex: DRH, Directeur IT..." value={newRdv.fonction} onChange={e => setNewRdv(r => ({ ...r, fonction: e.target.value }))} />
                </div>
              </div>

              {/* Nouveau contact — coordonnées (zone légèrement teintée plutôt qu'un gros bandeau) */}
              <div className="rdv-contact-zone">
                <div className="rdv-contact-zone-title" style={{ color: !selectedContactId ? '#0F6E56' : '#9CA3AF' }}>
                  {selectedContactId ? 'Coordonnées du contact' : 'Nouveau contact — coordonnées *'}
                </div>
                <div className="rdv-grid-3">
                  <div className="rdv-field">
                    <label className="rdv-field-label">Email</label>
                    <input className="rdv-input" type="email" placeholder="prenom.nom@client.com" value={newRdv.email} onChange={e => setNewRdv(r => ({ ...r, email: e.target.value }))} />
                  </div>
                  <div className="rdv-field">
                    <label className="rdv-field-label">Téléphone</label>
                    <input className="rdv-input" type="tel" placeholder="06 12 34 56 78" value={newRdv.telephone} onChange={e => setNewRdv(r => ({ ...r, telephone: e.target.value }))} />
                  </div>
                </div>
                {needsContactInfo && newRdv.nom.trim() && (
                  <div style={{ fontSize: 11.5, color: '#B45309', fontWeight: 600, marginTop: 10 }}>
                    ⚠️ Renseigne au moins un email ou un téléphone pour ce nouveau contact.
                  </div>
                )}
              </div>

              <label className="rdv-field-label">Compte rendu du RDV</label>
              <textarea className="rdv-input" placeholder="Résumé rapide du rendez-vous, besoin identifié, prochaine étape…" value={newRdv.compte_rendu} onChange={e => setNewRdv(r => ({ ...r, compte_rendu: e.target.value }))} rows={3} />

              <div className="rdv-cta-row">
                <span className="rdv-required-note">* Champs obligatoires</span>
                <button className="rdv-btn-primary" onClick={addRdv} disabled={savingRdv || !rdvComplete}>
                  {savingRdv ? 'Enregistrement...' : 'Enregistrer le RDV'}
                </button>
              </div>
              {errorRdv && (
                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
                  ⚠️ {errorRdv}
                </div>
              )}
            </div>

              <div className="rdv-list-title">Rendez-vous de la semaine{rdvList.length > 0 ? ` (${rdvList.length})` : ''}</div>
              <RdvRecentList list={rdvList} onRemove={removeRdv} />
            </div>

            {/* Accordion détail présentations (candidat présenté), toujours liée aux RDV de type Présentation — hors du panneau clair, comme avant */}
            <DetailAccordion type="presentation" count={rdvCounts.presentations} iaId={iaId} semaine={selectedWeek} annee={annee} onCompletionChange={handleDetailCompletion} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <RdvProgrammesPanel iaId={iaId} />
          </div>

          {/* Le panneau "Positionnement collaborateur ITC" (push/besoin) a déménagé vers le portail
              dédié "Challenge ITC" (voir ChallengeItc.jsx) pour ne pas faire doublon avec son propre
              formulaire + classement. */}

          <div style={{ marginBottom: 24 }}>
            <PremiumPanel accent={PIPE_COLOR} accentLight={PIPE_ACCENT_LIGHT} accentRing={PIPE_ACCENT_RING}>
              <PremiumSectionHeader icon="ti-filter" title="Gestion du Pipe" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                <Counter label="Besoins détectés"       value={form.besoins_detectes}      onChange={set('besoins_detectes')} />
                <Counter label="RDV candidat"           value={form.rdv_candidats}         onChange={set('rdv_candidats')} />
                <Counter label="Solutions envoyées"     value={form.cv_envoyes}            onChange={set('cv_envoyes')} />
                <Counter label="Attente réponse client" value={form.attente_retour}        onChange={set('attente_retour')} />
                <Counter label="Attente retour prez"    value={form.attente_retour_prez}   onChange={set('attente_retour_prez')} />
                <Counter label="Besoins sans solution"  value={form.besoins_sans_solution} onChange={set('besoins_sans_solution')} />
              </div>
              <TotalField label="Total Pipe (automatique)" value={totalPipe} color={PIPE_COLOR} />
            </PremiumPanel>
          </div>

          <div style={{ marginBottom: 24 }}>
            <PremiumPanel accent={RESULTATS_COLOR} accentLight={RESULTATS_ACCENT_LIGHT} accentRing={RESULTATS_ACCENT_RING}>
              <PremiumSectionHeader icon="ti-trophy" title="Résultats" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                <Counter label="Signatures"       value={form.signatures}             onChange={set('signatures')} />
                <Counter label="Démarrages"       value={form.demarrages}             onChange={set('demarrages')} />
                <Counter label="Fins de mission"  value={form.fins_de_mission}        onChange={set('fins_de_mission')} />
                <Counter label="Prés. à monter"   value={form.presentations_a_monter} onChange={set('presentations_a_monter')} />
              </div>
            </PremiumPanel>
            {/* Accordions détails résultats — hors du panneau clair, comme pour RDV Commerciaux */}
            <DetailAccordion type="signature"   count={form.signatures}      iaId={iaId} semaine={selectedWeek} annee={annee} onCompletionChange={handleDetailCompletion} />
            <DetailAccordion type="demarrage"   count={form.demarrages}      iaId={iaId} semaine={selectedWeek} annee={annee} onCompletionChange={handleDetailCompletion} />
            <DetailAccordion type="fin_mission" count={form.fins_de_mission} iaId={iaId} semaine={selectedWeek} annee={annee} onCompletionChange={handleDetailCompletion} />
          </div>

          {saveBlockedMsg && (
            <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(248,113,113,0.4)', color: '#F87171', fontSize: 12.5, fontWeight: 500 }}>
              ⚠️ {saveBlockedMsg}
            </div>
          )}
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: 13, background: saved ? '#0F6E56' : '#534AB7', color: saved ? '#E1F5EE' : '#EEEDFE', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background 0.3s' }}>
            {saving ? 'Enregistrement...' : saved ? 'Semaine enregistree !' : 'Enregistrer la semaine ' + selectedWeek}
          </button>
        </div>
      )}
    </div>
  )
}
