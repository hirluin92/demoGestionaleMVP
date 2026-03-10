# 🌐 Guida all'Acquisto e Configurazione Dominio

## 🏆 Raccomandazione: **Cloudflare Registrar**

### Perché Cloudflare?

✅ **Prezzi trasparenti**: Costo all'ingrosso, nessun markup  
✅ **DNS gratuito**: Il miglior DNS al mondo, incluso  
✅ **Privacy gratuita**: Whois privacy sempre inclusa  
✅ **Facile integrazione**: Setup Vercel in 5 minuti  
✅ **Nessun costo nascosto**: Prezzo che vedi è quello che paghi  
✅ **Sicurezza**: Protezione DDoS automatica  

### Prezzi Approximativi (2024):
- `.com`: ~$8-10/anno (costo all'ingrosso)
- `.it`: ~$8-12/anno
- `.net`: ~$10-12/anno

---

## 📋 Procedura Completa: Cloudflare

### Step 1: Crea Account Cloudflare

1. Vai su [cloudflare.com](https://www.cloudflare.com/)
2. Clicca **"Sign Up"** (gratuito)
3. Inserisci email e password
4. Verifica email

### Step 2: Acquista Dominio

1. Nel dashboard Cloudflare, vai su **"Registrar"** (menu laterale)
2. Clicca **"Register Domains"**
3. Cerca il dominio desiderato (es. `appointly.com`)
4. Seleziona il dominio e clicca **"Add to Cart"**
5. Completa il checkout (carta di credito/PayPal)
6. ⚠️ **IMPORTANTE**: Disabilita "Auto-renew" se vuoi controllo manuale

### Step 3: Configura DNS per Vercel

1. Nel dashboard Cloudflare, vai su **"Websites"**
2. Clicca sul tuo dominio
3. Vai su **"DNS"** → **"Records"**
4. Aggiungi questi record:

#### Record A (Root Domain):
```
Type: A
Name: @
IPv4 address: 76.76.21.21
Proxy: Proxied (arancione) ✅
TTL: Auto
```

#### Record CNAME (WWW):
```
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy: Proxied (arancione) ✅
TTL: Auto
```

**Nota**: Il "Proxy" (cloud arancione) abilita protezione DDoS e CDN di Cloudflare. Vercel funziona perfettamente con questo.

### Step 4: Configura Dominio su Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Domains**
4. Clicca **"Add Domain"**
5. Inserisci il tuo dominio (es. `appointly.com`)
6. Vercel verificherà automaticamente i DNS records
7. ⚠️ **Attendi 5-10 minuti** per la propagazione DNS

### Step 5: Aggiorna NEXTAUTH_URL

1. In Vercel Dashboard, vai su **Settings** → **Environment Variables**
2. Trova `NEXTAUTH_URL`
3. Modifica da `https://tuo-progetto.vercel.app` a `https://tuodominio.com`
4. Salva

### Step 6: Verifica SSL

1. Attendi 5-10 minuti dopo la configurazione
2. Vai su `https://tuodominio.com`
3. Verifica che ci sia il **lucchetto verde** 🔒
4. Vercel genera automaticamente certificato SSL (Let's Encrypt)

---

## 🔄 Alternative (se Cloudflare non ti convince)

### Namecheap

**Pro**:
- Interfaccia semplice
- Supporto clienti buono
- Prezzi competitivi

**Contro**:
- Più costoso di Cloudflare
- Privacy protection a pagamento (~$3/anno)
- DNS base (consigliato usare Cloudflare DNS comunque)

**Prezzi**:
- `.com`: ~$10-13/anno
- Privacy: +$3/anno

**Setup Namecheap + Cloudflare DNS**:
1. Acquista dominio su Namecheap
2. Cambia nameservers a Cloudflare (gratis)
3. Configura DNS su Cloudflare come sopra

### Google Domains → Squarespace

⚠️ **ATTENZIONE**: Google Domains non esiste più (venduto a Squarespace nel 2023)

**Squarespace Domains**:
- Prezzi simili a Namecheap
- Interfaccia meno intuitiva
- Consigliato evitare se possibile

---

## 🎯 Confronto Finale

| Caratteristica | Cloudflare | Namecheap | Squarespace |
|---------------|------------|-----------|-------------|
| **Prezzo .com** | $8-10/anno | $10-13/anno | $12-15/anno |
| **Privacy** | ✅ Gratis | ❌ $3/anno | ❌ $3/anno |
| **DNS** | ✅ Migliore | ⚠️ Base | ⚠️ Base |
| **Facilità** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Integrazione Vercel** | ✅ Perfetta | ✅ Buona | ✅ Buona |
| **Sicurezza** | ✅ DDoS protection | ⚠️ Base | ⚠️ Base |

---

## 💡 Raccomandazione Finale

**Usa Cloudflare Registrar** perché:
1. È il più economico
2. Include tutto (DNS, privacy, sicurezza)
3. Integrazione perfetta con Vercel
4. Nessun costo nascosto

**Se hai già un dominio su Namecheap**:
- Tienilo lì (non serve trasferirlo)
- Cambia solo i nameservers a Cloudflare (gratis)
- Ottieni tutti i benefici di Cloudflare DNS

---

## ⚠️ Errori Comuni da Evitare

1. **Non usare DNS di Vercel direttamente**: Cloudflare DNS è migliore
2. **Non disabilitare Proxy su Cloudflare**: Lascia "Proxied" (arancione)
3. **Non dimenticare di aggiornare NEXTAUTH_URL**: Critico per NextAuth
4. **Non aspettare troppo poco**: DNS propagation richiede 5-30 minuti

---

## 🧪 Test Post-Configurazione

Dopo aver configurato tutto, verifica:

```bash
# Verifica DNS propagation
nslookup tuodominio.com

# Verifica SSL
curl -I https://tuodominio.com

# Verifica redirect HTTP → HTTPS
curl -I http://tuodominio.com
```

**Risultato atteso**:
- DNS risolve correttamente
- SSL valido (lucchetto verde)
- HTTP reindirizza a HTTPS

---

## 📞 Supporto

**Cloudflare Support**:
- Email: support@cloudflare.com
- Chat: Disponibile nel dashboard
- Documentazione: https://developers.cloudflare.com/

**Vercel Support**:
- Email: support@vercel.com
- Documentazione: https://vercel.com/docs

---

**Tempo totale stimato**: 15-30 minuti  
**Costo annuo**: ~$8-12 per dominio .com
