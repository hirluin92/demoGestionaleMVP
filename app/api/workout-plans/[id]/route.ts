import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET - Dettaglio workout plan dell'utente corrente (client, sola lettura)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const plan = await prisma.workoutPlan.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
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
    })

    if (!plan) {
      return NextResponse.json({ error: 'Scheda non trovata' }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    logger.error('Errore recupero workout plan client', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

