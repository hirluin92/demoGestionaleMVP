/**
 * Google Calendar API integration
 * 
 * @module lib/google-calendar
 */

import { google } from 'googleapis'
import { prisma } from './prisma'
import { env } from './env'
import { isGoogleCalendarError } from './errors'
import { APP_CONFIG } from './config'

/**
 * Gets an authenticated Google Calendar client
 * 
 * Automatically refreshes expired tokens (with 5-minute buffer).
 * 
 * @returns Authenticated Google Calendar API client
 * @throws {Error} If Google Calendar is not configured
 * @throws {Error} If token refresh fails
 */
export async function getGoogleCalendarClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Calendar non configurato. Contatta l\'amministratore.')
  }

  const calendarConfig = await prisma.googleCalendar.findFirst()
  
  if (!calendarConfig) {
    throw new Error('Google Calendar non configurato. Contatta l\'amministratore.')
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: calendarConfig.accessToken,
    refresh_token: calendarConfig.refreshToken,
    expiry_date: calendarConfig.expiresAt.getTime(),
  })

  // Refresh token se scade tra meno di 5 minuti
  const now = new Date()
  const bufferMinutes = 5
  const expiryWithBuffer = new Date(calendarConfig.expiresAt.getTime() - bufferMinutes * 60 * 1000)
  
  if (now >= expiryWithBuffer) {
    console.log('🔄 Token Google Calendar in scadenza, refresh in corso...')
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token) {
        throw new Error('Refresh token non ha restituito access_token')
      }

      // Calcola nuovo expiry (default 1 ora)
      const newExpiryDate = credentials.expiry_date 
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000)

      // Aggiorna nel database
      await prisma.googleCalendar.update({
        where: { id: calendarConfig.id },
        data: {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || calendarConfig.refreshToken,
          expiresAt: newExpiryDate,
        }
      })

      oauth2Client.setCredentials(credentials)
      console.log('✅ Token Google Calendar rinnovato con successo')
      
    } catch (error) {
      console.error('❌ Errore refresh token Google Calendar:', error)
      
      // Se il refresh token è scaduto/revocato, lancia un errore specifico
      if (isGoogleCalendarError(error) && error.response?.data?.error === 'invalid_grant') {
        throw new Error('Token Google Calendar scaduto o revocato. Riconfigura Google Calendar dall\'area admin.')
      }
      
      throw new Error('Impossibile rinnovare il token Google Calendar. Contatta l\'amministratore.')
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Creates a new event in Google Calendar
 * 
 * @param summary - Event title
 * @param description - Event description
 * @param startDateTime - Event start time
 * @param endDateTime - Event end time
 * @returns Google Calendar event ID or null if creation fails
 * @throws {GoogleCalendarError} If event creation fails
 * @example
 * ```typescript
 * const eventId = await createCalendarEvent(
 *   'Training Session',
 *   'Personal training with John',
 *   new Date('2026-12-25T10:00:00'),
 *   new Date('2026-12-25T11:00:00')
 * )
 * ```
 */
export async function createCalendarEvent(
  summary: string,
  description: string,
  startDateTime: Date,
  endDateTime: Date
) {
  const calendar = await getGoogleCalendarClient()
  const calendarId = env.GOOGLE_CALENDAR_ID

  const event = {
    summary,
    description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: APP_CONFIG.timezone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: APP_CONFIG.timezone,
    },
  }

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  })

  return response.data.id || null
}

/**
 * Deletes an event from Google Calendar
 * 
 * @param eventId - Google Calendar event ID
 * @throws {GoogleCalendarError} If deletion fails
 */
export async function deleteCalendarEvent(eventId: string) {
  const calendar = await getGoogleCalendarClient()
  const calendarId = env.GOOGLE_CALENDAR_ID

  await calendar.events.delete({
    calendarId,
    eventId,
  })
}

/**
 * Retrieves an event from Google Calendar
 * 
 * @param eventId - Google Calendar event ID
 * @returns Event data or null if not found
 * @throws {GoogleCalendarError} If retrieval fails (except 404)
 */
export async function getCalendarEvent(eventId: string) {
  const calendar = await getGoogleCalendarClient()
  const calendarId = env.GOOGLE_CALENDAR_ID

  try {
    const response = await calendar.events.get({
      calendarId,
      eventId,
    })
    return response.data
  } catch (error) {
    if (isGoogleCalendarError(error) && error.code === 404) {
      return null // Evento non trovato
    }
    throw error
  }
}

/**
 * Checks if a Google Calendar event exists
 * 
 * @param eventId - Google Calendar event ID
 * @returns True if event exists, false otherwise
 */
