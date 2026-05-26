import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Entretiens() {
  const [ias, setIas] = useState([])
  const [iaSelectionnee, setIaSelectionnee] = useState(null)
  const [vue, setVue] = useState('liste') // 'liste' | 'nouveau' | 'historique'
  const [entretiens, setEntretiens] = useState([])
  const [entretienOuvert, setEntretienOuvert] = useState(null)

  // Formulaire nouveau entretien
  const [themes, setThemes] = useState('')
  const [observations, setObservations] = useState('')
  const [actions, setActions] = useState([{ description: '', responsable: 'ia', echeance: '' }])

  // États UI
  const [loadingCR, setLoadingCR] = useState(false)
  const [crGenere, setCrGenere] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchIas()
  }, [])

  const fetchIas = async () => {
    const { data } = await supabase.from('ia').select('id, nom, email').order('nom')
    if (data) setIas(data)
  }

  const fetchEntretiens = async (iaId) => {
    const { data } = await supabase
      .from('entretiens')
      .select('*, actions_1to1(*)')
      .eq('ia_id', iaId)
      .order('date_entretien', { ascending: false })
    if (data) setEntretiens(data)
  }

  const handleSelectIA = (ia) => {
    setIaSelectionnee(ia)
    fetchEntretiens(ia.id)
    setVue('liste')
    resetForm()
  }

  const resetForm = () => {
    setThemes('')
    setObservations('')
    setActions([{ description: '', responsable: 'ia', echeance: '' }])
    setCrGenere('')
  }

  const addAction = () => {
    setActions([...actions, { description: '', responsable: 'ia', echeance: '' }])
  }

  const updateAction = (i, field, value) => {
    const updated = [...actions]
    updated[i][field] = value
    setActions(updated)
  }

  const removeAction = (i) => {
    setActions(actions.filter((_, idx) => idx !== i))
  }

 const genererCR = () => {
  if (!observations && !themes) { setMsg('Renseigne au moins les observations avant de générer le prompt.'); return }
  
  const actionsTexte = actions
    .filter(a => a.description.trim())
    .map((a, i) => `${i + 1}. ${a.description} (Responsable : ${a.responsable === 'ia' ? iaSelectionnee.nom : 'Manager'})${a.echeance ? ` — échéance : ${a.echeance}` : ''}`)
    .join('\n')

  const prompt = `Tu es un assistant manager. Rédige un compte-rendu professionnel et bienveillant d'un point individuel avec ${iaSelectionnee.nom}, Business Engineer dans une ESN spécialisée IT/Télécom/Cybersécurité.

Voici les éléments saisis pendant le point :

THÈMES ABORDÉS : ${themes || 'Non précisés'}

OBSERVATIONS / POINTS CLÉS : ${observations}

ACTIONS DÉFINIES :
${actionsTexte || 'Aucune action définie'}

Rédige un CR structuré avec :
1. Un résumé du point (2-3 phrases)
2. Les points abordés et échanges clés
3. Les actions à mener avec les responsables
4. Un mot de conclusion positif et motivant

Sois concis, professionnel, et utilise le vouvoiement.`

  navigator.clipboard.writeText(prompt)
  setCrGenere('')
  setMsg('✅ Prompt copié ! Colle-le dans Claude.ai, récupère le CR et colle-le dans le champ ci-dessous.')
}
  const sauvegarderEntretien = async () => {
    if (!crGenere) { setMsg('Génère le CR avant de sauvegarder.'); return }
    setSaving(true)
    try {
      const { data: entretien, error } = await supabase
        .from('entretiens')
        .insert({
          ia_id: iaSelectionnee.id,
          date_entretien: new Date().toISOString().split('T')[0],
          themes,
          observations,
          cr_genere: crGenere,
          cr_envoye: false
        })
        .select()
        .single()

      if (error) throw error

      const actionsAInserer = actions
        .filter(a => a.description.trim())
        .map(a => ({
          entretien_id: entretien.id,
          ia_id: iaSelectionnee.id,
          description: a.description,
          responsable: a.responsable,
          echeance: a.echeance || null,
          statut: 'en_cours'
        }))

      if (actionsAInserer.length > 0) {
        await supabase.from('actions_1to1').insert(actionsAInserer)
      }

      setMsg('Entretien sauvegardé ✅')
      fetchEntretiens(iaSelectionnee.id)
      resetForm()
      setVue('liste')
    } catch (e) {
      setMsg('Erreur lors de la sauvegarde.')
    }
    setSaving(false)
  }
