
// Design system partagé "SaaS premium" : panneaux clairs (fond gris uniforme), tuiles de stats de
// taille fixe, listes en mini-cartes avec liseré de couleur, saisie déportée dans une fenêtre modale
// plutôt qu'un formulaire toujours ouvert. Introduit pour RDV Commerciaux / RDV programmés / Gestion
// du Pipe / Résultats dans Saisie.jsx (espace Commerce), puis extrait ici pour être réutilisé tel
// quel par SaisieCR.jsx (espace Recrutement) et harmoniser les deux espaces sans dupliquer ~160
// lignes de CSS à deux endroits. Les couleurs ci-dessous sont des copies locales des constantes
// équivalentes dans Saisie.jsx (mêmes valeurs) : ce fichier ne dépend de rien d'autre dans l'app.

const TITLE = '#101828'
const TEXT = '#344054'
const TEXT_SECONDARY = '#667085'
const BORDER = '#EAECF0'
// Accent historique de RDV Commerciaux (violet) — resté câblé en dur sur les classes bespoke
// .rdv-panel / .rdv-add-btn / .rdv-input / .rdv-btn-primary, contrairement aux classes génériques
// .ui-* qui tirent leur accent des variables CSS posées par <PremiumPanel accent=... />.
const RDV_COLOR = '#534AB7'
const RDV_ACCENT_LIGHT = '#EEEDFE'

