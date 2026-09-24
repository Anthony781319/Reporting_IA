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
    .rdv-panel { background: #fff; border-radius: 16px; padding: 16px 18px 18px; box-shadow: 0 1px 3px rgba(16,24,40,0.08); }

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
    .ui-panel { background: #fff; border: 1px solid ${RDV_BORDER}; border-radius: 16px; padding: 16px 18px 18px; box-shadow: 0 1px 3px rgba(16,24,40,0.06); }
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

// Panneau clair générique (fond blanc, bordure fine, ombre subtile) partagé par Positionnement / Pipe /
// Résultats — seul l'accent change d'un univers à l'autre via ces variables CSS.
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
// POSITIONNEMENT COLLABORATEUR ITC
// ─────────────────────────────────────────────
const POSITIONNEMENT_STATUTS = [
  { value: 'en_attente',             label: 'En attente de retour',    color: '#0369A1' },
  { value: 'presentation_a_prevoir', label: 'Présentation à prévoir',  color: '#BA7517' },
  { value: 'presentation_realisee',  label: 'Présentation réalisée',   color: '#1E40AF' },
  { value: 'sans_suite',             label: 'Sans suite',              color: '#9F1239' },
  { value: 'signe',                  label: 'Signé / Démarrage',       color: '#0F6E56' },
]

const POSITIONNEMENT_TYPE_OPTIONS = [
  { value: 'besoin', label: 'Positionnement sur besoin' },
  { value: 'push',   label: 'Push' },
]
const POSITIONNEMENT_TYPE_COLORS = { besoin: '#0F6E56', push: '#4338CA' }

const emptyPositionnement = () => ({ collaborateur_itc: '', client: '', nom: '', prenom: '', fonction: '', type_positionnement: '', date_push: todayISO() })

const POS_COLOR = '#7C6EE6'
const POS_ACCENT_LIGHT = '#F4F2FF'
const POS_ACCENT_RING = 'rgba(124,110,230,0.18)'

const PositionnementCard = ({ p, onStatutChange, onRemove }) => {
  const cfg = POSITIONNEMENT_STATUTS.find(s => s.value === p.statut) || POSITIONNEMENT_STATUTS[0]
  const typeColor = POSITIONNEMENT_TYPE_COLORS[p.type_positionnement] || POS_COLOR
  const typeLabel = POSITIONNEMENT_TYPE_OPTIONS.find(t => t.value === p.type_positionnement)?.label
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${cfg.color}45`, marginBottom: 10 }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: RDV_TITLE }}>{p.collaborateur_itc}</div>
            {typeLabel && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: typeColor, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{typeLabel}</span>}
          </div>
          <div style={{ fontSize: 12, color: POS_COLOR, fontWeight: 600, marginTop: 2 }}>🏢 {p.client}</div>
          {(p.nom || p.prenom) && (
            <div style={{ fontSize: 12, color: RDV_TEXT_SECONDARY, marginTop: 4 }}>
              👤 {[p.prenom, p.nom].filter(Boolean).join(' ')}{p.fonction && ` · ${p.fonction}`}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 6 }}>
            {p.date_push ? `Poussé le ${new Date(p.date_push).toLocaleDateString('fr-FR')}` : `Poussé en S${p.semaine}`} · Dernière MAJ : S{p.derniere_maj_semaine || p.semaine}
          </div>
        </div>
        {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>✕</button>}
      </div>
      <div style={{ padding: '0 14px 12px' }}>
        <select value={p.statut} onChange={e => onStatutChange(p.id, e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${cfg.color}60`, background: cfg.color + '14', color: cfg.color, fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
          {POSITIONNEMENT_STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  )
}

// Accents "Gestion du Pipe" (teal) et "Résultats" (bordeaux) — même recette que POS_COLOR ci-dessus :
// un accent + un fond très léger + une couleur de halo de focus, posés en variables CSS sur .ui-panel.
const PIPE_COLOR = '#2F8F83'
const PIPE_ACCENT_LIGHT = '#EFF8F6'
const PIPE_ACCENT_RING = 'rgba(47,143,131,0.18)'

const RESULTATS_COLOR = '#A4556A'
const RESULTATS_ACCENT_LIGHT = '#FBF2F4'
const RESULTATS_ACCENT_RING = 'rgba(164,85,106,0.18)'

const emptyP1 = { client: '', profil: '', experience: '', technologies: '', salaire_max: '', langues: '', lieu: '' }

const P1_COLOR = '#C88A2B'
const P1_ACCENT_LIGHT = '#FFF7ED'
const P1_ACCENT_RING = 'rgba(200,138,43,0.18)'
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
      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${RDV_BORDER}`, marginBottom: 10, background: '#fff' }}>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderLeft: `3px solid ${P1_COLOR}` }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: RDV_TITLE, flex: 1 }}>{p.description}</span>
          {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', fontSize: 20, lineHeight: 1, padding: 0 }}>x</button>}
        </div>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${RDV_BORDER}`, marginBottom: 10, background: '#fff' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${RDV_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: RDV_TITLE, marginBottom: 3 }}>{p.profil}</div>
          {p.client && <div style={{ fontSize: 12, color: P1_COLOR, fontWeight: 600 }}>🏢 {p.client}</div>}
        </div>
        {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}>x</button>}
      </div>
      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {p.experience && <div style={{ background: P1_ACCENT_LIGHT, borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: P1_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📅 Experience</div><div style={{ fontSize: 12, fontWeight: 700, color: RDV_TITLE, marginTop: 2 }}>{p.experience}</div></div>}
        {p.salaire_max && <div style={{ background: P1_ACCENT_LIGHT, borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: P1_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💰 Salaire max</div><div style={{ fontSize: 12, fontWeight: 700, color: RDV_TITLE, marginTop: 2 }}>{p.salaire_max}</div></div>}
        {p.technologies && <div style={{ background: P1_ACCENT_LIGHT, borderRadius: 8, padding: '7px 10px', gridColumn: 'span 2' }}><div style={{ fontSize: 10, color: P1_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💻 Technologies</div><div style={{ fontSize: 12, fontWeight: 700, color: RDV_TITLE, marginTop: 2 }}>{p.technologies}</div></div>}
        {p.langues && <div style={{ background: P1_ACCENT_LIGHT, borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: P1_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🌍 Langues</div><div style={{ fontSize: 12, fontWeight: 700, color: RDV_TITLE, marginTop: 2 }}>{p.langues}</div></div>}
        {p.lieu && <div style={{ background: P1_ACCENT_LIGHT, borderRadius: 8, padding: '7px 10px' }}><div style={{ fontSize: 10, color: P1_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📍 Lieu</div><div style={{ fontSize: 12, fontWeight: 700, color: RDV_TITLE, marginTop: 2 }}>{p.lieu}</div></div>}
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
  const [positionnements, setPositionnements] = useState([])
  const [newPositionnement, setNewPositionnement] = useState(emptyPositionnement())
  const [savingPositionnement, setSavingPositionnement] = useState(false)
  const [errorPositionnement, setErrorPositionnement] = useState('')
  const [posContactSuggestions, setPosContactSuggestions] = useState([])
  const [selectedPosContactId, setSelectedPosContactId] = useState(null)
  // Incrémenté après chaque ajout réussi pour forcer le remontage du champ date (voir input date_push
  // plus bas) : un <input type="date"> entièrement piloté par React (value= + onChange) perd le fil de
  // la saisie clavier dès qu'on tape dans le segment année (bug connu des date inputs contrôlés), d'où
  // le passage en non-contrôlé (defaultValue) — remonté via `key` uniquement quand on veut le réinitialiser.
  const [posFormKey, setPosFormKey] = useState(0)
  const dateInputRef = useRef(null)
  // Liste de référence des collaborateurs ITC (maintenue depuis Admin) : on force le choix dedans plutôt
  // que du texte libre, pour que "collaborateur_itc" soit toujours écrit à l'identique d'une saisie à l'autre.
  const [itcCollaborateurs, setItcCollaborateurs] = useState([])
  const [itcSuggestions, setItcSuggestions] = useState([])
  const [itcSuggestionsOpen, setItcSuggestionsOpen] = useState(false)

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
  // Le collaborateur ITC doit venir de la liste de référence (Admin) — comparaison insensible à la casse
  // pour ne pas coincer sur un accent de clavier différent, mais on stocke toujours le libellé exact de la liste.
  const collaborateurItcValide = itcCollaborateurs.some(c => c.nom.toLowerCase() === newPositionnement.collaborateur_itc.trim().toLowerCase())
  const positionnementComplete = collaborateurItcValide && newPositionnement.client.trim() && newPositionnement.nom.trim() && newPositionnement.type_positionnement && newPositionnement.date_push

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

  // Positionnements ITC : indépendant de la semaine sélectionnée (un positionnement vit sur plusieurs
  // semaines, seul son statut évolue) — on charge simplement tout ce qui est en cours pour cette IA.
  useEffect(() => {
    if (!iaId) return
    supabase.from('positionnements').select('*').eq('ia_id', iaId).order('created_at', { ascending: false })
      .then(({ data }) => setPositionnements(data || []))
  }, [iaId])

  // Liste de référence des collaborateurs ITC (indépendante de l'IA connectée, chargée une seule fois).
  useEffect(() => {
    supabase.from('collaborateurs_itc').select('*').eq('statut', 'actif').order('nom')
      .then(({ data }) => setItcCollaborateurs(data || []))
  }, [])

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

  // Même logique de rapprochement, pour le formulaire de positionnement
  useEffect(() => {
    const term = newPositionnement.nom.trim()
    if (selectedPosContactId || term.length < 2) { setPosContactSuggestions([]); return }
    const timeout = setTimeout(async () => {
      const { data: matches } = await supabase.from('contacts').select('*').ilike('nom', `%${term}%`).limit(5)
      setPosContactSuggestions(matches || [])
    }, 300)
    return () => clearTimeout(timeout)
  }, [newPositionnement.nom, selectedPosContactId])

  const pickPosContact = (c) => {
    setSelectedPosContactId(c.id)
    setNewPositionnement(p => ({ ...p, nom: c.nom, prenom: c.prenom || '' }))
    setPosContactSuggestions([])
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

  const addPositionnement = async () => {
    if (!positionnementComplete) return
    setSavingPositionnement(true)
    setErrorPositionnement('')

    // Même logique de rapprochement que pour les RDV : contact existant relié, sinon nouveau contact créé (nom + prénom suffisent ici)
    let contactId = selectedPosContactId
    let createdContactId = null // trace qu'on vient de créer ce contact, pour pouvoir annuler si la suite échoue
    if (!contactId) {
      const { data: newContact, error: contactErr } = await supabase.from('contacts')
        .insert({ nom: newPositionnement.nom.trim(), prenom: newPositionnement.prenom.trim() || null })
        .select().single()
      if (contactErr) {
        setErrorPositionnement(`Erreur contact : ${contactErr.message}`)
        setSavingPositionnement(false)
        return
      }
      contactId = newContact.id
      createdContactId = newContact.id
    }

    const { data, error: err } = await supabase.from('positionnements').insert({
      ia_id: iaId, semaine: selectedWeek, annee,
      collaborateur_itc: newPositionnement.collaborateur_itc.trim(),
      client: newPositionnement.client.trim(),
      contact_id: contactId,
      nom: newPositionnement.nom.trim(),
      prenom: newPositionnement.prenom.trim() || null,
      fonction: newPositionnement.fonction.trim() || null,
      type_positionnement: newPositionnement.type_positionnement,
      date_push: newPositionnement.date_push,
      statut: 'en_attente',
      derniere_maj_semaine: selectedWeek,
      derniere_maj_annee: annee,
    }).select().single()

    if (data) {
      setPositionnements(l => [data, ...l])
      setNewPositionnement(emptyPositionnement())
      setSelectedPosContactId(null)
      setPosFormKey(k => k + 1)
    } else {
      // Le contact avait été créé en 2 requêtes séparées (pas de vraie transaction côté Supabase) : si
      // l'enregistrement du positionnement échoue derrière, on supprime le contact qu'on venait de créer
      // pour ne pas polluer la base contacts avec des doublons orphelins à chaque nouvel essai.
      if (createdContactId) await supabase.from('contacts').delete().eq('id', createdContactId)
      setErrorPositionnement(err?.message ? `Erreur d'enregistrement : ${err.message}` : "Erreur d'enregistrement, réessaie ou préviens ton manager.")
    }
    setSavingPositionnement(false)
  }

  const removePositionnement = async (id) => {
    await supabase.from('positionnements').delete().eq('id', id)
    setPositionnements(l => l.filter(p => p.id !== id))
  }

  const updatePositionnementStatut = async (id, statut) => {
    const { data } = await supabase.from('positionnements')
      .update({ statut, derniere_maj_semaine: selectedWeek, derniere_maj_annee: annee, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (data) setPositionnements(l => l.map(p => p.id === id ? data : p))
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
            <DetailAccordion type="presentation" count={rdvCounts.presentations} iaId={iaId} semaine={selectedWeek} annee={annee} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <PremiumPanel accent={POS_COLOR} accentLight={POS_ACCENT_LIGHT} accentRing={POS_ACCENT_RING}>
              <PremiumSectionHeader icon="ti-send" title="Positionnement collaborateur ITC" />

              {positionnements.map(p => (
                <PositionnementCard key={p.id} p={p} onStatutChange={updatePositionnementStatut} onRemove={() => removePositionnement(p.id)} />
              ))}

              <div className="ui-card" style={{ marginTop: positionnements.length > 0 ? 14 : 0 }}>
                <div className="ui-card-header">
                  <div className="ui-card-icon"><i className="ti ti-plus" aria-hidden="true" /></div>
                  <div className="ui-card-title">Ajouter un positionnement</div>
                </div>

                <div className="ui-grid-2">
                  <div className="ui-field">
                    <label className="ui-field-label">Type de positionnement *</label>
                    <select className="ui-input" value={newPositionnement.type_positionnement} onChange={e => setNewPositionnement(p => ({ ...p, type_positionnement: e.target.value }))}>
                      <option value="">Choisir...</option>
                      {POSITIONNEMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="ui-field">
                    <label className="ui-field-label">Date du push *</label>
                    {/* Non-contrôlé (defaultValue) : un input date piloté par value= perd le fil dès qu'on tape dans le
                        segment année (React réécrit la valeur à chaque frappe et coupe l'accumulation du navigateur).
                        `key` force juste une réinitialisation propre après un ajout réussi. */}
                    <input
                      className="ui-input"
                      ref={dateInputRef}
                      key={posFormKey}
                      type="date"
                      defaultValue={newPositionnement.date_push}
                      onChange={e => setNewPositionnement(p => ({ ...p, date_push: e.target.value }))}
                      onClick={() => { try { dateInputRef.current?.showPicker?.() } catch { /* navigateur sans support showPicker : le petit icône calendrier reste cliquable normalement */ } }}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div className="ui-grid-2">
                  <div className="ui-field">
                    <label className="ui-field-label">Collaborateur en ITC *</label>
                    <input className="ui-input" type="text" placeholder="Rechercher dans la liste..." autoComplete="off" name="pos-collaborateur-itc"
                      value={newPositionnement.collaborateur_itc}
                      onFocus={() => { setItcSuggestions(newPositionnement.collaborateur_itc.trim() ? itcCollaborateurs.filter(c => c.nom.toLowerCase().includes(newPositionnement.collaborateur_itc.trim().toLowerCase())) : itcCollaborateurs); setItcSuggestionsOpen(true) }}
                      onBlur={() => setTimeout(() => setItcSuggestionsOpen(false), 150)}
                      onChange={e => {
                        const term = e.target.value
                        setNewPositionnement(p => ({ ...p, collaborateur_itc: term }))
                        setItcSuggestions(term.trim() ? itcCollaborateurs.filter(c => c.nom.toLowerCase().includes(term.trim().toLowerCase())) : itcCollaborateurs)
                        setItcSuggestionsOpen(true)
                      }} />
                    {collaborateurItcValide && (
                      <div className="ui-hint-ok">✓ Collaborateur reconnu</div>
                    )}
                    {!collaborateurItcValide && newPositionnement.collaborateur_itc.trim() && (
                      <div className="ui-hint-warn">Sélectionne un nom dans la liste</div>
                    )}
                    {itcSuggestionsOpen && itcSuggestions.length > 0 && (
                      <div className="ui-suggestions">
                        {itcSuggestions.map(c => (
                          <div key={c.id} className="ui-suggestion-item"
                            onClick={() => { setNewPositionnement(p => ({ ...p, collaborateur_itc: c.nom })); setItcSuggestionsOpen(false); setItcSuggestions([]) }}>
                            {c.nom}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ui-field">
                    <label className="ui-field-label">Client *</label>
                    <input className="ui-input" type="text" placeholder="Raison sociale du client" autoComplete="off" name="pos-client" value={newPositionnement.client} onChange={e => setNewPositionnement(p => ({ ...p, client: e.target.value }))} />
                  </div>
                </div>

                <div className="ui-grid-3">
                  <div className="ui-field">
                    <label className="ui-field-label">Nom de l'opérationnel visé *</label>
                    <input className="ui-input" type="text" placeholder="Nom" value={newPositionnement.nom} autoComplete="off" name="pos-nom-operationnel"
                      onChange={e => { setNewPositionnement(p => ({ ...p, nom: e.target.value })); setSelectedPosContactId(null) }} />
                    {selectedPosContactId && (
                      <div className="ui-hint-ok">✓ Contact déjà connu, relié automatiquement</div>
                    )}
                    {!selectedPosContactId && posContactSuggestions.length > 0 && (
                      <div className="ui-suggestions">
                        {posContactSuggestions.map(c => (
                          <div key={c.id} className="ui-suggestion-item" onClick={() => pickPosContact(c)}>
                            {[c.prenom, c.nom].filter(Boolean).join(' ')}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ui-field">
                    <label className="ui-field-label">Prénom</label>
                    <input className="ui-input" type="text" placeholder="Prénom" autoComplete="off" name="pos-prenom-operationnel" value={newPositionnement.prenom} onChange={e => setNewPositionnement(p => ({ ...p, prenom: e.target.value }))} />
                  </div>
                  <div className="ui-field">
                    <label className="ui-field-label">Fonction</label>
                    <input className="ui-input" type="text" placeholder="Ex: DRH, Directeur IT..." autoComplete="off" name="pos-fonction" value={newPositionnement.fonction} onChange={e => setNewPositionnement(p => ({ ...p, fonction: e.target.value }))} />
                  </div>
                </div>

                <div className="ui-cta-row">
                  <button className="ui-btn-primary" onClick={addPositionnement} disabled={savingPositionnement || !positionnementComplete}>
                    {savingPositionnement ? 'Enregistrement...' : 'Ajouter le positionnement'}
                  </button>
                </div>
                {errorPositionnement && (
                  <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
                    ⚠️ {errorPositionnement}
                  </div>
                )}
              </div>
            </PremiumPanel>
          </div>

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
            <DetailAccordion type="signature"   count={form.signatures}      iaId={iaId} semaine={selectedWeek} annee={annee} />
            <DetailAccordion type="demarrage"   count={form.demarrages}      iaId={iaId} semaine={selectedWeek} annee={annee} />
            <DetailAccordion type="fin_mission" count={form.fins_de_mission} iaId={iaId} semaine={selectedWeek} annee={annee} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <PremiumPanel accent={P1_COLOR} accentLight={P1_ACCENT_LIGHT} accentRing={P1_ACCENT_RING}>
              <PremiumSectionHeader icon="ti-target" title="Priorités P1" />

              {p1List.filter(p => (p.profil && p.profil.trim()) || (p.description && p.description.trim())).map(p => (
                <P1Card key={p.id} p={p} onRemove={() => removeP1(p.id)} />
              ))}

              <div className="ui-card">
                <div className="ui-card-header">
                  <div className="ui-card-icon"><i className="ti ti-plus" aria-hidden="true" /></div>
                  <div className="ui-card-title">Ajouter un P1</div>
                </div>

                {/* Numérotation recalculée séquentiellement (1 à 6) sur les lignes réellement affichées :
                    "langues" n'a pas sa propre ligne (fusionnée avec "salaire_max"), donc son num d'origine
                    (6) sautait visuellement avant "lieu" (7). Purement visuel — les clés/champs enregistrés
                    ne changent pas. */}
                {P1_STEPS.filter(s => s.key !== 'langues').map((step, idx) => {
                  const langStep = P1_STEPS.find(s => s.key === 'langues')
                  const isSalaireLangues = step.key === 'salaire_max'
                  return (
                    <div key={step.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: `1px solid ${RDV_BORDER}`, borderRadius: 10, background: '#fff', padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: P1_ACCENT_LIGHT, color: P1_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <label className="ui-field-label">{step.label}</label>
                        {isSalaireLangues ? (
                          <div className="ui-grid-2" style={{ marginBottom: 0 }}>
                            <input className="ui-input" type="text" value={newP1[step.key]} onChange={e => setNewP1(p => ({ ...p, [step.key]: e.target.value }))} placeholder={step.placeholder} />
                            <input className="ui-input" type="text" value={newP1['langues']} onChange={e => setNewP1(p => ({ ...p, langues: e.target.value }))} placeholder={langStep.placeholder} />
                          </div>
                        ) : (
                          <input className="ui-input" type="text" value={newP1[step.key]} onChange={e => setNewP1(p => ({ ...p, [step.key]: e.target.value }))} placeholder={step.placeholder} />
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="ui-cta-row">
                  <button className="ui-btn-primary" onClick={addP1} disabled={savingP1 || !p1Complete}>
                    {savingP1 ? 'Enregistrement...' : 'Ajouter le P1'}
                  </button>
                </div>
              </div>
            </PremiumPanel>
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
