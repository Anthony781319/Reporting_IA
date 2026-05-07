import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://szqsansojklzsuxirpye.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXNhbnNvamtsenN1eGlycHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzAzNzksImV4cCI6MjA5MzY0NjM3OX0.NGdkPuT8s_lk9qpNun6_fZlkdnU6Pd_ECby8ZAFqzlA'
)

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

const trend = (curr, prev) => {
  if (prev === undefined || prev === null) return ''
  const diff = curr - prev
  if (diff === 0) return '<span style="color:#888780; font-size:12px;">→ stable</span>'
  return diff > 0
    ? `<span style="color:#0F6E56; font-size:12px;">↑ +${diff} vs S préc.</span>`
    : `<span style="color:#A32D2D; font-size:12px;">↓ ${diff} vs S préc.</span>`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const semaine = currentWeek()
    const annee = new Date().getFullYear()

    const { data: ia } = await supabase.from('ia').select('*').order('nom')
    const { data: saisies } = await supabase.from('saisies').select('*').eq('annee', annee)

    const weekData = (saisies || []).filter(s => s.semaine === semaine)
    const prevData = (saisies || []).filter(s => s.semaine === semaine - 1)

    const sum = (data, key) => data.reduce((s, d) => s + (d[key] || 0), 0)
    const p = (key) => sum(prevData, key)

    // Classement pondéré de la semaine uniquement
    const ranking = (ia || []).map(i => {
      const w = weekData.find(s => s.ia_id === i.id) || {}
      const rdv = w.total_rdv || 0
      const prez = w.presentations || 0
      const sign = w.signatures || 0
      const score = rdv * 1 + prez * 2 + sign * 3
      return { nom: i.nom, rdv, prez, sign, score }
    }).filter(i => i.score > 0).sort((a, b) => b.score - a.score)

    const maxScore = ranking.length > 0 ? ranking[0].score : 1

    const kpis = [
      { label: 'RDV', value: sum(weekData, 'total_rdv'), prev: p('total_rdv'), color: '#534AB7' },
      { label: 'Présentations', value: sum(weekData, 'presentations'), prev: p('presentations'), color: '#185FA5' },
      { label: 'Signatures', value: sum(weekData, 'signatures'), prev: p('signatures'), color: '#993556' },
      { label: 'Démarrages', value: sum(weekData, 'demarrages'), prev: p('demarrages'), color: '#0F6E56' },
      { label: 'Fins de mission', value: sum(weekData, 'fins_de_mission'), prev: p('fins_de_mission'), color: '#BA7517' },
      { label: 'Solutions envoyées', value: sum(weekData, 'cv_envoyes'), prev: p('cv_envoyes'), color: '#3B6D11' },
      { label: 'Besoins détectés', value: sum(weekData, 'besoins_detectes'), prev: p('besoins_detectes'), color: '#D85A30' },
      { label: 'Pipe total', value: sum(weekData, 'besoins_sans_solution') + sum(weekData, 'attente_retour') + sum(weekData, 'attente_retour_prez'), prev: p('besoins_sans_solution') + p('attente_retour') + p('attente_retour_prez'), color: '#534AB7' },
      { label: 'Présentations à monter', value: sum(weekData, 'presentations_a_monter'), prev: p('presentations_a_monter'), color: '#888780' },
    ]

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport Semaine ${semaine}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f4f0; padding: 24px; color: #1a1a1a; }
  .container { max-width: 600px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #534AB7, #3C3489); color: white; border-radius: 16px; padding: 28px 32px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  .header p { opacity: 0.8; font-size: 14px; }
  .section { background: white; border-radius: 16px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .section-title { padding: 16px 20px 12px; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f0eeea; display: flex; align-items: center; gap: 8px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #f0eeea; }
  .kpi { background: white; padding: 16px 12px; text-align: center; }
  .kpi-label { font-size: 11px; color: #888780; margin-bottom: 6px; }
  .kpi-value { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .kpi-trend { font-size: 11px; min-height: 16px; }
  .rank-item { display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid #f5f4f0; gap: 12px; }
  .rank-item:last-child { border-bottom: none; }
  .rank-emoji { font-size: 18px; width: 28px; text-align: center; flex-shrink: 0; }
  .rank-name { flex: 1; font-size: 14px; font-weight: 500; }
  .rank-details { font-size: 11px; color: #888780; margin-top: 2px; }
  .rank-bar-wrap { flex: 2; height: 6px; background: #f0eeea; border-radius: 3px; overflow: hidden; }
  .rank-bar { height: 100%; border-radius: 3px; background: #534AB7; }
  .rank-score { font-size: 13px; font-weight: 700; color: #534AB7; width: 45px; text-align: right; flex-shrink: 0; }
  .footer { text-align: center; font-size: 12px; color: #888780; padding: 16px 0 8px; }
  .footer a { color: #534AB7; text-decoration: none; }
  .no-data { text-align: center; color: #888780; padding: 20px; font-size: 13px; }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <h1>📊 Rapport Hebdomadaire</h1>
    <p>Semaine ${semaine} — ${annee} · Équipe IS</p>
  </div>

  <div class="section">
    <div class="section-title">📊 Indicateurs clés — Semaine ${semaine}</div>
    <div class="kpi-grid">
      ${kpis.map(k => `
      <div class="kpi">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value" style="color:${k.color}">${k.value}</div>
        <div class="kpi-trend">${trend(k.value, k.prev)}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">🏆 Classement — Semaine ${semaine}<span style="font-size:11px; font-weight:400; color:#888780; margin-left:8px">RDV=1pt · Prez=2pts · Sign.=3pts</span></div>
    ${ranking.length === 0
      ? '<div class="no-data">Aucune saisie cette semaine</div>'
      : ranking.map((r, i) => {
          const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`
          const pct = Math.round((r.score / maxScore) * 100)
          return `<div class="rank-item">
            <span class="rank-emoji">${emoji}</span>
            <div style="flex:1">
              <div class="rank-name">${r.nom}</div>
              <div class="rank-details">${r.rdv} RDV · ${r.prez} Prez · ${r.sign} Sign.</div>
            </div>
            <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%"></div></div>
            <span class="rank-score">${r.score}pts</span>
          </div>`
        }).join('')
    }
  </div>

  <div class="footer">
    Rapport généré automatiquement · <a href="https://reporting-ia.vercel.app">Accéder au dashboard complet →</a>
  </div>

</div>
</body>
</html>`

    return res.status(200).json({
      semaine,
      annee,
      html,
      subject: `📊 Rapport Semaine ${semaine} — Équipe IS`
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
