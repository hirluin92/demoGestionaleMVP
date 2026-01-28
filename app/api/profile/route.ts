import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Il nome deve essere di almeno 2 caratteri')
    .max(100, 'Il nome è troppo lungo')
    .trim()
    .optional(),
    
  email: z.string()
    .email('Email non valida')
    .toLowerCase()
    .optional(),
    
  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Formato telefono non valido. Usa formato internazionale: +39XXXXXXXXXX')
    .optional()
    .nullable(),
})

// GET - Recupera il profilo dell'utente corrente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
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
    console.error('Errore recupero profilo:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna il profilo dell'utente corrente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

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

    // Se l'email viene modificata, verifica che non esista già
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email già registrata' },
          { status: 400 }
        )
      }
    }

    // Prepara i dati per l'aggiornamento
    const updateData: any = {}
    
    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
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

    console.error('Errore aggiornamento profilo:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
