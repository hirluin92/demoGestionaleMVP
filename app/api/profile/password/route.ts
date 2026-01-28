import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password corrente richiesta'),
  newPassword: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
    .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
    .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno un numero'),
})

// PUT - Cambia la password dell'utente corrente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    // Recupera l'utente con la password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Verifica la password corrente
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Password corrente non corretta' },
        { status: 400 }
      )
    }

    // Verifica che la nuova password sia diversa dalla corrente
    const isSamePassword = await bcrypt.compare(newPassword, user.password)

    if (isSamePassword) {
      return NextResponse.json(
        { error: 'La nuova password deve essere diversa dalla password corrente' },
        { status: 400 }
      )
    }

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Aggiorna la password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: 'Password aggiornata con successo' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore cambio password:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
