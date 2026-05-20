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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  try {
    const semaine = currentWeek()
    const annee = new Date().getFullYear()

    const { data: iaList } = await supabase.from('ia').select('*')
    const { data: saisies } = await supabase
  .from('saisies')
  .select('ia_id')
  .eq('semaine', semaine)
  .eq('annee', annee)
  .gt('total_rdv', 0)

    const iaAvecSaisie = new Set((saisies || []).map(s => s.ia_id))
    const iaSansSaisie = (iaList || [])
  .filter(ia =>
    !iaAvecSaisie.has(ia.id) &&
    ia.nom !== 'Anthony' &&
    ia.nom !== 'P1 of the week' &&
    ia.type !== 'cr'
  )
  .map(ia => ia.nom)

    const message = iaSansSaisie.length === 0
      ? `✅ Tout le monde a saisi son reporting pour la semaine ${semaine} !`
      : `📊 **Rappel reporting — Semaine ${semaine}**\n\nLes ingénieurs suivants n'ont pas encore saisi leurs données :\n**${iaSansSaisie.join(', ')}**\n\n👉 https://reporting-ia.vercel.app\n\n_Ton mot de passe : ton prénom en minuscules_`

    return res.status(200).json({
      semaine,
      iaSansSaisie,
      count: iaSansSaisie.length,
      message,
      tousOntSaisi: iaSansSaisie.length === 0
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
