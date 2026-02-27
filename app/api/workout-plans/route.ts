import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET - Lista workout plans attivi dell'utente corrente (client, sola lettura)
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const plans = await prisma.workoutPlan.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        days: {
          orderBy: {
            dayNumber: 'asc',
          },
          include: {
            exercises: {
              orderBy: {
                orderIndex: 'asc',
              },
              include: {
                exercise: {
                  include: {
                    category: true,
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

    return NextResponse.json(plans)
  } catch (error) {
    logger.error('Errore recupero workout plans client', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

