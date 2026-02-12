'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format, addDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { X, Calendar as CalendarIcon, Clock, User, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
}

export default function AdminBookingModal({ isOpen, onClose, onSuccess }: AdminBookingModalProps) {
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

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      // Reset form quando si apre
      setSelectedUserId('')
      setSelectedPackageId('')
      setSelectedDate('')
      setSelectedTime('')
      setAvailableSlots([])
      setError('')
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots([])
      setSelectedTime('')
    }
  }, [selectedDate, selectedPackageId])

  useEffect(() => {
    // Reset package quando cambia utente
    setSelectedPackageId('')
  }, [selectedUserId])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        // Filtra solo utenti con pacchetti attivi
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
      // Costruisci i parametri della query
      const params = new URLSearchParams({
        date: selectedDate,
        isAdmin: 'true',
      })
      
      if (selectedPackageId) {
        params.append('packageId', selectedPackageId)
        // isMultiplePackage sarà determinato automaticamente dal backend
      }
      
      const response = await fetch(`/api/available-slots?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        let slots = data.slots
        
        // Filtra orari passati se la data è oggi
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const selectedDateObj = new Date(selectedDate)
        const selectedDateOnly = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate())
        
        if (selectedDateOnly.getTime() === today.getTime()) {
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()
          
          slots = slots.filter((slot: string) => {
            const [slotHour, slotMinute] = slot.split(':').map(Number)
            if (slotHour < currentHour) return false
            if (slotHour === currentHour && slotMinute <= currentMinute) return false
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

  const selectedUser = users.find(u => u.id === selectedUserId)
  const availablePackages = selectedUser?.userPackages.filter(up => {
    const remaining = up.package.totalSessions - up.usedSessions
    return remaining > 0
  }) || []

  const today = new Date().toISOString().split('T')[0]
  
  // Genera array di date disponibili (prossimi 60 giorni)
  const availableDates = Array.from({ length: 60 }, (_, i) => {
    const date = addDays(new Date(), i)
    return {
      value: date.toISOString().split('T')[0],
      label: format(date, 'd MMM yyyy', { locale: it })
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

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    } catch (error) {
      setError('Impossibile connettersi al server')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !isOpen) return null

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95vw' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gold-text-gradient heading-font">
            Prenota Lezione
          </h2>
          <button
            onClick={onClose}
            className="text-4xl text-gray-400 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Selezione Cliente */}
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
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          {/* Selezione Pacchetto */}
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
                    {availablePackages.map((userPackage) => {
                      const remaining = userPackage.package.totalSessions - userPackage.usedSessions
                      const isMultiple = userPackage.package.name === 'Multiplo' || userPackage.package.name === 'Singolo'
                      const packageType = isMultiple ? (userPackage.package.name) : userPackage.package.name
                      return (
                        <option key={userPackage.id} value={userPackage.package.id}>
                          {packageType} - {remaining} / {userPackage.package.totalSessions} sessioni rimaste
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
                </div>
              )}
            </div>
          )}

          {/* Selezione Data */}
          <div>
            <label htmlFor="date" className="block text-sm font-light mb-2 heading-font text-gold-400" style={{ letterSpacing: '0.5px' }}>
              Data
            </label>
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
                  <option key={date.value} value={date.value}>
                    {date.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          {/* Selezione Orario */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-light mb-2 heading-font text-gold-400" style={{ letterSpacing: '0.5px' }}>
                Orario
              </label>
              {loadingSlots ? (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
                  <p className="mt-2 text-xs text-dark-600">Caricamento orari disponibili...</p>
                </div>
              ) : availableSlots.length === 0 ? (
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
                        {slot}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
                </div>
              )}
            </div>
          )}

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
