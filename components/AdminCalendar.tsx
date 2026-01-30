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
                  className={`glass-card rounded-lg p-2 md:p-2 cursor-pointer transition-all duration-300 ${
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

    const startHour = 6
    const endHour = 22
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour)

    const HOUR_HEIGHT = 80
    const PX_PER_MIN = HOUR_HEIGHT / 60
    const dayStartMin = startHour * 60
    const totalMinutes = (endHour - startHour) * 60
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
          <p className="text-xs text-gray-400">Orario: 06:00 - 22:00</p>
        </div>

        {/* UNICO SCROLL CONTAINER - ore + timeline insieme */}
        <div
          className="calendar-scroll overflow-y-auto rounded-lg no-scrollbar"
          style={{ height: '70vh' }}
        >
          <div className="grid grid-cols-12 gap-2">
            {/* Colonna etichette ore */}
            <div className="col-span-2 md:col-span-1">
              {hours.slice(0, -1).map((h) => (
                <div
                  key={h}
                  className="time-label flex items-start text-xs"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {String(h).padStart(2, '0')}:00
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
                {hours.slice(0, -1).map((h, idx) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-white/10 z-0"
                    style={{ top: idx * HOUR_HEIGHT }}
                  />
                ))}

                {/* Eventi assoluti */}
                {dayAppointments.map((apt) => {
                  const startMin = minutesSinceMidnight(apt.time)
                  const duration = apt.durationMinutes || 60
                  const endMin = startMin + duration

                  // clamp dentro range visibile
                  const clampedStart = Math.max(startMin, dayStartMin)
                  const clampedEnd = Math.min(endMin, dayStartMin + totalMinutes)

                  const top = (clampedStart - dayStartMin) * PX_PER_MIN
                  const height = Math.max((clampedEnd - clampedStart) * PX_PER_MIN, 18)
                  
                  // Versione compatta per eventi bassi
                  const compact = height < 55

                  return (
                    <div
                      key={apt.id}
                      className={`appointment-block cursor-pointer absolute left-2 right-2 z-10 overflow-hidden
                        bg-[#0b0b0b]/90 border border-gold-400/25 shadow-lg shadow-black/40
                        rounded-xl backdrop-blur-sm
                        ${apt.isPast ? 'grayscale brightness-75' : ''}`}
                      style={{ top, height }}
                      onClick={() => showAppointmentDetail(apt)}
                    >
                      <div className="h-full p-2 flex flex-col justify-center leading-tight">
                        <div>
                          <div className="font-semibold text-xs md:text-sm text-white truncate">
                            {apt.client_name}
                            {apt.isMultiplePackage && !compact && (
                              <Badge variant="info" size="sm" className="ml-2">(Multiplo)</Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {apt.time} • {apt.service}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
            className="text-[#E8DCA0] hover:text-[#F5ECC8] text-xs md:text-sm px-2 md:px-3"
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
            <div className="inline-block w-8 h-8 border-4 border-dark-200 border-t-[#E8DCA0] rounded-full animate-spin"></div>
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
