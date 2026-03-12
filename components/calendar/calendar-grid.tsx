'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TimeColumn } from './time-column'
import { StaffHeader } from './staff-header'
import { AppointmentBlock } from './appointment-block'
import { NewAppointmentDialog } from './new-appointment-dialog'
import { AppointmentDetail } from './appointment-detail'

// Commenti in italiano: griglia principale del calendario (vista settimanale base)

export interface CalendarStaff {
  id: string
  name: string
  color: string
}

export interface CalendarAppointment {
  id: string
  clientName: string
  serviceName: string
  staffId: string
  staffName?: string
  startTime: string
  endTime: string
  status: string
}

interface CalendarGridProps {
  tenantSlug?: string
  staff: CalendarStaff[]
  appointments: CalendarAppointment[]
  startHour?: number
  endHour?: number
  slotMinutes?: number
  servicesForCreation?: { id: string; name: string; duration: number }[]
}

const SLOT_HEIGHT = 20

export function CalendarGrid({
  tenantSlug,
  staff,
  appointments,
  startHour = 8,
  endHour = 20,
  slotMinutes = 15,
  servicesForCreation = [],
}: CalendarGridProps) {
  const router = useRouter()
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [newAptInfo, setNewAptInfo] = useState<{
    staffId: string
    staffName: string
    startTime: Date
  } | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)

  const totalMinutes = (endHour - startHour) * 60
  const slotsCount = totalMinutes / slotMinutes
  const staffCount = staff.length

  const parsedAppointments = useMemo(
    () =>
      appointments.map(apt => ({
        ...apt,
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
      })),
    [appointments],
  )

  // Commento in italiano: calcola per ogni appuntamento la colonna di sovrapposizione
  // in modo simile a Apple Calendar (offset orizzontale progressivo).
  const overlapColumnsById = useMemo(() => {
    const map: Record<string, number> = {}

    staff.forEach(staffMember => {
      // Raggruppa per giorno per evitare che gli appuntamenti di giorni diversi
      // vengano considerati sovrapposti
      const byDate: Record<string, typeof parsedAppointments> = {}

      parsedAppointments
        .filter(apt => apt.staffId === staffMember.id)
        .forEach(apt => {
          const key = apt.start.toISOString().slice(0, 10) // yyyy-MM-dd
          if (!byDate[key]) byDate[key] = []
          byDate[key].push(apt)
        })

      Object.values(byDate).forEach(dayAppointments => {
        const extended = dayAppointments
          .map(apt => {
            const startMins = apt.start.getHours() * 60 + apt.start.getMinutes()
            const endMins = apt.end.getHours() * 60 + apt.end.getMinutes()
            return { ...apt, startMins, endMins }
          })
          .sort(
            (a, b) =>
              a.startMins - b.startMins || b.endMins - a.endMins,
          )

        const overlap = (
          a: { startMins: number; endMins: number },
          b: { startMins: number; endMins: number },
        ) => a.startMins < b.endMins && a.endMins > b.startMins

        const colOf: Record<string, number> = {}

        extended.forEach(ev => {
          const earlierOverlapping = extended.filter(other =>
            other.id !== ev.id && overlap(ev, other) && other.id in colOf,
          )

          colOf[ev.id] =
            earlierOverlapping.length === 0
              ? 0
              : Math.max(...earlierOverlapping.map(o => colOf[o.id])) + 1
        })

        Object.entries(colOf).forEach(([id, col]) => {
          map[id] = col
        })
      })
    })

    return map
  }, [parsedAppointments, staff])

  // Commento in italiano: calcola la riga corrente per la linea rossa "ora attuale"
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowRow =
    nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60
      ? Math.floor((nowMinutes - startHour * 60) / slotMinutes) + 2
      : null

  // Scroll automatico sull'ora corrente al primo render
  useEffect(() => {
    if (!containerRef.current || nowRow === null) return
    const y = (nowRow - 2) * SLOT_HEIGHT - 160
    containerRef.current.scrollTop = Math.max(y, 0)
  }, [nowRow])

  const openNewAppointment = (staffId: string, startRow: number) => {
    const staffIndex = staff.findIndex(s => s.id === staffId)
    if (staffIndex === -1) return

    const minutesFromStart = (startRow - 2) * slotMinutes
    const totalMinutesFromMidnight = startHour * 60 + minutesFromStart

    const date = new Date()
    date.setHours(Math.floor(totalMinutesFromMidnight / 60), totalMinutesFromMidnight % 60, 0, 0)

    const selectedStaff = staff[staffIndex]
    if (selectedStaff) {
      setNewAptInfo({
        staffId,
        staffName: selectedStaff.name,
        startTime: date,
      })
    }
  }

  // Commento in italiano: gestisce il drop di un appuntamento su uno slot
  const handleDropOnSlot = async (appointmentId: string, staffId: string, slotIndex: number) => {
    if (!tenantSlug) return

    const apt = parsedAppointments.find(a => a.id === appointmentId)
    if (!apt) return

    const minutesFromStart = slotIndex * slotMinutes
    const totalMinutesFromMidnight = startHour * 60 + minutesFromStart

    const nextStart = new Date(apt.start)
    nextStart.setHours(
      Math.floor(totalMinutesFromMidnight / 60),
      totalMinutesFromMidnight % 60,
      0,
      0,
    )

    try {
      const res = await fetch(`/api/${tenantSlug}/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: nextStart.toISOString(), staffId }),
      })

      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null

      if (!res.ok || !json?.success) {
        // Logga l'errore per debug; in futuro potremo mostrare un toast.
        // eslint-disable-next-line no-console
        console.error('Errore spostamento appuntamento:', json?.error ?? 'Unknown error')
        return
      }

      router.refresh()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Errore di rete spostamento appuntamento:', error)
    }
  }

  const selectedAppointment =
    selectedAppointmentId &&
    appointments.find(a => a.id === selectedAppointmentId)

  return (
    <div
      ref={containerRef}
      className="relative overflow-x-auto glass-panel calendar-agenda"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `60px repeat(${staffCount}, minmax(200px, 1fr))`,
          gridTemplateRows: `48px repeat(${slotsCount}, ${SLOT_HEIGHT}px)`,
        }}
      >
        {/* Header staff */}
        <div className="border-b border-dark-700" />
        {staff.map(s => (
          <div key={s.id} className="border-b border-dark-700 border-l border-dark-800">
            <StaffHeader name={s.name} color={s.color} />
          </div>
        ))}

        {/* Colonna orari */}
        <TimeColumn
          startHour={startHour}
          endHour={endHour}
          slotMinutes={slotMinutes}
          slotHeight={SLOT_HEIGHT}
        />

        {/* Colonne staff (sfondo slot cliccabile) */}
        {staff.map((s, index) => (
          <div
            key={s.id}
            className="border-l border-[rgba(148,163,184,0.28)]/40 relative"
            style={{
              gridColumn: index + 2,
              gridRow: `2 / span ${slotsCount}`,
            }}
          >
            {Array.from({ length: slotsCount }, (_, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                onClick={() => {
                  if (tenantSlug && servicesForCreation.length > 0) {
                    openNewAppointment(s.id, i + 2)
                  }
                }}
                onDragOver={event => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                }}
                onDrop={event => {
                  event.preventDefault()
                  const appointmentId = event.dataTransfer.getData('application/appointly-appointment-id')
                  if (!appointmentId) return
                  void handleDropOnSlot(appointmentId, s.id, i)
                }}
                className={`calendar-slot ${
                  i % (60 / slotMinutes) === 0
                    ? 'calendar-slot-major'
                    : 'calendar-slot-minor'
                }`}
                style={{ height: SLOT_HEIGHT }}
              />
            ))}
          </div>
        ))}

        {/* Appuntamenti */}
        {parsedAppointments.map(apt => {
          const staffIndex = staff.findIndex(s => s.id === apt.staffId)
          if (staffIndex === -1) return null

          const staffColor = staff[staffIndex]?.color ?? '#3B82F6'

          return (
            <AppointmentBlock
              key={apt.id}
              id={apt.id}
              clientName={apt.clientName}
              serviceName={apt.serviceName}
              startTime={apt.start}
              endTime={apt.end}
              staffIndex={staffIndex + 1}
              columnOffset={1}
              slotMinutes={slotMinutes}
              calendarStartHour={startHour}
              color={staffColor}
              status={apt.status}
              overlapColumn={overlapColumnsById[apt.id] ?? 0}
              slotHeight={SLOT_HEIGHT}
              onResizeEnd={(appointmentId, newDurationMinutes) => {
                if (!tenantSlug) return
                void (async () => {
                  try {
                    const res = await fetch(
                      `/api/${tenantSlug}/appointments/${appointmentId}`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customDurationMinutes: newDurationMinutes,
                        }),
                      },
                    )
                    const json = (await res.json().catch(() => null)) as
                      | { success?: boolean; error?: string }
                      | null
                    if (!res.ok || !json?.success) {
                      // eslint-disable-next-line no-console
                      console.error(
                        'Errore aggiornamento durata appuntamento:',
                        json?.error ?? 'Errore sconosciuto',
                      )
                      return
                    }
                    router.refresh()
                  } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error(
                      'Errore di rete aggiornamento durata appuntamento:',
                      error,
                    )
                  }
                })()
              }}
              onClick={setSelectedAppointmentId}
            />
          )
        })}

        {/* Linea rossa ora corrente */}
        {nowRow !== null && (
          <div
            className="pointer-events-none col-span-full row-span-1 border-t-2 border-red-500/80"
            style={{
              gridColumn: `1 / span ${staffCount + 1}`,
              gridRowStart: nowRow,
            }}
          />
        )}
      </div>

      {/* Dialog creazione appuntamento */}
      {tenantSlug && newAptInfo && servicesForCreation.length > 0 && (
        <NewAppointmentDialog
          isOpen={!!newAptInfo}
          onClose={() => setNewAptInfo(null)}
          tenantSlug={tenantSlug}
          staffId={newAptInfo.staffId}
          staffName={newAptInfo.staffName}
          startTime={newAptInfo.startTime}
          services={servicesForCreation}
          onCreated={() => router.refresh()}
        />
      )}

      {/* Dettaglio appuntamento */}
      {tenantSlug && selectedAppointment && (
        <AppointmentDetail
          tenantSlug={tenantSlug}
          appointment={{
            id: selectedAppointment.id,
            clientName: selectedAppointment.clientName,
            serviceName: selectedAppointment.serviceName,
            staffName:
              staff.find(s => s.id === selectedAppointment.staffId)?.name ?? '',
            startTime: selectedAppointment.startTime,
            status: selectedAppointment.status,
          }}
          onClose={() => setSelectedAppointmentId(null)}
          onUpdated={() => router.refresh()}
        />
      )}
    </div>
  )
}

