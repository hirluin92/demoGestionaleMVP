import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email richiesta' },
        { status: 400 }
      )
    }

    // Cerca l'utente
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Per sicurezza, non riveliamo se l'email esiste o meno
    if (!user) {
      return NextResponse.json(
        { message: 'Se l\'email esiste, riceverai un link per il reset password' },
        { status: 200 }
      )
    }

    // Genera token sicuro
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 ora

    // Salva token nel database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Invia email
    const emailResult = await sendPasswordResetEmail(user.email, resetToken)

    if (!emailResult.success) {
      console.error('Errore invio email:', emailResult.error)
      // In sviluppo, logga il link
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 Link reset (dev): ${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`)
      }
    }

    return NextResponse.json(
      { message: 'Se l\'email esiste, riceverai un link per il reset password' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Errore forgot-password:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
