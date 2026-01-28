import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSettingsSchema = z.object({
  // Notifiche
  emailNotifications: z.boolean().optional(),
  bookingReminders: z.boolean().optional(),
  measurementUpdates: z.boolean().optional(),
  
  // Sicurezza
  loginAlerts: z.boolean().optional(),
  sessionTimeout: z.number().int().min(1).max(365).optional(), // 1-365 giorni
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
        emailNotifications: true,
        bookingReminders: true,
        measurementUpdates: true,
        loginAlerts: true,
        sessionTimeout: true,
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
    console.error('Errore recupero impostazioni:', error)
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
    
    if (validatedData.emailNotifications !== undefined) {
      updateData.emailNotifications = validatedData.emailNotifications
    }
    if (validatedData.bookingReminders !== undefined) {
      updateData.bookingReminders = validatedData.bookingReminders
    }
    if (validatedData.measurementUpdates !== undefined) {
      updateData.measurementUpdates = validatedData.measurementUpdates
    }
    if (validatedData.loginAlerts !== undefined) {
      updateData.loginAlerts = validatedData.loginAlerts
    }
    if (validatedData.sessionTimeout !== undefined) {
      updateData.sessionTimeout = validatedData.sessionTimeout
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        emailNotifications: true,
        bookingReminders: true,
        measurementUpdates: true,
        loginAlerts: true,
        sessionTimeout: true,
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

    console.error('Errore aggiornamento impostazioni:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
