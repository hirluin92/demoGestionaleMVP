import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const workoutExerciseSchema = z.object({
  exerciseId: z.string().optional().nullable(),
  name: z.string().min(1, 'Nome esercizio richiesto').max(100),
  sets: z.number().int().min(1, 'Almeno 1 serie').max(50),
  reps: z.string().min(1, 'Ripetizioni richieste').max(30),
  weight: z.string().max(50).optional().nullable(),
  restSeconds: z.number().int().min(0).max(600).optional().nullable(),
  tempo: z.string().max(20).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

const workoutDaySchema = z.object({
  name: z.string().min(1, 'Nome giorno richiesto').max(100),
  notes: z.string().max(500).optional().nullable(),
  exercises: z.array(workoutExerciseSchema).min(1, 'Almeno un esercizio per giorno'),
})

const createWorkoutPlanSchema = z.object({
  userId: z.string().min(1, 'ID utente richiesto'),
  name: z.string().min(1, 'Nome scheda richiesto').max(100),
  description: z.string().max(1000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  days: z.array(workoutDaySchema).min(1, 'Almeno un giorno di allenamento'),
})

const updateWorkoutPlanSchema = createWorkoutPlanSchema.extend({
  isActive: z.boolean().optional(),
})

// GET - Lista workout plans (solo ADMIN)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || undefined

    const where: any = {}
    if (userId) {
      where.userId = userId
    }

    const plans = await prisma.workoutPlan.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
    logger.error('Errore recupero workout plans admin', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo workout plan (solo ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createWorkoutPlanSchema.parse(body)

    const startDate = validated.startDate ? new Date(validated.startDate) : null
    const endDate = validated.endDate ? new Date(validated.endDate) : null

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.workoutPlan.create({
        data: {
          userId: validated.userId,
          name: validated.name,
          description: validated.description ?? null,
          startDate,
          endDate,
          isActive: true,
          days: {
            create: validated.days.map((day, dayIndex) => ({
              dayNumber: dayIndex + 1,
              name: day.name,
              notes: day.notes ?? null,
              exercises: {
                create: day.exercises.map((ex, exIndex) => ({
                  orderIndex: exIndex + 1,
                  exerciseId: ex.exerciseId ?? null,
                  name: ex.name,
                  sets: ex.sets,
                  reps: ex.reps,
                  weight: ex.weight ?? null,
                  restSeconds: ex.restSeconds ?? null,
                  tempo: ex.tempo ?? null,
                  notes: ex.notes ?? null,
                })),
              },
            })),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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

      return created
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Errore creazione workout plan admin', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

