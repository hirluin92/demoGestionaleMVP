# ✅ Checklist Rapida Pre-Consegna

## 🔴 CRITICO (Prima della consegna)

- [ ] **Dominio personalizzato** configurato e funzionante
- [ ] **NEXTAUTH_URL** aggiornato con dominio personalizzato in Vercel
- [ ] **Tutte le variabili d'ambiente** configurate in Vercel (Production)
- [ ] **Database Neon** di produzione configurato e testato
- [ ] **Account admin** creato e testato
- [ ] **SSL/HTTPS** attivo (verifica lucchetto verde)
- [ ] **Test completi** eseguiti (login, prenotazioni, admin)
- [ ] **Google Calendar** configurato e testato
- [ ] **WhatsApp (Twilio)** configurato e testato
- [ ] **Email (Resend)** configurato con dominio verificato

## 🟡 IMPORTANTE (Prime 2 settimane)

- [ ] **Backup database** verificati e testati
- [ ] **Monitoring** configurato (Vercel Analytics o esterno)
- [ ] **Documentazione utente** fornita
- [ ] **Documentazione admin** fornita
- [ ] **Training cliente** completato
- [ ] **Supporto post-launch** organizzato
- [ ] **Privacy Policy** pubblicata
- [ ] **Terms of Service** pubblicati

## 🟢 RACCOMANDATO (Primo mese)

- [ ] **Performance optimization** (Lighthouse > 90)
- [ ] **Security headers** verificati
- [ ] **Backup manuali** settimanali configurati
- [ ] **Disaster recovery plan** documentato
- [ ] **SLA supporto** comunicato al cliente

---

## 📋 Variabili d'Ambiente da Verificare

Controlla in **Vercel → Settings → Environment Variables** che siano presenti:

```
✅ DATABASE_URL
✅ NEXTAUTH_URL (con dominio personalizzato!)
✅ NEXTAUTH_SECRET
✅ GOOGLE_CLIENT_ID
✅ GOOGLE_CLIENT_SECRET
✅ GOOGLE_CALENDAR_ID
✅ TWILIO_ACCOUNT_SID
✅ TWILIO_AUTH_TOKEN
✅ TWILIO_WHATSAPP_FROM
✅ RESEND_API_KEY
✅ RESEND_FROM_EMAIL (dominio verificato!)
✅ CRON_SECRET
✅ ADMIN_EMAIL
✅ ADMIN_PASSWORD
```

---

## 🧪 Test da Eseguire

### Test Funzionali
- [ ] Login cliente funziona
- [ ] Login admin funziona
- [ ] Prenotazione sessione funziona
- [ ] Cancellazione prenotazione funziona
- [ ] Creazione pacchetto funziona
- [ ] Creazione cliente funziona
- [ ] Inserimento misurazioni funziona
- [ ] Visualizzazione grafici funziona

### Test Integrazione
- [ ] Google Calendar sync funziona
- [ ] WhatsApp notifications funzionano
- [ ] Email password reset funziona
- [ ] Cron job reminders funziona

### Test Browser
- [ ] Chrome ✅
- [ ] Firefox ✅
- [ ] Safari ✅
- [ ] Edge ✅
- [ ] Mobile (iOS) ✅
- [ ] Mobile (Android) ✅

---

## 📞 Informazioni da Fornire al Cliente

- [ ] **URL applicazione**: https://tuodominio.com
- [ ] **Credenziali admin**: [fornire in modo sicuro]
- [ ] **Documentazione**: [link o file]
- [ ] **Supporto**: [email/telefono]
- [ ] **SLA**: [tempi di risposta]

---

## 🚀 Comandi Utili

```bash
# Verifica database
npm run check:neon

# Verifica admin
npm run check:admin

# Test build locale
npm run build

# Deploy manuale
vercel --prod
```

---

**Per dettagli completi, vedi**: `docs/HANDOVER_PRODUCTION.md`
