import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Errore recupero prenotazioni admin:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
