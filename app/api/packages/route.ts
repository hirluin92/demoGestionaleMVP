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

    const packages = await prisma.package.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: 'CONFIRMED',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Errore recupero pacchetti:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei pacchetti' },
      { status: 500 }
    )
  }
}
