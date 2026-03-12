import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import { Calendar, Clock, Users, MessageSquare, TrendingUp } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

// Commenti in italiano: dashboard tenant con widget attività

interface DashboardWidgetProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  href?: string
}

function DashboardWidget({ title, value, subtitle, icon, href }: DashboardWidgetProps) {
  const content = (
    <Card variant="dark" hover className="h-full">
      <CardContent className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-dark-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          {subtitle && <p className="text-xs text-dark-500">{subtitle}</p>}
        </div>
        {icon && <div className="text-[#57E6D6]">{icon}</div>}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

export default async function TenantDashboardPage({
  params,
}: {
  params: { tenant: string }
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

  const tenantId = session.user.tenantId!
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  
  const next7Days = new Date(todayStart)
  next7Days.setDate(next7Days.getDate() + 7)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // Appuntamenti oggi
  const appointmentsToday = await prisma.appointment.findMany({
    where: {
      tenantId,
      startTime: { gte: todayStart, lt: todayEnd },
      status: { not: 'CANCELLED' },
    },
    include: {
      client: { select: { name: true, phone: true } },
      staff: { select: { name: true } },
      service: { select: { name: true, duration: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  // Appuntamenti prossimi 7 giorni
  const appointmentsNext7Days = await prisma.appointment.count({
    where: {
      tenantId,
      startTime: { gte: todayEnd, lt: next7Days },
      status: { not: 'CANCELLED' },
    },
  })

  // Slot vuoti oggi (calcolo semplificato: business hours - appointments)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })

  const businessHours = tenant?.settings && typeof tenant.settings === 'object' && 'businessHours' in tenant.settings
    ? (tenant.settings as { businessHours?: Record<string, { start: string; end: string }> }).businessHours
    : null

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const dayName = dayNames[now.getDay()] ?? 'mon'
  const todayHours = businessHours?.[dayName]
  
  let emptySlotsToday = 0
  if (todayHours) {
    const startParts = todayHours.start.split(':').map(Number)
    const endParts = todayHours.end.split(':').map(Number)
    const startHour = startParts[0] ?? 0
    const startMin = startParts[1] ?? 0
    const endHour = endParts[0] ?? 0
    const endMin = endParts[1] ?? 0
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const totalMinutes = endMinutes - startMinutes
    const slotsCount = Math.floor(totalMinutes / 30) // Slot da 30 min

    // Commento in italiano: calcola quanti slot da 30 minuti sono effettivamente occupati
    const occupiedSlots = appointmentsToday.reduce((sum, apt) => {
      const duration =
        (apt as { customDurationMinutes?: number }).customDurationMinutes ??
        apt.service.duration
      return sum + Math.ceil(duration / 30)
    }, 0)

    emptySlotsToday = Math.max(0, slotsCount - occupiedSlots)
  }

  // Ultimi clienti (ultimi 5)
  const recentClients = await prisma.client.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
    },
  })

  // Messaggi inviati questo mese
  const messagesThisMonth = await prisma.messageLog.count({
    where: {
      tenantId,
      sentAt: { gte: monthStart, lt: monthEnd },
      channel: 'WHATSAPP',
    },
  })

  // Tempo risparmiato: somma durate servizi completati questo mese
  const completedAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      status: 'COMPLETED',
      endTime: { gte: monthStart, lt: monthEnd },
    },
    include: {
      service: { select: { duration: true } },
    },
  })

  const totalMinutesSaved = completedAppointments.reduce(
    (sum, apt) => sum + apt.service.duration,
    0
  )
  const hoursSaved = Math.floor(totalMinutesSaved / 60)
  const minutesSaved = totalMinutesSaved % 60

  return (
    <section className="space-y-6">
      <SectionHeader
        kicker="Panoramica"
        title="Dashboard del salone"
        subtitle="Panoramica attività, appuntamenti e automazioni che incidono sul fatturato."
      />

      {/* Riga metriche in stile preview landing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardWidget
          title="Agenda oggi"
          value={appointmentsToday.length}
          subtitle={`${appointmentsNext7Days} nei prossimi 7 giorni`}
          icon={<Calendar className="w-6 h-6" />}
          href={`/${params.tenant}/calendar?date=${now.toISOString().split('T')[0]}`}
        />
        <DashboardWidget
          title="Slot liberi"
          value={emptySlotsToday}
          subtitle="Disponibili per prenotazioni"
          icon={<Clock className="w-6 h-6" />}
          href={`/${params.tenant}/calendar?date=${now.toISOString().split('T')[0]}`}
        />
        <DashboardWidget
          title="Cliente oggi"
          value={appointmentsToday.length > 0 ? appointmentsToday[0]?.client?.name ?? '—' : '—'}
          subtitle={
            appointmentsToday.length > 0 ? appointmentsToday[0]?.service?.name ?? 'Nessun appuntamento' : 'Nessun appuntamento'
          }
          icon={<Users className="w-6 h-6" />}
        />
        <DashboardWidget
          title="Tempo risparmiato"
          value={`${hoursSaved}h ${minutesSaved}m`}
          subtitle="Questo mese"
          icon={<TrendingUp className="w-6 h-6" />}
        />
      </div>

      {/* Corpo principale: agenda + "Assistente AI" semplificato */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agenda multi-operatore (lista oggi) */}
        <Card variant="dark">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.18em] text-dark-400">
              Agenda multi-operatore
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsToday.length === 0 ? (
              <p className="text-sm text-dark-400">Nessun appuntamento oggi</p>
            ) : (
              <div className="space-y-3">
                {appointmentsToday.map((apt) => {
                  const timeStr = new Date(apt.startTime).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <Link
                      key={apt.id}
                      href={`/${params.tenant}/calendar?date=${now.toISOString().split('T')[0]}`}
                      className="block p-3 rounded-2xl bg-dark-900/60 hover:bg-dark-800/80 border border-dark-700/60 hover:border-[rgba(122,168,255,0.5)] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{apt.client.name}</p>
                          <p className="text-xs text-dark-400">
                            {apt.service.name} · {apt.staff.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[#57E6D6] text-sm">{timeStr}</p>
                          <p className="text-[11px] text-dark-500 capitalize">
                            {apt.status.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assistente AI (mock basato sui dati reali) */}
        <Card variant="dark">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.18em] text-dark-400">
              Assistente AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="ai-item">
              <strong>Slot libero oggi</strong>
              <span className="block mt-1 text-xs text-dark-300">
                {emptySlotsToday > 0
                  ? `${emptySlotsToday} slot ancora prenotabili per oggi.`
                  : 'Nessuno slot disponibile: agenda piena.'}
              </span>
            </div>
            <div className="ai-item">
              <strong>Messaggi inviati</strong>
              <span className="block mt-1 text-xs text-dark-300">
                {messagesThisMonth} WhatsApp inviati questo mese tra reminder e recall.
              </span>
            </div>
            <div className="ai-item">
              <strong>Focus clienti recenti</strong>
              <span className="block mt-1 text-xs text-dark-300">
                {recentClients.length > 0
                  ? `Ultimo cliente acquisito: ${recentClients[0]?.name ?? ''}.`
                  : 'Ancora nessun nuovo cliente registrato.'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card variant="dark">
        <CardHeader>
          <CardTitle>Ultimi Clienti</CardTitle>
        </CardHeader>
        <CardContent>
          {recentClients.length === 0 ? (
            <p className="text-sm text-dark-400">Nessun cliente ancora</p>
          ) : (
            <div className="space-y-2">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/${params.tenant}/clients/${client.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-800 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-white">{client.name}</p>
                    <p className="text-xs text-dark-400">{client.phone}</p>
                  </div>
                  <Users className="w-4 h-4 text-dark-500" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

