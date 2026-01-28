import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@hugemass.com' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  if (admin) {
    console.log('✅ Admin trovato:')
    console.log(JSON.stringify(admin, null, 2))
    
    if (admin.role !== 'ADMIN') {
      console.log('⚠️  ATTENZIONE: Il ruolo non è ADMIN!')
      console.log('Eseguendo correzione...')
      
      await prisma.user.update({
        where: { email: 'admin@hugemass.com' },
        data: { role: 'ADMIN' },
      })
      
      console.log('✅ Ruolo corretto a ADMIN')
    } else {
      console.log('✅ Ruolo corretto: ADMIN')
    }
  } else {
    console.log('❌ Admin non trovato!')
    console.log('Esegui: npm run seed:admin')
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
