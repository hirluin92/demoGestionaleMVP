import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Forza rendering dinamico (usa headers per autenticazione)
export const dynamic = 'force-dynamic'

const createUserSchema = z.object({
  email: z.string()
    .email('Email non valida')
    .toLowerCase(),
    
  password: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
    .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
    .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno un numero'),
    
  name: z.string()
    .min(2, 'Il nome deve essere di almeno 2 caratteri')
    .max(100, 'Il nome è troppo lungo')
    .trim(),
    
  phone: z.string()
    .min(1, 'Il telefono è obbligatorio')
    .refine((val) => {
      // Deve rispettare il formato internazionale
      return /^\+[1-9]\d{1,14}$/.test(val.trim())
    }, 'Formato telefono non valido. Usa formato internazionale: +39XXXXXXXXXX')
    .transform((val) => val.trim()),
})

// GET - Lista tutti gli utenti (solo admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sortBy') || 'name' // 'name' | 'collaborationStartDate'
    const sortOrder = searchParams.get('sortOrder') || 'asc' // 'asc' | 'desc'
    const packageId = searchParams.get('packageId') // Filtro per pacchetto

    // Valida sortOrder - deve essere 'asc' o 'desc'
    const validSortOrder = (sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc'
    
    let orderBy: any = {}
    
    if (sortBy === 'name') {
      orderBy = { name: validSortOrder }
    } else if (sortBy === 'collaborationStartDate') {
      // Per collaborationStartDate, ordina per data e poi per nome come criterio secondario
      orderBy = [
        { collaborationStartDate: validSortOrder },
        { name: 'asc' } // Ordine secondario per consistenza quando le date sono uguali o null
      ]
    } else {
      orderBy = { name: 'asc' }
    }

    // Costruisci la condizione where
    const where: any = {
      role: 'CLIENT',
    }

    // Se è specificato un packageId, filtra gli utenti che hanno quel pacchetto
    if (packageId) {
      where.userPackages = {
        some: {
          packageId: packageId,
        },
      }
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        userPackages: {
          where: {
            package: {
              isActive: true,
            },
          },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                totalSessions: true,
              },
            },
          },
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
      orderBy,
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Errore recupero utenti:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero degli utenti' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo utente (solo admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, name, phone } = createUserSchema.parse(body)

    // Verifica se l'email esiste già
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'CLIENT',
      },
    })

    // Rimuovi password dalla risposta
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore creazione utente:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione dell\'utente' },
      { status: 500 }
    )
  }
}
