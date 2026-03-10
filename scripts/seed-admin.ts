import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { env } from '../lib/env'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = env.ADMIN_EMAIL || 'admin@appointly.com'
  const adminPassword = env.ADMIN_PASSWORD || 'changeme'

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  // Cerca se l'admin esiste già
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    // Aggiorna password e ruolo se esiste già
    const admin = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN',
        name: 'Admin',
      },
    })
    console.log('Admin aggiornato:', admin.email)
    console.log('Password resettata alla password dal .env o default "changeme"')
  } else {
    // Crea nuovo admin - prima crea un tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Admin Business',
        slug: adminEmail.split('@')[0]?.toLowerCase() || 'admin',
        email: adminEmail,
        category: 'OTHER',
        city: 'Unknown',
      },
    })

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        name: 'Admin',
        role: 'SUPER_ADMIN',
        tenantId: tenant.id,
      },
    })
    console.log('Admin creato:', admin.email)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
