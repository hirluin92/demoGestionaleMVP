import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')

    const where: any = {
      status: { not: 'CANCELLED' },
    }

    if (userId) {
      // Per pacchetti multipli, dobbiamo includere anche gli appuntamenti degli altri atleti
      // che condividono lo stesso pacchetto
      
      // Trova tutti i pacchetti a cui l'utente è associato
      const userPackages = await prisma.userPackage.findMany({
        where: { userId },
        select: { packageId: true },
      })

      const packageIds = userPackages.map(up => up.packageId)

      if (packageIds.length > 0) {
        // Trova tutti gli utenti associati a questi pacchetti (per pacchetti multipli)
        const relatedUserPackages = await prisma.userPackage.findMany({
          where: { packageId: { in: packageIds } },
          select: { userId: true },
        })

        const relatedUserIds = Array.from(new Set(relatedUserPackages.map(rup => rup.userId)))

        // Include appuntamenti dell'utente E degli altri atleti che condividono i pacchetti
        where.userId = { in: relatedUserIds }
        where.packageId = { in: packageIds } // Assicura che siano dello stesso pacchetto
      } else {
        // Se l'utente non ha pacchetti, mostra solo i suoi appuntamenti
        where.userId = userId
      }
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            userPackages: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Aggiungi informazioni sugli altri atleti per pacchetti multipli
    const bookingsWithAthletes = bookings.map(booking => {
      const isMultiplePackage = booking.package.userPackages.length > 1
      const allAthletes = booking.package.userPackages.map(up => ({
        id: up.user.id,
        name: up.user.name,
        email: up.user.email,
        phone: up.user.phone,
      }))

      return {
        ...booking,
        package: {
          ...booking.package,
          isMultiple: isMultiplePackage,
          athletes: isMultiplePackage ? allAthletes : undefined,
        },
      }
    })

    return NextResponse.json(bookingsWithAthletes)
  } catch (error) {
    logger.error('Errore recupero prenotazioni admin', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// POST - Crea prenotazione per un cliente (solo admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, packageId, date, time } = body

    // Validazione input
    if (!userId || !packageId || !date || !time) {
      return NextResponse.json(
        { error: 'Tutti i campi sono obbligatori' },
        { status: 400 }
      )
    }

    // Verifica che l'utente esista
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Cliente non trovato' },
        { status: 404 }
      )
    }

    // Verifica che il pacchetto esista e sia attivo per questo utente
    const userPackage = await prisma.userPackage.findFirst({
      where: {
        packageId,
        userId,
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
        { error: 'Pacchetto non trovato o non attivo per questo cliente' },
        { status: 404 }
      )
    }

    const packageData = userPackage.package

    // Prepara date usando la durata del package
    const bookingDate = new Date(date)
    const [hours, minutes] = time.split(':').map(Number)
    bookingDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(bookingDate)
    endDate.setMinutes(endDate.getMinutes() + (packageData.durationMinutes || 60))

    // Verifica se è un pacchetto multiplo
    const allUserPackagesForPackage = await prisma.userPackage.findMany({
      where: {
        packageId,
      },
    })

    const isMultiplePackage = allUserPackagesForPackage.length > 1

    // Per pacchetti multipli, verifica che TUTTI gli atleti abbiano sessioni disponibili
    if (isMultiplePackage) {
      for (const up of allUserPackagesForPackage) {
        const remaining = packageData.totalSessions - up.usedSessions
        if (remaining <= 0) {
          return NextResponse.json(
            { error: 'Uno o più atleti del pacchetto non hanno sessioni disponibili' },
            { status: 400 }
          )
        }
      }
    } else {
      // Per pacchetti singoli, verifica solo l'utente
      const remainingSessions = packageData.totalSessions - userPackage.usedSessions
      if (remainingSessions <= 0) {
        return NextResponse.json(
          { error: 'Nessuna sessione disponibile per questo pacchetto' },
          { status: 400 }
        )
      }
    }

    // Verifica sovrapposizioni con prenotazioni esistenti
    const startOfDay = new Date(bookingDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(bookingDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    const existingBookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
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

    // Verifica sovrapposizioni
    // REGOLA SPECIALE: L'admin può prenotare 2 lezioni di pacchetti singoli diversi alla stessa ora
    const overlappingBookings = existingBookings.filter(existing => {
      const existingDate = new Date(existing.date)
      const [existingHour, existingMinute] = existing.time.split(':').map(Number)
      
      // Verifica che sia lo stesso giorno
      if (
        existingDate.getFullYear() !== bookingDate.getFullYear() ||
        existingDate.getMonth() !== bookingDate.getMonth() ||
        existingDate.getDate() !== bookingDate.getDate()
      ) {
        return false
      }
      
      const existingStart = new Date(0, 0, 0, existingHour, existingMinute)
      const existingEnd = new Date(existingStart)
      existingEnd.setMinutes(existingEnd.getMinutes() + (existing.package.durationMinutes || 60))
      
      const newStart = new Date(0, 0, 0, hours, minutes)
      const newEnd = new Date(newStart)
      newEnd.setMinutes(newEnd.getMinutes() + (packageData.durationMinutes || 60))
      
      // Due prenotazioni si sovrappongono se:
      // newStart < existingEnd AND newEnd > existingStart
      return newStart.getTime() < existingEnd.getTime() && newEnd.getTime() > existingStart.getTime()
    })

    // Se ci sono sovrapposizioni, verifica se sono tutte di pacchetti singoli diversi
    if (overlappingBookings.length > 0) {
      // Verifica se la nuova prenotazione è per un pacchetto singolo
      const isNewBookingSingle = !isMultiplePackage
      
      // Separa le sovrapposizioni per tipo
      const multiplePackageOverlaps = overlappingBookings.filter(existing => {
        return existing.package.userPackages.length > 1
      })
      
      const samePackageOverlaps = overlappingBookings.filter(existing => {
        const existingIsMultiple = existing.package.userPackages.length > 1
        const isSamePackage = existing.package.id === packageId
        return !existingIsMultiple && isSamePackage
      })
      
      const differentSinglePackageOverlaps = overlappingBookings.filter(existing => {
        const existingIsMultiple = existing.package.userPackages.length > 1
        const isDifferentPackage = existing.package.id !== packageId
        return !existingIsMultiple && isDifferentPackage
      })

      // Se la nuova prenotazione è per un pacchetto singolo
      if (isNewBookingSingle) {
        // NON permettere se ci sono pacchetti multipli sovrapposti
        if (multiplePackageOverlaps.length > 0) {
          return NextResponse.json(
            { error: 'Questo orario si sovrappone con una prenotazione di pacchetto multiplo' },
            { status: 409 }
          )
        }
        
        // NON permettere se ci sono pacchetti singoli dello stesso pacchetto sovrapposti
        if (samePackageOverlaps.length > 0) {
          return NextResponse.json(
            { error: 'Questo orario si sovrappone con una prenotazione dello stesso pacchetto' },
            { status: 409 }
          )
        }
        
        // Permettere fino a 2 pacchetti singoli di pacchetti diversi
        if (differentSinglePackageOverlaps.length >= 2) {
          return NextResponse.json(
            { error: 'Questo orario è già occupato da 2 prenotazioni di pacchetti singoli diversi' },
            { status: 409 }
          )
        }
        
        // Se c'è 0 o 1 pacchetto singolo di pacchetti diversi, permettere
        // (sarà la prima o la seconda prenotazione di pacchetti singoli diversi)
      } else {
        // Per pacchetti multipli, non permettere sovrapposizioni
        return NextResponse.json(
          { error: 'Questo orario si sovrappone con una prenotazione esistente' },
          { status: 409 }
        )
      }
    }

    // Crea Google Calendar event (opzionale)
    let googleEventId: string | null = null
    try {
      const { createCalendarEvent } = await import('@/lib/google-calendar')
      const eventId = await createCalendarEvent(
        `Sessione ${user.name}`,
        `Prenotazione Hugemass - Pacchetto: ${packageData.name}`,
        bookingDate,
        endDate
      )
      googleEventId = eventId
      logger.info('Evento Google Calendar creato', { eventId: googleEventId })
    } catch (error) {
      logger.warn('Errore creazione evento Google Calendar (continua senza)', { error: sanitizeError(error) })
    }

    // Transazione atomica per DB (booking + package update)
    const booking = await prisma.$transaction(async (tx) => {
      // Ricontrolla sessioni disponibili (dentro transazione per evitare race)
      const userPkg = await tx.userPackage.findFirst({
        where: {
          packageId,
          userId,
        },
        include: {
          package: {
            select: { totalSessions: true, isActive: true },
          },
        },
      })

      if (!userPkg || !userPkg.package.isActive) {
        throw new Error('Pacchetto non più valido')
      }

      // Verifica se è un pacchetto multiplo
      const allUserPackages = await tx.userPackage.findMany({
        where: {
          packageId,
        },
      })

      const isMultiplePackage = allUserPackages.length > 1

      // Per pacchetti multipli, verifica che TUTTI gli atleti abbiano sessioni disponibili
      if (isMultiplePackage) {
        for (const up of allUserPackages) {
          if ((userPkg.package.totalSessions - up.usedSessions) <= 0) {
            throw new Error('Uno o più atleti del pacchetto non hanno sessioni disponibili')
          }
        }
      } else {
        // Per pacchetti singoli, verifica solo l'utente
        if ((userPkg.package.totalSessions - userPkg.usedSessions) <= 0) {
          throw new Error('Sessioni terminate durante l\'elaborazione')
        }
      }

      // Crea booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          packageId,
          date: bookingDate,
          time,
          googleEventId,
          status: 'CONFIRMED',
        },
      })

      // Scala sessione: per pacchetti multipli scala a TUTTI gli atleti, altrimenti solo all'utente
      if (isMultiplePackage) {
        // Scala la sessione a tutti gli atleti del pacchetto multiplo
        await tx.userPackage.updateMany({
          where: {
            packageId,
          },
          data: {
            usedSessions: {
              increment: 1,
            },
          },
        })
      } else {
        // Scala solo all'utente corrente per pacchetti singoli
        await tx.userPackage.update({
          where: { id: userPkg.id },
          data: {
            usedSessions: {
              increment: 1,
            },
          },
        })
      }

      return newBooking
    })

    // WhatsApp (opzionale - fuori transazione)
    if (user.phone) {
      try {
        const { sendWhatsAppMessage, formatBookingConfirmationMessage } = await import('@/lib/whatsapp')
        await sendWhatsAppMessage(
          user.phone,
          formatBookingConfirmationMessage(user.name, bookingDate, time)
        )
        logger.info('WhatsApp inviato con successo', { userName: user.name, userId: user.id })
      } catch (error) {
        logger.warn('Errore invio WhatsApp (continua senza)', { error: sanitizeError(error) })
      }
    }

    return NextResponse.json(booking, { status: 201 })
    
  } catch (error: any) {
    logger.error('Errore creazione prenotazione admin', { error: sanitizeError(error) })
    
    if (error.message) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Errore nella creazione della prenotazione' },
      { status: 500 }
    )
  }
}
