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
 * Updates an event in Google Calendar
 * 
 * @param eventId - Google Calendar event ID
 * @param summary - Event title
 * @param description - Event description
 * @param startDateTime - Event start time
 * @param endDateTime - Event end time
 * @throws {GoogleCalendarError} If update fails
 */
export async function updateCalendarEvent(
  eventId: string,
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

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  })
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
 * @param options - Optional parameters for admin special rules
 * @param options.isAdmin - Whether the user is an admin
 * @param options.packageId - Package ID being booked (for admin special rule)
 * @param options.isMultiplePackage - Whether the package is a multiple package
 * @returns Array of available time slots in HH:mm format
 */
export async function getAvailableSlots(
  date: Date,
  options?: {
    isAdmin?: boolean
    packageId?: string
    isMultiplePackage?: boolean
  }
) {
  const { prisma } = await import('./prisma')
  
  // Genera tutti gli slot possibili con griglia uniforme da 30 minuti:
  // - Dalle 06:00 alle 21:30: ogni 30 minuti (06:00, 06:30, 07:00, 07:30...)
  // - Esclude la pausa pranzo (14:00-15:30)
  const allSlots: string[] = []
  const DAY_START_MIN = 6 * 60       // 06:00
  const DAY_END_MIN = 21 * 60 + 30   // 21:30 (ultimo slot prenotabile)
  const LUNCH_START_MIN = 14 * 60    // 14:00
  const LUNCH_END_MIN = 15 * 60 + 30 // 15:30
  const SLOT_MINUTES = 30
  
  for (let min = DAY_START_MIN; min <= DAY_END_MIN; min += SLOT_MINUTES) {
    // Salta la pausa pranzo
    if (min >= LUNCH_START_MIN && min < LUNCH_END_MIN) continue
    const h = Math.floor(min / 60)
    const m = min % 60
    allSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  // STEP 1: Controlla prenotazioni nel database (fonte di verità principale)
  // Normalizza la data per il confronto (solo giorno, senza orario)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  // Query per trovare tutte le prenotazioni confermate per quella data con durata
  // Per la regola speciale admin, abbiamo bisogno anche di sapere se i pacchetti sono multipli
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
          id: true,
          userPackages: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  })

  // Calcola slot occupati considerando la durata di ogni prenotazione
  // Ora gli slot sono ogni ora, quindi una prenotazione occupa lo slot se inizia a quell'ora
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
      const slotTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
      // Aggiungi lo slot di inizio della prenotazione
      occupiedSlotsSet.add(slotTime)
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

  // Filtra slot disponibili considerando sovrapposizioni
  // Per ogni slot, verifica se può essere prenotato senza sovrapporsi con prenotazioni esistenti
  // Assumiamo una durata standard di 60 minuti per verificare disponibilità
  // (la durata effettiva sarà verificata al momento della prenotazione)
  const defaultDurationMinutes = 60
  const isAdmin = options?.isAdmin ?? false
  const packageId = options?.packageId
  const isMultiplePackage = options?.isMultiplePackage ?? false
  
  let availableSlots = allSlots.filter(slot => {
    const [slotHour, slotMinute] = slot.split(':').map(Number)
    
    // Calcola orario di fine per questo slot (assumendo durata standard)
    const slotStart = new Date(0, 0, 0, slotHour, slotMinute)
    const slotEnd = new Date(slotStart)
    slotEnd.setMinutes(slotEnd.getMinutes() + defaultDurationMinutes)
    
    // Trova tutte le prenotazioni che si sovrappongono con questo slot
    const overlappingBookings = dbBookings.filter(booking => {
      const bookingDate = new Date(booking.date)
      const selectedDate = new Date(date)
      
      // Verifica che sia lo stesso giorno
      if (
        bookingDate.getFullYear() !== selectedDate.getFullYear() ||
        bookingDate.getMonth() !== selectedDate.getMonth() ||
        bookingDate.getDate() !== selectedDate.getDate()
      ) {
        return false
      }
      
      const [bookingHour, bookingMinute] = booking.time.split(':').map(Number)
      const bookingStart = new Date(0, 0, 0, bookingHour, bookingMinute)
      const bookingEnd = new Date(bookingStart)
      bookingEnd.setMinutes(bookingEnd.getMinutes() + (booking.package.durationMinutes || 60))
      
      // Due prenotazioni si sovrappongono se:
      // slotStart < bookingEnd AND slotEnd > bookingStart
      return slotStart.getTime() < bookingEnd.getTime() && slotEnd.getTime() > bookingStart.getTime()
    })
    
    // Se non ci sono sovrapposizioni, lo slot è disponibile
    if (overlappingBookings.length === 0) {
      const isLunchBreak = (slotHour === 14 && slotMinute === 0) || 
                          (slotHour === 14 && slotMinute === 30) ||
                          (slotHour === 15 && slotMinute === 0)
      return !isLunchBreak && !allOccupiedSlots.includes(slot)
    }
    
    // Se ci sono sovrapposizioni, applica la regola speciale per admin
    if (isAdmin) {
      // REGOLA SPECIALE: Admin può prenotare 2 pacchetti singoli diversi alla stessa ora
      const multiplePackageOverlaps = overlappingBookings.filter(booking => {
        return booking.package.userPackages.length > 1
      })
      
      // NON permettere se ci sono pacchetti multipli sovrapposti
      if (multiplePackageOverlaps.length > 0) {
        return false
      }
      
      // Se abbiamo il packageId, possiamo fare controlli più specifici
      if (packageId) {
        const samePackageOverlaps = overlappingBookings.filter(booking => {
          const bookingIsMultiple = booking.package.userPackages.length > 1
          const isSamePackage = booking.package.id === packageId
          return !bookingIsMultiple && isSamePackage
        })
        
        const differentSinglePackageOverlaps = overlappingBookings.filter(booking => {
          const bookingIsMultiple = booking.package.userPackages.length > 1
          const isDifferentPackage = booking.package.id !== packageId
          return !bookingIsMultiple && isDifferentPackage
        })
        
        // NON permettere se ci sono pacchetti singoli dello stesso pacchetto sovrapposti
        if (samePackageOverlaps.length > 0) {
          return false
        }
        
        // Se il pacchetto selezionato è multiplo, non permettere sovrapposizioni
        if (isMultiplePackage) {
          return false
        }
        
        // Permettere fino a 2 pacchetti singoli di pacchetti diversi
        if (differentSinglePackageOverlaps.length >= 2) {
          return false
        }
        
        // Se c'è 0 o 1 pacchetto singolo di pacchetti diversi, permettere
        // NON controllare allOccupiedSlots qui perché la regola speciale dell'admin
        // permette sovrapposizioni di pacchetti singoli diversi
        const isLunchBreak = (slotHour === 14 && slotMinute === 0) || 
                            (slotHour === 14 && slotMinute === 30) ||
                            (slotHour === 15 && slotMinute === 0)
        return !isLunchBreak
      } else {
        // Se non abbiamo il packageId, assumiamo che potrebbe essere un pacchetto singolo
        // e permettiamo fino a 1 prenotazione di pacchetto singolo sovrapposta
        const singlePackageOverlaps = overlappingBookings.filter(booking => {
          return booking.package.userPackages.length === 1
        })
        
        // Permettere fino a 1 pacchetto singolo sovrapposto (l'admin può aggiungerne un altro)
        if (singlePackageOverlaps.length > 1) {
          return false
        }
        
        // Se c'è 0 o 1 pacchetto singolo sovrapposto, permettere
        // NON controllare allOccupiedSlots qui perché la regola speciale dell'admin
        // permette sovrapposizioni di pacchetti singoli diversi
        const isLunchBreak = (slotHour === 14 && slotMinute === 0) || 
                            (slotHour === 14 && slotMinute === 30) ||
                            (slotHour === 15 && slotMinute === 0)
        return !isLunchBreak
      }
    }
    
    // Per utenti normali o pacchetti multipli, non permettere sovrapposizioni
    const isLunchBreak = (slotHour === 14 && slotMinute === 0) || 
                        (slotHour === 14 && slotMinute === 30) ||
                        (slotHour === 15 && slotMinute === 0)
    return !isLunchBreak && !allOccupiedSlots.includes(slot)
  })

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
