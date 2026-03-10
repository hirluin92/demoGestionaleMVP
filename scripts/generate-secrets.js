#!/usr/bin/env node

/**
 * Script per generare secret per Appointly
 * Uso: node scripts/generate-secrets.js
 */

const crypto = require('crypto')

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64')
}

console.log('🔐 Secret generati per Appointly:\n')
console.log('NEXTAUTH_SECRET=')
console.log(generateSecret(32))
console.log('\nCRON_SECRET=')
console.log(generateSecret(32))
console.log('\n✅ Copia questi valori nel tuo file .env')
