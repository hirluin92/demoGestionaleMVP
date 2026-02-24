import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteCalendarEvent, updateCalendarEvent, createCalendarEvent } from '@/lib/google-calendar'
import { sendWhatsAppMessage, formatBookingModificationMessage, formatBookingCancellationMessage, formatFreeSlotNotificationMessage } from '@/lib/whatsapp'
import { isTwilioError } from '@/lib/errors'
import { logger, sanitizeError } from '@/lib/logger'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

const updateBookingSchema = z.object({
  date: z.string()
    .refine((dateStr) => {
      const bookingDate = new Date(dateStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return bookingDate >= today && !isNaN(bookingDate.getTime())
    }, 'Data non valida o nel passato')
    .optional(),
  time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido')
    .refine((time) => {
      const [hours, minutes] = time.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes
      // Orario valido: dalle 06:00 alle 21:30, solo slot da 30 minuti (:00 o :30)
      // Esclude la pausa pranzo (14:00-15:30)
      if (totalMinutes < 360 || totalMinutes > 1290) return false
      if (minutes !== 0 && minutes !== 30) return false
      if (totalMinutes >= 840 && totalMinutes < 930) return false // 14:00-15:30
      return true
    }, 'Orario non valido (06:00-21:30, solo :00 o :30, esclusa pausa pranzo 14:00-15:30)')
    .optional(),
  durationMinutes: z.number()
    .int()
    .min(15, 'Durata minima 15 minuti')
    .max(240, 'Durata massima 240 minuti')
    .optional(),
})

// DELETE - Disdici prenotazione (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // STEP 1: Prendi booking info PRIMA della transazione
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        status: 'CONFIRMED',
      },
      include: {
        package: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata o già cancellata' },
        { status: 404 }
      )
    }

    // STEP 2: Cancella Google Calendar event PRIMA della transazione
    // Nota: L'admin può disdire in qualsiasi momento, senza limiti di tempo
    if (booking.googleEventId) {
      try {
        await deleteCalendarEvent(booking.googleEventId)
      } catch (error) {
        logger.warn('Errore cancellazione evento Google Calendar', { 
          bookingId: params.id,
          error: sanitizeError(error) 
        })
        // Continua comunque - meglio cancellare la prenotazione
      }
    }

    // STEP 3: Transazione atomica per DB
    await prisma.$transaction(async (tx) => {
      // Aggiorna prenotazione
      await tx.booking.update({
        where: { id: params.id },
        data: { status: 'CANCELLED' },
      })

      // Verifica se è un pacchetto multiplo
      const allUserPackages = await tx.userPackage.findMany({
        where: {
          packageId: booking.packageId,
        },
      })

      const isMultiplePackage = allUserPackages.length > 1

      // Per pacchetti multipli, reintegra la sessione a TUTTI gli atleti
      // Per pacchetti singoli, reintegra solo all'utente che ha prenotato
      if (isMultiplePackage) {
        await tx.userPackage.updateMany({
          where: {
            packageId: booking.packageId,
          },
          data: {
            usedSessions: {
              decrement: 1,
            },
          },
        })
      } else {
        await tx.userPackage.updateMany({
          where: {
            userId: booking.userId,
            packageId: booking.packageId,
          },
          data: {
            usedSessions: {
              decrement: 1,
            },
          },
        })
      }
    })

    // STEP 4: Invia notifiche WhatsApp (fuori transazione - non critico)
    try {
      // Determina se è un pacchetto multiplo
      const allUserPackages = await prisma.userPackage.findMany({
        where: {
          packageId: booking.packageId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              bookingReminders: true,
            },
          },
        },
      })

      const isMultiplePackage = allUserPackages.length > 1
      const bookingDate = new Date(booking.date)
      const [hours, minutes] = booking.time.split(':').map(Number)
      bookingDate.setHours(hours, minutes, 0, 0)

      // Notifica tutti gli atleti del pacchetto (se multiplo) o solo il cliente (se singolo)
      const usersToNotify = isMultiplePackage 
        ? allUserPackages.map(up => up.user)
        : [await prisma.user.findUnique({
            where: { id: booking.userId },
            select: {
              id: true,
              name: true,
              phone: true,
              bookingReminders: true,
            },
          })].filter(Boolean)

      for (const user of usersToNotify) {
        if (!user || !user.phone || !user.bookingReminders) continue

        try {
          const message = formatBookingCancellationMessage(
            user.name,
            bookingDate,
            booking.time
          )

          await sendWhatsAppMessage(user.phone, message)
          logger.info('WhatsApp disdetta inviato con successo', { userName: user.name, userId: user.id })
        } catch (error) {
          if (isTwilioError(error)) {
            logger.error('Errore Twilio invio WhatsApp disdetta', {
              userName: user.name,
              userId: user.id,
              error: sanitizeError(error),
              twilioCode: error.code,
            })
          } else {
            logger.error('Errore generico invio WhatsApp disdetta', {
              userName: user.name,
              userId: user.id,
              error: sanitizeError(error),
            })
          }
          // Continua con gli altri utenti
        }
      }
    } catch (error) {
      logger.error('Errore invio notifiche WhatsApp disdetta', { 
        bookingId: params.id,
        error: sanitizeError(error) 
      })
      // Non bloccare la risposta - le notifiche non sono critiche
    }

    // STEP 5: Notifica tutti i clienti con appuntamenti successivi nello stesso giorno
    try {
      // Crea bookingDate per formattazione
      const bookingDate = new Date(booking.date)
      const [hours, minutes] = booking.time.split(':').map(Number)
      bookingDate.setHours(hours, minutes, 0, 0)

      // Calcola l'orario della prenotazione disdetta in minuti per il confronto
      const [cancelledHours, cancelledMinutes] = booking.time.split(':').map(Number)
      const cancelledTimeInMinutes = cancelledHours * 60 + cancelledMinutes

      // Cerca tutti gli appuntamenti dello stesso giorno con orario successivo
      const startOfDay = new Date(booking.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(booking.date)
      endOfDay.setHours(23, 59, 59, 999)

      const sameDayBookings = await prisma.booking.findMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'CONFIRMED',
          id: { not: booking.id }, // Escludi quello appena cancellato
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              bookingReminders: true,
            },
          },
          package: {
            include: {
              userPackages: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      })

      // Filtra solo gli appuntamenti con orario successivo
      const laterBookings = sameDayBookings.filter(b => {
        const [hours, minutes] = b.time.split(':').map(Number)
        const bookingTimeInMinutes = hours * 60 + minutes
        return bookingTimeInMinutes > cancelledTimeInMinutes
      })

      // Notifica tutti i clienti con appuntamenti successivi
      for (const laterBooking of laterBookings) {
        // Salta se l'utente non ha il telefono o ha disabilitato i promemoria
        if (!laterBooking.user.phone || !laterBooking.user.bookingReminders) {
          continue
        }

        try {
          const message = formatFreeSlotNotificationMessage(
            laterBooking.user.name,
            bookingDate,
            booking.time,
            laterBooking.time
          )
          await sendWhatsAppMessage(laterBooking.user.phone, message)
          logger.info('WhatsApp notifica slot libero inviata', { 
            to: laterBooking.user.name, 
            userId: laterBooking.user.id,
            freeSlot: booking.time,
            currentBooking: laterBooking.time
          })
        } catch (error) {
          logger.error('Errore invio WhatsApp notifica slot libero', {
            userId: laterBooking.user.id,
            error: sanitizeError(error),
          })
          // Continua con gli altri clienti anche se uno fallisce
        }
      }
    } catch (error) {
      logger.error('Errore ricerca appuntamenti successivi per notifica slot libero', {
        error: sanitizeError(error),
      })
      // Non bloccare - questa notifica non è critica
    }

    logger.info('Prenotazione disdetta con successo', { bookingId: params.id })
    return NextResponse.json({ success: true })
    
  } catch (error) {
    logger.error('Errore disdetta prenotazione', { 
      bookingId: params.id,
      error: sanitizeError(error) 
    })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Modifica prenotazione (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // STEP 1: Valida input
    const body = await request.json()
    const validatedData = updateBookingSchema.parse(body)
    const { date, time, durationMinutes } = validatedData

    // STEP 2: Recupera la prenotazione esistente
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        status: 'CONFIRMED',
      },
      include: {
        package: true,
        user: true,
      },
    })

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      )
    }

    // STEP 3: Usa il pacchetto esistente (non può essere modificato)
    const userPackage = await prisma.userPackage.findFirst({
      where: {
        packageId: existingBooking.packageId,
        userId: existingBooking.userId,
        package: {
          isActive: true,
        },
      },
      include: {
        package: true,
      },
    })

    if (!userPackage) {
      return NextResponse.json(
        { error: 'Pacchetto non trovato o non attivo' },
        { status: 404 }
      )
    }

    // STEP 4: Prepara nuove date (usa quelle esistenti se non specificate)
    const finalDate = date || format(parseISO(existingBooking.date.toISOString()), 'yyyy-MM-dd')
    const finalTime = time || existingBooking.time
    const finalDuration = durationMinutes ?? userPackage.package.durationMinutes ?? 60

    const newBookingDate = new Date(finalDate)
    const [hours, minutes] = finalTime.split(':').map(Number)
    newBookingDate.setHours(hours, minutes, 0, 0)
    const newEndDate = new Date(newBookingDate)
    newEndDate.setMinutes(newEndDate.getMinutes() + finalDuration)

    // STEP 5: Verifica che la data/orario non sia nel passato
    const now = new Date()
    if (newBookingDate < now) {
      return NextResponse.json(
        { error: 'Non è possibile prenotare in una data o orario già passato' },
        { status: 400 }
      )
    }

    // STEP 6: Transazione atomica - aggiorna solo i campi presenti
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Costruisci l'oggetto data solo con i campi presenti
      const updateData: { date?: Date; time?: string; durationMinutes?: number } = {}
      if (date) updateData.date = newBookingDate
      if (time) updateData.time = finalTime
      if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes

      // Aggiorna solo i campi specificati (cliente e pacchetto rimangono invariati)
      const updated = await tx.booking.update({
        where: { id: params.id },
        data: updateData,
        include: {
          user: true,
          package: true,
        },
      })

      return updated
    })

    // STEP 7: Aggiorna Google Calendar event
    if (updatedBooking.googleEventId) {
      try {
        await updateCalendarEvent(
          updatedBooking.googleEventId,
          `Sessione ${updatedBooking.user.name}`,
          `Prenotazione Hugemass - Pacchetto: ${updatedBooking.package.name}`,
          newBookingDate,
          newEndDate
        )
        logger.info('Evento Google Calendar aggiornato', { eventId: updatedBooking.googleEventId })
      } catch (error) {
        logger.warn('Errore aggiornamento evento Google Calendar', { 
          bookingId: params.id,
          error: sanitizeError(error) 
        })
        // Continua comunque - la prenotazione è stata aggiornata
      }
    } else {
      // Se non c'era un evento Google Calendar, creane uno nuovo
      try {
        const eventId = await createCalendarEvent(
          `Sessione ${updatedBooking.user.name}`,
          `Prenotazione Hugemass - Pacchetto: ${updatedBooking.package.name}`,
          newBookingDate,
          newEndDate
        )

        if (eventId) {
          await prisma.booking.update({
            where: { id: params.id },
            data: { googleEventId: eventId },
          })
          logger.info('Nuovo evento Google Calendar creato', { eventId, bookingId: params.id })
        }
      } catch (error) {
        logger.warn('Errore creazione evento Google Calendar', { 
          bookingId: params.id,
          error: sanitizeError(error) 
        })
        // Continua comunque
      }
    }

    // STEP 8: Invia notifiche WhatsApp (fuori transazione - non critico)
    try {
      // Determina se è un pacchetto multiplo
      const allUserPackages = await prisma.userPackage.findMany({
        where: {
          packageId: updatedBooking.packageId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              bookingReminders: true,
            },
          },
        },
      })

      const isMultiplePackage = allUserPackages.length > 1
      const oldBookingDate = new Date(existingBooking.date)
      const [oldHours, oldMinutes] = existingBooking.time.split(':').map(Number)
      oldBookingDate.setHours(oldHours, oldMinutes, 0, 0)

      // Notifica tutti gli atleti del pacchetto (se multiplo) o solo il cliente (se singolo)
      const usersToNotify = isMultiplePackage 
        ? allUserPackages.map(up => up.user)
        : [await prisma.user.findUnique({
            where: { id: updatedBooking.userId },
            select: {
              id: true,
              name: true,
              phone: true,
              bookingReminders: true,
            },
          })].filter(Boolean)

      for (const user of usersToNotify) {
        if (!user || !user.phone || !user.bookingReminders) continue

        try {
          const message = formatBookingModificationMessage(
            user.name,
            oldBookingDate,
            existingBooking.time,
            newBookingDate,
            finalTime
          )

          await sendWhatsAppMessage(user.phone, message)
          logger.info('WhatsApp modifica inviato con successo', { userName: user.name, userId: user.id })
        } catch (error) {
          if (isTwilioError(error)) {
            logger.error('Errore Twilio invio WhatsApp modifica', {
              userName: user.name,
              userId: user.id,
              error: sanitizeError(error),
              twilioCode: error.code,
            })
          } else {
            logger.error('Errore generico invio WhatsApp modifica', {
              userName: user.name,
              userId: user.id,
              error: sanitizeError(error),
            })
          }
          // Continua con gli altri utenti
        }
      }
    } catch (error) {
      logger.error('Errore invio notifiche WhatsApp modifica', { 
        bookingId: params.id,
        error: sanitizeError(error) 
      })
      // Non bloccare la risposta - le notifiche non sono critiche
    }

    logger.info('Prenotazione modificata con successo', { bookingId: params.id })
    return NextResponse.json(updatedBooking)
    
  } catch (error) {
    logger.error('Errore modifica prenotazione', { 
      bookingId: params.id,
      error: sanitizeError(error) 
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Errore nella modifica della prenotazione' 
      },
      { status: 500 }
    )
  }
}
