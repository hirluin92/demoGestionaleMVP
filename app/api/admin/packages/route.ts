import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, withRetry } from '@/lib/prisma'
import { logger, sanitizeError } from '@/lib/logger'
import { z } from 'zod'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

const createPackageSchema = z.object({
  userIds: z.array(z.string()).min(1, 'Seleziona almeno un cliente'),
  name: z.string().optional().default(''), // Opzionale, verrà generato automaticamente se non fornito
  totalSessions: z.number().int().positive(),
  durationMinutes: z.number().int().positive().optional().default(60), // Default 60 minuti
})

// GET - Lista tutti i pacchetti (solo admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const packages = await withRetry(() =>
      prisma.package.findMany({
        include: {
          userPackages: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    )

    return NextResponse.json(packages)
  } catch (error) {
    logger.error('Errore recupero pacchetti', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore nel recupero dei pacchetti' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo pacchetto (solo admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { userIds, name, totalSessions, durationMinutes } = createPackageSchema.parse(body)

    // Verifica che tutti gli utenti esistano
    const users = await withRetry(() =>
      prisma.user.findMany({
        where: { id: { in: userIds } },
      })
    )

    if (users.length !== userIds.length) {
      return NextResponse.json(
        { error: 'Uno o più utenti non trovati' },
        { status: 404 }
      )
    }

    // Verifica che nessun utente abbia già un pacchetto attivo
    const usersWithActivePackages = await withRetry(() =>
      prisma.userPackage.findMany({
        where: {
          userId: { in: userIds },
          package: {
            isActive: true,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    )

    if (usersWithActivePackages.length > 0) {
      const usersWithPackages = usersWithActivePackages.map(up => up.user.name || up.user.email).join(', ')
      return NextResponse.json(
        { 
          error: `Uno o più clienti hanno già un pacchetto attivo: ${usersWithPackages}. Non è possibile assegnare un nuovo pacchetto finché non viene terminato quello esistente.`,
          usersWithPackages: usersWithActivePackages.map(up => ({
            userId: up.userId,
            userName: up.user.name,
            userEmail: up.user.email,
          })),
        },
        { status: 400 }
      )
    }

    // Genera nome automatico basato sul tipo (singolo o multiplo)
    const packageName = name || (userIds.length > 1 ? 'Multiplo' : 'Singolo')
    
    // Crea il pacchetto (senza userId per la relazione uno-a-molti)
    const packageData = await withRetry(() =>
      prisma.package.create({
        data: {
          name: packageName,
          totalSessions,
          durationMinutes: durationMinutes || 60, // Default 60 minuti se non specificato
          usedSessions: 0,
          isActive: true,
          // Crea le relazioni molti-a-molti
          userPackages: {
            create: userIds.map(userId => ({
              userId,
              usedSessions: 0,
            })),
          },
        },
        include: {
          userPackages: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      })
    )

    return NextResponse.json(packageData, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Errore creazione pacchetto', { error: sanitizeError(error) })
    return NextResponse.json(
      { error: 'Errore nella creazione del pacchetto' },
      { status: 500 }
    )
  }
}
