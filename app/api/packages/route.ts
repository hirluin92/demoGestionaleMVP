import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

// GET - Lista pacchetti utente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Recupera i pacchetti tramite userPackages per supportare pacchetti multipli
    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId: session.user.id,
        package: {
          isActive: true,
        },
      },
      include: {
        package: {
          include: {
            _count: {
              select: {
                bookings: {
                  where: {
                    status: 'CONFIRMED',
                    userId: session.user.id, // Solo le prenotazioni dell'utente corrente
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Trasforma i dati per mantenere la compatibilità con il frontend
    const packages = userPackages.map(up => ({
      id: up.package.id,
      name: up.package.name,
      totalSessions: up.package.totalSessions,
      usedSessions: up.usedSessions, // Usa usedSessions da userPackage
      isActive: up.package.isActive,
      durationMinutes: up.package.durationMinutes,
      createdAt: up.package.createdAt,
      updatedAt: up.package.updatedAt,
    }))

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Errore recupero pacchetti:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei pacchetti' },
      { status: 500 }
    )
  }
}
