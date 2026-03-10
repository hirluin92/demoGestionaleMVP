# Appointly - Sistema di Gestione Appuntamenti Multi-Tenant

Sistema completo di gestione appuntamenti per attività di servizi (parrucchieri, estetisti, dentisti, ecc.) con supporto multi-tenant, calendario interattivo, prenotazioni pubbliche e integrazione WhatsApp.

## Funzionalità

- ✅ **Multi-tenancy**: Ogni attività ha il proprio spazio isolato
- ✅ **Calendario interattivo**: Vista settimanale con drag & drop, linea tempo corrente
- ✅ **Prenotazioni pubbliche**: Flusso 4-step con integrazione .ics calendar
- ✅ **Gestione clienti**: Lista, dettagli, note testuali e vocali (con AI)
- ✅ **Gestione servizi e staff**: CRUD completo con associazioni
- ✅ **Onboarding wizard**: Setup guidato per nuovi tenant
- ✅ **Dashboard**: Metriche e statistiche in tempo reale
- ✅ **Notifiche WhatsApp**: Conferme e reminder automatici via Twilio
- ✅ **Modalità telefono**: Interfaccia ottimizzata per chiamate
- ✅ **Integrazione Stripe**: Gestione abbonamenti e fatturazione
- ✅ **Note vocali**: Trascrizione e strutturazione automatica con Claude AI

## Stack Tecnologico

- **Next.js 14** - App Router, Server Components, Server Actions
- **TypeScript** - Strict mode, type safety completo
- **Prisma v5** - ORM con PostgreSQL (Neon)
- **NextAuth.js** - Autenticazione multi-role (TENANT_OWNER, STAFF, SUPER_ADMIN)
- **Tailwind CSS** - Styling con tema dark/gold
- **Zod** - Validazione input API
- **Twilio** - WhatsApp Business API
- **Stripe** - Pagamenti e abbonamenti
- **Claude API** - Strutturazione note vocali

## Setup Completo

### 1. Installazione Dipendenze

```bash
npm install
```

### 2. Configurazione Database

