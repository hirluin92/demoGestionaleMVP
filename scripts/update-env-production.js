const fs = require('fs')
const path = require('path')

const envProductionPath = path.resolve(process.cwd(), '.env.production')

if (!fs.existsSync(envProductionPath)) {
  console.error('❌ File .env.production non trovato')
  process.exit(1)
}

// Leggi il file
const content = fs.readFileSync(envProductionPath, 'utf8')

// Nuovo DATABASE_URL
const newDatabaseUrl = 'postgresql://neondb_owner:npg_F1L6IAEPOrHv@ep-billowing-wave-agupx4jo.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

// Sostituisci DATABASE_URL
const updatedContent = content.replace(
  /^DATABASE_URL=.*$/m,
  `DATABASE_URL="${newDatabaseUrl}"`
)

// Se non c'era DATABASE_URL, aggiungilo
const finalContent = updatedContent.includes('DATABASE_URL=')
  ? updatedContent
  : `${content}\nDATABASE_URL="${newDatabaseUrl}"\n`

// Scrivi il file
fs.writeFileSync(envProductionPath, finalContent, 'utf8')

console.log('✅ .env.production aggiornato con il DATABASE_URL corretto (Neon)')
console.log(`   DATABASE_URL: ${newDatabaseUrl.substring(0, 50)}...`)
