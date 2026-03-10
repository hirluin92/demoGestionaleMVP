import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { createClientNoteSchema } from '@/lib/validators'

// Commenti in italiano: API per note cliente (testuali e, in futuro, vocali strutturate)

const paramsSchema = z.object({
  tenant: z.string().min(1),
  clientId: z.string().cuid(),
})

export async function GET(
  _req: Request,
  { params }: { params: { tenant: string; clientId: string } },
) {
  try {
    const parsedParams = paramsSchema.parse(params)
    const auth = await requireTenantAccess(parsedParams.tenant)
    if (auth.error) return auth.error

    const client = await prisma.client.findFirst({
      where: {
        id: parsedParams.clientId,
        tenantId: auth.tenantId!,
      },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente non trovato' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: client.notes,
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

export async function POST(
  req: Request,
  { params }: { params: { tenant: string; clientId: string } },
) {
  try {
    const parsedParams = paramsSchema.parse(params)
    const auth = await requireTenantAccess(parsedParams.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = createClientNoteSchema.parse(body)

    // Verifica che il cliente appartenga al tenant
    const client = await prisma.client.findFirst({
      where: {
        id: parsedParams.clientId,
        tenantId: auth.tenantId!,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente non trovato' },
        { status: 404 },
      )
    }

    const note = await prisma.clientNote.create({
      data: {
        clientId: client.id,
        type: data.type,
        content: data.content,
      },
    })

    return NextResponse.json({
      success: true,
      data: note,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dati non validi', details: error.errors },
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

