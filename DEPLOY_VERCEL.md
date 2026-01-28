# Guida Deploy su Vercel

Questa guida ti aiuterà a deployare l'applicazione Hugemass su Vercel.

## Prerequisiti

1. Account Vercel (gratuito): [vercel.com](https://vercel.com)
2. Account GitHub/GitLab/Bitbucket (per il repository)
3. Database PostgreSQL (consigliato: Neon, Supabase, o Vercel Postgres)

## Step 1: Preparazione Repository

### 1.1 Commit e Push del Codice

Assicurati che tutto il codice sia committato e pushato su GitHub:

```bash
git add .
git commit -m "Preparazione per deploy Vercel"
git push origin main
```

### 1.2 Verifica File Necessari

Assicurati che questi file siano presenti:
- ✅ `package.json`
- ✅ `next.config.js` (se presente)
- ✅ `prisma/schema.prisma`
- ✅ `.gitignore` (con `.env` escluso)

## Step 2: Setup Database

### Opzione A: Neon (Consigliato - Gratuito)

1. Vai su [neon.tech](https://neon.tech)
2. Crea un account gratuito
3. Crea un nuovo progetto
4. Copia la **Connection String** (sarà simile a: `postgresql://user:password@host/dbname?sslmode=require`)

### Opzione B: Supabase

1. Vai su [supabase.com](https://supabase.com)
2. Crea un nuovo progetto
3. Vai su Settings → Database
4. Copia la **Connection String**

### Opzione C: Vercel Postgres

1. Nel dashboard Vercel, vai su Storage
2. Crea un nuovo Postgres database
3. Copia la connection string

## Step 3: Deploy su Vercel

### 3.1 Importa il Progetto

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Connetti il tuo repository GitHub/GitLab/Bitbucket
3. Seleziona il repository `customSaasMKDA`
4. Clicca su **Import**

### 3.2 Configurazione Progetto

Vercel dovrebbe rilevare automaticamente:
- **Framework Preset**: Next.js
- **Root Directory**: `./` (lasciare vuoto)
- **Build Command**: `npm run build` (automatico)
- **Output Directory**: `.next` (automatico)
- **Install Command**: `npm install` (automatico)

### 3.3 Configurazione Variabili d'Ambiente

Nella sezione **Environment Variables**, aggiungi tutte queste variabili:

#### Variabili Richieste (obbligatorie):

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
NEXTAUTH_URL=https://tuo-progetto.vercel.app
NEXTAUTH_SECRET=genera-un-secret-di-almeno-32-caratteri
```

**Per generare NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

#### Variabili Opzionali (ma consigliate):

```env
# Google Calendar (se usi Google Calendar)
GOOGLE_CLIENT_ID=tuo-google-client-id
GOOGLE_CLIENT_SECRET=tuo-google-client-secret
GOOGLE_CALENDAR_ID=primary

# Resend (per email password reset)
RESEND_API_KEY=re_tua-api-key
RESEND_FROM_EMAIL=noreply@tudominio.com

# Twilio (per WhatsApp - opzionale)
TWILIO_ACCOUNT_SID=tuo-account-sid
TWILIO_AUTH_TOKEN=tuo-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890

# Admin (per creare l'utente admin iniziale)
ADMIN_EMAIL=admin@hugemass.com
ADMIN_PASSWORD=tua-password-sicura

# Cron (per reminder automatici - opzionale)
CRON_SECRET=genera-un-secret-di-almeno-16-caratteri
```

**⚠️ IMPORTANTE**: 
- Per `NEXTAUTH_URL`, usa l'URL che Vercel ti assegnerà (es: `https://custom-saas-mkda.vercel.app`)
- Dopo il primo deploy, Vercel ti darà un URL. Aggiorna `NEXTAUTH_URL` con quello URL

### 3.4 Deploy

1. Clicca su **Deploy**
2. Attendi che il build completi (circa 2-5 minuti)
3. Se ci sono errori, controlla i log nel dashboard Vercel

## Step 4: Post-Deploy - Setup Database

### 4.1 Esegui Migration Database

Dopo il primo deploy, devi eseguire le migration del database. Hai due opzioni:

#### Opzione A: Usando Vercel CLI (Consigliato)

```bash
# Installa Vercel CLI
npm i -g vercel

# Login
vercel login

# Link al progetto
vercel link

# Esegui migration
npx prisma migrate deploy
```

#### Opzione B: Usando Script Locale

1. Crea un file `.env.local` con le stesse variabili di Vercel
2. Esegui localmente:
```bash
npx prisma migrate deploy
```

### 4.2 Crea Utente Admin

Dopo aver eseguito le migration, crea l'utente admin:

```bash
npm run seed:admin
```

Oppure usa lo script direttamente con le variabili d'ambiente:

```bash
DATABASE_URL="..." ADMIN_EMAIL="admin@hugemass.com" ADMIN_PASSWORD="..." npm run seed:admin
```

## Step 5: Verifica Deploy

1. Vai all'URL del tuo progetto Vercel (es: `https://custom-saas-mkda.vercel.app`)
2. Prova a fare login con le credenziali admin
3. Verifica che tutte le funzionalità funzionino:
   - ✅ Login
   - ✅ Dashboard admin
   - ✅ Dashboard cliente
   - ✅ Creazione clienti
   - ✅ Creazione pacchetti
   - ✅ Prenotazioni

## Step 6: Configurazione Domini Personalizzati (Opzionale)

1. Nel dashboard Vercel, vai su **Settings** → **Domains**
2. Aggiungi il tuo dominio personalizzato
3. Configura i DNS come indicato da Vercel
4. Aggiorna `NEXTAUTH_URL` con il nuovo dominio

## Troubleshooting

### Errore: "DATABASE_URL is required"

- Verifica che la variabile `DATABASE_URL` sia configurata correttamente nel dashboard Vercel
- Assicurati che la connection string includa `?sslmode=require` per database esterni

### Errore: "NEXTAUTH_SECRET is required"

- Genera un nuovo secret: `openssl rand -base64 32`
- Aggiungilo alle variabili d'ambiente in Vercel

### Errore Build: "Prisma Client not generated"

Aggiungi questo script al `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Database Migration non eseguite

1. Vai su **Settings** → **Build & Development Settings**
2. Aggiungi un **Build Command** personalizzato:
```bash
npx prisma generate && npm run build
```

Oppure crea un file `vercel.json`:

```json
{
  "buildCommand": "npx prisma generate && npm run build"
}
```

### Google Calendar non funziona

1. Verifica che `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` siano configurati
2. Nel Google Cloud Console, aggiungi l'URL di produzione agli **Authorized redirect URIs**:
   - `https://tuo-progetto.vercel.app/api/auth/callback/google`

### Email non funzionano

1. Verifica che `RESEND_API_KEY` e `RESEND_FROM_EMAIL` siano configurati
2. Se usi un dominio personalizzato, verifica il dominio su Resend
3. Per sviluppo, puoi usare domini di test di Resend

## Comandi Utili

### Verifica Variabili d'Ambiente

Nel dashboard Vercel, vai su **Settings** → **Environment Variables** per vedere tutte le variabili configurate.

### Logs in Tempo Reale

```bash
vercel logs --follow
```

### Deploy Manuale

```bash
vercel --prod
```

### Rollback a Versione Precedente

Nel dashboard Vercel, vai su **Deployments**, trova la versione precedente e clicca su **Promote to Production**.

## Note Importanti

1. **Database**: Vercel non include un database PostgreSQL gratuito. Usa Neon (gratuito fino a 0.5GB) o Supabase (gratuito fino a 500MB)

2. **Build Time**: Il primo build può richiedere più tempo per generare Prisma Client

3. **Environment Variables**: Le variabili d'ambiente sono case-sensitive. Usa esattamente i nomi indicati

4. **NEXTAUTH_URL**: Deve corrispondere esattamente all'URL del tuo progetto Vercel (con `https://`)

5. **SSL**: Vercel gestisce automaticamente SSL/HTTPS per tutti i domini

## Supporto

Se hai problemi durante il deploy:
1. Controlla i log di build nel dashboard Vercel
2. Verifica che tutte le variabili d'ambiente siano configurate
3. Assicurati che il database sia accessibile da internet
4. Controlla che Prisma Client sia generato correttamente
