import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'

// Commenti in italiano: ricerca veloce clienti per modalità telefono

const querySchema = z.object({
  q: z.string().min(1),
})

export async function GET(
  req: Request,
  { params }: { params: { tenant: string } },
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    const { q: query } = querySchema.parse({ q })

    const clients = await prisma.client.findMany({
      where: {
        tenantId: auth.tenantId!,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      include: {
        appointments: {
          where: {
            tenantId: auth.tenantId!,
          },
          include: {
            service: true,
            staff: true,
          },
          orderBy: {
            startTime: 'desc',
          },
          take: 1,
        },
        notes: {
          where: {
            type: 'ALLERGY',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: 5,
    })

    const result = clients.map(client => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      lastAppointment: client.appointments[0]
        ? {
            date: client.appointments[0].startTime,
            service: client.appointments[0].service.name,
            staff: client.appointments[0].staff.name,
          }
        : null,
      allergies: client.notes.map(n => n.content),
    }))

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Parametri non validi', details: error.errors },
        { status: 400 },
      )
    }
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 },
    )
  }
}

