import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  'https://szqsansojklzsuxirpye.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXNhbnNvamtsenN1eGlycHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzAzNzksImV4cCI6MjA5MzY0NjM3OX0.NGdkPuT8s_lk9qpNun6_fZlkdnU6Pd_ECby8ZAFqzlA'
)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'reporting.consort@gmail.com',
    pass: 'ruztdlmqvxyzxroi'
  }
})

const currentWeek = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

export default async function handler(req, res) {
  try {
    const semaine = currentWeek()
    const annee = new Date().getFullYear()

    const { data: iaList } = await supabase.from('ia').select('*')
    const { data: saisies } = await supabase
      .from('saisies')
      .select('ia_id')
      .eq('semaine', semaine)
      .eq('annee', annee)

    const iaAvecSaisie = new Set((saisies || []).map(s => s.ia_id))
    const iaSansSaisie = (iaList || []).filter(ia => !iaAvecSaisie.has(ia.id) && ia.nom !== 'Anthony')

    if (iaSansSaisie.length === 0) {
      return res.status(200).json({ message: 'Tout le monde a saisi cette semaine 🎉' })
    }

    const results = []
    for (const ia of iaSansSaisie) {
      try {
        await transporter.sendMail({
          from: '"Reporting IA" <reporting.consort@gmail.com>',
          to: ia.email,
          subject: `📊 Rappel — Saisie semaine ${semaine} en attente`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
                <h1 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0;">Reporting IA</h1>
              </div>

              <div style="background: #f5f4f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 8px 0;">Bonjour <strong>${ia.nom}</strong> 👋</p>
                <p style="font-size: 14px; color: #5F5E5A; margin: 0;">
                  Tu n'as pas encore saisi tes données pour la <strong>semaine ${semaine}</strong>.
                  Ça ne prend que 2 minutes !
                </p>
              </div>

              <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://reporting-ia.vercel.app"
                   style="display: inline-block; background: #534AB7; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 600;">
                  Accéder à mon reporting →
                </a>
              </div>

              <div style="border-top: 1px solid #e5e4e0; padding-top: 16px;">
                <p style="font-size: 12px; color: #888780; text-align: center; margin: 0;">
                  Ton mot de passe : ton prénom en minuscules
                </p>
              </div>
            </div>
          `
        })
        results.push({ ia: ia.nom, status: 'envoyé' })
      } catch (err) {
        results.push({ ia: ia.nom, status: 'erreur', error: err.message })
      }
    }

    return res.status(200).json({
      message: `${results.filter(r => r.status === 'envoyé').length} rappel(s) envoyé(s)`,
      semaine,
      results
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
