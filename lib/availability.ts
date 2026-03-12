import { prisma } from './prisma'
import { addMinutes, startOfDay, endOfDay, format, parse, isBefore } from 'date-fns'

interface AvailableSlot {
  startTime: Date
  staffId: string
  staffName: string
  staffColor: string
}

/**
 * Calcola slot disponibili per un servizio in una data specifica
 * 
 * @param tenantId ID del tenant
 * @param serviceId ID del servizio
 * @param date Data per cui calcolare disponibilità
 * @returns Array di slot disponibili
 */
export async function getAvailableSlots(
  tenantId: string,
  serviceId: string,
  date: Date
): Promise<AvailableSlot[]> {
  // 1. Trova il servizio per avere la durata
  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId },
  })
  if (!service) return []

  // 2. Trova staff che offrono questo servizio
  const staffLinks = await prisma.staffService.findMany({
    where: { serviceId },
    include: { staff: true },
  })
  const activeStaff = staffLinks
    .filter(sl => sl.staff.isActive)
    .map(sl => sl.staff)

  if (activeStaff.length === 0) return []

  // 3. Recupera businessHours del tenant come fallback
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })

  const tenantSettings = tenant?.settings as Record<string, unknown> | null
  const tenantBusinessHours = (tenantSettings?.businessHours ?? {}) as Record<
    string,
    { start: string; end: string; break?: { start: string; end: string } } | null
  >

  // 4. Prendi tutti gli appuntamenti del giorno per questi staff
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      staffId: { in: activeStaff.map(s => s.id) },
      startTime: { gte: startOfDay(date), lte: endOfDay(date) },
      status: { notIn: ['CANCELLED'] },
    },
  })

  // 5. Per ogni staff, calcola slot liberi
  const dayName = format(date, 'EEE').toLowerCase().slice(0, 3) // mon, tue, ...
  const slots: AvailableSlot[] = []
  const now = new Date()

  for (const staff of activeStaff) {
    // Commento in italiano: usa workingHours dello staff, con fallback a businessHours del tenant
    const staffWorkingHours = staff.workingHours as Record<
      string,
      { start: string; end: string; break?: { start: string; end: string } } | null
    > | null

    const staffDayHours = staffWorkingHours?.[dayName]
    const tenantDayHours = tenantBusinessHours[dayName]

    // Prendi gli orari dello staff se esistono, altrimenti quelli del tenant
    const hours = staffDayHours ?? tenantDayHours
    if (!hours) continue // Giorno libero per tutti

    const dayStart = parse(hours.start, 'HH:mm', date)
    const dayEnd = parse(hours.end, 'HH:mm', date)
    const staffAppointments = appointments.filter(a => a.staffId === staff.id)

    // Genera slot ogni 15 minuti
    let cursor = dayStart
    while (addMinutes(cursor, service.duration) <= dayEnd) {
      // Salta slot nel passato
      if (isBefore(cursor, now)) {
        cursor = addMinutes(cursor, 15)
        continue
      }

      // Salta durante la pausa
      if (hours.break) {
        const breakStart = parse(hours.break.start, 'HH:mm', date)
        const breakEnd = parse(hours.break.end, 'HH:mm', date)
        const slotEnd = addMinutes(cursor, service.duration)
        if (cursor < breakEnd && slotEnd > breakStart) {
          cursor = addMinutes(cursor, 15)
          continue
        }
      }

      // Controlla conflitti con appuntamenti esistenti
      const slotEnd = addMinutes(cursor, service.duration)
      const hasConflict = staffAppointments.some(
        apt => cursor < apt.endTime && slotEnd > apt.startTime,
      )

      if (!hasConflict) {
        slots.push({
          startTime: new Date(cursor),
          staffId: staff.id,
          staffName: staff.name,
          staffColor: staff.color,
        })
      }

      cursor = addMinutes(cursor, 15)
    }
  }

  // Ordina per orario
  return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}
