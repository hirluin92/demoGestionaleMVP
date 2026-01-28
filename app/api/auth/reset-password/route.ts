import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e password richiesti' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve essere di almeno 6 caratteri' },
        { status: 400 }
      )
    }

    // Trova utente con token valido
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token non scaduto
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token non valido o scaduto' },
        { status: 400 }
      )
    }

    // Hash nuova password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Aggiorna password e rimuovi token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return NextResponse.json(
      { message: 'Password aggiornata con successo' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Errore reset-password:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
