import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Recupera tutte le misurazioni dell'utente corrente (solo lettura)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const measurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId: session.user.id,
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
