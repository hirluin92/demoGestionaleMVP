import { z } from 'zod'

/**
 * Schemi Zod condivisi tra frontend e backend
 * Usa questi schemi per validare input API e form
 */

// ==========================================
// REGISTRAZIONE TENANT
// ==========================================
export const registerTenantSchema = z.object({
  businessName: z.string().min(2).max(100),
  category: z.enum([
    'parrucchiere', 'estetista', 'dentista',
    'fisioterapista', 'personal_trainer', 'barbiere',
    'nail_artist', 'tatuatore', 'psicologo', 'altro',
  ]),
  city: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
})

// ==========================================
// APPUNTAMENTO
// ==========================================
export const createAppointmentSchema = z.object({
  clientId: z.string().cuid(),
  staffId: z.string().cuid(),
  serviceId: z.string().cuid(),
  startTime: z.string().datetime(),
  customDurationMinutes: z.number().int().min(5).max(480).optional(),
  notes: z.string().optional(),
})

export const updateAppointmentSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  startTime: z.string().datetime().optional(),
  staffId: z.string().cuid().optional(),
  customDurationMinutes: z.number().int().min(5).max(480).optional(),
  notes: z.string().optional(),
})

// ==========================================
// CLIENTE
// ==========================================
export const createClientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  optInMarketing: z.boolean().default(false),
  optInReminders: z.boolean().default(true),
})

export const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  optInMarketing: z.boolean().optional(),
  optInReminders: z.boolean().optional(),
})

// ==========================================
// SERVIZIO
// ==========================================
export const createServiceSchema = z.object({
  name: z.string().min(2),
  duration: z.number().int().min(15).max(480), // 15 min - 8 ore
  price: z.number().int().min(0), // Centesimi
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#8B5CF6'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

// ==========================================
// STAFF
// ==========================================
export const createStaffSchema = z.object({
  name: z.string().min(2),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  isActive: z.boolean().default(true),
  workingHours: z.record(z.any()).default({}),
  serviceIds: z.array(z.string().cuid()).default([]),
})

// ==========================================
// NOTA CLIENTE
// ==========================================
export const createClientNoteSchema = z.object({
  type: z.enum(['GENERAL', 'ALLERGY', 'PREFERENCE', 'HISTORY', 'VOICE']).default('GENERAL'),
  content: z.string().min(1),
})

// ==========================================
// PRENOTAZIONE PUBBLICA
// ==========================================
export const publicBookingSchema = z.object({
  serviceId: z.string().cuid(),
  staffId: z.string().cuid(),
  startTime: z.string().datetime(),
  clientName: z.string().min(2),
  clientPhone: z.string().min(10),
  optInReminders: z.boolean().default(true),
  optInMarketing: z.boolean().default(false),
})
