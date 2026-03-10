'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Search, PhoneCall, X } from 'lucide-react'

// Commenti in italiano:
// Modalità telefono attivo - overlay full-screen con ricerca rapida cliente

interface PhoneModeClient {
  id: string
  name: string
  phone: string
  lastAppointment: {
    date: string
    service: string
    staff: string
  } | null
  allergies: string[]
}

interface PhoneModeProps {
  isActive: boolean
  onClose: () => void
}

export function PhoneMode({ isActive, onClose }: PhoneModeProps) {
  const params = useParams<{ tenant: string }>()
  const tenantSlug = params?.tenant
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<PhoneModeClient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isActive, onClose])

  useEffect(() => {
    if (!isActive || !query || !tenantSlug) {
      setClients([])
      return
    }
    const timeout = setTimeout(() => {
      void searchClients()
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isActive, tenantSlug])

  const searchClients = async () => {
    if (!tenantSlug || !query) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/${tenantSlug}/clients/search?q=${encodeURIComponent(query)}`)
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: PhoneModeClient[]; error?: string }
        | null
      if (!res.ok || !json?.success || !json.data) {
        setError(json?.error ?? 'Errore ricerca clienti.')
        return
      }
      setClients(json.data)
    } catch {
      setError('Errore di rete durante la ricerca.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenBooking = (clientId: string) => {
    if (!tenantSlug) return
    // Commento in italiano: per ora reindirizziamo alla pagina cliente;
    // in step successivi potremo aprire direttamente la prenotazione con cliente preselezionato.
    router.push(`/${tenantSlug}/clients/${clientId}`)
    onClose()
  }

  const handleCreateNewClient = () => {
    if (!tenantSlug) return
    router.push(`/${tenantSlug}/clients?new=1`)
    onClose()
  }

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-50 max-w-3xl w-full mx-4 bg-dark-900 rounded-2xl border border-dark-700 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gold-300">
            <PhoneCall className="w-5 h-5" />
            <span className="text-sm font-semibold">Modalità telefono attivo</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-dark-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-dark-400 mb-1">
            Cerca cliente per nome o numero
          </label>
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full px-10 py-3 rounded-xl bg-dark-800 border border-dark-600 text-sm text-white"
              placeholder="Es. Mario, 3331234567..."
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400">
            {error}
          </p>
        )}
        {loading && (
          <p className="text-xs text-dark-400">
            Ricerca in corso...
          </p>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {clients.map(client => (
            <button
              key={client.id}
              type="button"
              onClick={() => handleOpenBooking(client.id)}
              className="w-full text-left px-3 py-2 rounded-lg border border-dark-700 hover:border-gold-400/60 hover:bg-dark-800/60 transition-smooth"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {client.name}
                  </div>
                  <div className="text-[11px] text-dark-400">
                    {client.phone}
                  </div>
                  {client.allergies.length > 0 && (
                    <div className="text-[11px] text-red-300 mt-1">
                      Allergie: {client.allergies.join(', ')}
                    </div>
                  )}
                </div>
                {client.lastAppointment && (
                  <div className="text-right text-[11px] text-dark-400">
                    <div>Ultimo: {new Date(client.lastAppointment.date).toLocaleDateString('it-IT')}</div>
                    <div>{client.lastAppointment.service}</div>
                    <div>con {client.lastAppointment.staff}</div>
                  </div>
                )}
              </div>
            </button>
          ))}
          {!loading && !error && query && clients.length === 0 && (
            <p className="text-xs text-dark-500">
              Nessun cliente trovato. Premi &quot;Nuovo cliente&quot; per registrarlo al volo.
            </p>
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-dark-800 mt-2">
          <button
            type="button"
            onClick={handleCreateNewClient}
            className="text-xs text-gold-300 hover:text-gold-100"
          >
            + Nuovo cliente
          </button>
          <p className="text-[10px] text-dark-500">
            Fai in modo di chiudere la prenotazione in meno di 45 secondi.
          </p>
        </div>
      </div>
    </div>
  )
}

