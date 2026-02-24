'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format, addDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { X, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'

interface User {
  id: string
  name: string
  email: string
  userPackages: Array<{
    id: string
    usedSessions: number
    package: {
      id: string
      name: string
      totalSessions: number
      durationMinutes: number
    }
  }>
}

interface AdminBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Data pre-compilata dal click sul calendario (YYYY-MM-DD) */
  prefilledDate?: string
  /** Orario pre-compilato dal click sulla timeline (HH:MM) */
  prefilledTime?: string
}

export default function AdminBookingModal({
  isOpen,
  onClose,
  onSuccess,
  prefilledDate = '',
  prefilledTime = '',
}: AdminBookingModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [dateOverride, setDateOverride] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      // Pre-compila data e orario se passati dal calendario
      setSelectedDate(prefilledDate || '')
      setSelectedUserId('')
      setSelectedPackageId('')
      
      // Verifica se prefilledTime è passato (solo se la data è oggi)
      let initialTime = prefilledTime || ''
      if (prefilledTime && prefilledDate) {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const selDate = new Date(prefilledDate)
        const selDateOnly = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate())
        const isToday = selDateOnly.getTime() === today.getTime()
        
        if (isToday) {
          const [ph, pm] = prefilledTime.split(':').map(Number)
          if (ph < now.getHours() || (ph === now.getHours() && pm <= now.getMinutes())) {
            // Orario passato: non impostarlo
            initialTime = ''
          }
        }
      }
      
      setSelectedTime(initialTime)
      // Se c'è un orario pre-compilato valido (non passato), includilo subito negli slot disponibili
      setAvailableSlots(initialTime ? [initialTime] : [])
      setError('')
      setDateOverride(false)
    }
  }, [isOpen, prefilledDate, prefilledTime])

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots([])
      // Non resettare selectedTime se era pre-compilato dall'esterno
      if (!prefilledTime) setSelectedTime('')
    }
  }, [selectedDate, selectedPackageId])

  useEffect(() => {
    setSelectedPackageId('')
  }, [selectedUserId])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        const usersWithPackages = data.filter((user: User) =>
          user.userPackages && user.userPackages.length > 0
        )
        setUsers(usersWithPackages)
      }
    } catch (error) {
      console.error('Errore recupero utenti:', error)
      setError('Errore nel caricamento dei clienti')
    }
  }

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return
    setLoadingSlots(true)
    try {
      const params = new URLSearchParams({ date: selectedDate, isAdmin: 'true' })
      if (selectedPackageId) params.append('packageId', selectedPackageId)

      const response = await fetch(`/api/available-slots?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        let slots = data.slots

        // Filtra orari passati se oggi
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const selDate = new Date(selectedDate)
        const selDateOnly = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate())
        const isToday = selDateOnly.getTime() === today.getTime()

        if (isToday) {
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()
          slots = slots.filter((slot: string) => {
            const [h, m] = slot.split(':').map(Number)
            if (h < currentHour) return false
            if (h === currentHour && m <= currentMinute) return false
            return true
          })
        }

        // Verifica se prefilledTime è passato (solo se la data è oggi)
        let isPrefilledTimePast = false
        if (prefilledTime && isToday) {
          const [ph, pm] = prefilledTime.split(':').map(Number)
          if (ph < now.getHours() || (ph === now.getHours() && pm <= now.getMinutes())) {
            isPrefilledTimePast = true
          }
        }

        // Se l'orario pre-compilato non è passato e non è negli slot disponibili, aggiungilo
        // (permette all'admin di vedere e selezionare l'orario cliccato sul calendario)
        if (prefilledTime && !isPrefilledTimePast && !slots.includes(prefilledTime)) {
          slots = [prefilledTime, ...slots].sort((a, b) => {
            const [ah, am] = a.split(':').map(Number)
            const [bh, bm] = b.split(':').map(Number)
            return (ah * 60 + am) - (bh * 60 + bm)
          })
        }

        setAvailableSlots(slots)

        // Seleziona l'orario: prefilledTime se non è passato, altrimenti il primo disponibile
        if (prefilledTime && !isPrefilledTimePast) {
          setSelectedTime(prefilledTime)
        } else if (slots.length > 0) {
          // Se prefilledTime è passato o non presente, seleziona il primo slot disponibile
          setSelectedTime(slots[0])
        } else {
          setSelectedTime('')
        }
      }
    } catch (error) {
      console.error('Errore recupero slot:', error)
      setError('Impossibile caricare gli orari disponibili')
    } finally {
      setLoadingSlots(false)
    }
  }

  const selectedUser = users.find(u => u.id === selectedUserId)
  const availablePackages = selectedUser?.userPackages.filter(up => {
    return (up.package.totalSessions - up.usedSessions) > 0
  }) || []

  const availableDates = Array.from({ length: 60 }, (_, i) => {
    const date = addDays(new Date(), i)
    return {
      value: date.toISOString().split('T')[0],
      label: format(date, 'EEE d MMM yyyy', { locale: it })
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedUserId || !selectedPackageId || !selectedDate || !selectedTime) {
      setError('Compila tutti i campi')
      setLoading(false)
      return
    }

    // Valida che l'orario non sia passato (se la data è oggi)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selDate = new Date(selectedDate)
    const selDateOnly = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate())
    
    if (selDateOnly.getTime() === today.getTime()) {
      const [h, m] = selectedTime.split(':').map(Number)
      if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
        setError('Non è possibile prenotare un appuntamento in un orario già passato')
        setLoading(false)
        return
      }
    }

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          packageId: selectedPackageId,
          date: selectedDate,
          time: selectedTime,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          400: data.error || 'Dati non validi',
          404: 'Cliente o pacchetto non trovato',
          409: 'Orario già prenotato',
          500: 'Errore del server',
        }
        setError(errorMessages[response.status] || data.error || 'Errore nella prenotazione')
        return
      }

      onSuccess()
      onClose()
    } catch {
      setError('Impossibile connettersi al server')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !isOpen) return null

  const isDatePrefilled = !!prefilledDate && !dateOverride
  const isTimePrefilled = !!prefilledTime

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95vw' }}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold gold-text-gradient heading-font">
              Prenota Lezione
            </h2>
            {/* Mostra data/ora pre-compilata se presente */}
            {(isDatePrefilled || isTimePrefilled) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {isDatePrefilled && (
                  <span>{format(new Date(selectedDate || prefilledDate), 'EEE d MMM yyyy', { locale: it })}</span>
                )}
                {isDatePrefilled && isTimePrefilled && <span> — </span>}
                {isTimePrefilled && <span className="text-gold-400">{prefilledTime}</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition" aria-label="Chiudi">
            <X className="w-8 h-8" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Cliente */}
          <div>
            <label className="block text-sm font-light mb-2 heading-font text-gold-400" style={{ letterSpacing: '0.5px' }}>
              Cliente
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-field w-full appearance-none pr-10"
                required
              >
                <option value="">Seleziona un cliente</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" />
            </div>
          </div>

          {/* Pacchetto */}
          {selectedUser && (
            <div>
              <label className="block text-sm font-light mb-2 heading-font text-gold-400" style={{ letterSpacing: '0.5px' }}>
                Pacchetto
              </label>
              {availablePackages.length === 0 ? (
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
                  Nessun pacchetto disponibile per questo cliente
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedPackageId}
                    onChange={(e) => setSelectedPackageId(e.target.value)}
                    className="input-field w-full appearance-none pr-10"
                    required
                  >
                    <option value="">Seleziona un pacchetto</option>
                    {availablePackages.map((up) => {
                      const remaining = up.package.totalSessions - up.usedSessions
                      return (
                        <option key={up.id} value={up.package.id}>
                          {up.package.name} — {remaining} / {up.package.totalSessions} sessioni rimaste
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Data — se pre-compilata mostrala come readonly, altrimenti select */}
          <div>
            <label className="block text-sm font-light mb-2 heading-font text-gold-400" style={{ letterSpacing: '0.5px' }}>
              Data
            </label>
            {isDatePrefilled ? (
              <div className="input-field w-full flex items-center justify-between">
                <span className="text-white">
                  {format(new Date(prefilledDate), 'EEEE d MMMM yyyy', { locale: it })}
                </span>
                <button
                  type="button"
                  className="text-[10px] text-gray-500 hover:text-gray-300 transition underline ml-2"
                  onClick={() => {
                    setDateOverride(true)
                  }}
                >
                  Cambia
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field w-full appearance-none pr-10"
                  required
                >
                  <option value="">Seleziona una data</option>
                  {availableDates.map((date) => (
                    <option key={date.value} value={date.value}>{date.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Orario */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-light mb-2 heading-font text-gold-400" style={{ letterSpacing: '0.5px' }}>
                Orario
              </label>
              {loadingSlots ? (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-dark-200 border-t-gold-400 rounded-full animate-spin" />
                  <p className="mt-2 text-xs text-dark-600">Caricamento orari disponibili...</p>
                </div>
              ) : availableSlots.length === 0 && !prefilledTime ? (
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
                  Nessun orario disponibile per questa data
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="input-field w-full appearance-none pr-10"
                    required
                  >
                    <option value="">Seleziona un orario</option>
                    {availableSlots.map((slot: string) => (
                      <option key={slot} value={slot}>
                        {slot}{isTimePrefilled && slot === prefilledTime ? ' ✓ (selezionato dal calendario)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Annulla
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="flex-1"
              disabled={loading || !selectedUserId || !selectedPackageId || !selectedDate || !selectedTime}
              loading={loading}
            >
              {loading ? 'Prenotazione...' : 'Prenota'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
