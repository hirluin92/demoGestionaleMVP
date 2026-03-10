import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAvailableSlots } from '@/lib/availability'
import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  serviceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * GET /api/[tenant]/availability
 * Calcola slot disponibili per un servizio in una data
 * Route pubblica (non richiede autenticazione) per prenotazione online
 */
export async function GET(
  req: Request,
  { params }: { params: { tenant: string } }
) {
  try {
    // Verifica che il tenant esista
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenant },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant non trovato' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(req.url)
    const query = querySchema.parse({
      serviceId: searchParams.get('serviceId'),
      date: searchParams.get('date'),
    })

    const date = new Date(query.date)
    const slots = await getAvailableSlots(tenant.id, query.serviceId, date)

    return NextResponse.json({ success: true, data: slots })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Parametri non validi', details: error.errors },
        { status: 400 }
      )
    }
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}
