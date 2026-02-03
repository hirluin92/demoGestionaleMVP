'use client'

import { useState, useEffect } from 'react'
import { format, addDays, subDays, startOfMonth, endOfMonth, getDay, parseISO, addMonths, subMonths, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AppointmentDetailModal from '@/components/AppointmentDetailModal'

interface Booking {
  id: string
  date: string // ISO string
  time: string // "HH:mm"
  status: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  package: {
    id: string
    name: string
    durationMinutes: number
    isMultiple?: boolean
    athletes?: Array<{
      id: string
      name: string
      email: string
      phone: string | null
    }>
  }
}

type CalendarView = 'month' | 'day'

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
  isPast?: boolean // Flag per appuntamenti passati
  userId?: string // User ID per modifica
  packageId?: string // Package ID per modifica
  durationMinutes: number // Durata in minuti
  isMultiplePackage?: boolean // Flag per pacchetti multipli
}

export default function AdminCalendar() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarView, setCalendarView] = useState<CalendarView>('day')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentDay, setCurrentDay] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null)
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Rileva se siamo su mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Verifica se un appuntamento è passato
  const isAppointmentPast = (apt: AppointmentData): boolean => {
    const now = new Date()
    const appointmentDateTime = new Date(`${apt.date}T${apt.time}:00`)
    return appointmentDateTime < now
  }

  // Trasforma i booking dal formato API al formato del calendario
  const transformBookings = (bookings: Booking[]): AppointmentData[] => {
    return bookings.map(booking => {
      const bookingDate = parseISO(booking.date)
      const appointmentDateTime = new Date(`${format(bookingDate, 'yyyy-MM-dd')}T${booking.time}:00`)
      const isPast = appointmentDateTime < new Date()
      
      // Per pacchetti multipli, mostra tutti gli atleti
      let clientName = booking.user.name
      const isMultiple = booking.package.isMultiple && booking.package.athletes && booking.package.athletes.length > 1
      if (isMultiple && booking.package.athletes) {
        const athleteNames = booking.package.athletes.map(a => a.name).join(', ')
        clientName = athleteNames
      }
      
      return {
        id: booking.id,
        client_name: clientName,
        client_email: booking.user.email,
        phone: booking.user.phone,
        date: format(bookingDate, 'yyyy-MM-dd'),
        time: booking.time,
        service: booking.package.name,
        status: booking.status.toLowerCase(),
        notes: `${booking.package.durationMinutes} minuti`,
        isPast, // Aggiungi flag per appuntamenti passati
        userId: booking.user.id, // Aggiungi userId per modifica
        packageId: booking.package.id, // Aggiungi packageId per modifica
        durationMinutes: booking.package.durationMinutes, // Durata in minuti
        isMultiplePackage: isMultiple, // Flag per pacchetti multipli
      }
    })
  }

  const allAppointments = transformBookings(bookings)

  useEffect(() => {
    fetchBookings()
  }, [calendarView, currentMonth, currentDay])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      let startDate: Date
      let endDate: Date

      if (calendarView === 'day') {
        startDate = startOfDay(currentDay)
        endDate = addDays(startDate, 1)
      } else {
        // Month view - fetch tutto il mese
        startDate = startOfMonth(currentMonth)
        endDate = endOfMonth(currentMonth)
      }

      const response = await fetch(
        `/api/admin/bookings?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

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

  // Formato data italiana
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy', { locale: it })
  }


  // Navigazione
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (calendarView === 'month') {
      setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1))
    } else {
      setCurrentDay(direction === 'prev' ? subDays(currentDay, 1) : addDays(currentDay, 1))
    }
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(new Date(today))
    setCurrentDay(new Date(today))
  }

  // VISTA MESE
  const renderMonthView = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = startOfMonth(currentMonth)
    const lastDay = endOfMonth(currentMonth)
    const startDay = getDay(firstDay) === 0 ? 6 : getDay(firstDay) - 1

    // Raggruppa appuntamenti per data
    const appointmentsByDate: Record<string, AppointmentData[]> = {}
    allAppointments.forEach(apt => {
      if (!appointmentsByDate[apt.date]) {
        appointmentsByDate[apt.date] = []
      }
      appointmentsByDate[apt.date].push(apt)
    })

    const today = new Date()
    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

    return (
      <div className="space-y-4">
        {/* Day names header */}
        <div className="calendar-header">
          {dayNames.map(day => (
            <div key={day} className="calendar-header-day">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="calendar-grid">
          {/* Celle vuote iniziali */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Giorni del mese */}
          {Array.from({ length: lastDay.getDate() }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const hasAppointments = appointmentsByDate[dateStr]?.length > 0
            const appointmentCount = appointmentsByDate[dateStr]?.length || 0

            return (
              <div
                key={dateStr}
                className={`calendar-day ${hasAppointments ? 'has-appointments' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div className="calendar-day-number">{day}</div>
                {appointmentCount > 0 && (
                  <div className="calendar-day-count">{appointmentCount}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Appuntamenti del giorno selezionato */}
        {selectedDate && appointmentsByDate[selectedDate] && (
          <div className="glass-card rounded-lg p-3 md:p-3 mt-3">
            <p className="text-xs md:text-sm font-semibold mb-2 gold-text-gradient heading-font">
              {formatDate(selectedDate)} - {appointmentsByDate[selectedDate].length} appuntament{appointmentsByDate[selectedDate].length !== 1 ? 'i' : 'o'}
            </p>
            <div className="space-y-1.5">
              {appointmentsByDate[selectedDate].map(apt => (
                <div
                  key={apt.id}
                  className={`glass-card rounded-lg p-2 md:p-2 cursor-pointer transition-smooth ${
                    apt.isPast 
                      ? 'opacity-60 border-dark-400/30 hover:border-dark-400/50' 
                      : 'hover:border-gold-400/50'
                  }`}
                  onClick={() => showAppointmentDetail(apt)}
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
                    <div className="flex-1">
                      <p className="font-semibold text-xs md:text-sm text-white">{apt.client_name}</p>
                      <p className="text-xs text-gray-400">{apt.time} • {apt.service}</p>
                    </div>
                    <Badge variant={apt.status === 'confirmed' ? 'success' : apt.status === 'pending' ? 'warning' : 'info'} size="sm" className="self-start md:self-center">
                      {apt.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }


  // VISTA GIORNO
  const renderDayView = () => {
    const dateStr = format(currentDay, 'yyyy-MM-dd')
    const dayAppointments = allAppointments.filter(a => a.date === dateStr)

    // Genera le ore disponibili: 6-13 ogni ora, poi 15:30, 16:30, 17:30, ecc.
    const hours: Array<{ hour: number; minute: number }> = []
    // Dalle 6 alle 13: ogni ora
    for (let h = 6; h < 14; h++) {
      hours.push({ hour: h, minute: 0 })
    }
    // Dalle 15:30 in poi: ogni ora a partire da 15:30
    for (let h = 15; h < 22; h++) {
      hours.push({ hour: h, minute: 30 })
    }

    const HOUR_HEIGHT = isMobile ? 40 : 60
    const PX_PER_MIN = HOUR_HEIGHT / 60
    const dayStartMin = 6 * 60 // Inizia alle 6:00
    // Calcola l'altezza totale: dalle 6 alle 13 (7 ore) + pausa pranzo (1.5 ore) + dalle 15:30 alle 21:30 (6 ore)
    const morningHours = 7 // 6-13
    const lunchBreak = 1.5 // 14:00-15:30
    const afternoonHours = 6 // 15:30-21:30
    const totalHours = morningHours + lunchBreak + afternoonHours
    const totalMinutes = totalHours * 60
    const timelineHeight = totalMinutes * PX_PER_MIN

    const minutesSinceMidnight = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number)
      return h * 60 + m
    }

    return (
      <div className="space-y-4">
        {/* Header giorno */}
        <div className="glass-card rounded-lg p-3 mb-3">
          <h3 className="text-lg font-bold gold-text-gradient heading-font mb-1">
            {dayAppointments.length} Appuntament{dayAppointments.length !== 1 ? 'i' : 'o'}
          </h3>
            <p className="text-xs text-gray-400">Orario: 06:00 - 13:00, 15:30 - 21:30</p>
        </div>

        {/* UNICO SCROLL CONTAINER - ore + timeline insieme */}
        <div
          className="calendar-scroll overflow-y-auto rounded-lg no-scrollbar"
          style={{ height: '70vh' }}
        >
          <div className="grid grid-cols-12 gap-2">
              {/* Colonna etichette ore */}
              <div className="col-span-2 md:col-span-1">
                {hours.slice(0, -1).map((h, idx) => (
                  <div
                    key={`${h.hour}-${h.minute}`}
                    className="time-label flex items-start text-[10px] md:text-xs"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    {String(h.hour).padStart(2, '0')}:{String(h.minute).padStart(2, '0')}
                  </div>
                ))}
              </div>

            {/* Colonna timeline */}
            <div className="col-span-10 md:col-span-11">
              <div
                className="relative time-slot"
                style={{ height: timelineHeight }}
              >
                  {/* Linee orarie */}
                  {hours.slice(0, -1).map((h, idx) => {
                    const hourMinutes = h.hour * 60 + h.minute
                    const top = (hourMinutes - dayStartMin) * PX_PER_MIN
                    return (
                      <div
                        key={`${h.hour}-${h.minute}`}
                        className="absolute left-0 right-0 border-t border-white/10 z-0"
                        style={{ top }}
                      />
                    )
                  })}

                {/* Eventi assoluti - raggruppati per ora */}
                {(() => {
                  // Filtra appuntamenti escludendo la pausa pranzo
                  const filteredAppointments = dayAppointments.filter((apt) => {
                    const startMin = minutesSinceMidnight(apt.time)
                    const lunchBreakStart = 14 * 60 // 14:00
                    const lunchBreakEnd = 15 * 60 + 30 // 15:30
                    return !(startMin >= lunchBreakStart && startMin < lunchBreakEnd)
                  })

                  // Raggruppa appuntamenti per ora
                  const appointmentsByTime: Record<string, AppointmentData[]> = {}
                  filteredAppointments.forEach((apt) => {
                    if (!appointmentsByTime[apt.time]) {
                      appointmentsByTime[apt.time] = []
                    }
                    appointmentsByTime[apt.time].push(apt)
                  })

                  // Renderizza gli appuntamenti
                  return Object.entries(appointmentsByTime).flatMap(([time, apts]) => {
                    // Se ci sono 2 appuntamenti singoli (non multipli) alla stessa ora, renderizzali affiancati
                    const singleAppointments = apts.filter(apt => !apt.isMultiplePackage)
                    const hasTwoSingles = singleAppointments.length === 2 && apts.length === 2

                    return apts.map((apt, index) => {
                      const startMin = minutesSinceMidnight(apt.time)
                      const duration = apt.durationMinutes || 60
                      const endMin = startMin + duration

                      // clamp dentro range visibile (considerando la pausa pranzo)
                      const lunchBreakStart = 14 * 60 // 14:00
                      const lunchBreakEnd = 15 * 60 + 30 // 15:30
                      if (startMin >= lunchBreakStart && startMin < lunchBreakEnd) {
                        return null // Non mostrare appuntamenti nella pausa pranzo
                      }
                      
                      const clampedStart = Math.max(startMin, dayStartMin)
                      // Se l'appuntamento si estende nella pausa pranzo, taglialo
                      let clampedEnd = Math.min(endMin, dayStartMin + totalMinutes)
                      if (clampedStart < lunchBreakStart && clampedEnd > lunchBreakStart) {
                        clampedEnd = lunchBreakStart // Taglia alla pausa pranzo
                      }

                      const top = (clampedStart - dayStartMin) * PX_PER_MIN
                      const height = Math.max((clampedEnd - clampedStart) * PX_PER_MIN, isMobile ? 14 : 18)
                      
                      // Versione compatta per eventi bassi (soglia più bassa su mobile)
                      const compact = height < (isMobile ? 40 : 55)

                      // Calcola posizione e larghezza per appuntamenti affiancati
                      let left = '0.5rem' // left-2
                      let right = '0.5rem' // right-2
                      let width = 'auto'

                      if (hasTwoSingles) {
                        // Ogni appuntamento occupa metà dello spazio, con un piccolo gap tra loro
                        const gap = '0.25rem' // gap tra i due
                        const totalGap = `calc(${gap} * 1)` // gap tra i due
                        const halfWidth = `calc(50% - ${gap} / 2)`
                        
                        if (index === 0) {
                          // Primo appuntamento: sinistra
                          left = '0.5rem'
                          right = 'auto'
                          width = halfWidth
                        } else {
                          // Secondo appuntamento: destra
                          left = 'auto'
                          right = '0.5rem'
                          width = halfWidth
                        }
                      }

                      return (
                        <div
                          key={apt.id}
                          className={`appointment-block cursor-pointer absolute z-10 overflow-hidden
                            bg-[#0b0b0b]/90 border border-gold-400/25 shadow-card backdrop-blur-sm
                            rounded-xl
                            ${apt.isPast ? 'grayscale brightness-75' : ''}`}
                          style={{ 
                            top, 
                            height,
                            left: hasTwoSingles ? (index === 0 ? '0.5rem' : 'auto') : '0.5rem',
                            right: hasTwoSingles ? (index === 0 ? 'auto' : '0.5rem') : '0.5rem',
                            width: hasTwoSingles ? `calc(50% - 0.625rem)` : 'auto'
                          }}
                          onClick={() => showAppointmentDetail(apt)}
                        >
                          <div className="h-full p-1.5 md:p-2 flex flex-col justify-center leading-tight">
                            <div>
                              <div className="font-semibold text-[10px] md:text-xs lg:text-sm text-white truncate">
                                {apt.client_name}
                                {apt.isMultiplePackage && !compact && (
                                  <Badge variant="info" size="sm" className="ml-1 md:ml-2 text-[8px] md:text-[10px]">(Multiplo)</Badge>
                                )}
                              </div>
                              <div className="text-[9px] md:text-[11px] text-gray-400 truncate">
                                {apt.time} • {apt.service}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mostra dettaglio appuntamento
  const showAppointmentDetail = (apt: AppointmentData) => {
    setSelectedAppointment(apt)
    setIsAppointmentModalOpen(true)
  }

  // Periodo corrente per il display
  const getCurrentPeriod = () => {
    if (calendarView === 'month') {
      return format(currentMonth, 'MMMM yyyy', { locale: it })
    } else {
      return format(currentDay, 'EEEE d MMMM yyyy', { locale: it })
    }
  }

  return (
    <div className="space-y-4 calendar-container">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center space-x-2 md:space-x-4 w-full sm:w-auto justify-center sm:justify-start">
          <Button
            variant="outline-gold"
            size="sm"
            onClick={() => navigatePeriod('prev')}
            className="p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-gold-400 hover:text-gold-300 text-xs md:text-sm px-2 md:px-3"
          >
            Oggi
          </Button>

          <Button
            variant="outline-gold"
            size="sm"
            onClick={() => navigatePeriod('next')}
            className="p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="text-white font-semibold text-xs md:text-sm min-w-[120px] md:min-w-[200px] text-center heading-font px-2">
            {getCurrentPeriod()}
          </div>
        </div>

        {/* View buttons */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-end">
          <button
            className={`calendar-view-btn text-xs md:text-sm px-3 md:px-4 ${calendarView === 'month' ? 'active' : ''}`}
            onClick={() => setCalendarView('month')}
            data-view="month"
          >
            Mese
          </button>
          <button
            className={`calendar-view-btn text-xs md:text-sm px-3 md:px-4 ${calendarView === 'day' ? 'active' : ''}`}
            onClick={() => setCalendarView('day')}
            data-view="day"
          >
            Giorno
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
            <p className="mt-4 text-dark-600">Caricamento calendario...</p>
          </div>
        ) : (
          <>
            {calendarView === 'month' && renderMonthView()}
            {calendarView === 'day' && renderDayView()}
          </>
        )}
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          isOpen={isAppointmentModalOpen}
          onClose={() => {
            setIsAppointmentModalOpen(false)
            setSelectedAppointment(null)
          }}
          onUpdate={() => {
            fetchBookings() // Ricarica le prenotazioni dopo modifica/cancellazione
          }}
        />
      )}
    </div>
  )
}
