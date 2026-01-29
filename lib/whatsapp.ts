/**
 * WhatsApp messaging via Twilio API
 * 
 * @module lib/whatsapp
 */

import twilio from 'twilio'
import { env } from './env'
import { isTwilioError } from './errors'

// Inizializza client Twilio solo se configurato
let client: ReturnType<typeof twilio> | null = null

if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
}

function normalizePhoneNumber(phone: string): string {
  // Rimuovi spazi e caratteri speciali
  let normalized = phone.replace(/\s+/g, '').replace(/[-\/]/g, '')
  
  // Se inizia con 0, sostituisci con +39
  if (normalized.startsWith('0')) {
    normalized = '+39' + normalized.substring(1)
  }
  // Se inizia con 39, aggiungi +
  else if (normalized.startsWith('39')) {
    normalized = '+' + normalized
  }
  // Se inizia con +, lascia così
  else if (!normalized.startsWith('+')) {
    // Se non ha prefisso, assume Italia (+39)
    normalized = '+39' + normalized
  }
  
  return normalized
}

/**
 * Sends a WhatsApp message via Twilio
 * 
 * Automatically normalizes phone numbers to international format.
 * Gracefully handles missing Twilio configuration.
 * 
 * @param to - Recipient phone number (e.g., "3339406945" or "+393339406945")
 * @param message - Message content
 * @returns Twilio message object or null if Twilio not configured
 * @throws {TwilioError} If message sending fails
 * @example
 * ```typescript
 * try {
 *   await sendWhatsAppMessage('+393339406945', 'Hello!')
 * } catch (error) {
 *   if (isTwilioError(error)) {
 *     console.log('Twilio error:', error.code)
 *   }
 * }
 * ```
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
) {
  // Check se Twilio è configurato
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM || !client) {
    console.warn('⚠️ Twilio non configurato, skip invio WhatsApp')
    return null
  }

  try {
    const normalizedPhone = normalizePhoneNumber(to)
    console.log(`📱 Invio WhatsApp a: ${normalizedPhone} (originale: ${to})`)
    
    const result = await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${normalizedPhone}`,
      body: message,
    })
    
    console.log(`✅ WhatsApp inviato con successo a ${normalizedPhone} (SID: ${result.sid})`)
    return result
  } catch (error) {
    const normalizedPhone = normalizePhoneNumber(to)
    
    if (isTwilioError(error)) {
      console.error(`❌ Errore Twilio invio WhatsApp a ${normalizedPhone}:`, error.message)
      
      // Log dettagliato per errori comuni
      if (error.code === 21211) {
        console.error('   🔴 Numero non valido per Twilio')
        console.error('   Possibili cause: numero non registrato su WhatsApp o formato errato')
      } else if (error.code === 21608) {
        console.error('   🔴 Numero non autorizzato per Twilio Sandbox')
        console.error('   Soluzione: aggiungi il numero alla lista autorizzati su Twilio')
      } else if (error.code === 21408) {
        console.error('   🔴 Numero di destinazione non valido')
      } else {
        console.error('   Codice errore:', error.code)
        console.error('   Dettagli:', error)
      }
    } else if (error instanceof Error) {
      console.error(`❌ Errore generico invio WhatsApp a ${normalizedPhone}:`, error.message)
    } else {
      console.error(`❌ Errore sconosciuto invio WhatsApp a ${normalizedPhone}:`, String(error))
    }
    
    throw error
  }
}

/**
 * Formats a booking confirmation message
 * 
 * @param clientName - Name of the client
 * @param date - Booking date
 * @param time - Booking time in HH:mm format
 * @returns Formatted WhatsApp message
 */
export function formatBookingConfirmationMessage(
  clientName: string,
  date: Date,
  time: string
) {
  const formattedDate = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `✅ Prenotazione confermata!\n\nCiao ${clientName},\n\nLa tua sessione è stata prenotata per:\n📅 ${formattedDate}\n🕐 ${time}\n\nTi aspettiamo allo studio Hugemass! 💪`
}

/**
 * Formats a booking reminder message
 * 
 * @param clientName - Name of the client
 * @param date - Booking date
 * @param time - Booking time in HH:mm format
 * @returns Formatted WhatsApp reminder message
 */
export function formatBookingReminderMessage(
  clientName: string,
  date: Date,
  time: string
) {
  const formattedDate = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `⏰ Promemoria sessione\n\nCiao ${clientName},\n\nTi ricordiamo che hai una sessione tra 1 ora:\n📅 ${formattedDate}\n🕐 ${time}\n\nTi aspettiamo! 💪`
}

/**
 * Formats a booking modification message
 * 
 * @param clientName - Name of the client
 * @param oldDate - Previous booking date
 * @param oldTime - Previous booking time in HH:mm format
 * @param newDate - New booking date
 * @param newTime - New booking time in HH:mm format
 * @returns Formatted WhatsApp message
 */
export function formatBookingModificationMessage(
  clientName: string,
  oldDate: Date,
  oldTime: string,
  newDate: Date,
  newTime: string
) {
  const formattedOldDate = oldDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  
  const formattedNewDate = newDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `🔄 Appuntamento modificato\n\nCiao ${clientName},\n\nIl tuo appuntamento è stato modificato:\n\n❌ Precedente:\n📅 ${formattedOldDate}\n🕐 ${oldTime}\n\n✅ Nuovo:\n📅 ${formattedNewDate}\n🕐 ${newTime}\n\nTi aspettiamo allo studio Hugemass! 💪`
}

/**
 * Formats a booking cancellation message
 * 
 * @param clientName - Name of the client
 * @param date - Booking date
 * @param time - Booking time in HH:mm format
 * @returns Formatted WhatsApp message
 */
export function formatBookingCancellationMessage(
  clientName: string,
  date: Date,
  time: string
) {
  const formattedDate = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `❌ Appuntamento disdetto\n\nCiao ${clientName},\n\nIl tuo appuntamento è stato disdetto:\n📅 ${formattedDate}\n🕐 ${time}\n\nLa sessione è stata restituita al tuo pacchetto.\n\nPer prenotare un nuovo appuntamento, accedi alla tua area riservata.`
}
