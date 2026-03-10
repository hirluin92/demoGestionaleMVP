import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { slugify } from '@/lib/utils'
import { registerTenantSchema } from '@/lib/validators'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = registerTenantSchema.parse(body)

    // Controlla se email già esiste
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email già registrata' },
        { status: 409 }
      )
    }

    // Genera slug unico
    let slug = slugify(data.businessName)
    let counter = 1
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${slugify(data.businessName)}-${counter++}`
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    // Crea tenant + user in transazione atomica
    const tenant = await prisma.tenant.create({
      data: {
        slug,
        name: data.businessName,
        category: data.category,
        city: data.city,
        email: data.email,
        phone: data.phone,
        plan: 'PRO',
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 giorni
        users: {
          create: {
            email: data.email,
            passwordHash,
            name: data.ownerName,
            role: 'TENANT_OWNER',
          },
        },
      },
      include: { users: true },
    })

    return NextResponse.json({
      success: true,
      data: { tenantSlug: tenant.slug },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 }
    )
  }
}
