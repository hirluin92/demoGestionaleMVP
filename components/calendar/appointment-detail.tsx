'use client'

import { useState } from 'react'
import { X, CheckCircle, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'

// Commenti in italiano: pannello dettaglio appuntamento minimale per cambio stato / cancellazione

interface AppointmentDetailData {
  id: string
  clientName: string
  serviceName: string
  staffName: string
  startTime: string
  status: string
}

interface AppointmentDetailProps {
  tenantSlug: string
  appointment: AppointmentDetailData | null
  onClose: () => void
  onUpdated?: () => void
}

export function AppointmentDetail({
  tenantSlug,
  appointment,
  onClose,
  onUpdated,
}: AppointmentDetailProps) {
  const [status, setStatus] = useState<string>(appointment?.status ?? 'SCHEDULED')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!appointment) return null

  const handleUpdate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/${tenantSlug}/appointments/${appointment.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      )
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore aggiornamento appuntamento')
      }
      if (onUpdated) onUpdated()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Impossibile aggiornare lo stato.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/${tenantSlug}/appointments/${appointment.id}`,
        { method: 'DELETE' },
      )
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore cancellazione appuntamento')
      }
      if (onUpdated) onUpdated()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Impossibile cancellare l\'appuntamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-md bg-dark-900 border-l border-dark-700 p-4 md:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Dettagli appuntamento
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-dark-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2 text-xs md:text-sm text-dark-200">
          <div>
            <span className="font-semibold text-white">Cliente: </span>
            <span>{appointment.clientName}</span>
          </div>
          <div>
            <span className="font-semibold text-white">Servizio: </span>
            <span>{appointment.serviceName}</span>
          </div>
          <div>
            <span className="font-semibold text-white">Operatore: </span>
            <span>{appointment.staffName}</span>
          </div>
          <div>
            <span className="font-semibold text-white">Inizio: </span>
            <span>{new Date(appointment.startTime).toLocaleString('it-IT')}</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-dark-500">
            Stato appuntamento
          </label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs text-white"
          >
            <option value="SCHEDULED">Programmato</option>
            <option value="CONFIRMED">Confermato</option>
            <option value="IN_PROGRESS">In corso</option>
            <option value="COMPLETED">Completato</option>
            <option value="NO_SHOW">No-show</option>
          </select>
        </div>
        {error && (
          <p className="text-xs text-red-400">
            {error}
          </p>
        )}
        <div className="mt-auto flex gap-2 pt-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleCancel}
            loading={loading}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Cancella
          </Button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={handleUpdate}
            loading={loading}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            Salva
          </Button>
        </div>
      </div>
    </div>
  )
}

