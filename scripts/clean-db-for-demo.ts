// IMPORTANTE: Carica dotenv PRIMA di qualsiasi altro import
import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

// Carica .env.production se esiste, altrimenti .env
const envProductionPath = resolve(process.cwd(), '.env.production')
const envPath = resolve(process.cwd(), '.env')

// Prova prima .env.production, poi .env
let envFile = envPath
if (existsSync(envProductionPath)) {
  envFile = envProductionPath
  console.log('📄 Caricato: .env.production')
} else if (existsSync(envPath)) {
  console.log('📄 Caricato: .env')
} else {
  console.log('⚠️  Nessun file .env trovato, uso variabili d\'ambiente del sistema')
}

// Carica il file .env appropriato PRIMA di importare altri moduli
config({ path: envFile })

// Ora importa gli altri moduli (che useranno process.env già popolato)
import { PrismaClient } from '@prisma/client'

// Permetti di sovrascrivere DATABASE_URL con variabile d'ambiente
// Utile per eseguire lo script sul database di produzione (Vercel/Neon)
const databaseUrl = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('\n❌ Errore: DATABASE_URL non trovato')
  console.log('\n💡 Per pulire il database di produzione (Vercel/Neon):')
  console.log('   1. Ottieni DATABASE_URL dal dashboard Vercel (Settings → Environment Variables)')
  console.log('   2. Esegui: DATABASE_URL_OVERRIDE="<url-neon>" npm run clean:demo')
  console.log('   Oppure: DATABASE_URL="<url-neon>" npm run clean:demo\n')
  process.exit(1)
}

// Mostra informazioni sul database che verrà usato
console.log(`\n🔗 DATABASE_URL: ${databaseUrl.substring(0, 30)}...${databaseUrl.substring(databaseUrl.length - 20)}`)

