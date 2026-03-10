import { prisma } from './prisma'

/**
 * Verifica disponibilità di uno slot temporale per un operatore
 * 
 * @param tenantId ID del tenant
 * @param staffId ID dell'operatore
 * @param startTime Orario di inizio
 * @param endTime Orario di fine
 * @param excludeAppointmentId ID appuntamento da escludere (per spostamenti)
 * @returns Oggetto con available (boolean) e conflict (string opzionale)
 */
export async function checkSlotAvailability(
  tenantId: string,
  staffId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<{ available: boolean; conflict?: string }> {
  const overlapping = await prisma.appointment.findFirst({
    where: {
      tenantId,
      staffId,
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      status: { notIn: ['CANCELLED'] },
      OR: [
        // Nuovo inizia durante un esistente
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        // Nuovo finisce durante un esistente
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
        // Nuovo contiene interamente un esistente
        { startTime: { gte: startTime }, endTime: { lte: endTime } },
      ],
    },
    include: { client: true, service: true },
  })

  if (overlapping) {
    return {
      available: false,
      conflict: `Slot occupato: ${overlapping.client.name} - ${overlapping.service.name}`,
    }
  }

  return { available: true }
}
