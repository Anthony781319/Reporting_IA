import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7)
}

export default function SaisieCR({ crNom }) {
  const annee = new Date().getFullYear()
  const semaineActuelle = currentWeek()
  const [semaine, setSemaine] = useState(semaineActuelle)

  const [reporting, setReporting] = useState({
    nb_entretiens: 0, nb_candidats_valides: 0,
    nb_cv_envoyes: 0, nb_presentations: 0, nb_signatures: 0
  })
  const [rdvList, setRdvList] = useState([])
  const [rdvForm, setRdvForm] = useState({ identite_candidat: '', profil: '', valide: false, positionne_sur_besoins: '' })
  const [showRdvForm, setShowRdvForm] = useState(false)
  const [presList, setPresList] = useState([])
  const [presForm, setPresForm] = useState({ identite_candidat: '', profil: '', date_presentation: '', ia_concerne: '' })
  const [showPresForm, setShowPresForm] = useState(false)
  const [sigList, setSigList] = useState([])
  const [sigForm, setSigForm] = useState({ identite_candidat: '', profil: '', salaire_envisage: '', date_signature: '' })
  const [showSigForm, setShowSigForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    const load = async () => {
      setReporting({ nb_entretiens: 0, nb_candidats_valides: 0, nb_cv_envoyes: 0, nb_presentations: 0, nb_signatures: 0 })
      setRdvList([])
      setPresList([])
      setSigList([])
      setShowRdvForm(false)
      setShowPresForm(false)
      setShowSigForm(false)

      const [{ data: rep }, { data: rdv }, { data: pres }, { data: sig }] = await Promise.all([
        supabase.from('cr_reporting').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee).single(),
        supabase.from('cr_rendez_vous').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee),
        supabase.from('cr_presentations').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee),
        supabase.from('cr_signatures').select('*').eq('cr_nom', crNom).eq('semaine', semaine).eq('annee', annee),
      ])
      if (rep) setReporting({ nb_entretiens: rep.nb_entretiens, nb_candidats_valides: rep.nb_candidats_valides, nb_cv_envoyes: rep.nb_cv_envoyes, nb_presentations: rep.nb_presentations, nb_signatures: rep.nb_signatures })
      if (rdv) setRdvList(rdv)
      if (pres) setPresList(pres)
      if (sig) setSigList(sig)
    }
    load()
  }, [crNom, semaine, annee])

  const saveReporting = async () => {
    setSaving(true)
    await supabase.from('cr_reporting').upsert({ cr_nom: crNom, semaine, annee, ...reporting }, { onConflict: 'cr_nom,semaine,annee' })
    setSaving(false)
    showToast('✅ Chiffres sauvegardés !')
  }

  const addRdv = async () => {
    if (!rdvForm.identite_candidat) return
    const { data, error } = await supabase.from('cr_rendez_vous').insert({ cr_nom: crNom, semaine, annee, ...rdvForm }).select().single()
    if (error || !data) { showToast('❌ Erreur lors de l\'ajout'); return }
    setRdvList([...rdvList, data])
    setRdvForm({ identite_candidat: '', profil: '', valide: false, positionne_sur_besoins: '' })
    setShowRdvForm(false)
    showToast('✅ Rendez-vous ajouté !')
  }

  const deleteRdv = async (id) => {
    await supabase.from('cr_rendez_vous').delete().eq('id', id)
    setRdvList(rdvList.filter(r => r.id !== id))
  }

  const addPres = async () => {
    if (!presForm.identite_candidat) return
    const { data, error } = await supabase.from('cr_presentations').insert({ cr_nom: crNom, semaine, annee, ...presForm }).select().single()
    if (error || !data) { showToast('❌ Erreur lors de l\'ajout'); return }
    setPresList([...presList, data])
    setPresForm({ identite_candidat: '', profil: '', date_presentation: '', ia_concerne: '' })
    setShowPresForm(false)
    showToast('✅ Présentation ajoutée !')
  }

  const deletePres = async (id) => {
    await supabase.from('cr_presentations').delete().eq('id', id)
    setPresList(presList.filter(p => p.id !== id))
  }

  const addSig = async () => {
    if (!sigForm.identite_candidat) return
    const { data, error } = await supabase.from('cr_signatures').insert({ cr_nom: crNom, semaine, annee, ...sigForm }).select().single()
    if (error || !data) { showToast('❌ Erreur lors de l\'ajout'); return }
    setSigList([...sigList, data])
    setSigForm({ identite_candidat: '', profil: '', salaire_envisage: '', date_signature: '' })
    setShowSigForm(false)
    showToast('✅ Signature ajoutée !')
  }

  const deleteSig = async (id) => {
    await supabase.from('cr_signatures').delete().eq('id', id)
    setSigList(sigList.filter(s => s.id !== id))
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#1a1a2e', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, zIndex: 999 }}>
          {toast}
        </div>
      )}

      {/* Header + navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>👋 Bonjour {crNom}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{annee}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSemaine(s => Math.max(1, s - 1))} style={btnNav}>←</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Semaine {semaine}</div>
            {semaine === semaineActuelle && (
              <div style={{ fontSize: 10, color: '#534AB7', fontWeight: 500 }}>Semaine actuelle</div>
            )}
          </div>
          <button onClick={() => setSemaine(s => Math.min(52, s + 1))} style={btnNav}>→</button>
        </div>
      </div>

      {/* ── BLOC 1 : Rendez-vous ── */}
      <div style={{ ...blockCard, borderTop: '4px solid #534AB7' }}>
        <div style={blockHeader}>
          <div style={{ ...blockIcon, background: '#EEEDFE' }}>📅</div>
          <div>
            <div style={blockTitle}>Rendez-vous</div>
            <div style={blockSub}>Entretiens & candidats validés</div>
          </div>
        </div>
        <div style={grid2}>
          <Counter label="Entretiens réalisés" value={reporting.nb_entretiens} onChange={v => setReporting({ ...reporting, nb_entretiens: v })} color="#534AB7" />
          <Counter label="Candidats validés" value={reporting.nb_candidats_valides} onChange={v => setReporting({ ...reporting, nb_candidats_valides: v })} color="#534AB7" />
        </div>
      </div>

      {/* ── BLOC 2 : Business ── */}
      <div style={{ ...blockCard, borderTop: '4px solid #085041' }}>
        <div style={blockHeader}>
          <div style={{ ...blockIcon, background: '#E1F5EE' }}>💼</div>
          <div>
            <div style={blockTitle}>Business</div>
            <div style={blockSub}>CV, présentations & signatures</div>
          </div>
        </div>
        <div style={grid3}>
          <Counter label="CV envoyés" value={reporting.nb_cv_envoyes} onChange={v => setReporting({ ...reporting, nb_cv_envoyes: v })} color="#085041" />
          <Counter label="Présentations" value={reporting.nb_presentations} onChange={v => setReporting({ ...reporting, nb_presentations: v })} color="#085041" />
          <Counter label="Signatures" value={reporting.nb_signatures} onChange={v => setReporting({ ...reporting, nb_signatures: v })} color="#085041" />
        </div>
        <button onClick={saveReporting} disabled={saving} style={{ ...btnSave, background: '#085041' }}>
          {saving ? 'Sauvegarde...' : '💾 Sauvegarder les chiffres'}
        </button>
      </div>

      {/* ── BLOC 3a : Détail Rendez-vous ── */}
      <div style={{ ...blockCard, borderTop: '4px solid #0C447C' }}>
        <div style={blockHeader}>
          <div style={{ ...blockIcon, background: '#E6F1FB' }}>🗂</div>
          <div>
            <div style={blockTitle}>Détail — Rendez-vous</div>
            <div style={blockSub}>{rdvList.length} entrée{rdvList.length !== 1 ? 's' : ''} cette semaine</div>
          </div>
        </div>
        {rdvList.map(r => (
          <div key={r.id} style={detailCard}>
            <div style={detailRow}>
              <span style={candidatName}>{r.identite_candidat}</span>
              <span style={profilBadge}>{r.profil}</span>
            </div>
            <div style={detailRow}>
              <span style={{ ...statusBadge, background: r.valide ? '#E1F5EE' : '#FCEBEB', color: r.valide ? '#085041' : '#A32D2D' }}>
                {r.valide ? '✅ Validé' : '❌ Non validé'}
              </span>
              {r.positionne_sur_besoins && <span style={infoBadge}>📌 {r.positionne_sur_besoins}</span>}
            </div>
            <button onClick={() => deleteRdv(r.id)} style={btnDelete}>Supprimer</button>
          </div>
        ))}
        {showRdvForm ? (
          <div style={formBox}>
            <Input label="Identité du candidat" value={rdvForm.identite_candidat} onChange={v => setRdvForm({ ...rdvForm, identite_candidat: v })} />
            <Input label="Profil" value={rdvForm.profil} onChange={v => setRdvForm({ ...rdvForm, profil: v })} />
            <Input label="Positionné sur besoins" value={rdvForm.positionne_sur_besoins} onChange={v => setRdvForm({ ...rdvForm, positionne_sur_besoins: v })} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" id="valide" checked={rdvForm.valide} onChange={e => setRdvForm({ ...rdvForm, valide: e.target.checked })} />
              <label htmlFor="valide" style={{ fontSize: 13 }}>Candidat validé</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addRdv} style={{ ...btnSave, background: '#0C447C' }}>Ajouter</button>
              <button onClick={() => setShowRdvForm(false)} style={btnCancel}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowRdvForm(true)} style={{ ...btnAdd, borderColor: '#0C447C', color: '#0C447C' }}>+ Ajouter un rendez-vous</button>
        )}
      </div>

      {/* ── BLOC 3b : Présentations ── */}
      <div style={{ ...blockCard, borderTop: '4px solid #633806' }}>
        <div style={blockHeader}>
          <div style={{ ...blockIcon, background: '#FAEEDA' }}>📋</div>
          <div>
            <div style={blockTitle}>Détail — Présentations</div>
            <div style={blockSub}>{presList.length} entrée{presList.length !== 1 ? 's' : ''} cette semaine</div>
          </div>
        </div>
        {presList.map(p => (
          <div key={p.id} style={detailCard}>
            <div style={detailRow}>
              <span style={candidatName}>{p.identite_candidat}</span>
              <span style={profilBadge}>{p.profil}</span>
            </div>
            <div style={detailRow}>
              {p.date_presentation && <span style={infoBadge}>📅 {p.date_presentation}</span>}
              {p.ia_concerne && <span style={infoBadge}>👤 {p.ia_concerne}</span>}
            </div>
            <button onClick={() => deletePres(p.id)} style={btnDelete}>Supprimer</button>
          </div>
        ))}
        {showPresForm ? (
          <div style={formBox}>
            <Input label="Identité du candidat" value={presForm.identite_candidat} onChange={v => setPresForm({ ...presForm, identite_candidat: v })} />
            <Input label="Profil" value={presForm.profil} onChange={v => setPresForm({ ...presForm, profil: v })} />
            <Input label="IA concerné" value={presForm.ia_concerne} onChange={v => setPresForm({ ...presForm, ia_concerne: v })} />
            <Input label="Date de présentation" type="date" value={presForm.date_presentation} onChange={v => setPresForm({ ...presForm, date_presentation: v })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addPres} style={{ ...btnSave, background: '#633806' }}>Ajouter</button>
              <button onClick={() => setShowPresForm(false)} style={btnCancel}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowPresForm(true)} style={{ ...btnAdd, borderColor: '#633806', color: '#633806' }}>+ Ajouter une présentation</button>
        )}
      </div>

      {/* ── BLOC 3c : Signatures ── */}
      <div style={{ ...blockCard, borderTop: '4px solid #72243E' }}>
        <div style={blockHeader}>
          <div style={{ ...blockIcon, background: '#FBEAF0' }}>✍️</div>
          <div>
            <div style={blockTitle}>Détail — Signatures</div>
            <div style={blockSub}>{sigList.length} entrée{sigList.length !== 1 ? 's' : ''} cette semaine</div>
          </div>
        </div>
        {sigList.map(s => (
          <div key={s.id} style={detailCard}>
            <div style={detailRow}>
              <span style={candidatName}>{s.identite_candidat}</span>
              <span style={profilBadge}>{s.profil}</span>
            </div>
            <div style={detailRow}>
              {s.salaire_envisage && <span style={infoBadge}>💰 {s.salaire_envisage}</span>}
              {s.date_signature && <span style={infoBadge}>📅 {s.date_signature}</span>}
            </div>
            <button onClick={() => deleteSig(s.id)} style={btnDelete}>Supprimer</button>
          </div>
        ))}
        {showSigForm ? (
          <div style={formBox}>
            <Input label="Identité du candidat" value={sigForm.identite_candidat} onChange={v => setSigForm({ ...sigForm, identite_candidat: v })} />
            <Input label="Profil" value={sigForm.profil} onChange={v => setSigForm({ ...sigForm, profil: v })} />
            <Input label="Salaire envisagé" value={sigForm.salaire_envisage} onChange={v => setSigForm({ ...sigForm, salaire_envisage: v })} />
            <Input label="Date de signature" type="date" value={sigForm.date_signature} onChange={v => setSigForm({ ...sigForm, date_signature: v })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addSig} style={{ ...btnSave, background: '#72243E' }}>Ajouter</button>
              <button onClick={() => setShowSigForm(false)} style={btnCancel}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowSigForm(true)} style={{ ...btnAdd, borderColor: '#72243E', color: '#72243E' }}>+ Ajouter une signature</button>
        )}
      </div>

    </div>
  )
}

