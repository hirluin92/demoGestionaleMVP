'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, Clock } from 'lucide-react'
import Button from '@/components/ui/Button'

interface AppointmentData {
  id: string
  client_name: string
  client_email: string
  phone: string | null
  date: string // YYYY-MM-DD
  time: string // HH:MM
  service: string
  status: string
  notes?: string
  userId?: string
  packageId?: string
}

interface EditAppointmentModalProps {
  appointment: AppointmentData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditAppointmentModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: EditAppointmentModalProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [formData, setFormData] = useState({
    date: '',
    time: '',
  })

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen && appointment) {
      // Inizializza il form con i dati dell'appuntamento
      setFormData({
        date: appointment.date,
        time: appointment.time,
      })
    }
  }, [isOpen, appointment])

  useEffect(() => {
    if (formData.date) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots([])
    }
  }, [formData.date])


  const fetchAvailableSlots = async () => {
    if (!formData.date) return
    
    setLoadingSlots(true)
    try {
      const response = await fetch(`/api/available-slots?date=${formData.date}`)
      if (response.ok) {
        const data = await response.json()
        let slots = data.slots

        // Filtra gli orari passati se la data è oggi
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const selectedDateObj = new Date(formData.date)
        const selectedDateOnly = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate())

        if (selectedDateOnly.getTime() === today.getTime()) {
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()
          slots = slots.filter((slot: string) => {
            const [slotHour, slotMinute] = slot.split(':').map(Number)
            return slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute + 1)
          })
        }

        setAvailableSlots(slots)
      }
    } catch (error) {
      console.error('Errore recupero slot:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!formData.date || !formData.time) {
      setError('Compila tutti i campi obbligatori')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/admin/bookings/${appointment?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          time: formData.time,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella modifica dell\'appuntamento')
      }

      onSuccess()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore nella modifica dell\'appuntamento')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !appointment || !mounted) return null

  const today = new Date().toISOString().split('T')[0]

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90vw' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold gold-text-gradient heading-font">
            Modifica Appuntamento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Chiudi"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Data */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-light mb-2 heading-font"
              className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
            >
              Data
            </label>
            <div className="relative">
              <input
                type="date"
                id="date"
                required
                min={today}
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value, time: '' }))}
                className="input-field w-full pr-10"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" />
            </div>
          </div>

          {/* Ora */}
          {formData.date && (
            <div>
              <label
                htmlFor="time"
                className="block text-sm font-light mb-2 heading-font"
                className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
              >
                Ora
              </label>
              <div className="relative">
                <select
                  id="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="input-field w-full appearance-none pr-10"
                  disabled={loadingSlots || availableSlots.length === 0}
                >
                  <option value="">
                    {loadingSlots ? 'Caricamento orari...' : availableSlots.length === 0 ? 'Nessun orario disponibile' : 'Seleziona un orario'}
                  </option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="flex-1"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
