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
      
      return {
        id: booking.id,
        client_name: booking.user.name,
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

    // Ore visibili: 6:00 - 22:00 (17 ore)
    const hours = Array.from({ length: 17 }, (_, i) => i + 6)

    // Raggruppa per ora
    const appointmentsByHour: Record<number, AppointmentData[]> = {}
    dayAppointments.forEach(apt => {
      const hour = parseInt(apt.time.split(':')[0])
      if (hour >= 6 && hour <= 22) {
        if (!appointmentsByHour[hour]) {
          appointmentsByHour[hour] = []
        }
        appointmentsByHour[hour].push(apt)
      }
    })

    return (
      <div className="space-y-4">
        {/* Header giorno */}
        <div className="glass-card rounded-lg p-3 mb-3">
          <h3 className="text-lg font-bold gold-text-gradient heading-font mb-1">
            {dayAppointments.length} Appuntament{dayAppointments.length !== 1 ? 'i' : 'o'}
          </h3>
          <p className="text-xs text-gray-400">Orario: 06:00 - 22:00</p>
        </div>

        {/* Griglia giornaliera */}
        <div className="space-y-1">
          {hours.map((hour) => {
            const hasAppointment = appointmentsByHour[hour]?.length > 0

            return (
              <div 
                key={hour} 
                className={`grid grid-cols-12 gap-2 ${hasAppointment ? 'min-h-[60px] md:min-h-[60px]' : 'min-h-[25px] md:min-h-[25px]'}`}
              >
                <div className="col-span-2 md:col-span-1 time-label flex items-center text-xs">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className={`col-span-10 md:col-span-11 time-slot ${hasAppointment ? 'has-appointment min-h-[50px] md:min-h-[60px]' : 'min-h-[20px] md:min-h-[20px]'}`}>
                  {hasAppointment && appointmentsByHour[hour].map(apt => (
                    <div
                      key={apt.id}
                      className={`appointment-block cursor-pointer ${
                        apt.isPast ? 'opacity-60' : ''
                      }`}
                      onClick={() => showAppointmentDetail(apt)}
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1 md:gap-0">
                        <div className="flex-1">
                          <div className="font-semibold text-xs md:text-sm text-white">{apt.client_name}</div>
                          <div className="text-xs text-gray-400">{apt.time} • {apt.service}</div>
                          <div className="text-xs mt-1">
                            <Badge variant={apt.status === 'confirmed' ? 'success' : apt.status === 'pending' ? 'warning' : 'info'} size="sm">
                              {apt.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        {apt.phone && (
                          <div className="text-xs text-gray-500 md:ml-2">{apt.phone}</div>
                        )}
                      </div>
                      {apt.notes && (
                        <div className="text-xs text-gray-400 mt-1">{apt.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
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
