import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteCalendarEvent } from '@/lib/google-calendar'

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

    console.log('✅ Prenotazione cancellata con successo:', params.id)
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('❌ Errore cancellazione prenotazione:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Errore nella cancellazione della prenotazione' 
      },
      { status: 500 }
    )
  }
}
