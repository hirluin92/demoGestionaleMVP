import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteCalendarEvent, updateCalendarEvent, createCalendarEvent } from '@/lib/google-calendar'
import { sendWhatsAppMessage, formatBookingModificationMessage, formatBookingCancellationMessage } from '@/lib/whatsapp'
import { isTwilioError } from '@/lib/errors'
import { z } from 'zod'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

const updateBookingSchema = z.object({
  date: z.string()
    .refine((dateStr) => {
      const bookingDate = new Date(dateStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return bookingDate >= today && !isNaN(bookingDate.getTime())
    }, 'Data non valida o nel passato'),
  time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido')
    .refine((time) => {
      const [hours] = time.split(':').map(Number)
      return hours >= 8 && hours < 20
    }, 'Orario non valido (8:00-20:00)'),
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
    if (booking.googleEventId) {
      try {
        await deleteCalendarEvent(booking.googleEventId)
      } catch (error) {
        console.error('⚠️ Errore cancellazione evento Google Calendar:', error)
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
          console.log(`✅ WhatsApp disdetta inviato con successo a ${user.name} (${user.phone})`)
        } catch (error) {
          if (isTwilioError(error)) {
            console.error(`⚠️ Errore Twilio invio WhatsApp a ${user.name} (${user.phone}):`, error.message)
          } else {
            console.error(`⚠️ Errore generico invio WhatsApp a ${user.name} (${user.phone}):`, error instanceof Error ? error.message : String(error))
          }
          // Continua con gli altri utenti
        }
      }
    } catch (error) {
      console.error('⚠️ Errore invio notifiche WhatsApp disdetta:', error)
      // Non bloccare la risposta - le notifiche non sono critiche
    }

    console.log('✅ Prenotazione disdetta con successo:', params.id)
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Errore disdetta prenotazione:', error)
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
    const { date, time } = validatedData

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

    // STEP 4: Prepara nuove date
    const newBookingDate = new Date(date)
    const [hours, minutes] = time.split(':').map(Number)
    newBookingDate.setHours(hours, minutes, 0, 0)
    const newEndDate = new Date(newBookingDate)
    newEndDate.setMinutes(newEndDate.getMinutes() + (userPackage.package.durationMinutes || 60))

    // STEP 5: Verifica sovrapposizioni (escludendo la prenotazione corrente)
    const startOfDay = new Date(newBookingDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(newBookingDate)
    endOfDay.setHours(23, 59, 59, 999)

    const existingBookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        id: { not: params.id }, // Escludi la prenotazione corrente
      },
      include: {
        package: {
          select: {
            durationMinutes: true,
          },
        },
      },
    })

    const hasOverlap = existingBookings.some(existing => {
      const existingDate = new Date(existing.date)
      const [existingHour, existingMinute] = existing.time.split(':').map(Number)
      
      if (
        existingDate.getFullYear() !== newBookingDate.getFullYear() ||
        existingDate.getMonth() !== newBookingDate.getMonth() ||
        existingDate.getDate() !== newBookingDate.getDate()
      ) {
        return false
      }
      
      const existingStart = new Date(0, 0, 0, existingHour, existingMinute)
      const existingEnd = new Date(existingStart)
      existingEnd.setMinutes(existingEnd.getMinutes() + (existing.package.durationMinutes || 60))
      
      const newStart = new Date(0, 0, 0, hours, minutes)
      const newEnd = new Date(newStart)
      newEnd.setMinutes(newEnd.getMinutes() + (userPackage.package.durationMinutes || 60))
      
      return newStart.getTime() < existingEnd.getTime() && newEnd.getTime() > existingStart.getTime()
    })

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Questo orario si sovrappone con una prenotazione esistente' },
        { status: 400 }
      )
    }

    // STEP 6: Transazione atomica - aggiorna solo data e ora
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Aggiorna solo data e ora (cliente e pacchetto rimangono invariati)
      const updated = await tx.booking.update({
        where: { id: params.id },
        data: {
          date: newBookingDate,
          time,
        },
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
        console.log('✅ Evento Google Calendar aggiornato:', updatedBooking.googleEventId)
      } catch (error) {
        console.error('⚠️ Errore aggiornamento evento Google Calendar:', error)
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
          console.log('✅ Nuovo evento Google Calendar creato:', eventId)
        }
      } catch (error) {
        console.error('⚠️ Errore creazione evento Google Calendar:', error)
        // Continua comunque
      }
    }

    // STEP 9: Invia notifiche WhatsApp (fuori transazione - non critico)
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
            time
          )

          await sendWhatsAppMessage(user.phone, message)
          console.log(`✅ WhatsApp modifica inviato con successo a ${user.name} (${user.phone})`)
        } catch (error) {
          if (isTwilioError(error)) {
            console.error(`⚠️ Errore Twilio invio WhatsApp a ${user.name} (${user.phone}):`, error.message)
          } else {
            console.error(`⚠️ Errore generico invio WhatsApp a ${user.name} (${user.phone}):`, error instanceof Error ? error.message : String(error))
          }
          // Continua con gli altri utenti
        }
      }
    } catch (error) {
      console.error('⚠️ Errore invio notifiche WhatsApp modifica:', error)
      // Non bloccare la risposta - le notifiche non sono critiche
    }

    console.log('✅ Prenotazione modificata con successo:', params.id)
    return NextResponse.json(updatedBooking)
    
  } catch (error) {
    console.error('Errore modifica prenotazione:', error)
    
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