Crea un database PostgreSQL (consigliato [Neon](https://neon.tech)) e configura la variabile `DATABASE_URL` nel file `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/appointly?schema=public"
```

Poi esegui:

```bash
npx prisma generate
npx prisma db push
```

### 3. Configurazione Autenticazione

Genera un secret per NextAuth:

```bash
openssl rand -base64 32
```

Aggiungi al file `.env`:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="il-secret-generato"
```

### 4. Configurazione Twilio (WhatsApp)

1. Crea un account su [Twilio](https://www.twilio.com/)
2. Ottieni `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN`
3. Configura un numero WhatsApp Business
4. Crea i template per booking e reminder
5. Aggiungi al file `.env`:

```env
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
TEMPLATE_SID_BOOKING="your-booking-template-sid"
TEMPLATE_SID_REMINDER="your-reminder-template-sid"
```

### 5. Configurazione Stripe

1. Crea un account su [Stripe](https://stripe.com/)
2. Ottieni le API keys
3. Crea i price IDs per i piani (SOLO, PRO, STUDIO)
4. Configura il webhook endpoint
5. Aggiungi al file `.env`:

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_SOLO="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_STUDIO="price_..."
```

### 6. Configurazione Claude API

1. Crea un account su [Anthropic](https://www.anthropic.com/)
2. Ottieni la API key
3. Aggiungi al file `.env`:

```env
ANTHROPIC_API_KEY="sk-ant-..."
```

### 7. Configurazione Cron Job per Reminder

Per inviare automaticamente i reminder WhatsApp, configura un cron job che chiami:

```
GET https://tuo-dominio.com/api/cron/reminders
Authorization: Bearer YOUR_CRON_SECRET
```

Aggiungi al file `.env`:

```env
CRON_SECRET="un-secret-sicuro-per-il-cron"
```

Esempio cron job (ogni ora):

```bash
0 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://tuo-dominio.com/api/cron/reminders
```

Oppure usa [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs).

### 8. Variabili d'Ambiente Complete

Crea un file `.env` con tutte le variabili:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Twilio
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_FROM="whatsapp:+..."
TEMPLATE_SID_BOOKING="..."
TEMPLATE_SID_REMINDER="..."

# Stripe
STRIPE_SECRET_KEY="..."
STRIPE_PUBLISHABLE_KEY="..."
STRIPE_WEBHOOK_SECRET="..."
STRIPE_PRICE_SOLO="..."
STRIPE_PRICE_PRO="..."
STRIPE_PRICE_STUDIO="..."

# Claude API
ANTHROPIC_API_KEY="..."

# Cron
CRON_SECRET="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 9. Avvio Applicazione

```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:3000`

## Struttura Progetto

```
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Route group autenticazione
│   │   ├── login/              # Pagina login
│   │   └── register/           # Pagina registrazione tenant
│   ├── (marketing)/            # Route group marketing
│   │   └── page.tsx            # Landing page pubblica
│   ├── [tenant]/               # Route dinamiche per tenant
│   │   ├── dashboard/          # Dashboard principale
│   │   ├── calendar/          # Calendario settimanale
│   │   ├── clients/           # Gestione clienti
│   │   ├── services/          # Gestione servizi
│   │   ├── staff/             # Gestione operatori
│   │   ├── settings/          # Impostazioni tenant
│   │   ├── billing/           # Gestione abbonamenti
│   │   ├── prenota/           # Prenotazione pubblica
│   │   └── onboarding/        # Wizard setup iniziale
│   └── api/                    # API routes
│       ├── [tenant]/          # API tenant-specifiche
│       ├── cron/              # Cron jobs
│       ├── stripe/            # Webhook Stripe
│       └── twilio/            # Webhook Twilio
├── components/                  # Componenti React
│   ├── calendar/              # Componenti calendario
│   ├── clients/               # Componenti gestione clienti
│   ├── phone-mode/            # Modalità telefono
│   └── ui/                    # Componenti UI base
├── lib/                        # Utilities e configurazioni
│   ├── auth.ts                # Configurazione NextAuth
│   ├── prisma.ts              # Client Prisma
│   ├── env.ts                 # Validazione variabili d'ambiente
│   ├── validators.ts          # Schemi Zod
│   ├── twilio.ts              # Integrazione Twilio
│   ├── stripe.ts              # Integrazione Stripe
│   └── utils.ts              # Funzioni utility
├── prisma/                     # Schema database
│   └── schema.prisma          # Schema Prisma completo
└── scripts/                    # Script di setup
```

## Architettura Multi-Tenant

Ogni query al database **DEVE** filtrare per `tenantId` per garantire l'isolamento dei dati. Questo è implementato tramite:

- `requireTenantAccess()` - Helper per verificare accesso tenant
- Middleware NextAuth - Protezione route tenant-specifiche
- Filtri automatici in tutte le query Prisma

## API Standard

Tutte le API seguono questo formato:

```typescript
{
  success: boolean
  data?: T
  error?: string
}
```

Ogni route API:
1. Verifica autenticazione e accesso tenant
2. Valida input con Zod
3. Esegue logica business
4. Ritorna risposta standardizzata

## Deployment

### Vercel (Consigliato)

1. Push del codice su GitHub
2. Importa il progetto su Vercel
3. Configura tutte le variabili d'ambiente
4. Configura il database (usa Neon o Vercel Postgres)
5. Configura cron job per reminder (Vercel Cron Jobs)
6. Configura webhook Stripe e Twilio

### Altri Provider

Il progetto può essere deployato su qualsiasi provider che supporta Next.js:
- Railway
- Render
- AWS
- DigitalOcean

## Note Importanti

- ⚠️ **Multi-tenancy**: Ogni query DEVE filtrare per `tenantId`
- ⚠️ **TypeScript strict**: Mai usare `any` o `@ts-ignore`
- ⚠️ **Validazione Zod**: Ogni input API deve essere validato
- ⚠️ **Prezzi in centesimi**: Tutti i prezzi sono memorizzati in centesimi (€25.00 = 2500)
- ⚠️ **Commenti in italiano**: Tutti i commenti nel codice sono in italiano

## Licenza

Proprietario - Tutti i diritti riservati
