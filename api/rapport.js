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

const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) + '%' : '—'

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

    // Stats par IA
    const iaStats = (ia || []).map(i => {
      const all = (saisies || []).filter(s => s.ia_id === i.id)
      const week = weekData.find(s => s.ia_id === i.id) || {}
      const totalRdv = all.reduce((s, d) => s + (d.total_rdv || 0), 0)
      const totalPrez = all.reduce((s, d) => s + (d.presentations || 0), 0)
      const totalSign = all.reduce((s, d) => s + (d.signatures || 0), 0)
      const totalDem = all.reduce((s, d) => s + (d.demarrages || 0), 0)
      const score = totalRdv * 1 + totalPrez * 1.5 + totalSign * 2 + totalDem * 3
      return {
        nom: i.nom,
        w_rdv: week.total_rdv || 0,
        w_prez: week.presentations || 0,
        w_sign: week.signatures || 0,
        w_dem: week.demarrages || 0,
        totalRdv, totalPrez, totalSign, totalDem, score,
        ratioBesRdv: pct(all.reduce((s,d) => s+(d.besoins_detectes||0),0), totalRdv),
        ratioSignPrez: pct(totalSign, totalPrez),
        ratioObj: pct(totalSign, 10),
      }
    }).sort((a, b) => b.score - a.score)

    const totalRdvSem = sum(weekData, 'total_rdv')
    const totalPrezSem = sum(weekData, 'presentations')
    const totalSignSem = sum(weekData, 'signatures')
    const totalDemSem = sum(weekData, 'demarrages')
    const totalFinSem = sum(weekData, 'fins_de_mission')
    const totalBssSem = sum(weekData, 'besoins_sans_solution')
    const totalArcSem = sum(weekData, 'attente_retour')
    const totalArpSem = sum(weekData, 'attente_retour_prez')

    const prevRdv = sum(prevData, 'total_rdv')
    const trend = (curr, prev) => {
      if (!prev) return ''
      const diff = curr - prev
      if (diff === 0) return '<span style="color:#888">→ =</span>'
      return diff > 0
        ? `<span style="color:#0F6E56">↑ +${diff}</span>`
        : `<span style="color:#A32D2D">↓ ${diff}</span>`
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport Semaine ${semaine} — ${annee}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f4f0; margin: 0; padding: 24px; color: #1a1a1a; }
  .container { max-width: 680px; margin: 0 auto; }
  .header { background: #534AB7; color: white; border-radius: 12px; padding: 28px 32px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 600; }
  .header p { margin: 0; opacity: 0.8; font-size: 14px; }
  .section { background: white; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
  .section-header { padding: 14px 20px; font-size: 13px; font-weight: 600; border-left: 4px solid; }
  .section-body { padding: 16px 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .kpi { background: #f5f4f0; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-label { font-size: 11px; color: #5F5E5A; margin-bottom: 4px; }
  .kpi-value { font-size: 24px; font-weight: 600; }
  .kpi-trend { font-size: 11px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { padding: 8px 10px; text-align: left; background: #f5f4f0; color: #5F5E5A; font-weight: 500; font-size: 11px; }
  td { padding: 9px 10px; border-bottom: 0.5px solid #e5e4e0; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafaf8; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; background: #FAEEDA; color: #633806; }
  .badge-good { background: #E1F5EE; color: #085041; }
  .rank { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 0.5px solid #e5e4e0; }
  .rank:last-child { border-bottom: none; }
  .rank-num { font-size: 16px; width: 28px; }
  .rank-name { flex: 1; font-size: 13px; font-weight: 500; }
  .rank-bar-wrap { flex: 2; height: 6px; background: #e5e4e0; border-radius: 3px; overflow: hidden; }
  .rank-bar { height: 100%; border-radius: 3px; background: #534AB7; }
  .rank-score { font-size: 12px; font-weight: 600; color: #534AB7; width: 50px; text-align: right; }
  .pipe-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 0.5px solid #e5e4e0; }
  .pipe-row:last-child { border-bottom: none; }
  .pipe-label { font-size: 13px; color: #5F5E5A; }
  .pipe-value { font-size: 22px; font-weight: 600; }
  .footer { text-align: center; font-size: 12px; color: #888; margin-top: 20px; padding-bottom: 20px; }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <h1>📊 Rapport Hebdomadaire</h1>
    <p>Semaine ${semaine} — ${annee} · Équipe IS</p>
  </div>

  <!-- KPIs -->
  <div class="section">
    <div class="section-header" style="border-color:#534AB7; color:#534AB7;">📊 Indicateurs clés de la semaine</div>
    <div class="section-body">
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">RDV</div>
          <div class="kpi-value" style="color:#534AB7">${totalRdvSem}</div>
          <div class="kpi-trend">${trend(totalRdvSem, prevRdv)}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Présentations</div>
          <div class="kpi-value" style="color:#185FA5">${totalPrezSem}</div>
          <div class="kpi-trend">${trend(totalPrezSem, sum(prevData, 'presentations'))}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Signatures</div>
          <div class="kpi-value" style="color:#993556">${totalSignSem}</div>
          <div class="kpi-trend">${trend(totalSignSem, sum(prevData, 'signatures'))}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Démarrages</div>
          <div class="kpi-value" style="color:#0F6E56">${totalDemSem}</div>
          <div class="kpi-trend">${trend(totalDemSem, sum(prevData, 'demarrages'))}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Fins de mission</div>
          <div class="kpi-value" style="color:#BA7517">${totalFinSem}</div>
          <div class="kpi-trend">${trend(totalFinSem, sum(prevData, 'fins_de_mission'))}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Pipe total</div>
          <div class="kpi-value" style="color:#534AB7">${totalBssSem + totalArcSem + totalArpSem}</div>
          <div class="kpi-trend">${trend(totalBssSem + totalArcSem + totalArpSem, sum(prevData,'besoins_sans_solution')+sum(prevData,'attente_retour')+sum(prevData,'attente_retour_prez'))}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Classement -->
  <div class="section">
    <div class="section-header" style="border-color:#993556; color:#993556;">🏆 Classement pondéré — Semaine ${semaine}</div>
    <div class="section-body">
      <p style="font-size:11px; color:#888; margin:0 0 12px">RDV=1pt · Prez=2pts · Sign.=3pts</p>
      ${iaStats.filter(i => i.w_rdv + i.w_prez + i.w_sign > 0).map((ia, i) => {
        const score = ia.w_rdv * 1 + ia.w_prez * 2 + ia.w_sign * 3
        const maxScore = iaStats[0] ? iaStats[0].w_rdv * 1 + iaStats[0].w_prez * 2 + iaStats[0].w_sign * 3 : 1
        const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`
        return `<div class="rank">
          <span class="rank-num">${emoji}</span>
          <span class="rank-name">${ia.nom}</span>
          <div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round((score/Math.max(maxScore,1))*100)}%"></div></div>
          <span class="rank-score">${score}pts</span>
        </div>`
      }).join('')}
    </div>
  </div>

  <!-- Détail par IA -->
  <div class="section">
    <div class="section-header" style="border-color:#0F6E56; color:#0F6E56;">👥 Détail par ingénieur — Semaine ${semaine}</div>
    <div class="section-body" style="padding:0">
      <table>
        <tr>
          <th>IA</th><th>RDV</th><th>Prez</th><th>Sign.</th><th>Démarr.</th>
        </tr>
        ${iaStats.map(ia => `<tr>
          <td><strong>${ia.nom}</strong></td>
          <td>${ia.w_rdv}</td>
          <td>${ia.w_prez}</td>
          <td>${ia.w_sign}</td>
          <td>${ia.w_dem}</td>
        </tr>`).join('')}
        <tr style="font-weight:600; background:#f5f4f0">
          <td>Total</td>
          <td>${totalRdvSem}</td>
          <td>${totalPrezSem}</td>
          <td>${totalSignSem}</td>
          <td>${totalDemSem}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Cumul annuel -->
  <div class="section">
    <div class="section-header" style="border-color:#BA7517; color:#BA7517;">📈 Cumul annuel & Ratios</div>
    <div class="section-body" style="padding:0">
      <table>
        <tr>
          <th>IA</th><th>RDV</th><th>Prez</th><th>Sign.</th><th>Bes./RDV</th><th>Obj.</th>
        </tr>
        ${iaStats.map(ia => `<tr>
          <td><strong>${ia.nom}</strong></td>
          <td>${ia.totalRdv}</td>
          <td>${ia.totalPrez}</td>
          <td>${ia.totalSign}</td>
          <td><span class="badge">${ia.ratioBesRdv}</span></td>
          <td><span class="badge ${ia.totalSign >= 10 ? 'badge-good' : ''}">${ia.ratioObj}</span></td>
        </tr>`).join('')}
      </table>
    </div>
  </div>

  <!-- État du pipe -->
  <div class="section">
    <div class="section-header" style="border-color:#BA7517; color:#BA7517;">🎯 État du pipe — Semaine ${semaine}</div>
    <div class="section-body">
      <div class="pipe-row">
        <span class="pipe-label">🔍 Besoins sans solution</span>
        <span class="pipe-value" style="color:#534AB7">${totalBssSem}</span>
      </div>
      <div class="pipe-row">
        <span class="pipe-label">⏳ En attente réponse client</span>
        <span class="pipe-value" style="color:#BA7517">${totalArcSem}</span>
      </div>
      <div class="pipe-row">
        <span class="pipe-label">📋 Présentations en attente retour</span>
        <span class="pipe-value" style="color:#993556">${totalArpSem}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    Rapport généré automatiquement · Reporting IA · <a href="https://reporting-ia.vercel.app" style="color:#534AB7">Accéder au dashboard</a>
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
