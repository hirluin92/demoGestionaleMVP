 'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Search, UserPlus } from 'lucide-react'
import Button from '@/components/ui/Button'

// Commenti in italiano: lista clienti con ricerca, filtri e creazione rapida

interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  totalVisits: number
  totalSpent: number
  lastVisitAt: string | null
}

type Filter = 'all' | 'active' | 'dormant' | 'new'

export default function TenantClientsPage() {
  const params = useParams<{ tenant: string }>()
  const tenantSlug = params?.tenant

  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [filter, setFilter] = useState<Filter>(
    (searchParams.get('filter') as Filter) || 'all',
  )
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  useEffect(() => {
    void loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, filter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadClients()
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const loadClients = async () => {
    if (!tenantSlug) return
    setLoading(true)
    setError(null)

    const paramsUrl = new URLSearchParams()
    if (query) paramsUrl.set('q', query)
    if (filter !== 'all') paramsUrl.set('filter', filter)

    try {
      const res = await fetch(
        `/api/${tenantSlug}/clients?${paramsUrl.toString()}`,
      )
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: Client[]; error?: string }
        | null

      if (!res.ok || !json?.success || !json.data) {
        setError(json?.error ?? 'Impossibile caricare i clienti.')
        return
      }

      setClients(json.data)

      // Aggiorna URL per deep link
      const nextParams = new URLSearchParams()
      if (query) nextParams.set('q', query)
      if (filter !== 'all') nextParams.set('filter', filter)
      const qs = nextParams.toString()
      router.replace(qs ? `?${qs}` : '?')
    } catch {
      setError('Errore di rete durante il caricamento dei clienti.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantSlug || !newClientName || !newClientPhone) return
    setCreatingClient(true)
    try {
      const res = await fetch(`/api/${tenantSlug}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          phone: newClientPhone,
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore creazione cliente')
      }
      setShowNewClient(false)
      setNewClientName('')
      setNewClientPhone('')
      void loadClients()
    } catch (err) {
      console.error(err)
      setError('Impossibile creare il cliente.')
    } finally {
      setCreatingClient(false)
    }
  }

  const formatLastVisit = (iso: string | null) => {
    if (!iso) return 'Nessuna visita'
    return new Date(iso).toLocaleDateString('it-IT')
  }

  const formatSpent = (cents: number) =>
    new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100)

  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Clienti
        </h1>
        <div className="flex gap-2">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cerca per nome o telefono..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs md:text-sm text-white"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          </div>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={() => setShowNewClient(true)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Nuovo cliente
          </Button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(
          [
            ['all', 'Tutti'],
            ['active', 'Attivi (<30gg)'],
            ['dormant', 'Dormienti (>60gg)'],
            ['new', 'Nuovi (1 visita)'],
          ] as Array<[Filter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full border text-xs transition-smooth ${
              filter === value
                ? 'border-accent-main bg-accent-main/10 text-white'
                : 'border-dark-300 bg-dark-100/20 text-dark-400 hover:border-accent-main/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-xs text-dark-500">
          Caricamento clienti...
        </p>
      )}

      {!loading && !error && clients.length === 0 && (
        <p className="text-xs text-dark-500">
          Nessun cliente trovato.
        </p>
      )}

      {/* Lista clienti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {clients.map(client => (
          <Link
            key={client.id}
            href={`/${tenantSlug}/clients/${client.id}`}
            className="border border-dark-700 rounded-lg px-3 py-2.5 hover:border-accent-main/60 hover:bg-dark-800/60 transition-smooth"
          >
            <div className="flex justify-between items-start gap-2 mb-1">
              <div>
                <div className="text-sm font-semibold text-white">
                  {client.name}
                </div>
                <div className="text-[11px] text-dark-400">
                  {client.phone}
                </div>
              </div>
              <div className="text-right text-[11px] text-dark-500">
                <div>
                  Visite: <span className="text-white">{client.totalVisits}</span>
                </div>
                <div>
                  Spesa: <span className="text-white">{formatSpent(client.totalSpent)}</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-dark-500">
              Ultima visita: {formatLastVisit(client.lastVisitAt)}
            </div>
          </Link>
        ))}
      </div>

      {/* Dialog nuovo cliente */}
      {showNewClient && (
        <div className="modal-overlay" onClick={() => setShowNewClient(false)}>
          <div
            className="modal-content glass-card rounded-xl p-6 sm:p-8"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '420px', width: '90vw' }}
          >
            <h2 className="text-lg font-semibold mb-4">
              Nuovo cliente
            </h2>
            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-dark-500 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dark-500 mb-1">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={newClientPhone}
                  onChange={e => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewClient(false)}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  loading={creatingClient}
                  disabled={creatingClient || !newClientName || !newClientPhone}
                >
                  Salva
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

