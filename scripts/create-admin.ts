/**
 * Script per creare un nuovo utente admin in produzione
 * 
 * Uso:
 * DATABASE_URL="postgresql://..." tsx scripts/create-admin.ts <email> <password> <name>
 * 
 * Esempio:
 * DATABASE_URL="postgresql://..." tsx scripts/create-admin.ts admin2@appointly.com password123 "Admin 2"
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Leggi i parametri dalla command line
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error('❌ Errore: Specifica almeno email e password')
    console.log('\nUso:')
    console.log('  tsx scripts/create-admin.ts <email> <password> [name]')
    console.log('\nEsempio:')
    console.log('  tsx scripts/create-admin.ts admin2@appointly.com password123 "Admin 2"')
    process.exit(1)
  }

  const email = args[0]
  const password = args[1]
  const name = args[2] || 'Admin'

  // Valida email
  if (!email || !email.includes('@')) {
    console.error('❌ Errore: Email non valida')
    process.exit(1)
  }

  // Valida password
  if (!password || password.length < 6) {
    console.error('❌ Errore: La password deve essere di almeno 6 caratteri')
    process.exit(1)
  }

  try {
    // Verifica se l'utente esiste già
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log(`⚠️  Utente con email ${email} già esistente`)
      
      // Chiedi conferma per aggiornare
      console.log('Vuoi aggiornare questo utente a admin? (s/n)')
      // Per script non interattivo, procediamo direttamente
      const hashedPassword = await bcrypt.hash(password, 10)
      
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          passwordHash: hashedPassword,
          role: 'SUPER_ADMIN',
          name,
        },
      })
      
      console.log(`✅ Utente aggiornato a admin:`)
      console.log(`   Email: ${updatedUser.email}`)
      console.log(`   Nome: ${updatedUser.name}`)
      console.log(`   Ruolo: ${updatedUser.role}`)
    } else {
      // Crea nuovo admin - prima crea un tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: `${name}'s Business`,
          slug: email.split('@')[0]?.toLowerCase() || 'admin',
          email,
          category: 'OTHER',
          city: 'Unknown',
        },
      })

      const hashedPassword = await bcrypt.hash(password, 10)
      
      const admin = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          role: 'SUPER_ADMIN',
          tenantId: tenant.id,
        },
      })
      
      console.log(`✅ Utente admin creato con successo:`)
      console.log(`   Email: ${admin.email}`)
      console.log(`   Nome: ${admin.name}`)
      console.log(`   Ruolo: ${admin.role}`)
      console.log(`   ID: ${admin.id}`)
    }
  } catch (error) {
    console.error('❌ Errore durante la creazione dell\'admin:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
