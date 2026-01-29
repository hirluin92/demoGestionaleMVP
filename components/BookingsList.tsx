'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, X, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale/it'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Booking {
  id: string
  date: string
  time: string
  status: string
  userId: string
  package: {
    name: string
  }
  user?: {
    id: string
    name: string
    email: string
  }
}

interface BookingsListProps {
  onCancel?: () => void
  showCountOnly?: boolean
}

export default function BookingsList({ onCancel, showCountOnly }: BookingsListProps) {
  const { data: session } = useSession()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [])

  // Ascolta eventi di refresh (da BookingForm o cancellazioni)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleRefresh = () => {
        fetchBookings()
      }
      window.addEventListener('booking-created', handleRefresh)
      window.addEventListener('booking-cancelled', handleRefresh)
      return () => {
        window.removeEventListener('booking-created', handleRefresh)
        window.removeEventListener('booking-cancelled', handleRefresh)
      }
    }
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings')
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      }
    } catch (error) {
      console.error('Errore recupero prenotazioni:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelClick = (bookingId: string) => {
    setConfirmingDelete(bookingId)
  }

  const handleConfirmDelete = async (bookingId: string) => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nella cancellazione')
      }

      fetchBookings()
      if (onCancel) {
        onCancel()
      }
      
      // Trigger evento per aggiornare altri componenti
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('booking-cancelled'))
      }
      
      setConfirmingDelete(null)
      
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nella cancellazione della prenotazione')
    } finally {
      setIsDeleting(false)
    }
  }

  if (showCountOnly) {
    return <>{bookings.length}</>
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
        <p className="mt-4 text-dark-600">Caricamento prenotazioni...</p>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-dark-500 mx-auto mb-4" />
        <p className="text-dark-600 font-semibold">Nessuna prenotazione</p>
        <p className="text-sm text-dark-500 mt-2">Prenota la tua prima sessione utilizzando il form sopra</p>
      </div>
    )
  }

  // Filtra prenotazioni future considerando anche l'ora
  const upcomingBookings = bookings
    .filter(b => {
      const bookingDateTime = new Date(b.date)
      const [hours, minutes] = b.time.split(':').map(Number)
      bookingDateTime.setHours(hours, minutes, 0, 0)
      return bookingDateTime >= new Date()
    })
    .sort((a, b) => {
      const dateA = new Date(a.date)
      const [hoursA, minutesA] = a.time.split(':').map(Number)
      dateA.setHours(hoursA, minutesA, 0, 0)
      
      const dateB = new Date(b.date)
      const [hoursB, minutesB] = b.time.split(':').map(Number)
      dateB.setHours(hoursB, minutesB, 0, 0)
      
      return dateA.getTime() - dateB.getTime()
    })

  // Filtra prenotazioni passate considerando anche l'ora
  const pastBookings = bookings
    .filter(b => {
      const bookingDateTime = new Date(b.date)
      const [hours, minutes] = b.time.split(':').map(Number)
      bookingDateTime.setHours(hours, minutes, 0, 0)
      return bookingDateTime < new Date()
    })
    .sort((a, b) => {
      const dateA = new Date(a.date)
      const [hoursA, minutesA] = a.time.split(':').map(Number)
      dateA.setHours(hoursA, minutesA, 0, 0)
      
      const dateB = new Date(b.date)
      const [hoursB, minutesB] = b.time.split(':').map(Number)
      dateB.setHours(hoursB, minutesB, 0, 0)
      
      return dateB.getTime() - dateA.getTime()
    })

  return (
    <div className="space-y-6">
      {upcomingBookings.length > 0 && (
        <div>
          <h4 className="font-display font-bold text-white mb-4 text-lg md:text-xl flex items-center">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-gold-400 mr-2" />
            Prossime Prenotazioni
          </h4>
          <div className="space-y-3">
            {upcomingBookings.map((booking) => {
              const bookingDate = new Date(booking.date)
              const [hours, minutes] = booking.time.split(':').map(Number)
              bookingDate.setHours(hours, minutes, 0, 0)
              
              const now = new Date()
              const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
              const canCancel = hoursUntilBooking >= 3
              const isPast = bookingDate < new Date()

              return (
                <div
                  key={booking.id}
                  className={`bg-dark-100/50 backdrop-blur-sm border-2 rounded-xl p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300 group ${
                    isPast 
                      ? 'opacity-60 border-dark-400/30 hover:border-dark-400/50' 
                      : 'border-dark-200/30 hover:border-gold-400/50'
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="bg-gradient-to-br from-gold-400 to-gold-500 p-3 rounded-xl shadow-gold group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="w-5 h-5 md:w-6 md:h-6 text-dark-950" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-white text-base md:text-lg mb-1">
                        {format(bookingDate, "EEEE d MMMM yyyy", { locale: it })}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-dark-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gold-400" />
                          <span className="font-semibold">{booking.time}</span>
                        </div>
                        <span className="text-dark-500">•</span>
                        <Badge variant="gold" size="sm">{booking.package.name}</Badge>
                        {booking.user && booking.user.id !== session?.user?.id && (
                          <>
                            <span className="text-dark-500">•</span>
                            <span className="text-xs text-dark-500 italic">
                              Prenotato da {booking.user.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isPast && (
                    <div className="flex-shrink-0">
                      {!canCancel && (
                        <div className="text-xs text-dark-500 text-right">
                          <p className="mb-1">Non cancellabile</p>
                          <p className="text-dark-600">Meno di 3 ore</p>
                        </div>
                      )}
                      {canCancel && confirmingDelete === booking.id ? (
                        <div className="bg-gold-500/10 border-2 border-gold-400/30 rounded-xl p-4 backdrop-blur-sm animate-scale-in">
                          <div className="flex items-center mb-2">
                            <AlertTriangle className="w-5 h-5 text-gold-400 mr-2" />
                            <p className="text-sm font-bold text-white">
                              Confermi la cancellazione?
                            </p>
                          </div>
                          <p className="text-xs text-dark-600 mb-3">
                            {booking.user && booking.user.id !== session?.user?.id
                              ? 'La sessione verrà restituita a tutti gli atleti del pacchetto multiplo.'
                              : 'La sessione verrà restituita al tuo pacchetto.'}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleConfirmDelete(booking.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Cancellazione...' : 'Sì, cancella'}
                            </Button>
                            <Button
                              variant="outline-gold"
                              size="sm"
                              onClick={() => setConfirmingDelete(null)}
                              disabled={isDeleting}
                            >
                              Annulla
                            </Button>
                          </div>
                        </div>
                      ) : canCancel ? (
                        <button
                          onClick={() => handleCancelClick(booking.id)}
                          className="text-accent-danger hover:text-accent-danger/80 p-2 hover:bg-accent-danger/10 rounded-lg transition-colors"
                          title="Cancella prenotazione"
                          aria-label="Cancella prenotazione"
                        >
                          <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pastBookings.length > 0 && (
        <div>
          <h4 className="font-display font-bold text-dark-600 mb-4 text-lg md:text-xl flex items-center">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-dark-500 mr-2" />
            Prenotazioni Passate
          </h4>
          <div className="space-y-3">
            {pastBookings.map((booking) => {
              const bookingDate = new Date(booking.date)

              return (
                <div
                  key={booking.id}
                  className="bg-dark-100/30 backdrop-blur-sm border border-dark-200/20 rounded-xl p-4 md:p-6 flex items-center space-x-4 opacity-60"
                >
                  <div className="bg-dark-200 p-3 rounded-xl">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-dark-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-dark-600 text-base md:text-lg mb-1">
                      {format(bookingDate, "EEEE d MMMM yyyy", { locale: it })}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-dark-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{booking.time}</span>
                      </div>
                      <span>•</span>
                      <Badge variant="info" size="sm">{booking.package.name}</Badge>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