// Avvisa se si sta usando un database diverso da quello locale
if (databaseUrl.includes('neon.tech') || databaseUrl.includes('neon.tech') || databaseUrl.includes('ep-')) {
  console.log('⚠️  ATTENZIONE: Stai per pulire il database di PRODUZIONE (Neon)')
  const hostMatch = databaseUrl.match(/@([^/]+)/)
  if (hostMatch) {
    console.log(`   Host: ${hostMatch[1]}\n`)
  } else {
    console.log('   Database: Neon (rilevato)\n')
  }
} else {
  console.log('ℹ️  Database locale rilevato\n')
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

async function main() {
  console.log('🧹 Pulizia database per demo...\n')

  // Trova l'utente admin (usa process.env direttamente, non lib/env)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hugemass.com'
  
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!admin) {
    console.error(`❌ Errore: Utente admin non trovato con email: ${adminEmail}`)
    console.log('💡 Assicurati che l\'admin esista o esegui prima: npm run seed:admin')
    process.exit(1)
  }

  if (admin.role !== 'ADMIN') {
    console.error(`❌ Errore: L'utente ${adminEmail} non è un admin (role: ${admin.role})`)
    process.exit(1)
  }

  console.log(`✅ Admin trovato: ${admin.name} (${admin.email})\n`)

  // Conta i dati prima della pulizia
  const usersCount = await prisma.user.count()
  const bookingsCount = await prisma.booking.count()
  const packagesCount = await prisma.package.count()
  const measurementsCount = await prisma.bodyMeasurement.count()
  const userPackagesCount = await prisma.userPackage.count()

  console.log('📊 Dati attuali nel database:')
  console.log(`   - Utenti: ${usersCount}`)
  console.log(`   - Prenotazioni: ${bookingsCount}`)
  console.log(`   - Pacchetti: ${packagesCount}`)
  console.log(`   - Misurazioni: ${measurementsCount}`)
  console.log(`   - UserPackages: ${userPackagesCount}\n`)

  // Elimina tutti gli utenti tranne l'admin
  // Questo eliminerà automaticamente (cascade):
  // - bookings
  // - body_measurements
  // - user_packages
  // - packages (se hanno userId)
  console.log('🗑️  Eliminazione utenti (tranne admin)...')
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { not: admin.id },
    },
  })
  console.log(`   ✅ Eliminati ${deletedUsers.count} utenti\n`)

  // Elimina pacchetti orfani (senza userId e senza userPackages)
  console.log('🗑️  Eliminazione pacchetti orfani...')
  const orphanPackages = await prisma.package.findMany({
    where: {
      userId: null,
      userPackages: {
        none: {},
      },
    },
  })

  if (orphanPackages.length > 0) {
    const deletedPackages = await prisma.package.deleteMany({
      where: {
        id: { in: orphanPackages.map(p => p.id) },
      },
    })
    console.log(`   ✅ Eliminati ${deletedPackages.count} pacchetti orfani\n`)
  } else {
    console.log('   ℹ️  Nessun pacchetto orfano trovato\n')
  }

  // Verifica che non ci siano più bookings
  const remainingBookings = await prisma.booking.count()
  if (remainingBookings > 0) {
    console.log('⚠️  Eliminazione bookings rimanenti...')
    await prisma.booking.deleteMany({})
    console.log(`   ✅ Eliminati ${remainingBookings} bookings rimanenti\n`)
  }

  // Verifica che non ci siano più misurazioni
  const remainingMeasurements = await prisma.bodyMeasurement.count()
  if (remainingMeasurements > 0) {
    console.log('⚠️  Eliminazione misurazioni rimanenti...')
    await prisma.bodyMeasurement.deleteMany({})
    console.log(`   ✅ Eliminati ${remainingMeasurements} misurazioni rimanenti\n`)
  }

  // Verifica che non ci siano più userPackages
  const remainingUserPackages = await prisma.userPackage.count()
  if (remainingUserPackages > 0) {
    console.log('⚠️  Eliminazione userPackages rimanenti...')
    await prisma.userPackage.deleteMany({})
    console.log(`   ✅ Eliminati ${remainingUserPackages} userPackages rimanenti\n`)
  }

  // Elimina anche le credenziali Google Calendar (opzionale - commenta se vuoi mantenerle)
  const googleCalendarsCount = await prisma.googleCalendar.count()
  if (googleCalendarsCount > 0) {
    console.log('🗑️  Eliminazione credenziali Google Calendar...')
    const deletedCalendars = await prisma.googleCalendar.deleteMany({})
    console.log(`   ✅ Eliminate ${deletedCalendars.count} configurazioni Google Calendar`)
    console.log('   ⚠️  Nota: Dovrai riconfigurare Google Calendar dopo la pulizia\n')
  }

  // Conta i dati dopo la pulizia
  const finalUsersCount = await prisma.user.count()
  const finalBookingsCount = await prisma.booking.count()
  const finalPackagesCount = await prisma.package.count()
  const finalMeasurementsCount = await prisma.bodyMeasurement.count()
  const finalUserPackagesCount = await prisma.userPackage.count()

  console.log('📊 Dati finali nel database:')
  console.log(`   - Utenti: ${finalUsersCount} (solo admin)`)
  console.log(`   - Prenotazioni: ${finalBookingsCount}`)
  console.log(`   - Pacchetti: ${finalPackagesCount}`)
  console.log(`   - Misurazioni: ${finalMeasurementsCount}`)
  console.log(`   - UserPackages: ${finalUserPackagesCount}\n`)

  // Verifica che l'admin sia ancora presente
  const adminStillExists = await prisma.user.findUnique({
    where: { id: admin.id },
  })

  if (!adminStillExists) {
    console.error('❌ ERRORE CRITICO: L\'admin è stato eliminato!')
    process.exit(1)
  }

  console.log('✅ Pulizia completata con successo!')
  console.log(`\n🔑 Credenziali admin:`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Password: (quella configurata in ADMIN_PASSWORD o "changeme")\n`)
}

main()
  .catch((e) => {
    console.error('❌ Errore durante la pulizia:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
