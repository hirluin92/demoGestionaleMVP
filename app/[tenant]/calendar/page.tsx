import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { startOfWeek, endOfWeek } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CalendarGrid, type CalendarAppointment, type CalendarStaff } from '@/components/calendar/calendar-grid'
import { CalendarHeader } from '@/components/calendar/calendar-header'

// Commenti in italiano: pagina calendario che usa componenti CalendarHeader e CalendarGrid

export default async function TenantCalendarPage({
  params,
  searchParams,
}: {
  params: { tenant: string }
  searchParams?: { date?: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (
    session.user.tenantSlug !== params.tenant &&
    session.user.role !== 'SUPER_ADMIN'
  ) {
    redirect('/login')
  }

  const baseDate = searchParams?.date ? new Date(searchParams.date) : new Date()
  // Settimana corrente (lunedì-domenica)
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })

  // Commento in italiano: fetch staff, servizi e appuntamenti per la settimana corrente filtrando per tenantId
  const [staff, services, appointments] = await Promise.all([
    prisma.staff.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.service.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        duration: true,
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId: session.user.tenantId,
        startTime: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        client: true,
        service: true,
        staff: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    }),
  ])

  const staffForCalendar: CalendarStaff[] = staff.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
  }))

  const appointmentsForCalendar: CalendarAppointment[] = appointments.map(a => ({
    id: a.id,
    clientName: a.client.name,
    serviceName: a.service.name,
    staffId: a.staffId,
    staffName: a.staff.name,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    status: a.status,
  }))

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Calendario
        </h1>
        <span className="text-xs text-dark-500">
          Settimana dal{' '}
          {weekStart.toLocaleDateString('it-IT')}
          {' '}al{' '}
          {weekEnd.toLocaleDateString('it-IT')}
        </span>
      </div>

      <CalendarHeader currentDate={baseDate} />

      <CalendarGrid
        tenantSlug={params.tenant}
        staff={staffForCalendar}
        appointments={appointmentsForCalendar}
        servicesForCreation={services}
      />
    </section>
  )
}

