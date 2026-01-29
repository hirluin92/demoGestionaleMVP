# Risolvere Migrazioni Fallite su Vercel

Il database Neon su Vercel ha alcune migrazioni che sono state applicate manualmente ma non sono state tracciate correttamente da Prisma.

## Passi da seguire:

1. **Risolvi la migrazione fallita `20260127205432_add_body_measurements`:**
   ```bash
   set DATABASE_URL=postgresql://neondb_owner:npg_F1L6IAEPOrHv@ep-billowing-wave-agupx4jo.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require^&channel_binding=require
   npx prisma migrate resolve --rolled-back 20260127205432_add_body_measurements
   ```

2. **Se la tabella `body_measurements` esiste già, segnala come applicata:**
   ```bash
   npx prisma migrate resolve --applied 20260127205432_add_body_measurements
   ```

3. **Riapplica tutte le migrazioni:**
   ```bash
   npx prisma migrate deploy
   ```

## Alternativa: Usa Neon SQL Editor

Se preferisci, puoi eseguire manualmente la migrazione `20260129134239_add_user_packages_many_to_many` direttamente nel Neon SQL Editor:

1. Vai su [Neon Console](https://console.neon.tech)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Copia e incolla il contenuto di `prisma/migrations/20260129134239_add_user_packages_many_to_many/migration.sql`
5. Esegui la query

Poi segna la migrazione come applicata:
```bash
npx prisma migrate resolve --applied 20260129134239_add_user_packages_many_to_many
```
