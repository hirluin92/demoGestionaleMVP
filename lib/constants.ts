/**
 * Costanti globali per Appointly
 */

// Template servizi pre-popolati per categoria
export const SERVICE_TEMPLATES: Record<string, Array<{ name: string; duration: number; price: number }>> = {
  parrucchiere: [
    { name: 'Taglio Uomo', duration: 30, price: 2000 },
    { name: 'Taglio Donna', duration: 45, price: 3500 },
    { name: 'Piega', duration: 30, price: 2500 },
    { name: 'Colore', duration: 90, price: 6000 },
    { name: 'Meches / Balayage', duration: 120, price: 8000 },
    { name: 'Trattamento Ristrutturante', duration: 45, price: 3000 },
  ],
  estetista: [
    { name: 'Pulizia Viso', duration: 60, price: 5000 },
    { name: 'Ceretta Gambe', duration: 30, price: 2500 },
    { name: 'Ceretta Inguine', duration: 20, price: 1500 },
    { name: 'Manicure', duration: 45, price: 2500 },
    { name: 'Pedicure', duration: 60, price: 3500 },
    { name: 'Massaggio Rilassante 60min', duration: 60, price: 5500 },
  ],
  fisioterapista: [
    { name: 'Prima Visita + Valutazione', duration: 60, price: 7000 },
    { name: 'Seduta Fisioterapia', duration: 45, price: 5000 },
    { name: 'Terapia Manuale', duration: 50, price: 6000 },
    { name: 'Riabilitazione Post-Operatoria', duration: 60, price: 6500 },
  ],
  personal_trainer: [
    { name: 'Consulenza Iniziale', duration: 60, price: 5000 },
    { name: 'Allenamento Personalizzato', duration: 60, price: 4000 },
    { name: 'Pacchetto 10 Sedute', duration: 60, price: 35000 },
  ],
  barbiere: [
    { name: 'Taglio Classico', duration: 30, price: 2000 },
    { name: 'Taglio + Barba', duration: 45, price: 3000 },
    { name: 'Rasatura', duration: 20, price: 1500 },
  ],
  nail_artist: [
    { name: 'Manicure Classica', duration: 45, price: 2500 },
    { name: 'Manicure Semipermanente', duration: 60, price: 3500 },
    { name: 'Pedicure', duration: 60, price: 3000 },
    { name: 'Ricostruzione Unghie', duration: 90, price: 5000 },
  ],
  tatuatore: [
    { name: 'Consulenza', duration: 30, price: 0 },
    { name: 'Tatuaggio Piccolo', duration: 60, price: 8000 },
    { name: 'Tatuaggio Medio', duration: 120, price: 15000 },
  ],
  psicologo: [
    { name: 'Prima Consulenza', duration: 60, price: 8000 },
    { name: 'Seduta Individuale', duration: 50, price: 7000 },
    { name: 'Seduta di Coppia', duration: 60, price: 10000 },
  ],
  altro: [],
}

// Costanti calendario
export const SLOT_HEIGHT = 20 // px per slot da 15 minuti
export const HOUR_HEIGHT = SLOT_HEIGHT * 4 // 80px per ora
export const MIN_COL_WIDTH = 200 // px minimo colonna operatore

// Limiti messaggi per piano
export const PLAN_MESSAGE_LIMITS = {
  SOLO: 100,
  PRO: 400,
  STUDIO: 1000,
} as const
