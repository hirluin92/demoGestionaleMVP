'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar as CalendarIcon, Clock, Sparkles, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Package {
  id: string
  name: string
  totalSessions: number
  usedSessions: number
}

interface BookingFormProps {
  packages: Package[]
  onSuccess: () => void
}

export default function BookingForm({ packages, onSuccess }: BookingFormProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // Seleziona automaticamente il primo pacchetto con sessioni disponibili
  const activePackage = packages.find(pkg => {
    const remaining = pkg.totalSessions - pkg.usedSessions
    return remaining > 0
  })

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots([])
      setSelectedTime('')
    }
  }, [selectedDate])

  // Verifica che ci sia almeno un pacchetto disponibile
  if (!activePackage) {
    return (
      <div className="bg-dark-100/50 border-2 border-dark-200/30 rounded-xl p-4 md:p-6 text-center backdrop-blur-sm">
        <p className="text-dark-600 font-semibold text-sm md:text-base">Nessun pacchetto disponibile</p>
        <p className="text-xs md:text-sm text-dark-700 mt-1">Contatta l'amministratore per acquistare un pacchetto</p>
      </div>
    )
  }

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true)
    try {
      const response = await fetch(`/api/available-slots?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        let slots = data.slots
        
        // Se la data selezionata è oggi, filtra anche gli orari passati (doppia sicurezza lato client)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const selectedDateObj = new Date(selectedDate)
        const selectedDateOnly = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate())
        
        if (selectedDateOnly.getTime() === today.getTime()) {
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()
          
          slots = slots.filter((slot: string) => {
            const [slotHour, slotMinute] = slot.split(':').map(Number)
            
            // Se l'ora dello slot è passata, escludilo
            if (slotHour < currentHour) {
              return false
            }
            
            // Se l'ora è la stessa, controlla i minuti
            if (slotHour === currentHour && slotMinute <= currentMinute) {
              return false
            }
            
            return true
          })
        }
        
        setAvailableSlots(slots)
      }
    } catch (error) {
      console.error('Errore recupero slot:', error)
      setError('Impossibile caricare gli orari disponibili')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: activePackage.id,
          date: selectedDate,
          time: selectedTime,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          400: data.details 
            ? `Dati non validi: ${data.details.map((d: any) => d.message).join(', ')}`
            : 'Verifica data e orario',
          404: 'Pacchetto non trovato',
          409: 'Orario già prenotato',
          429: 'Troppe richieste. Attendi.',
          500: 'Errore del server',
        }
        
        setError(errorMessages[response.status] || data.error || 'Errore')
        return
      }

      setSuccess(true)
      setSelectedDate('')
      setSelectedTime('')
      setAvailableSlots([])
      
      if (onSuccess) onSuccess()
      router.refresh()

      setTimeout(() => setSuccess(false), 5000)
    } catch (error) {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6" aria-label="Form prenotazione sessione">
      {/* Success Message */}
      {success && (
        <div 
          className="alert-success"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start">
            <CheckCircle2 className="w-6 h-6 text-green-400 mr-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-green-300 text-sm md:text-base">Prenotazione Confermata!</p>
              <p className="text-xs md:text-sm text-green-400/80 mt-1">Riceverai una conferma via WhatsApp</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          className="alert-error"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm md:text-base font-semibold text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Date Selection */}
      <div>
        <label 
          htmlFor="date-select"
          className="block text-xs md:text-sm font-bold text-dark-700 mb-2 md:mb-3 flex items-center"
        >
          <CalendarIcon className="w-4 h-4 mr-2 text-gold-400" aria-hidden="true" />
          Seleziona Data
        </label>
        <input
          id="date-select"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={today}
          required
          aria-required="true"
          className="w-full px-4 py-3 md:py-3.5 bg-dark-100/50 backdrop-blur-sm border-2 border-dark-200/30 rounded-xl text-white text-sm md:text-base focus-visible:border-gold-400 focus-visible:ring-2 focus-visible:ring-gold-400/20 transition-all cursor-pointer hover:border-dark-300/50"
        />
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="animate-slide-down">
          <label 
            htmlFor="time-selection"
            className="block text-xs md:text-sm font-bold text-dark-700 mb-2 md:mb-3 flex items-center"
          >
            <Clock className="w-4 h-4 mr-2 text-gold-400" aria-hidden="true" />
            Seleziona Orario
          </label>
          
          {loadingSlots ? (
            <div 
              className="flex items-center justify-center py-8 md:py-12 bg-dark-100/30 rounded-xl border border-dark-200/30"
              role="status"
              aria-live="polite"
              aria-label="Caricamento orari disponibili"
            >
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-gold-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" aria-hidden="true" />
              </div>
              <span className="sr-only">Caricamento slot disponibili...</span>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="bg-dark-100/50 border-2 border-dark-200/30 rounded-xl p-4 md:p-6 text-center backdrop-blur-sm">
              <Clock className="w-8 h-8 md:w-10 md:h-10 text-dark-500 mx-auto mb-2 md:mb-3" aria-hidden="true" />
              <p className="text-dark-600 font-semibold text-sm md:text-base">Nessuno slot disponibile</p>
              <p className="text-xs md:text-sm text-dark-700 mt-1">Prova un'altra data</p>
            </div>
          ) : (
            <div 
              id="time-selection"
              className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3"
              role="radiogroup"
              aria-label="Orari disponibili"
            >
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  role="radio"
                  aria-checked={selectedTime === slot}
                  onClick={() => setSelectedTime(slot)}
                  className={`
                    px-3 py-2.5 md:px-4 md:py-3.5 rounded-xl font-bold text-xs md:text-sm transition-smooth relative overflow-hidden group
                    ${selectedTime === slot
                      ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-dark-950 shadow-gold scale-105 ring-2 ring-gold-400 ring-offset-2 ring-offset-dark-950'
                      : 'bg-dark-100/50 text-dark-600 border-2 border-dark-200/30 hover:border-gold-400/50 hover:text-gold-400 hover:scale-105'
                    }
                  `}
                >
                  <span className="relative z-10">{slot}</span>
                  {selectedTime !== slot && (
                    <span className="hidden md:block absolute inset-0 bg-gradient-to-r from-gold-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="gold"
        size="lg"
        fullWidth
        loading={loading}
        disabled={!selectedDate || !selectedTime}
        aria-label="Conferma prenotazione sessione"
      >
        {!loading && <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" aria-hidden="true" />}
        Conferma Prenotazione
      </Button>
    </form>
  )
}
