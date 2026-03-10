import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(time: string): string {
  return time
}

/**
 * Formatta un prezzo in centesimi come valuta EUR
 * @param cents Prezzo in centesimi (es. 2500 = €25.00)
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

/**
 * Normalizza un numero di telefono italiano
 * @param phone Numero di telefono da normalizzare
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\s/g, '').replace(/^\+39/, '')
  return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
}

/**
 * Converte una stringa in slug URL-friendly
 * @param text Testo da convertire
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}