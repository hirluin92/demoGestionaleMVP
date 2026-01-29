import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Range ragionevoli per misure umane
const MEASUREMENT_RANGES = {
  peso: { min: 30, max: 300 }, // kg
  altezza: { min: 100, max: 250 }, // cm
  bodyFat: { min: 0, max: 100 }, // percentuale
  collo: { min: 20, max: 80 }, // cm
  spalle: { min: 80, max: 180 }, // cm
  torace: { min: 60, max: 200 }, // cm
  vita: { min: 40, max: 200 }, // cm
  fianchi: { min: 50, max: 200 }, // cm
  bicipite: { min: 15, max: 80 }, // cm
  avambraccio: { min: 15, max: 50 }, // cm
  coscia: { min: 30, max: 120 }, // cm
  polpaccio: { min: 20, max: 70 }, // cm
}

const measurementSchema = z.object({
  userId: z.string().min(1, 'User ID richiesto'),
  measurementDate: z.string().optional(),
  peso: z.number()
    .min(MEASUREMENT_RANGES.peso.min, `Il peso deve essere almeno ${MEASUREMENT_RANGES.peso.min} kg`)
    .max(MEASUREMENT_RANGES.peso.max, `Il peso non può superare ${MEASUREMENT_RANGES.peso.max} kg`)
    .optional().nullable(),
  altezza: z.number()
    .min(MEASUREMENT_RANGES.altezza.min, `L'altezza deve essere almeno ${MEASUREMENT_RANGES.altezza.min} cm`)
    .max(MEASUREMENT_RANGES.altezza.max, `L'altezza non può superare ${MEASUREMENT_RANGES.altezza.max} cm`)
    .optional().nullable(),
  bodyFat: z.number()
    .min(MEASUREMENT_RANGES.bodyFat.min, `La percentuale di grasso corporeo deve essere almeno ${MEASUREMENT_RANGES.bodyFat.min}%`)
    .max(MEASUREMENT_RANGES.bodyFat.max, `La percentuale di grasso corporeo non può superare ${MEASUREMENT_RANGES.bodyFat.max}%`)
    .optional().nullable(),
  collo: z.number()
    .min(MEASUREMENT_RANGES.collo.min, `La circonferenza del collo deve essere almeno ${MEASUREMENT_RANGES.collo.min} cm`)
    .max(MEASUREMENT_RANGES.collo.max, `La circonferenza del collo non può superare ${MEASUREMENT_RANGES.collo.max} cm`)
    .optional().nullable(),
  spalle: z.number()
    .min(MEASUREMENT_RANGES.spalle.min, `La larghezza delle spalle deve essere almeno ${MEASUREMENT_RANGES.spalle.min} cm`)
    .max(MEASUREMENT_RANGES.spalle.max, `La larghezza delle spalle non può superare ${MEASUREMENT_RANGES.spalle.max} cm`)
    .optional().nullable(),
  torace: z.number()
    .min(MEASUREMENT_RANGES.torace.min, `La circonferenza del torace deve essere almeno ${MEASUREMENT_RANGES.torace.min} cm`)
    .max(MEASUREMENT_RANGES.torace.max, `La circonferenza del torace non può superare ${MEASUREMENT_RANGES.torace.max} cm`)
    .optional().nullable(),
  vita: z.number()
    .min(MEASUREMENT_RANGES.vita.min, `La circonferenza della vita deve essere almeno ${MEASUREMENT_RANGES.vita.min} cm`)
    .max(MEASUREMENT_RANGES.vita.max, `La circonferenza della vita non può superare ${MEASUREMENT_RANGES.vita.max} cm`)
    .optional().nullable(),
  fianchi: z.number()
    .min(MEASUREMENT_RANGES.fianchi.min, `La circonferenza dei fianchi deve essere almeno ${MEASUREMENT_RANGES.fianchi.min} cm`)
    .max(MEASUREMENT_RANGES.fianchi.max, `La circonferenza dei fianchi non può superare ${MEASUREMENT_RANGES.fianchi.max} cm`)
    .optional().nullable(),
  bicipiteDx: z.number()
    .min(MEASUREMENT_RANGES.bicipite.min, `La circonferenza del bicipite destro deve essere almeno ${MEASUREMENT_RANGES.bicipite.min} cm`)
    .max(MEASUREMENT_RANGES.bicipite.max, `La circonferenza del bicipite destro non può superare ${MEASUREMENT_RANGES.bicipite.max} cm`)
    .optional().nullable(),
  bicipiteSx: z.number()
    .min(MEASUREMENT_RANGES.bicipite.min, `La circonferenza del bicipite sinistro deve essere almeno ${MEASUREMENT_RANGES.bicipite.min} cm`)
    .max(MEASUREMENT_RANGES.bicipite.max, `La circonferenza del bicipite sinistro non può superare ${MEASUREMENT_RANGES.bicipite.max} cm`)
    .optional().nullable(),
  avambraccioDx: z.number()
    .min(MEASUREMENT_RANGES.avambraccio.min, `La circonferenza dell'avambraccio destro deve essere almeno ${MEASUREMENT_RANGES.avambraccio.min} cm`)
    .max(MEASUREMENT_RANGES.avambraccio.max, `La circonferenza dell'avambraccio destro non può superare ${MEASUREMENT_RANGES.avambraccio.max} cm`)
    .optional().nullable(),
  avambraccioSx: z.number()
    .min(MEASUREMENT_RANGES.avambraccio.min, `La circonferenza dell'avambraccio sinistro deve essere almeno ${MEASUREMENT_RANGES.avambraccio.min} cm`)
    .max(MEASUREMENT_RANGES.avambraccio.max, `La circonferenza dell'avambraccio sinistro non può superare ${MEASUREMENT_RANGES.avambraccio.max} cm`)
    .optional().nullable(),
  cosciaDx: z.number()
    .min(MEASUREMENT_RANGES.coscia.min, `La circonferenza della coscia destra deve essere almeno ${MEASUREMENT_RANGES.coscia.min} cm`)
    .max(MEASUREMENT_RANGES.coscia.max, `La circonferenza della coscia destra non può superare ${MEASUREMENT_RANGES.coscia.max} cm`)
    .optional().nullable(),
  cosciaSx: z.number()
    .min(MEASUREMENT_RANGES.coscia.min, `La circonferenza della coscia sinistra deve essere almeno ${MEASUREMENT_RANGES.coscia.min} cm`)
    .max(MEASUREMENT_RANGES.coscia.max, `La circonferenza della coscia sinistra non può superare ${MEASUREMENT_RANGES.coscia.max} cm`)
    .optional().nullable(),
  polpaccioDx: z.number()
    .min(MEASUREMENT_RANGES.polpaccio.min, `La circonferenza del polpaccio destro deve essere almeno ${MEASUREMENT_RANGES.polpaccio.min} cm`)
    .max(MEASUREMENT_RANGES.polpaccio.max, `La circonferenza del polpaccio destro non può superare ${MEASUREMENT_RANGES.polpaccio.max} cm`)
    .optional().nullable(),
  polpaccioSx: z.number()
    .min(MEASUREMENT_RANGES.polpaccio.min, `La circonferenza del polpaccio sinistro deve essere almeno ${MEASUREMENT_RANGES.polpaccio.min} cm`)
    .max(MEASUREMENT_RANGES.polpaccio.max, `La circonferenza del polpaccio sinistro non può superare ${MEASUREMENT_RANGES.polpaccio.max} cm`)
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
    console.error('Errore recupero misurazioni:', error)
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
        altezza: validatedData.altezza,
        bodyFat: validatedData.bodyFat,
        collo: validatedData.collo,
        spalle: validatedData.spalle,
        torace: validatedData.torace,
        vita: validatedData.vita,
        fianchi: validatedData.fianchi,
        bicipiteDx: validatedData.bicipiteDx,
        bicipiteSx: validatedData.bicipiteSx,
        avambraccioDx: validatedData.avambraccioDx,
        avambraccioSx: validatedData.avambraccioSx,
        cosciaDx: validatedData.cosciaDx,
        cosciaSx: validatedData.cosciaSx,
        polpaccioDx: validatedData.polpaccioDx,
        polpaccioSx: validatedData.polpaccioSx,
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
    console.error('Errore creazione misurazione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
