import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

// DELETE - Elimina un pacchetto (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Verifica se il pacchetto esiste
    const existingPackage = await prisma.package.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
          },
        },
      },
    })

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'Pacchetto non trovato' },
        { status: 404 }
      )
    }

    // Verifica se ci sono prenotazioni attive
    if (existingPackage.bookings.length > 0) {
      return NextResponse.json(
        { error: 'Impossibile eliminare il pacchetto: ci sono prenotazioni attive associate' },
        { status: 400 }
      )
    }

    // Elimina il pacchetto
    await prisma.package.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore eliminazione pacchetto:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
