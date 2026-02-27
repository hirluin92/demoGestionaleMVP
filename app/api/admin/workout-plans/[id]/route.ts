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

const updateWorkoutPlanSchema = z.object({
  userId: z.string().min(1, 'ID utente richiesto'),
  name: z.string().min(1, 'Nome scheda richiesto').max(100),
  description: z.string().max(1000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  days: z.array(workoutDaySchema).min(1, 'Almeno un giorno di allenamento'),
})

// GET - Dettaglio workout plan (solo ADMIN)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const plan = await prisma.workoutPlan.findUnique({
      where: {
        id: params.id,
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

    if (!plan) {
      return NextResponse.json({ error: 'Scheda non trovata' }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    logger.error('Errore recupero workout plan admin', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna workout plan (solo ADMIN, strategia delete-and-recreate per giorni/esercizi)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateWorkoutPlanSchema.parse(body)

    const startDate = validated.startDate ? new Date(validated.startDate) : null
    const endDate = validated.endDate ? new Date(validated.endDate) : null

    const plan = await prisma.$transaction(async (tx) => {
      // Verifica esistenza
      const existing = await tx.workoutPlan.findUnique({
        where: { id: params.id },
      })

      if (!existing) {
        throw new Error('Scheda non trovata')
      }

      // 1. Elimina tutti i WorkoutDay esistenti (cascade sugli esercizi)
      await tx.workoutDay.deleteMany({
        where: {
          workoutPlanId: params.id,
        },
      })

      // 2. Aggiorna i campi del WorkoutPlan
      const updatedPlan = await tx.workoutPlan.update({
        where: {
          id: params.id,
        },
        data: {
          userId: validated.userId,
          name: validated.name,
          description: validated.description ?? null,
          startDate,
          endDate,
          isActive: validated.isActive ?? existing.isActive,
        },
      })

      // 3. Ricrea i nuovi WorkoutDay + WorkoutExercise
      await tx.workoutDay.createMany({
        data: validated.days.map((day, dayIndex) => ({
          id: undefined as unknown as string, // prisma ignora id se non richiesto, ma createMany non supporta relazioni nested
          workoutPlanId: updatedPlan.id,
          dayNumber: dayIndex + 1,
          name: day.name,
          notes: day.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      })

      // Recupera i giorni creati per collegare gli esercizi
      const days = await tx.workoutDay.findMany({
        where: {
          workoutPlanId: updatedPlan.id,
        },
        orderBy: {
          dayNumber: 'asc',
        },
      })

      // Crea gli esercizi per ciascun giorno
      for (let i = 0; i < validated.days.length; i++) {
        const dayInput = validated.days[i]
        const dayRecord = days[i]
        if (!dayRecord) continue

        await tx.workoutExercise.createMany({
          data: dayInput.exercises.map((ex, exIndex) => ({
            workoutDayId: dayRecord.id,
            orderIndex: exIndex + 1,
            exerciseId: ex.exerciseId ?? null,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight ?? null,
            restSeconds: ex.restSeconds ?? null,
            tempo: ex.tempo ?? null,
            notes: ex.notes ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        })
      }

      const fullPlan = await tx.workoutPlan.findUnique({
        where: {
          id: updatedPlan.id,
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

      if (!fullPlan) {
        throw new Error('Errore durante il ricaricamento della scheda')
      }

      return fullPlan
    })

    return NextResponse.json(plan)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Scheda non trovata') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    logger.error('Errore aggiornamento workout plan admin', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina workout plan (solo ADMIN)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    await prisma.workoutPlan.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Errore eliminazione workout plan admin', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

