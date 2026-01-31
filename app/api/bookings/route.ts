import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google-calendar'
import { sendWhatsAppMessage, formatBookingConfirmationMessage } from '@/lib/whatsapp'
import { bookingRateLimiter } from '@/lib/rate-limit'
import { isTwilioError } from '@/lib/errors'
import { handleApiError } from '@/lib/api-response'
import { logger, sanitizeError } from '@/lib/logger'
import { z } from 'zod'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

const bookingSchema = z.object({
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
    
  packageId: z.string().min(1, 'Package ID richiesto'),
}).refine((data) => {
  // Valida che la data + orario combinati non siano nel passato
  const bookingDateTime = new Date(data.date)
  const [hours, minutes] = data.time.split(':').map(Number)
  bookingDateTime.setHours(hours, minutes, 0, 0)
  
  const now = new Date()
  
  // Aggiungi un buffer di 1 minuto per evitare problemi di timing
  const buffer = 60 * 1000 // 1 minuto in millisecondi
  
  return bookingDateTime.getTime() > (now.getTime() + buffer)
}, {
  message: 'Non è possibile prenotare per un orario nel passato',
  path: ['time'], // Mostra l'errore sul campo time
})

// GET - Lista prenotazioni utente
// Per pacchetti multipli, include anche le prenotazioni degli altri atleti
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // STEP 1: Trova tutti i pacchetti dell'utente corrente
    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        package: true,
      },
    })

    // STEP 2: Identifica i pacchetti multipli e raccogli tutti gli userId che li condividono
    const userIdsToInclude = new Set<string>([session.user.id]) // Inizia con l'utente corrente

    for (const userPackage of userPackages) {
      // Se il pacchetto ha più di un userPackage, è un pacchetto multiplo
      const allUserPackages = await prisma.userPackage.findMany({
        where: {
          packageId: userPackage.packageId,
        },
        select: {
          userId: true,
        },
      })

      // Se è un pacchetto multiplo (più di 1 atleta), aggiungi tutti gli userId
      if (allUserPackages.length > 1) {
        allUserPackages.forEach(up => userIdsToInclude.add(up.userId))
      }
    }

    // STEP 3: Recupera tutte le prenotazioni dell'utente corrente E degli altri atleti dei pacchetti multipli
    const bookings = await prisma.booking.findMany({
      where: {
        userId: { in: Array.from(userIdsToInclude) },
        status: { not: 'CANCELLED' },
        // Solo prenotazioni relative ai pacchetti dell'utente corrente o dei pacchetti multipli condivisi
        packageId: { in: userPackages.map(up => up.packageId) },
      },
      include: {
        package: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    logger.error('Errore recupero prenotazioni', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore nel recupero delle prenotazioni' },
      { status: 500 }
    )
  }
}

// POST - Crea nuova prenotazione
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await bookingRateLimiter.check(session.user.id)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Troppe richieste. Riprova tra qualche minuto.',
          retryAfter: rateLimitResult.reset
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
          }
        }
      )
    }

    // Valida input
    const body = await request.json()
    const validatedData = bookingSchema.parse(body)
    const { date, time, packageId } = validatedData

    // STEP 1: Verifica preliminare pacchetto (fuori transazione) - serve per durata
    // Verifica tramite userPackages per supportare pacchetti multipli
    const userPackage = await prisma.userPackage.findFirst({
      where: {
        packageId,
        userId: session.user.id,
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

    const packageData = userPackage.package

    // Prepara date usando la durata del package
    const bookingDate = new Date(date)
    const [hours, minutes] = time.split(':').map(Number)
    bookingDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(bookingDate)
    endDate.setMinutes(endDate.getMinutes() + (packageData.durationMinutes || 60)) // Usa durata del package, default 60 min

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
      // Per pacchetti singoli, verifica solo l'utente corrente
      const remainingSessions = packageData.totalSessions - userPackage.usedSessions
      if (remainingSessions <= 0) {
        return NextResponse.json(
          { error: 'Nessuna sessione disponibile' },
          { status: 400 }
        )
      }
    }

    // STEP 2: Crea Google Calendar event PRIMA della transazione (opzionale)
    let googleEventId: string | null = null
    try {
      const eventId = await createCalendarEvent(
        `Sessione ${session.user.name}`,
        `Prenotazione Hugemass - Pacchetto: ${packageData.name}`,
        bookingDate,
        endDate
      )
      googleEventId = eventId
      logger.info('Evento Google Calendar creato', { eventId: googleEventId })
    } catch (error) {
      logger.warn('Errore creazione evento Google Calendar (continua senza)', { error: sanitizeError(error) })
      // Continua senza Google Calendar - la prenotazione viene comunque creata
      // L'utente può sincronizzare manualmente dopo
    }

    // STEP 3: Transazione atomica per DB (booking + package update)
    const booking = await prisma.$transaction(async (tx) => {
      // Verifica sovrapposizioni con prenotazioni esistenti
      // Recupera tutte le prenotazioni confermate per quella data
      const startOfDay = new Date(bookingDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(bookingDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      const existingBookings = await tx.booking.findMany({
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
            },
          },
        },
      })

      // Verifica sovrapposizioni
      const hasOverlap = existingBookings.some(existing => {
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

      if (hasOverlap) {
        throw new Error('Questo orario si sovrappone con una prenotazione esistente')
      }

      // Ricontrolla sessioni disponibili (dentro transazione per evitare race)
      // Usa userPackage per supportare pacchetti multipli
      const userPkg = await tx.userPackage.findFirst({
        where: {
          packageId,
          userId: session.user.id,
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
        // Per pacchetti singoli, verifica solo l'utente corrente
        if ((userPkg.package.totalSessions - userPkg.usedSessions) <= 0) {
          throw new Error('Sessioni terminate durante l\'elaborazione')
        }
      }

      // Crea booking
      const newBooking = await tx.booking.create({
        data: {
          userId: session.user.id,
          packageId,
          date: bookingDate,
          time,
          googleEventId,
          status: 'CONFIRMED',
        },
      })

      // Scala sessione: per pacchetti multipli scala a TUTTI gli atleti, altrimenti solo all'utente corrente
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

    // STEP 4: WhatsApp rimosso - non serve conferma quando l'utente registra un appuntamento

    return NextResponse.json(booking, { status: 201 })
    
  } catch (error) {
    return handleApiError(error)
  }
}
