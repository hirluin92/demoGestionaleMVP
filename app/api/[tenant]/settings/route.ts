import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'

// Commenti in italiano: API per leggere/aggiornare le impostazioni del tenant (businessHours, ecc.)

const businessHoursSchema = z.record(
  z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    break: z
      .object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .optional(),
  }),
)

const updateSettingsSchema = z.object({
  businessHours: businessHoursSchema.optional(),
  timezone: z.string().optional(),
  brandColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: { tenant: string } },
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const tenant = await prisma.tenant.findFirst({
      where: {
        id: auth.tenantId!,
      },
      select: {
        settings: true,
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant non trovato' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: tenant.settings,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { tenant: string } },
) {
  try {
    const auth = await requireTenantAccess(params.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = updateSettingsSchema.parse(body)

    const existing = await prisma.tenant.findFirst({
      where: { id: auth.tenantId! },
      select: { settings: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tenant non trovato' },
        { status: 404 },
      )
    }

    const nextSettings = {
      ...(existing.settings as Record<string, unknown>),
      ...(data.businessHours && { businessHours: data.businessHours }),
      ...(data.timezone && { timezone: data.timezone }),
      ...(data.brandColor && { brandColor: data.brandColor }),
    }

    const updated = await prisma.tenant.update({
      where: { id: auth.tenantId! },
      data: {
        settings: nextSettings,
      },
      select: { settings: true },
    })

    return NextResponse.json({
      success: true,
      data: updated.settings,
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

