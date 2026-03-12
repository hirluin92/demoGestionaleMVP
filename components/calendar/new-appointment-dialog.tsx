'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'

// Commenti in italiano: dialog minimale per creare un nuovo appuntamento dal calendario

interface ServiceOption {
  id: string
  name: string
  duration: number
}

interface NewAppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  tenantSlug: string
  staffId: string
  staffName: string
  startTime: Date
  services: ServiceOption[]
  onCreated?: () => void
}

export function NewAppointmentDialog({
  isOpen,
  onClose,
  tenantSlug,
  staffId,
  staffName,
  startTime,
  services,
  onCreated,
}: NewAppointmentDialogProps) {
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [serviceId, setServiceId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; phone: string | null }[]
  >([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  if (!isOpen) return null

  // Ricerca live cliente per nome/telefono mentre si digita
  useEffect(() => {
    const query = clientName.trim()
    if (!query) {
      setSearchResults([])
      setSelectedClientId(null)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true)
        const res = await fetch(
          `/api/${tenantSlug}/clients/search?q=${encodeURIComponent(query)}`,
        )
        const json = (await res.json().catch(() => null)) as
          | {
              success?: boolean
              data?: { id: string; name: string; phone: string | null }[]
              error?: string
            }
          | null
        if (!res.ok || !json?.success || !json.data) {
          setSearchResults([])
          return
        }
        setSearchResults(json.data)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(timeout)
  }, [clientName, tenantSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!serviceId || !clientName || !clientPhone) return
    setLoading(true)
    try {
      // 1. Determina clientId: usa cliente selezionato o creane uno nuovo
      let clientId: string

      if (selectedClientId) {
        clientId = selectedClientId
      } else {
        // Fallback: logica attuale basata sul telefono (evita duplicati)
        const searchRes = await fetch(
          `/api/${tenantSlug}/clients?q=${encodeURIComponent(clientPhone)}`,
        )
        const searchJson = await searchRes.json()
        const existingClient = searchJson.data?.find((c: { phone: string }) =>
          c.phone.includes(clientPhone.replace(/\s/g, '')),
        )

        if (existingClient) {
          clientId = existingClient.id
        } else {
          const clientRes = await fetch(`/api/${tenantSlug}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: clientName,
              phone: clientPhone,
            }),
          })
          const clientJson = (await clientRes.json().catch(() => null)) as
            | { success?: boolean; data?: { id: string }; error?: string }
            | null
          if (!clientRes.ok || !clientJson?.success || !clientJson.data) {
            throw new Error(clientJson?.error ?? 'Errore creazione cliente')
          }
          clientId = clientJson.data.id
        }
      }

      // 2. Crea appuntamento
      const aptRes = await fetch(`/api/${tenantSlug}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          staffId,
          serviceId,
          startTime: startTime.toISOString(),
        }),
      })
      const aptJson = (await aptRes.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null
      if (!aptRes.ok || !aptJson?.success) {
        // Mostra l'errore specifico restituito dall'API (es. "Operatore non offre questo servizio")
        setError(aptJson?.error ?? 'Errore creazione appuntamento')
        return
      }

      if (onCreated) onCreated()
      onClose()
    } catch (err) {
      console.error(err)
      if (!error) {
        setError("Impossibile creare l'appuntamento.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-6 sm:p-8"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '90vw' }}
      >
        <h2 className="text-lg sm:text-xl font-semibold mb-4">
          Nuovo appuntamento – {staffName}
        </h2>
        <p className="text-xs text-dark-500 mb-4">
          {format(startTime, "EEEE d MMMM yyyy 'alle' HH:mm", { locale: undefined })}
        </p>
        {error && (
          <p className="text-xs text-red-400 mb-2">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-dark-500 mb-1">
              Servizio
            </label>
            <select
              value={serviceId}
              onChange={e => setServiceId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs text-white"
            >
              <option value="">Seleziona un servizio</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-500 mb-1">
              Nome cliente
            </label>
            <div className="relative">
              <input
                type="text"
                value={clientName}
                onChange={e => {
                  setClientName(e.target.value)
                  setSelectedClientId(null)
                }}
                className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs text-white"
                placeholder="Digita nome o numero..."
              />
              {(searchLoading || searchResults.length > 0) && (
                <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-dark-300 bg-[rgba(10,14,24,0.98)] shadow-lg">
                  {searchLoading && (
                    <div className="px-3 py-2 text-[11px] text-dark-400">
                      Ricerca in corso...
                    </div>
                  )}
                  {!searchLoading &&
                    searchResults.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(client.id)
                          setClientName(client.name)
                          setClientPhone(client.phone ?? '')
                          setSearchResults([])
                        }}
                        className="w-full px-3 py-2 text-left text-[11px] hover:bg-dark-700/70"
                      >
                        <div className="font-semibold text-white">
                          {client.name}
                        </div>
                        {client.phone && (
                          <div className="text-[10px] text-dark-300">
                            {client.phone}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-500 mb-1">
              Telefono
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              loading={loading}
              disabled={loading || !serviceId || !clientName || !clientPhone}
            >
              Crea appuntamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

