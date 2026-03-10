import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'

// Carica variabili d'ambiente
config()

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error('❌ Uso: tsx scripts/fix-user-password.ts <email> <nuova-password>')
    console.log('\nEsempio:')
    console.log('tsx scripts/fix-user-password.ts riccigianluca92@gmail.com NuevaPassword123')
    process.exit(1)
  }

  // Verifica che l'utente esista
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error(`❌ Utente con email ${email} non trovato`)
    process.exit(1)
  }

  // Hash della nuova password
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  // Aggiorna la password
  await prisma.user.update({
    where: { email },
    data: { passwordHash: hashedPassword },
  })

  console.log(`✅ Password aggiornata per ${email}`)
  console.log(`Nuova password: ${newPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
