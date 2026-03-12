import { Resend } from 'resend'
import { env } from './env'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${env.NEXTAUTH_URL}/reset-password/${resetToken}`
  
  if (!resend || !env.RESEND_FROM_EMAIL) {
    console.warn('⚠️  Resend non configurato correttamente')
    console.warn('   RESEND_API_KEY:', env.RESEND_API_KEY ? 'Presente' : 'MANCANTE')
    console.warn('   RESEND_FROM_EMAIL:', env.RESEND_FROM_EMAIL || 'MANCANTE')
    console.log(`🔗 Link reset password (dev): ${resetUrl}`)
    return { success: false, error: 'Resend not configured' }
  }

  // Verifica che il dominio non sia un dominio pubblico gratuito
  const fromEmail = env.RESEND_FROM_EMAIL
  const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com']
  const emailDomain = fromEmail.split('@')[1]?.toLowerCase()
  
  if (emailDomain && publicDomains.includes(emailDomain)) {
    console.warn(`Resend: dominio mittente ${emailDomain} non valido. Usa un dominio personalizzato o onboarding@resend.dev per sviluppo.`)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Link reset password (dev): ${resetUrl}`)
    }
    return { success: false, error: 'Dominio mittente email non valido' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Reset Password - Appointly',
      html: generateEmailHtml(resetUrl),
    })

    if (error) {
      console.error('❌ Errore invio email Resend:', error)
      console.log(`🔗 Link reset password (dev): ${resetUrl}`)
      return { success: false, error: error.message }
    }

    console.log('✅ Email reset password inviata con Resend a:', email)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Errore invio email:', error)
    console.log(`🔗 Link reset password (dev): ${resetUrl}`)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function generateEmailHtml(resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d4af37; margin: 0;">Appointly</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Reset Password</h2>
          <p>Hai richiesto il reset della password. Clicca sul pulsante qui sotto per impostare una nuova password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #d4af37; color: #1a1a1a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Oppure copia e incolla questo link nel browser:<br>
            <a href="${resetUrl}" style="color: #d4af37; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            Questo link scade tra 1 ora. Se non hai richiesto il reset, ignora questa email.
          </p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Appointly. Tutti i diritti riservati.</p>
        </div>
      </body>
    </html>
  `
}
