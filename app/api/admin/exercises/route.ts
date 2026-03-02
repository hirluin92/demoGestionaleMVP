import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  categoryId: z.string().min(1),
  equipment: z.string().max(50).optional().nullable(),
})

// POST - Crea esercizio custom (solo ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createExerciseSchema.parse(body)

    // Verifica unicità per [name, categoryId]
    const existing = await prisma.exercise.findUnique({
      where: {
        name_categoryId: {
          name: validated.name,
          categoryId: validated.categoryId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Esiste già un esercizio con questo nome in questa categoria' },
        { status: 409 }
      )
    }

    const exercise = await prisma.exercise.create({
      data: {
        name: validated.name,
        categoryId: validated.categoryId,
        equipment: validated.equipment ?? null,
        isDefault: false,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Errore creazione esercizio admin', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