export async function checkEventExists(eventId: string): Promise<boolean> {
  try {
    const event = await getCalendarEvent(eventId)
    return event !== null
  } catch (error) {
    console.error('Errore verifica evento Google Calendar:', error)
    return false
  }
}

/**
 * Gets available time slots for a given date
 * 
 * @param date - Date to check availability
 * @returns Array of available time slots in HH:mm format
 */
export async function getAvailableSlots(date: Date) {
  const { prisma } = await import('./prisma')
  
  // Genera tutti gli slot possibili (ogni 30 minuti dalle 8:00 alle 20:00)
  const allSlots: string[] = []
  for (let hour = 8; hour < 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
    }
  }

  // STEP 1: Controlla prenotazioni nel database (fonte di verità principale)
  // Normalizza la data per il confronto (solo giorno, senza orario)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  // Query per trovare tutte le prenotazioni confermate per quella data con durata
  const dbBookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      time: true,
      date: true,
      package: {
        select: {
          durationMinutes: true,
        },
      },
    },
  })

  // Calcola slot occupati considerando la durata di ogni prenotazione
  const occupiedSlotsSet = new Set<string>()
  
  dbBookings
    .filter(booking => {
      const bookingDate = new Date(booking.date)
      const selectedDate = new Date(date)
      return (
        bookingDate.getFullYear() === selectedDate.getFullYear() &&
        bookingDate.getMonth() === selectedDate.getMonth() &&
        bookingDate.getDate() === selectedDate.getDate()
      )
    })
    .forEach(booking => {
      const [startHour, startMinute] = booking.time.split(':').map(Number)
      const durationMinutes = booking.package.durationMinutes || 60 // Default 60 minuti
      
      // Calcola tutti gli slot occupati da questa prenotazione
      // Una prenotazione che inizia alle 10:00 e dura 60 minuti occupa 10:00 e 10:30 (non 11:00)
      let currentMinute = startMinute
      let currentHour = startHour
      const endTime = new Date(0, 0, 0, startHour, startMinute)
      endTime.setMinutes(endTime.getMinutes() + durationMinutes)
      const endHour = endTime.getHours()
      const endMinute = endTime.getMinutes()
      
      // Aggiungi slot ogni 30 minuti dalla start alla end (esclusa la fine)
      while (
        currentHour < endHour || 
        (currentHour === endHour && currentMinute < endMinute)
      ) {
        const slotTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
        occupiedSlotsSet.add(slotTime)
        
        // Avanza di 30 minuti
        currentMinute += 30
        if (currentMinute >= 60) {
          currentMinute = 0
          currentHour += 1
        }
      }
    })
  
  const occupiedSlotsFromDB = Array.from(occupiedSlotsSet)

  // STEP 2: Opzionalmente controlla Google Calendar (se disponibile)
  let occupiedSlotsFromCalendar: string[] = []
  try {
    if (!env.GOOGLE_CLIENT_ID) {
      // Google Calendar non configurato, skip
      return allSlots.filter(slot => !occupiedSlotsFromDB.includes(slot))
    }
    const calendar = await getGoogleCalendarClient()
    const calendarId = env.GOOGLE_CALENDAR_ID

    const response = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const busySlots = response.data.items || []
    
    occupiedSlotsFromCalendar = busySlots
      .filter(event => event.start?.dateTime)
      .map(event => {
        const start = new Date(event.start!.dateTime!)
        // Converti in formato HH:mm
        return `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`
      })
  } catch (error) {
    // Se Google Calendar fallisce, usa solo il database
    console.warn('⚠️ Impossibile recuperare eventi da Google Calendar, uso solo database:', error)
  }

  // Combina slot occupati da database e Google Calendar
  const allOccupiedSlots = [...new Set([...occupiedSlotsFromDB, ...occupiedSlotsFromCalendar])]

  // Filtra slot disponibili (non occupati)
  let availableSlots = allSlots.filter(slot => !allOccupiedSlots.includes(slot))

  // Se la data è oggi, filtra anche gli orari passati
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const selectedDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (selectedDateOnly.getTime() === today.getTime()) {
    // È oggi: filtra gli orari passati
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    availableSlots = availableSlots.filter(slot => {
      const [slotHour, slotMinute] = slot.split(':').map(Number)
      
      // Se l'ora dello slot è passata, escludilo
      if (slotHour < currentHour) {
        return false
      }
      
      // Se l'ora è la stessa, controlla i minuti
      if (slotHour === currentHour && slotMinute <= currentMinute) {
        return false
      }
      
      return true
    })
  }

  return availableSlots
}
