import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET - Lista esercizi con filtri opzionali (categoria, search)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')

    const where: any = {}

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    const exercises = await prisma.exercise.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [
        {
          category: {
            sortOrder: 'asc',
          },
        },
        {
          name: 'asc',
        },
      ],
    })

    return NextResponse.json(exercises)
  } catch (error) {
    logger.error('Errore recupero esercizi', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

