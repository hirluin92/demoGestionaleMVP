# 🎨 Personalizzazione Tema - Font e Colori

## 📋 Come Funziona Attualmente

### ✅ Sistema Centralizzato (Raccomandato)

Il sistema è **parzialmente centralizzato** tramite variabili CSS. Per cambiare font e colori in tutta l'app, modifica **UN SOLO FILE**:

**File: `app/globals.css`** (righe 8-21)

```css
:root {
  /* Font principale */
  --font-primary: var(--font-russo-one), 'Russo One', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Colore oro principale */
  --color-gold-main: #D3AF37;
  --color-gold-light: #E5C55A;
  --color-gold-dark: #B8942A;
  
  /* Varianti colore oro per opacità (RGB) */
  --color-gold-main-rgb: 211, 175, 55;
  --color-gold-light-rgb: 229, 197, 90;
  --color-gold-dark-rgb: 184, 148, 42;
}
```

### 🔄 Come Vengono Usate le Variabili

1. **Tailwind Config** (`tailwind.config.ts`):
   - Le classi Tailwind come `text-gold-400`, `bg-gold-400`, `border-gold-400` usano le variabili CSS
   - Il font `font-sans`, `font-display`, `font-heading` usano `var(--font-primary)`

2. **Componenti React**:
   - ✅ **Usa classi Tailwind**: `className="text-gold-400 bg-gold-200"`
   - ❌ **Evita valori hardcoded**: `style={{ color: '#D3AF37' }}`

3. **CSS Globale** (`app/globals.css`):
   - Le classi utility come `.gold-text-gradient`, `.gold-gradient` usano le variabili CSS

## 🎯 Come Cambiare Font e Colore

### Cambiare il Font

1. Modifica `app/layout.tsx`:
```typescript
import { Nome_Font } from 'next/font/google'

const nomeFont = Nome_Font({ 
  variable: '--font-nome-font',
  // ... altre opzioni
})
```

2. Aggiorna `app/globals.css`:
```css
:root {
  --font-primary: var(--font-nome-font), 'Nome Font', sans-serif;
}
```

### Cambiare il Colore Oro

Modifica **solo** `app/globals.css` (righe 17-19):

```css
:root {
  --color-gold-main: #TUO_COLORE;        /* Colore principale */
  --color-gold-light: #TUO_COLORE_CHIARO; /* Variante chiara */
  --color-gold-dark: #TUO_COLORE_SCURO;   /* Variante scura */
  
  /* IMPORTANTE: Aggiorna anche i valori RGB */
  --color-gold-main-rgb: R, G, B;        /* RGB del colore principale */
  --color-gold-light-rgb: R, G, B;       /* RGB del colore chiaro */
  --color-gold-dark-rgb: R, G, B;        /* RGB del colore scuro */
}
```

**Esempio**: Se vuoi usare `#FFD700` (oro classico):
```css
:root {
  --color-gold-main: #FFD700;
  --color-gold-light: #FFE44D;
  --color-gold-dark: #CCAA00;
  
  --color-gold-main-rgb: 255, 215, 0;
  --color-gold-light-rgb: 255, 228, 77;
  --color-gold-dark-rgb: 204, 170, 0;
}
```

## 📝 Best Practices

### ✅ DO (Fare)

1. **Usa classi Tailwind**:
```tsx
<div className="text-gold-400 bg-gold-200 border-gold-500">
  Testo oro
</div>
```

2. **Usa classi utility CSS**:
```tsx
<h1 className="gold-text-gradient">Titolo</h1>
<div className="gold-gradient">Sfondo</div>
```

3. **Per opacità, usa variabili RGB**:
```tsx
<div style={{ backgroundColor: 'rgba(var(--color-gold-main-rgb), 0.2)' }}>
  Sfondo trasparente
</div>
```

### ❌ DON'T (Non Fare)

1. **Non usare valori hardcoded**:
```tsx
// ❌ SBAGLIATO
<div style={{ color: '#D3AF37' }}>Testo</div>
<div className="text-[#D3AF37]">Testo</div>

// ✅ CORRETTO
<div className="text-gold-400">Testo</div>
```

2. **Non duplicare colori nei componenti**:
```tsx
// ❌ SBAGLIATO
const goldColor = '#D3AF37';

// ✅ CORRETTO
// Usa direttamente le classi Tailwind o le variabili CSS
```

## 🔍 Verifica Componenti

Per trovare componenti che usano ancora valori hardcoded:

```bash
# Cerca valori hardcoded del colore oro
grep -r "#D3AF37" components/
grep -r "#E8DCA0" components/  # Vecchio colore

# Cerca font hardcoded
grep -r "Russo One" components/
```

## 🚀 Migrazione Completa

Alcuni componenti potrebbero ancora usare valori hardcoded. Per migrarli:

1. Sostituisci `#D3AF37` con `text-gold-400` o `bg-gold-400`
2. Sostituisci `rgba(211, 175, 55, ...)` con `rgba(var(--color-gold-main-rgb), ...)`
3. Sostituisci `'Russo One'` con `var(--font-primary)` o classi Tailwind

## 📚 Riferimenti

- **Variabili CSS**: `app/globals.css` (righe 8-21)
- **Config Tailwind**: `tailwind.config.ts`
- **Font Setup**: `app/layout.tsx`