const envoyerCR = async (entretien) => {
  try {
    await fetch('https://default1d593042a69d49e08d1c0daf8ac171.7b.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/357caf7470f146f98e8fd5a4d037d9d0/triggers/manual/paths/invoke?api-version=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: iaSelectionnee.email,
        nom: iaSelectionnee.nom,
        cr: entretien.cr_genere,
        date: new Date(entretien.date_entretien).toLocaleDateString('fr-FR')
      })
    })
    await supabase.from('entretiens').update({ cr_envoye: true }).eq('id', entretien.id)
    fetchEntretiens(iaSelectionnee.id)
    setMsg('✅ CR envoyé avec succès !')
  } catch (e) {
    setMsg('❌ Erreur lors de l\'envoi.')
  }
}
  
  const toggleStatutAction = async (actionId, statutActuel) => {
    const nouveau = statutActuel === 'en_cours' ? 'fait' : 'en_cours'
    await supabase.from('actions_1to1').update({ statut: nouveau }).eq('id', actionId)
    fetchEntretiens(iaSelectionnee.id)
  }

  // STYLES
  const s = {
    page: { padding: '24px', maxWidth: 900, margin: '0 auto' },
    titre: { fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--color-text-primary)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 },
    carteIA: (selected) => ({
      padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
      border: `2px solid ${selected ? 'var(--color-accent)' : 'var(--color-border-tertiary)'}`,
      background: selected ? 'var(--color-accent-subtle)' : 'var(--color-background-secondary)',
      fontWeight: selected ? 700 : 500, fontSize: 14, color: 'var(--color-text-primary)',
      transition: 'all 0.15s'
    }),
    section: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)', display: 'block' },
    textarea: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 14, resize: 'vertical', minHeight: 80, boxSizing: 'border-box' },
    input: { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13 },
    select: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13 },
    btnPrimary: { padding: '10px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { padding: '10px 20px', background: 'none', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    btnDanger: { padding: '4px 10px', background: 'none', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    actionRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
    badge: (statut) => ({ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: statut === 'fait' ? '#c6f6d5' : '#fefcbf', color: statut === 'fait' ? '#276749' : '#744210' }),
    carteEntretien: { background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 10, padding: 16, marginBottom: 12 },
    msg: { padding: '10px 14px', background: 'var(--color-accent-subtle)', borderRadius: 8, fontSize: 13, marginBottom: 16, color: 'var(--color-text-primary)' }
  }

  return (
    <div style={s.page}>
      <div style={s.titre}>🤝 Points Individuels</div>

      {/* Sélection IA */}
      <div style={s.section}>
        <span style={s.label}>Sélectionne un Business Engineer</span>
        <div style={s.grid}>
          {ias.map(ia => (
            <div key={ia.id} style={s.carteIA(iaSelectionnee?.id === ia.id)} onClick={() => handleSelectIA(ia)}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>👤</div>
              {ia.nom}
            </div>
          ))}
        </div>
      </div>

      {iaSelectionnee && (
        <>
          {msg && <div style={s.msg}>{msg}</div>}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button style={vue === 'liste' ? s.btnPrimary : s.btnSecondary} onClick={() => setVue('liste')}>
              Historique
            </button>
            <button style={vue === 'nouveau' ? s.btnPrimary : s.btnSecondary} onClick={() => { setVue('nouveau'); resetForm(); setMsg('') }}>
              + Nouveau point
            </button>
          </div>

          {/* HISTORIQUE */}
          {vue === 'liste' && (
            <div>
              {entretiens.length === 0 && <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Aucun entretien enregistré pour {iaSelectionnee.nom}.</p>}
              {entretiens.map(e => (
                <div key={e.id} style={s.carteEntretien}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>📅 {new Date(e.date_entretien).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{e.cr_envoye ? '✅ CR envoyé' : '⏳ CR non envoyé'}</span>
                  </div>
                  {e.themes && <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>🏷️ {e.themes}</p>}
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-accent)' }}>Voir le CR</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, marginTop: 8, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>{e.cr_genere}</pre>
                  </details>
                  {e.actions_1to1?.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Actions :</span>
                      {e.actions_1to1.map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <span style={s.badge(a.statut)}>{a.statut === 'fait' ? '✓ Fait' : '⏳ En cours'}</span>
                          <span style={{ fontSize: 13, flex: 1 }}>{a.description}</span>
                          <button style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-border-tertiary)', background: 'none', color: 'var(--color-text-secondary)' }}
                            onClick={() => toggleStatutAction(a.id, a.statut)}>
                            {a.statut === 'fait' ? 'Réouvrir' : 'Marquer fait'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* NOUVEAU ENTRETIEN */}
          {vue === 'nouveau' && (
            <div>
              <div style={s.section}>
                <label style={s.label}>Thèmes abordés</label>
                <input style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} placeholder="ex : prospection, pipeline, bien-être, formation…" value={themes} onChange={e => setThemes(e.target.value)} />
              </div>

              <div style={s.section}>
                <label style={s.label}>Observations & points clés</label>
                <textarea style={s.textarea} placeholder="Note ici les échanges, points importants, contexte…" value={observations} onChange={e => setObservations(e.target.value)} rows={5} />
              </div>

              <div style={s.section}>
                <label style={s.label}>Actions définies</label>
                {actions.map((a, i) => (
                  <div key={i} style={s.actionRow}>
                    <input style={{ ...s.input, flex: 1, minWidth: 200 }} placeholder="Description de l'action…" value={a.description} onChange={e => updateAction(i, 'description', e.target.value)} />
                    <select style={s.select} value={a.responsable} onChange={e => updateAction(i, 'responsable', e.target.value)}>
                      <option value="ia">{iaSelectionnee.nom}</option>
                      <option value="manager">Manager</option>
                    </select>
                    <input type="date" style={s.input} value={a.echeance} onChange={e => updateAction(i, 'echeance', e.target.value)} />
                    {actions.length > 1 && <button style={s.btnDanger} onClick={() => removeAction(i)}>✕</button>}
                  </div>
                ))}
                <button style={{ ...s.btnSecondary, marginTop: 4, fontSize: 13, padding: '6px 14px' }} onClick={addAction}>+ Ajouter une action</button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <button style={s.btnSecondary} onClick={genererCR}>
  📋 Copier le prompt Claude
</button>
              </div>

              {crGenere && (
                <div style={{ marginTop: 20 }}>
                  <label style={s.label}>CR généré — tu peux le modifier avant de sauvegarder</label>
                  <textarea style={{ ...s.textarea, minHeight: 200 }} value={crGenere} onChange={e => setCrGenere(e.target.value)} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button style={s.btnPrimary} onClick={sauvegarderEntretien} disabled={saving}>
                      {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
