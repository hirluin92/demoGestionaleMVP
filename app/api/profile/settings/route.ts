import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSettingsSchema = z.object({
  // Notifiche
  bookingReminders: z.boolean().optional(),
})

// GET - Recupera le impostazioni dell'utente corrente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        bookingReminders: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    logger.error('Errore recupero impostazioni', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna le impostazioni dell'utente corrente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    // Verifica se l'utente esiste
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Prepara i dati per l'aggiornamento
    const updateData: any = {}
    
    if (validatedData.bookingReminders !== undefined) {
      updateData.bookingReminders = validatedData.bookingReminders
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        bookingReminders: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Errore aggiornamento impostazioni', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
