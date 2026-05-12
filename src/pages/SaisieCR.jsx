import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7)
}

export default function SaisieCR({ crNom }) {
  const semaine = currentWeek()
  const annee = new Date().getFullYear()

  // Bloc 1 & 2
  const [reporting, setReporting] = useState({
    nb_entretiens: 0, nb_candidats_valides: 0,
    nb_cv_envoyes: 0, nb_presentations: 0, nb_signatures: 0
  })

  // Bloc 3 - Rendez-vous
  const [rdvList, setRdvList] = useState([])
  const [rdvForm, setRdvForm] = useState({ identite_candidat: '', profil: '', valide: false, positionne_sur_besoins: '' })
  const [showRdvForm, setShowRdvForm] = useState(false)

  // Bloc 3 - Présentations
  const [presList, setPresList] = useState([])
  const [presForm, setPresForm] = useState({ identite_candidat: '', profil: '', date_presentation: '', ia_concerne: '' })
  const [showPresForm, setShowPresForm] = useState(false)

  // Bloc 3 - Signatures
  const [sigList, setSigList] = useState([])
  const [sigForm, setSigForm] = useState({ identite_candidat: '', profil: '', salaire_envisage: '', date_signature: '' })
  const [showSigForm, setShowSigForm] = useState(false)

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // Chargement données existantes
  useEffect(() => {
    const load = async () => {
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

  // Sauvegarde blocs 1 & 2
  const saveReporting = async () => {
    setSaving(true)
    await supabase.from('cr_reporting').upsert({ cr_nom: crNom, semaine, annee, ...reporting }, { onConflict: 'cr_nom,semaine,annee' })
    setSaving(false)
    showToast('✅ Chiffres sauvegardés !')
  }

  // Ajout RDV
  const addRdv = async () => {
    if (!rdvForm.identite_candidat) return
    const { data } = await supabase.from('cr_rendez_vous').insert({ cr_nom: crNom, semaine, annee, ...rdvForm }).select().single()
    setRdvList([...rdvList, data])
    setRdvForm({ identite_candidat: '', profil: '', valide: false, positionne_sur_besoins: '' })
    setShowRdvForm(false)
    showToast('✅ Rendez-vous ajouté !')
  }

  // Suppression RDV
  const deleteRdv = async (id) => {
    await supabase.from('cr_rendez_vous').delete().eq('id', id)
    setRdvList(rdvList.filter(r => r.id !== id))
  }

  // Ajout Présentation
  const addPres = async () => {
    if (!presForm.identite_candidat) return
    const { data } = await supabase.from('cr_presentations').insert({ cr_nom: crNom, semaine, annee, ...presForm }).select().single()
    setPresList([...presList, data])
    setPresForm({ identite_candidat: '', profil: '', date_presentation: '', ia_concerne: '' })
    setShowPresForm(false)
    showToast('✅ Présentation ajoutée !')
  }

  const deletePres = async (id) => {
    await supabase.from('cr_presentations').delete().eq('id', id)
    setPresList(presList.filter(p => p.id !== id))
  }

  // Ajout Signature
  const addSig = async () => {
    if (!sigForm.identite_candidat) return
    const { data } = await supabase.from('cr_signatures').insert({ cr_nom: crNom, semaine, annee, ...sigForm }).select().single()
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

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#1a1a2e', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, zIndex: 999 }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>👋 Bonjour {crNom}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Semaine {semaine} — {annee}</p>
      </div>

      {/* ── BLOC 1 : Rendez-vous ── */}
      <Section title="📅 Rendez-vous">
        <div style={grid2}>
          <Counter label="Entretiens réalisés" value={reporting.nb_entretiens} onChange={v => setReporting({ ...reporting, nb_entretiens: v })} />
          <Counter label="Candidats validés" value={reporting.nb_candidats_valides} onChange={v => setReporting({ ...reporting, nb_candidats_valides: v })} />
        </div>
      </Section>

      {/* ── BLOC 2 : Business ── */}
      <Section title="💼 Business">
        <div style={grid3}>
          <Counter label="CV envoyés" value={reporting.nb_cv_envoyes} onChange={v => setReporting({ ...reporting, nb_cv_envoyes: v })} />
          <Counter label="Présentations" value={reporting.nb_presentations} onChange={v => setReporting({ ...reporting, nb_presentations: v })} />
          <Counter label="Signatures" value={reporting.nb_signatures} onChange={v => setReporting({ ...reporting, nb_signatures: v })} />
        </div>
        <button onClick={saveReporting} disabled={saving} style={btnPrimary}>
          {saving ? 'Sauvegarde...' : '💾 Sauvegarder les chiffres'}
        </button>
      </Section>

      {/* ── BLOC 3a : Détail Rendez-vous ── */}
      <Section title="🗂 Détail — Rendez-vous">
        {rdvList.map(r => (
          <div key={r.id} style={card}>
            <div style={cardRow}><b>{r.identite_candidat}</b> — {r.profil}</div>
            <div style={cardRow}>
              <span style={{ ...badge, background: r.valide ? '#E1F5EE' : '#FCEBEB', color: r.valide ? '#085041' : '#A32D2D' }}>{r.valide ? '✅ Validé' : '❌ Non validé'}</span>
              {r.positionne_sur_besoins && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>📌 {r.positionne_sur_besoins}</span>}
            </div>
            <button onClick={() => deleteRdv(r.id)} style={btnDelete}>Supprimer</button>
          </div>
        ))}

        {showRdvForm ? (
          <div style={formBox}>
            <Input label="Identité du candidat" value={rdvForm.identite_candidat} onChange={v => setRdvForm({ ...rdvForm, identite_candidat: v })} />
            <Input label="Profil" value={rdvForm.profil} onChange={v => setRdvForm({ ...rdvForm, profil: v })} />
            <Input label="Positionné sur besoins" value={rdvForm.positionne_sur_besoins} onChange={v => setRdvForm({ ...rdvForm, positionne_sur_besoins: v })} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="checkbox" id="valide" checked={rdvForm.valide} onChange={e => setRdvForm({ ...rdvForm, valide: e.target.checked })} />
              <label htmlFor="valide" style={{ fontSize: 13 }}>Candidat validé</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addRdv} style={btnPrimary}>Ajouter</button>
              <button onClick={() => setShowRdvForm(false)} style={btnSecondary}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowRdvForm(true)} style={btnAdd}>+ Ajouter un rendez-vous</button>
        )}
      </Section>

      {/* ── BLOC 3b : Détail Présentations ── */}
      <Section title="📋 Détail — Présentations">
        {presList.map(p => (
          <div key={p.id} style={card}>
            <div style={cardRow}><b>{p.identite_candidat}</b> — {p.profil}</div>
            <div style={cardRow}>
              {p.date_presentation && <span style={badge}>📅 {p.date_presentation}</span>}
              {p.ia_concerne && <span style={badge}>👤 {p.ia_concerne}</span>}
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
              <button onClick={addPres} style={btnPrimary}>Ajouter</button>
              <button onClick={() => setShowPresForm(false)} style={btnSecondary}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowPresForm(true)} style={btnAdd}>+ Ajouter une présentation</button>
        )}
      </Section>

      {/* ── BLOC 3c : Détail Signatures ── */}
      <Section title="✍️ Détail — Signatures">
        {sigList.map(s => (
          <div key={s.id} style={card}>
            <div style={cardRow}><b>{s.identite_candidat}</b> — {s.profil}</div>
            <div style={cardRow}>
              {s.salaire_envisage && <span style={badge}>💰 {s.salaire_envisage}</span>}
              {s.date_signature && <span style={badge}>📅 {s.date_signature}</span>}
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
              <button onClick={addSig} style={btnPrimary}>Ajouter</button>
              <button onClick={() => setShowSigForm(false)} style={btnSecondary}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowSigForm(true)} style={btnAdd}>+ Ajouter une signature</button>
        )}
      </Section>

    </div>
  )
}

// ── Composants utilitaires ──

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', borderRadius: 14, padding: '20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Counter({ label, value, onChange }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={btnCounter}>−</button>
        <span style={{ fontSize: 22, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{value}</span>
        <button onClick={() => onChange(value + 1)} style={btnCounter}>+</button>
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

// ── Styles ──
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }
const card = { background: 'var(--color-background-secondary)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, fontSize: 13 }
const cardRow = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }
const badge = { background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 6, padding: '2px 8px', fontSize: 11 }
const formBox = { background: 'var(--color-background-secondary)', borderRadius: 10, padding: '16px', marginBottom: 8 }
const btnPrimary = { padding: '10px 18px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnSecondary = { padding: '10px 18px', background: 'none', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }
const btnAdd = { width: '100%', padding: '10px', background: 'none', border: '1px dashed var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer', marginTop: 4 }
const btnDelete = { marginTop: 6, padding: '4px 10px', background: 'none', border: '1px solid #f5c6c6', borderRadius: 6, fontSize: 11, color: '#A32D2D', cursor: 'pointer' }
const btnCounter = { width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--color-border-tertiary)', background: 'none', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
