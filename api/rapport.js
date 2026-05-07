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

const trendText = (curr, prev) => {
  const diff = curr - prev
  if (diff === 0) return '<span style="color:#888780;">→ stable</span>'
  return diff > 0
    ? `<span style="color:#0F6E56;">↑ +${diff}</span>`
    : `<span style="color:#A32D2D;">↓ ${diff}</span>`
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

    const kpis = [
      { label: 'RDV', value: sum(weekData, 'total_rdv'), prev: p('total_rdv'), color: '#534AB7' },
      { label: 'Présentations', value: sum(weekData, 'presentations'), prev: p('presentations'), color: '#185FA5' },
      { label: 'Signatures', value: sum(weekData, 'signatures'), prev: p('signatures'), color: '#993556' },
      { label: 'Démarrages', value: sum(weekData, 'demarrages'), prev: p('demarrages'), color: '#0F6E56' },
      { label: 'Fins de mission', value: sum(weekData, 'fins_de_mission'), prev: p('fins_de_mission'), color: '#BA7517' },
      { label: 'Solutions envoyées', value: sum(weekData, 'cv_envoyes'), prev: p('cv_envoyes'), color: '#3B6D11' },
      { label: 'Besoins détectés', value: sum(weekData, 'besoins_detectes'), prev: p('besoins_detectes'), color: '#D85A30' },
      { label: 'Pipe total', value: sum(weekData, 'besoins_sans_solution') + sum(weekData, 'attente_retour') + sum(weekData, 'attente_retour_prez'), prev: p('besoins_sans_solution') + p('attente_retour') + p('attente_retour_prez'), color: '#534AB7' },
      { label: 'Prés. à monter', value: sum(weekData, 'presentations_a_monter'), prev: p('presentations_a_monter'), color: '#888780' },
    ]

    const ranking = (ia || []).map(i => {
      const w = weekData.find(s => s.ia_id === i.id) || {}
      const rdv = w.total_rdv || 0
      const prez = w.presentations || 0
      const sign = w.signatures || 0
      const score = rdv * 1 + prez * 2 + sign * 3
      return { nom: i.nom, rdv, prez, sign, score }
    }).filter(i => i.score > 0).sort((a, b) => b.score - a.score)

    // KPIs en rangées de 3 colonnes
    const kpiRows = []
    for (let i = 0; i < kpis.length; i += 3) {
      const row = kpis.slice(i, i + 3)
      while (row.length < 3) row.push(null)
      kpiRows.push(row)
    }

    const kpiHtml = kpiRows.map(row => `
      <tr>
        ${row.map(k => k ? `
          <td width="33%" valign="top" style="padding:16px 8px; text-align:center; border:1px solid #f0eeea; background:#ffffff;">
            <div style="font-size:11px; color:#888780; margin-bottom:8px; font-family:Arial,sans-serif;">${k.label}</div>
            <div style="font-size:30px; font-weight:bold; color:${k.color}; font-family:Arial,sans-serif; line-height:1.2;">${k.value}</div>
            <div style="font-size:11px; margin-top:6px; font-family:Arial,sans-serif;">${trendText(k.value, k.prev)}</div>
          </td>
        ` : `<td width="33%" style="background:#ffffff; border:1px solid #f0eeea;"></td>`).join('')}
      </tr>
    `).join('')

    const rankingHtml = ranking.length === 0
      ? `<tr><td colspan="3" style="padding:20px; text-align:center; color:#888780; font-family:Arial,sans-serif;">Aucune saisie cette semaine</td></tr>`
      : ranking.map((r, i) => {
          const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
          const bg = i % 2 === 0 ? '#ffffff' : '#fafaf8'
          return `<tr style="background:${bg};">
            <td width="40" style="padding:12px 16px; font-size:18px; font-family:Arial,sans-serif;">${emoji}</td>
            <td style="padding:12px 8px; font-family:Arial,sans-serif;">
              <div style="font-size:14px; font-weight:bold; color:#1a1a1a;">${r.nom}</div>
              <div style="font-size:11px; color:#888780; margin-top:2px;">${r.rdv} RDV &middot; ${r.prez} Prez &middot; ${r.sign} Sign.</div>
            </td>
            <td width="60" style="padding:12px 16px; text-align:right; font-size:14px; font-weight:bold; color:#534AB7; font-family:Arial,sans-serif; white-space:nowrap;">${r.score}pts</td>
          </tr>`
        }).join('')

    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rapport Semaine ${semaine}</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f4f0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f4f0">
<tr><td align="center" style="padding:24px 16px;">

  <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

    <!-- HEADER -->
    <tr>
      <td bgcolor="#534AB7" style="padding:28px 32px; border-radius:16px 16px 0 0;">
        <div style="font-size:22px; font-weight:bold; color:#ffffff; font-family:Arial,sans-serif;">&#128202; Rapport Hebdomadaire</div>
        <div style="font-size:14px; color:#ccccff; margin-top:4px; font-family:Arial,sans-serif;">Semaine ${semaine} &mdash; ${annee} &middot; Equipe IS</div>
      </td>
    </tr>

    <!-- KPIs -->
    <tr>
      <td bgcolor="#ffffff" style="padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:16px 20px 12px; font-size:14px; font-weight:bold; color:#534AB7; font-family:Arial,sans-serif; border-bottom:2px solid #f0eeea;">
              Indicateurs cles &mdash; Semaine ${semaine}
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="2" border="0" bgcolor="#f0eeea" style="margin:0;">
          ${kpiHtml}
        </table>
      </td>
    </tr>

    <!-- SPACER -->
    <tr><td height="12" bgcolor="#f5f4f0" style="font-size:0; line-height:0;">&nbsp;</td></tr>

    <!-- CLASSEMENT -->
    <tr>
      <td bgcolor="#ffffff" style="padding:0; border-radius:0 0 16px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:16px 20px 12px; border-bottom:2px solid #f0eeea;">
              <span style="font-size:14px; font-weight:bold; color:#993556; font-family:Arial,sans-serif;">&#127942; Classement &mdash; Semaine ${semaine}</span>
              <span style="font-size:11px; color:#888780; font-family:Arial,sans-serif; margin-left:8px;">RDV=1pt &middot; Prez=2pts &middot; Sign.=3pts</span>
            </td>
          </tr>
          ${rankingHtml}
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="padding:16px; text-align:center; font-size:12px; color:#888780; font-family:Arial,sans-serif;">
        Rapport genere automatiquement &middot;
        <a href="https://reporting-ia.vercel.app" style="color:#534AB7; text-decoration:none;">Acceder au dashboard complet</a>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`

    return res.status(200).json({
      semaine,
      annee,
      html,
      subject: `Rapport Semaine ${semaine} - Equipe IS`
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
