import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { logger, sanitizeError } from '@/lib/logger'
import { sendWhatsAppMessage, formatFreeSlotNotificationMessage } from '@/lib/whatsapp'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

// DELETE - Cancella prenotazione
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // STEP 1: Prendi booking info PRIMA della transazione
    // Per pacchetti multipli, qualsiasi atleta del pacchetto può cancellare
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        status: 'CONFIRMED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        package: {
          include: {
            userPackages: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      )
    }

    // Verifica che l'utente corrente sia uno degli atleti del pacchetto
    const isUserInPackage = booking.package.userPackages.some(
      up => up.userId === session.user.id
    )

    if (!isUserInPackage) {
      return NextResponse.json(
        { error: 'Non autorizzato a cancellare questa prenotazione' },
        { status: 403 }
      )
    }

    // Verifica che la cancellazione avvenga almeno 3 ore prima dell'appuntamento
    const bookingDateTime = new Date(booking.date)
    const [hours, minutes] = booking.time.split(':').map(Number)
    bookingDateTime.setHours(hours, minutes, 0, 0)
    
    const now = new Date()
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilBooking < 3) {
      return NextResponse.json(
        { error: 'Non è possibile cancellare un appuntamento con meno di 3 ore di anticipo' },
        { status: 400 }
      )
    }

    // STEP 2: Cancella Google Calendar event PRIMA della transazione
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

    // STEP 4: Notifica WhatsApp a tutti gli altri atleti del pacchetto multiplo (se applicabile)
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
          },
        },
      },
    })

    const isMultiplePackage = allUserPackages.length > 1

    const bookingDate = new Date(booking.date)
    const formattedDate = bookingDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    if (isMultiplePackage) {
      // Invia notifica a tutti gli altri atleti (escluso quello che ha disdetto)
      const otherAthletes = allUserPackages
        .filter(up => up.userId !== booking.userId && up.user.phone)
        .map(up => up.user)

      for (const athlete of otherAthletes) {
        try {
          const message = `📢 Notifica Disdetta\n\nCiao ${athlete.name},\n\n${booking.user.name} ha disdetto l'appuntamento:\n📅 ${formattedDate}\n🕐 ${booking.time}\n\nLa sessione è stata restituita al pacchetto condiviso.`
          await sendWhatsAppMessage(athlete.phone!, message)
          logger.info('WhatsApp notifica disdetta inviata', { 
            to: athlete.name, 
            userId: athlete.id 
          })
        } catch (error) {
          logger.error('Errore invio WhatsApp notifica disdetta', {
            userId: athlete.id,
            error: sanitizeError(error),
          })
          // Continua con gli altri atleti anche se uno fallisce
        }
      }
    }

    // STEP 5: Notifica l'admin della disdetta
    try {
      const admin = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      })

      if (admin && admin.phone) {
        const adminMessage = `📢 Disdetta Appuntamento\n\n${booking.user.name} ha disdetto l'appuntamento:\n📅 ${formattedDate}\n🕐 ${booking.time}\n\nPacchetto: ${booking.package.name}`
        await sendWhatsAppMessage(admin.phone, adminMessage)
        logger.info('WhatsApp notifica disdetta inviata all\'admin', { 
          adminId: admin.id 
        })
      } else {
        logger.warn('Admin non trovato o senza telefono per notifica disdetta')
      }
    } catch (error) {
      logger.error('Errore invio WhatsApp notifica disdetta all\'admin', {
        error: sanitizeError(error),
      })
      // Non bloccare - la notifica all'admin non è critica
    }

    // STEP 6: Notifica tutti i clienti con appuntamenti successivi nello stesso giorno
    try {
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

    logger.info('Prenotazione cancellata con successo', { bookingId: params.id })
    return NextResponse.json({ success: true })
    
  } catch (error) {
    logger.error('Errore cancellazione prenotazione', { 
      bookingId: params.id,
      error: sanitizeError(error) 
    })
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Errore nella cancellazione della prenotazione' 
      },
      { status: 500 }
    )
  }
}
