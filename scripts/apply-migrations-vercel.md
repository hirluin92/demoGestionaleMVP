# Applicare Migrazioni al Database Neon su Vercel

## Problema
Il database Neon su Vercel non ha la tabella `user_packages` perché le migrazioni Prisma non sono state applicate.

## Soluzione

### Opzione 1: Usando il DATABASE_URL di Vercel (Consigliato)

1. **Ottieni il DATABASE_URL da Vercel:**
   - Vai su [Vercel Dashboard](https://vercel.com/dashboard)
   - Seleziona il tuo progetto
   - Vai su **Settings** → **Environment Variables**
   - Copia il valore di `DATABASE_URL`

2. **Applica le migrazioni:**
   ```bash
   # Sostituisci <DATABASE_URL> con il valore copiato da Vercel
   DATABASE_URL="<DATABASE_URL>" npx prisma migrate deploy
   ```

   Oppure, se preferisci usare un file `.env` temporaneo:
   ```bash
   # Crea un file .env.vercel temporaneo
   echo 'DATABASE_URL="<DATABASE_URL>"' > .env.vercel
   
   # Applica le migrazioni
   dotenv -e .env.vercel -- npx prisma migrate deploy
   
   # Rimuovi il file temporaneo dopo
   rm .env.vercel
   ```

### Opzione 2: Usando Neon Console (Alternativa)

1. Vai su [Neon Console](https://console.neon.tech)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Esegui manualmente il contenuto della migrazione:
   - Apri `prisma/migrations/20260129134239_add_user_packages_many_to_many/migration.sql`
   - Copia tutto il contenuto
   - Incollalo nell'SQL Editor di Neon
   - Esegui la query

### Verifica

Dopo aver applicato le migrazioni, verifica che la tabella esista:

```sql
-- Esegui questa query nel Neon SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_packages';
```

Dovresti vedere `user_packages` nella lista.

## Note

- Le migrazioni sono **idempotenti**: se esegui `prisma migrate deploy` più volte, non creerà duplicati
- Assicurati che il `DATABASE_URL` sia corretto e che abbia i permessi necessari
- Dopo aver applicato le migrazioni, riprova ad aggiungere un nuovo cliente su Vercel
