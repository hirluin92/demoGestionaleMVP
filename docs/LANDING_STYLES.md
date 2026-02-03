# Stili e Componenti dalla Landing Page

Questo documento descrive gli elementi grafici e gli stili integrati dalla landing page del progetto `customGestionaleOnline`.

## Componenti Disponibili

### GlassCard
Componente card con effetto glassmorphism avanzato.

```tsx
import { GlassCard } from '@/components/ui/GlassCard'

// Variante base
<GlassCard>
  <p>Contenuto della card</p>
</GlassCard>

// Variante avanzata con gradient border
<GlassCard variant="advanced">
  <p>Contenuto con bordo gradient</p>
</GlassCard>
```

### Label
Etichetta stilizzata per sezioni.

```tsx
import { Label } from '@/components/ui/Label'

<Label>Funzionalità</Label>
```

### ParallaxBackground
Sfondo con effetto parallax al movimento del mouse.

```tsx
import { ParallaxBackground } from '@/components/ParallaxBackground'

<ParallaxBackground />
```

### Particles
Particelle animate che fluttuano sullo sfondo.

```tsx
import { Particles } from '@/components/Particles'

<Particles />
```

## Classi CSS Disponibili

### Glass Card
- `.glass-card` - Card base con effetto glassmorphism
- `.glass-card-advanced` - Card con gradient border e top shine
- `.glass-card-enhanced` - Versione migliorata con hover effects

### Animazioni Scroll
Usa l'attributo `data-animate` per attivare animazioni al scroll:

```tsx
<div data-animate className="opacity-0 translate-y-4">
  Contenuto che appare al scroll
</div>
```

L'animazione viene gestita automaticamente da IntersectionObserver.

### Bottoni
- `.btn-gold` - Bottone con gradiente oro
- `.btn-gold-enhanced` - Versione migliorata con animazioni

### Input
- `.input-field` - Input con stile glassmorphism

## Colori

Tutti i colori oro utilizzano le variabili CSS centralizzate:
- `--color-gold-main`: #D3AF37
- `--color-gold-light`: #E5C55A
- `--color-gold-dark`: #B8942A

## Font

Il font utilizzato è "Russo One" per tutto il testo, definito nella variabile CSS `--font-primary`.