export const PremiumStyles = () => (
  <style>{`
    .rdv-panel { background: #E3E6EC; border-radius: 16px; padding: 16px 18px 18px; box-shadow: 0 1px 3px rgba(16,24,40,0.08); }

    .rdv-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .rdv-section-icon { width: 26px; height: 26px; border-radius: 8px; background: ${RDV_ACCENT_LIGHT}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rdv-section-title { font-size: 13px; font-weight: 700; color: ${TITLE}; text-transform: uppercase; letter-spacing: 0.04em; }

    .rdv-kpi-row { display: flex; flex-wrap: wrap; align-items: baseline; margin: 0 0 14px; }
    .rdv-kpi-item { display: flex; align-items: baseline; gap: 5px; padding-right: 14px; margin-right: 14px; border-right: 1px solid ${BORDER}; }
    .rdv-kpi-item:last-child { border-right: none; margin-right: 0; padding-right: 0; }
    .rdv-kpi-value { font-size: 13.5px; font-weight: 700; color: ${TEXT}; }
    .rdv-kpi-label { font-size: 12.5px; font-weight: 500; color: ${TEXT_SECONDARY}; }

    .rdv-card { background: #fff; border: 1px solid ${BORDER}; border-radius: 14px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); }
    .rdv-card-header { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
    .rdv-card-icon { width: 26px; height: 26px; border-radius: 8px; background: ${RDV_ACCENT_LIGHT}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rdv-card-title { font-size: 14px; font-weight: 700; color: ${TITLE}; }

    .rdv-grid-1 { display: grid; grid-template-columns: 2fr 1.2fr 1.8fr 1fr; gap: 12px; margin-bottom: 12px; }
    .rdv-grid-2 { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 12px; margin-bottom: 12px; }
    .rdv-grid-3 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 860px) { .rdv-grid-1, .rdv-grid-2 { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .rdv-grid-1, .rdv-grid-2, .rdv-grid-3 { grid-template-columns: 1fr; } }

    .rdv-field { position: relative; }
    .rdv-field-label { display: block; font-size: 12px; font-weight: 600; color: ${TEXT}; margin-bottom: 5px; }
    .rdv-input { height: 44px; padding: 0 13px; border-radius: 9px; border: 1.5px solid ${BORDER}; background: #F9FAFB; color: ${TITLE}; font-size: 13.5px; width: 100%; box-sizing: border-box; font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
    .rdv-input::placeholder { color: #98A2B3; }
    .rdv-input:focus { outline: none; border-color: ${RDV_COLOR}; background: #fff; box-shadow: 0 0 0 3px ${RDV_COLOR}22; }
    select.rdv-input { cursor: pointer; }
    textarea.rdv-input { height: auto; min-height: 88px; padding: 11px 13px; resize: vertical; line-height: 1.45; }

    .rdv-suggestions { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; background: #fff; border: 1px solid ${BORDER}; border-radius: 10px; margin-top: 4px; overflow: hidden; box-shadow: 0 10px 30px rgba(16,24,40,0.14); max-height: 220px; overflow-y: auto; }
    .rdv-suggestion-item { padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #F3F4F6; font-size: 12.5px; }
    .rdv-suggestion-item:last-child { border-bottom: none; }
    .rdv-suggestion-item:hover { background: #F9FAFB; }

    .rdv-contact-zone { background: #FAFAFB; border: 1px solid #F2F4F7; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; }
    .rdv-contact-zone-title { font-size: 11px; font-weight: 700; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }

    .rdv-cta-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
    .rdv-required-note { font-size: 12px; color: #98A2B3; }
    .rdv-btn-primary { height: 45px; padding: 0 28px; border-radius: 10px; background: ${RDV_COLOR}; color: #fff; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: background .15s ease, transform .05s ease; }
    .rdv-btn-primary:hover:not(:disabled) { background: #443B92; }
    .rdv-btn-primary:active:not(:disabled) { transform: scale(0.98); }
    .rdv-btn-primary:disabled { background: #EAECF0; color: #98A2B3; cursor: default; }

    .rdv-list-title { font-size: 11.5px; font-weight: 700; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 0.06em; margin: 16px 0 4px; }
    .rdv-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 10px 2px; border-bottom: 1px solid ${BORDER}; }
    .rdv-item:last-child { border-bottom: none; }
    .rdv-item-main { min-width: 0; flex: 1; }
    .rdv-item-client { font-size: 13.5px; font-weight: 700; color: ${TITLE}; margin-bottom: 2px; }
    .rdv-item-meta { font-size: 12px; color: ${TEXT_SECONDARY}; margin-bottom: 2px; }
    .rdv-item-meta b { font-weight: 600; }
    .rdv-item-contact { font-size: 12px; color: ${TEXT_SECONDARY}; margin-bottom: 2px; }
    .rdv-item-cr { font-size: 12px; color: #98A2B3; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rdv-item-delete { flex-shrink: 0; background: none; border: none; cursor: pointer; color: #98A2B3; font-size: 12px; font-weight: 600; padding: 2px; white-space: nowrap; margin-top: 1px; }
    .rdv-item-delete:hover { color: #D92D20; }

    .rdv-empty { text-align: center; padding: 20px 12px; color: ${TEXT_SECONDARY}; }

    .rdv-add-btn { display: flex; align-items: center; gap: 7px; background: ${RDV_COLOR}; color: #fff; border: none; border-radius: 10px; padding: 9px 15px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 2px rgba(16,24,40,0.1); transition: filter .15s ease; white-space: nowrap; }
    .rdv-add-btn:hover { filter: brightness(0.92); }
    .rdv-add-btn i { font-size: 13px; }

    .rdv-stat-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
    .rdv-stat-tile { display: flex; flex-direction: column; justify-content: center; background: #fff; border-radius: 12px; padding: 10px 14px; width: 128px; min-height: 60px; box-sizing: border-box; box-shadow: 0 1px 2px rgba(16,24,40,0.06); flex-shrink: 0; }
    .rdv-stat-tile.hero { border: 1.5px solid ${RDV_COLOR}1F; }
    .rdv-stat-tile .v-row { display: flex; align-items: center; gap: 6px; }
    .rdv-stat-tile .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .rdv-stat-tile .v { font-size: 22px; font-weight: 800; color: ${TITLE}; line-height: 1.15; }
    .rdv-stat-tile .l { font-size: 11px; font-weight: 600; color: ${TEXT_SECONDARY}; margin-top: 3px; line-height: 1.25; }
    .rdv-stat-arrow { display: flex; align-items: center; color: #C0C5CE; font-size: 18px; font-weight: 700; flex-shrink: 0; }

    .rdv-card2 { background: #fff; border-radius: 12px; padding: 11px 13px; display: flex; align-items: flex-start; gap: 10px; box-shadow: 0 1px 2px rgba(16,24,40,0.05); position: relative; overflow: hidden; margin-bottom: 8px; }
    .rdv-card2:last-child { margin-bottom: 0; }
    .rdv-card2-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    .rdv-card2-main { flex: 1; min-width: 0; padding-left: 6px; }
    .rdv-card2-client { font-size: 13.5px; font-weight: 700; color: ${TITLE}; }
    .rdv-card2-pill { display: inline-block; font-size: 10px; font-weight: 700; border-radius: 20px; padding: 2px 8px; margin-left: 8px; vertical-align: middle; white-space: nowrap; }
    .rdv-card2-meta { font-size: 12px; color: ${TEXT_SECONDARY}; margin-top: 3px; }
    .rdv-card2-cr { font-size: 12px; color: #98A2B3; font-style: italic; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rdv-card2-trash { background: none; border: none; cursor: pointer; color: #C0C5CE; font-size: 15px; padding: 5px; flex-shrink: 0; border-radius: 6px; transition: color .15s ease, background .15s ease; }
    .rdv-card2-trash:hover { color: #D92D20; background: #FEF2F2; }

    .rdv-modal-overlay { position: fixed; inset: 0; background: rgba(16,24,40,0.45); display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; z-index: 1000; overflow-y: auto; }
    .rdv-modal { background: #fff; border-radius: 16px; padding: 20px 22px; width: 100%; max-width: 560px; box-shadow: 0 20px 50px rgba(16,24,40,0.3); box-sizing: border-box; }
    .rdv-modal-close { background: none; border: none; cursor: pointer; color: ${TEXT_SECONDARY}; font-size: 18px; padding: 4px; line-height: 1; border-radius: 6px; }
    .rdv-modal-close:hover { background: #F3F4F6; }

    .ui-panel { background: #E3E6EC; border: 1px solid #D5D9E0; border-radius: 16px; padding: 16px 18px 18px; box-shadow: 0 1px 3px rgba(16,24,40,0.06); }
    .ui-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .ui-section-icon { width: 26px; height: 26px; border-radius: 8px; background: var(--accent-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ui-section-icon i { color: var(--accent); font-size: 13px; }
    .ui-section-title { font-size: 13px; font-weight: 700; color: ${TITLE}; text-transform: uppercase; letter-spacing: 0.04em; }

    .ui-card { background: #fff; border: 1.5px solid ${BORDER}; border-radius: 14px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); }
    .ui-card-header { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
    .ui-card-icon { width: 26px; height: 26px; border-radius: 8px; background: var(--accent-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ui-card-icon i { color: var(--accent); font-size: 15px; }
    .ui-card-title { font-size: 14px; font-weight: 700; color: ${TITLE}; }

    .ui-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .ui-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 860px) { .ui-grid-3 { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .ui-grid-2, .ui-grid-3 { grid-template-columns: 1fr; } }

    .ui-field { position: relative; }
    .ui-field-label { display: block; font-size: 12px; font-weight: 600; color: ${TEXT}; margin-bottom: 5px; }
    .ui-input { height: 44px; padding: 0 13px; border-radius: 9px; border: 1.5px solid ${BORDER}; background: #F9FAFB; color: ${TITLE}; font-size: 13.5px; width: 100%; box-sizing: border-box; font-family: inherit; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
    .ui-input::placeholder { color: #98A2B3; }
    .ui-input:focus { outline: none; border-color: var(--accent); background: #fff; box-shadow: 0 0 0 3px var(--accent-ring); }
    select.ui-input { cursor: pointer; }
    textarea.ui-input { height: auto; min-height: 88px; padding: 11px 13px; resize: vertical; line-height: 1.45; }

    .ui-suggestions { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; background: #fff; border: 1px solid ${BORDER}; border-radius: 10px; margin-top: 4px; overflow: hidden; box-shadow: 0 10px 30px rgba(16,24,40,0.14); max-height: 220px; overflow-y: auto; }
    .ui-suggestion-item { padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #F3F4F6; font-size: 12.5px; font-weight: 600; color: ${TITLE}; }
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
    .ui-counter-tile { background: #fff; border-radius: 12px; padding: 12px 10px; box-shadow: 0 1px 2px rgba(16,24,40,0.06); display: flex; flex-direction: column; align-items: center; gap: 7px; }

    .ui-total-footer { margin-top: 14px; padding-top: 12px; border-top: 1px solid ${BORDER}; }
    .ui-total-strip { display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border-radius: 8px; padding: 9px 12px; }
    .ui-total-label { font-size: 12.5px; font-weight: 600; color: ${TEXT}; }
    .ui-total-value { font-size: 19px; font-weight: 800; }

    .ui-add-btn { display: flex; align-items: center; gap: 7px; background: var(--accent); color: #fff; border: none; border-radius: 10px; padding: 9px 15px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 2px rgba(16,24,40,0.1); transition: filter .15s ease; white-space: nowrap; }
    .ui-add-btn:hover { filter: brightness(0.92); }
    .ui-add-btn i { font-size: 13px; }
    .ui-section-header.with-action { justify-content: space-between; }

    .ui-toggle-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .ui-toggle-item { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid ${BORDER}; background: #fff; transition: all .15s ease; font-size: 12px; font-weight: 500; color: ${TEXT}; }
    .ui-toggle-item.checked { border: 2px solid var(--accent); background: var(--accent-light); font-weight: 600; color: var(--accent); }

    .ui-check-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .ui-check-group-label { font-size: 11px; font-weight: 700; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 6px; }
    .ui-check-group-label:first-child { margin-top: 0; }
    .ui-check-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer; border: 1px solid ${BORDER}; background: #fff; transition: all .15s ease; }
    .ui-check-item.checked { border: 2px solid var(--accent); background: var(--accent-light); }
    .ui-check-box { width: 18px; height: 18px; border-radius: 4px; border: 2px solid ${BORDER}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ui-check-box.checked { border-color: var(--accent); background: var(--accent); color: #fff; font-size: 11px; }
    .ui-check-label { font-size: 12px; color: ${TEXT}; }
    .ui-check-label.checked { font-weight: 500; color: var(--accent); }
  `}</style>
)

// Panneau clair générique (fond gris #E3E6EC uniforme, bordure fine, ombre subtile) partagé par toutes
// les sections — seul l'accent change d'un univers à l'autre via ces variables CSS.
export const PremiumPanel = ({ accent, accentLight, accentRing, children }) => (
  <div className="ui-panel" style={{ '--accent': accent, '--accent-light': accentLight, '--accent-ring': accentRing }}>
    {children}
  </div>
)

// action (optionnel) : bouton aligné à droite du header — ouvre la fenêtre d'ajout de la section.
export const PremiumSectionHeader = ({ icon, title, action }) => (
  <div className={`ui-section-header${action ? ' with-action' : ''}`}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="ui-section-icon"><i className={`ti ${icon}`} aria-hidden="true" /></div>
      <div className="ui-section-title">{title}</div>
    </div>
    {action}
  </div>
)
