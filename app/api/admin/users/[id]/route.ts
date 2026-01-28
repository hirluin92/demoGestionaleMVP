import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateUserSchema = z.object({
  email: z.string()
    .email('Email non valida')
    .toLowerCase()
    .optional(),
    
  password: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
    .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
    .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno un numero')
    .optional(),
    
  name: z.string()
    .min(2, 'Il nome deve essere di almeno 2 caratteri')
    .max(100, 'Il nome è troppo lungo')
    .trim()
    .optional(),
    
  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Formato telefono non valido. Usa formato internazionale: +39XXXXXXXXXX')
    .optional()
    .nullable(),
    
  collaborationStartDate: z.string()
    .optional()
    .nullable(),
})

// GET - Recupera un utente specifico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: params.id,
      },
      include: {
        packages: {
          where: { isActive: true },
        },
        _count: {
          select: {
            bookings: {
              where: {
                status: 'CONFIRMED',
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Rimuovi password dalla risposta
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Errore recupero utente:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna un utente
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
    const validatedData = updateUserSchema.parse(body)

    // Verifica se l'utente esiste
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
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
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10)
    }
    if (validatedData.collaborationStartDate !== undefined) {
      updateData.collaborationStartDate = validatedData.collaborationStartDate
        ? new Date(validatedData.collaborationStartDate)
        : null
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        packages: {
          where: { isActive: true },
        },
        _count: {
          select: {
            bookings: {
              where: {
                status: 'CONFIRMED',
              },
            },
          },
        },
      },
    })

    // Rimuovi password dalla risposta
    const { password: _, ...userWithoutPassword } = updatedUser

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore aggiornamento utente:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
