import twilio from 'twilio'
import { env } from './env'
import { prisma } from './prisma'

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

/**
 * Normalizza numero italiano
 */
function normalizePhone(phone: string): string {
  const clean = phone.replace(/\s/g, '').replace(/^00/, '+')
  if (clean.startsWith('+')) return clean
  if (clean.startsWith('3')) return `+39${clean}` // Italiano senza prefisso
  return `+${clean}`
}

/**
 * Invia messaggio WhatsApp
 * 
 * @param tenantId ID del tenant
 * @param to Numero destinatario
 * @param templateSid SID del template WhatsApp approvato
 * @param vars Variabili per il template
 * @param appointmentId ID appuntamento (opzionale)
 * @param type Tipo di messaggio
 */
export async function sendWhatsApp(
  tenantId: string,
  to: string,
  templateSid: string,
  vars: Record<string, string>,
  appointmentId?: string,
  type: 'REMINDER' | 'CONFIRMATION' | 'CANCELLATION' = 'REMINDER'
) {
  const phone = normalizePhone(to)

  try {
    const message = await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${phone}`,
      contentSid: templateSid,
      contentVariables: JSON.stringify(vars),
    })

    // Log il messaggio per billing
    await prisma.messageLog.create({
      data: {
        tenantId,
        appointmentId,
        clientPhone: phone,
        channel: 'WHATSAPP',
        type,
        twilioSid: message.sid,
        status: 'sent',
        costCents: 4, // ~€0.04 utility template (stima conservativa)
      },
    })

    return { success: true, sid: message.sid }
  } catch (error) {
    console.error('WhatsApp send error:', error)

    await prisma.messageLog.create({
      data: {
        tenantId,
        appointmentId,
        clientPhone: phone,
        channel: 'WHATSAPP',
        type,
        status: 'failed',
        costCents: 0,
      },
    })

    return { success: false, error }
  }
}
