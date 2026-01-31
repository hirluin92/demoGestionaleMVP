import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Range ragionevoli per misure umane
const MEASUREMENT_RANGES = {
  peso: { min: 30, max: 300 }, // kg
  braccio: { min: 15, max: 80 }, // cm
  spalle: { min: 80, max: 180 }, // cm
  torace: { min: 60, max: 200 }, // cm
  vita: { min: 40, max: 200 }, // cm
  gamba: { min: 30, max: 120 }, // cm
  fianchi: { min: 50, max: 200 }, // cm
}

const measurementSchema = z.object({
  userId: z.string().min(1, 'User ID richiesto'),
  measurementDate: z.string().optional(),
  peso: z.number()
    .min(MEASUREMENT_RANGES.peso.min, `Il peso deve essere almeno ${MEASUREMENT_RANGES.peso.min} kg`)
    .max(MEASUREMENT_RANGES.peso.max, `Il peso non può superare ${MEASUREMENT_RANGES.peso.max} kg`)
    .optional().nullable(),
  braccio: z.number()
    .min(MEASUREMENT_RANGES.braccio.min, `La circonferenza del braccio deve essere almeno ${MEASUREMENT_RANGES.braccio.min} cm`)
    .max(MEASUREMENT_RANGES.braccio.max, `La circonferenza del braccio non può superare ${MEASUREMENT_RANGES.braccio.max} cm`)
    .optional().nullable(),
  spalle: z.number()
    .min(MEASUREMENT_RANGES.spalle.min, `La circonferenza delle spalle deve essere almeno ${MEASUREMENT_RANGES.spalle.min} cm`)
    .max(MEASUREMENT_RANGES.spalle.max, `La circonferenza delle spalle non può superare ${MEASUREMENT_RANGES.spalle.max} cm`)
    .optional().nullable(),
  torace: z.number()
    .min(MEASUREMENT_RANGES.torace.min, `La circonferenza del torace deve essere almeno ${MEASUREMENT_RANGES.torace.min} cm`)
    .max(MEASUREMENT_RANGES.torace.max, `La circonferenza del torace non può superare ${MEASUREMENT_RANGES.torace.max} cm`)
    .optional().nullable(),
  vita: z.number()
    .min(MEASUREMENT_RANGES.vita.min, `La circonferenza della vita deve essere almeno ${MEASUREMENT_RANGES.vita.min} cm`)
    .max(MEASUREMENT_RANGES.vita.max, `La circonferenza della vita non può superare ${MEASUREMENT_RANGES.vita.max} cm`)
    .optional().nullable(),
  gamba: z.number()
    .min(MEASUREMENT_RANGES.gamba.min, `La circonferenza della gamba deve essere almeno ${MEASUREMENT_RANGES.gamba.min} cm`)
    .max(MEASUREMENT_RANGES.gamba.max, `La circonferenza della gamba non può superare ${MEASUREMENT_RANGES.gamba.max} cm`)
    .optional().nullable(),
  fianchi: z.number()
    .min(MEASUREMENT_RANGES.fianchi.min, `La circonferenza dei fianchi deve essere almeno ${MEASUREMENT_RANGES.fianchi.min} cm`)
    .max(MEASUREMENT_RANGES.fianchi.max, `La circonferenza dei fianchi non può superare ${MEASUREMENT_RANGES.fianchi.max} cm`)
    .optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET - Recupera tutte le misurazioni di un utente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID richiesto' }, { status: 400 })
    }

    const measurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId,
      },
      orderBy: {
        measurementDate: 'desc',
      },
    })

    return NextResponse.json(measurements)
  } catch (error) {
    logger.error('Errore recupero misurazioni', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// POST - Crea una nuova misurazione
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = measurementSchema.parse(body)

    const measurementDate = validatedData.measurementDate 
      ? new Date(validatedData.measurementDate)
      : new Date()

    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: validatedData.userId,
        measurementDate,
        peso: validatedData.peso,
        braccio: validatedData.braccio,
        spalle: validatedData.spalle,
        torace: validatedData.torace,
        vita: validatedData.vita,
        gamba: validatedData.gamba,
        fianchi: validatedData.fianchi,
        notes: validatedData.notes,
      },
    })

    return NextResponse.json(measurement, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Errore creazione misurazione', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