function Counter({ label, value, onChange, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={{ ...btnCounter, borderColor: color }}>−</button>
        <span style={{ fontSize: 22, fontWeight: 700, minWidth: 32, textAlign: 'center', color }}>{value}</span>
        <button onClick={() => onChange(value + 1)} style={{ ...btnCounter, borderColor: color }}>+</button>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
    </div>
  )
}

const blockCard = { background: 'var(--color-background-primary)', borderRadius: 14, padding: '20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }
const blockHeader = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }
const blockIcon = { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }
const blockTitle = { fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }
const blockSub = { fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }
const detailCard = { background: 'var(--color-background-secondary)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, fontSize: 13 }
const detailRow = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }
const candidatName = { fontWeight: 600, fontSize: 13 }
const profilBadge = { fontSize: 12, color: 'var(--color-text-secondary)', background: 'var(--color-background-primary)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-border-tertiary)' }
const statusBadge = { borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500 }
const infoBadge = { background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 6, padding: '2px 8px', fontSize: 11 }
const formBox = { background: 'var(--color-background-secondary)', borderRadius: 10, padding: '16px', marginBottom: 8, marginTop: 8 }
const btnSave = { padding: '10px 18px', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnCancel = { padding: '10px 18px', background: 'none', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }
const btnAdd = { width: '100%', padding: '10px', background: 'none', border: '1px dashed', borderRadius: 8, fontSize: 13, cursor: 'pointer', marginTop: 4, fontWeight: 500 }
const btnDelete = { marginTop: 6, padding: '4px 10px', background: 'none', border: '1px solid #f5c6c6', borderRadius: 6, fontSize: 11, color: '#A32D2D', cursor: 'pointer' }
const btnCounter = { width: 28, height: 28, borderRadius: '50%', border: '1px solid', background: 'none', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const btnNav = { padding: '8px 14px', background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, cursor: 'pointer', fontSize: 14 }
