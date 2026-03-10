import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ClientNotesSection } from '@/components/clients/client-notes-section'

// Commenti in italiano: scheda dettaglio cliente con statistiche, storico e note base

interface ClientPageProps {
  params: {
    tenant: string
    clientId: string
  }
}

export default async function ClientDetailPage({ params }: ClientPageProps) {
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

  const client = await prisma.client.findFirst({
    where: {
      id: params.clientId,
      tenantId: session.user.tenantId,
    },
    include: {
      appointments: {
        where: {
          tenantId: session.user.tenantId,
        },
        include: {
          service: true,
          staff: true,
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 30,
      },
      notes: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!client) {
    redirect(`/${params.tenant}/clients`)
  }

  const visits = client.totalVisits
  const totalSpent = client.totalSpent

  let avgFrequencyDays: number | null = null
  if (client.appointments.length > 1) {
    const sorted = [...client.appointments].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    )
    const first = sorted[0]?.startTime
    const last = sorted[sorted.length - 1]?.startTime
    if (first && last) {
      const diffMs = last.getTime() - first.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      avgFrequencyDays = Math.round(diffDays / (sorted.length - 1))
    }
  }

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100)

  const formatDateTime = (d: Date) =>
    d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <section className="space-y-4">
      {/* Header cliente */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {client.name}
          </h1>
          <div className="mt-1 text-xs text-dark-400 space-y-1">
            <div>Telefono: <span className="text-white">{client.phone}</span></div>
            {client.email && (
              <div>Email: <span className="text-white">{client.email}</span></div>
            )}
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-dark-800 text-dark-200 border border-dark-600">
            Visite: <span className="text-white">{visits}</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-dark-800 text-dark-200 border border-dark-600">
            Spesa totale: <span className="text-white">{formatCurrency(totalSpent)}</span>
          </span>
          {avgFrequencyDays !== null && (
            <span className="px-3 py-1 rounded-full bg-dark-800 text-dark-200 border border-dark-600">
              Frequenza media: <span className="text-white">{avgFrequencyDays} gg</span>
            </span>
          )}
        </div>
      </div>

      {/* Storico appuntamenti */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-white">
          Storico appuntamenti
        </h2>
        {client.appointments.length === 0 ? (
          <p className="text-xs text-dark-500">Nessun appuntamento registrato.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-dark-700 p-2">
            {client.appointments.map(apt => (
              <div
                key={apt.id}
                className="flex justify-between items-start gap-2 text-[11px] border-b border-dark-800 last:border-b-0 py-1"
              >
                <div>
                  <div className="text-white">
                    {apt.service.name}
                  </div>
                  <div className="text-dark-400">
                    con {apt.staff.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-dark-300">
                    {formatDateTime(apt.startTime)}
                  </div>
                  <div className="text-white">
                    {formatCurrency(apt.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note cliente */}
      <ClientNotesSection 
        clientId={client.id} 
        tenantSlug={params.tenant}
        initialNotes={client.notes.map(note => ({
          id: note.id,
          type: note.type,
          content: note.content,
          createdAt: note.createdAt.toISOString(),
        }))}
      />
    </section>
  )
}

