import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const measurementSchema = z.object({
  userId: z.string().min(1, 'User ID richiesto'),
  measurementDate: z.string().optional(),
  peso: z.number().positive().optional().nullable(),
  altezza: z.number().positive().optional().nullable(),
  bodyFat: z.number().min(0).max(100).optional().nullable(),
  collo: z.number().positive().optional().nullable(),
  spalle: z.number().positive().optional().nullable(),
  torace: z.number().positive().optional().nullable(),
  vita: z.number().positive().optional().nullable(),
  fianchi: z.number().positive().optional().nullable(),
  bicipiteDx: z.number().positive().optional().nullable(),
  bicipiteSx: z.number().positive().optional().nullable(),
  avambraccioDx: z.number().positive().optional().nullable(),
  avambraccioSx: z.number().positive().optional().nullable(),
  cosciaDx: z.number().positive().optional().nullable(),
  cosciaSx: z.number().positive().optional().nullable(),
  polpaccioDx: z.number().positive().optional().nullable(),
  polpaccioSx: z.number().positive().optional().nullable(),
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
