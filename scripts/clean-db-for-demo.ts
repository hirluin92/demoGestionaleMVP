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
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@appointly.com'
  
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!admin) {
    console.error(`❌ Errore: Utente admin non trovato con email: ${adminEmail}`)
    console.log('💡 Assicurati che l\'admin esista o esegui prima: npm run seed:admin')
    process.exit(1)
  }

  if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'TENANT_OWNER') {
    console.error(`❌ Errore: L'utente ${adminEmail} non è un admin (role: ${admin.role})`)
    process.exit(1)
  }

  console.log(`✅ Admin trovato: ${admin.name} (${admin.email})\n`)

  // Conta i dati prima della pulizia
  const tenantsCount = await prisma.tenant.count()
  const usersCount = await prisma.user.count()
  const appointmentsCount = await prisma.appointment.count()
  const clientsCount = await prisma.client.count()
  const servicesCount = await prisma.service.count()
  const staffCount = await prisma.staff.count()

  console.log('📊 Dati attuali nel database:')
  console.log(`   - Tenant: ${tenantsCount}`)
  console.log(`   - Utenti: ${usersCount}`)
  console.log(`   - Appuntamenti: ${appointmentsCount}`)
  console.log(`   - Clienti: ${clientsCount}`)
  console.log(`   - Servizi: ${servicesCount}`)
  console.log(`   - Staff: ${staffCount}\n`)

  // Trova il tenant dell'admin
  const adminTenant = await prisma.tenant.findUnique({
    where: { id: admin.tenantId },
  })

  if (!adminTenant) {
    console.error('❌ Errore: Tenant dell\'admin non trovato')
    process.exit(1)
  }

  console.log(`✅ Tenant admin trovato: ${adminTenant.name} (${adminTenant.slug})\n`)

  // Elimina tutti gli appuntamenti
  console.log('🗑️  Eliminazione appuntamenti...')
  const deletedAppointments = await prisma.appointment.deleteMany({})
  console.log(`   ✅ Eliminati ${deletedAppointments.count} appuntamenti\n`)

  // Elimina tutti i clienti
  console.log('🗑️  Eliminazione clienti...')
  const deletedClients = await prisma.client.deleteMany({})
  console.log(`   ✅ Eliminati ${deletedClients.count} clienti\n`)

  // Elimina tutti i servizi
  console.log('🗑️  Eliminazione servizi...')
  const deletedServices = await prisma.service.deleteMany({})
  console.log(`   ✅ Eliminati ${deletedServices.count} servizi\n`)

  // Elimina tutti gli staff
  console.log('🗑️  Eliminazione staff...')
  const deletedStaff = await prisma.staff.deleteMany({})
  console.log(`   ✅ Eliminati ${deletedStaff.count} staff\n`)

  // Elimina tutti gli utenti tranne l'admin
  console.log('🗑️  Eliminazione utenti (tranne admin)...')
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { not: admin.id },
    },
  })
  console.log(`   ✅ Eliminati ${deletedUsers.count} utenti\n`)

  // Elimina tutti i tenant tranne quello dell'admin
  console.log('🗑️  Eliminazione tenant (tranne quello dell\'admin)...')
  const deletedTenants = await prisma.tenant.deleteMany({
    where: {
      id: { not: admin.tenantId },
    },
  })
  console.log(`   ✅ Eliminati ${deletedTenants.count} tenant\n`)

  // Conta i dati dopo la pulizia
  const finalTenantsCount = await prisma.tenant.count()
  const finalUsersCount = await prisma.user.count()
  const finalAppointmentsCount = await prisma.appointment.count()
  const finalClientsCount = await prisma.client.count()
  const finalServicesCount = await prisma.service.count()
  const finalStaffCount = await prisma.staff.count()

  console.log('📊 Dati finali nel database:')
  console.log(`   - Tenant: ${finalTenantsCount} (solo quello dell'admin)`)
  console.log(`   - Utenti: ${finalUsersCount} (solo admin)`)
  console.log(`   - Appuntamenti: ${finalAppointmentsCount}`)
  console.log(`   - Clienti: ${finalClientsCount}`)
  console.log(`   - Servizi: ${finalServicesCount}`)
  console.log(`   - Staff: ${finalStaffCount}\n`)

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
