'use client'

import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, startOfMonth, endOfMonth, getDay, isSameDay, parseISO, addMonths, subMonths, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

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

type CalendarView = 'month' | 'week' | 'day'

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
}

export default function AdminCalendar() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarView, setCalendarView] = useState<CalendarView>('day')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentDay, setCurrentDay] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Trasforma i booking dal formato API al formato del calendario
  const transformBookings = (bookings: Booking[]): AppointmentData[] => {
    return bookings.map(booking => {
      const bookingDate = parseISO(booking.date)
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
      }
    })
  }

  const allAppointments = transformBookings(bookings)

  useEffect(() => {
    fetchBookings()
  }, [calendarView, currentMonth, currentWeek, currentDay])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      let startDate: Date
      let endDate: Date

      if (calendarView === 'day') {
        startDate = startOfDay(currentDay)
        endDate = addDays(startDate, 1)
      } else if (calendarView === 'week') {
        startDate = startOfWeek(currentWeek, { weekStartsOn: 1 })
        endDate = endOfWeek(currentWeek, { weekStartsOn: 1 })
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

  // Ottieni inizio settimana (Lunedì)
  const getStartOfWeek = (date: Date) => {
    return startOfWeek(date, { weekStartsOn: 1 })
  }

  // Navigazione
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (calendarView === 'month') {
      setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1))
    } else if (calendarView === 'week') {
      setCurrentWeek(direction === 'prev' ? subDays(currentWeek, 7) : addDays(currentWeek, 7))
    } else {
      setCurrentDay(direction === 'prev' ? subDays(currentDay, 1) : addDays(currentDay, 1))
    }
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(new Date(today))
    setCurrentWeek(new Date(today))
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
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs text-gray-400 font-semibold py-2">
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
          <div className="glass-card rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold mb-3 gold-text-gradient heading-font">
              {formatDate(selectedDate)} - {appointmentsByDate[selectedDate].length} appuntament{appointmentsByDate[selectedDate].length !== 1 ? 'i' : 'o'}
            </p>
            <div className="space-y-2">
              {appointmentsByDate[selectedDate].map(apt => (
                <div key={apt.id} className="glass-card rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{apt.client_name}</p>
                      <p className="text-sm text-gray-400">{apt.time} • {apt.service}</p>
                    </div>
                    <Badge variant={apt.status === 'confirmed' ? 'success' : apt.status === 'pending' ? 'warning' : 'info'}>
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

  // VISTA SETTIMANA
  const renderWeekView = () => {
    const startOfWeekDate = getStartOfWeek(currentWeek)
    const weekDays = eachDayOfInterval({ start: startOfWeekDate, end: addDays(startOfWeekDate, 6) })
    const today = new Date()

    // Ore visibili: 8:00 - 22:00 (15 ore)
    const hours = Array.from({ length: 15 }, (_, i) => i + 8)

    // Raggruppa appuntamenti per data e ora
    const appointmentsByDateTime: Record<string, AppointmentData[]> = {}
    allAppointments.forEach(apt => {
      const hour = parseInt(apt.time.split(':')[0])
      if (hour >= 8 && hour <= 22) {
        const key = `${apt.date}-${hour}`
        if (!appointmentsByDateTime[key]) {
          appointmentsByDateTime[key] = []
        }
        appointmentsByDateTime[key].push(apt)
      }
    })

    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

    return (
      <div className="space-y-4">
        {/* Headers giorni settimana */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div></div> {/* Spazio per colonna orari */}
          {weekDays.map((date, i) => {
            const isToday = isSameDay(date, today)
            return (
              <div
                key={i}
                className={`text-center p-2 glass-card rounded-lg ${isToday ? 'border-2 border-[#E8DCA0]' : ''}`}
              >
                <div className="text-xs text-gray-400">{dayNames[i]}</div>
                <div className={`font-bold ${isToday ? 'gold-text-gradient heading-font' : 'text-white'}`}>
                  {format(date, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Griglia oraria settimanale - struttura allineata */}
        <div className="space-y-1">
          {hours.map((hour) => {
            return (
              <div key={hour} className="grid grid-cols-8 gap-2">
                {/* Etichetta oraria */}
                <div className="time-label flex items-center justify-center">
                  {String(hour).padStart(2, '0')}:00
                </div>

                {/* Slot per ogni giorno della settimana */}
                {weekDays.map((date, dayIndex) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const key = `${dateStr}-${hour}`
                  const hasAppointment = appointmentsByDateTime[key]?.length > 0

                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={`time-slot min-h-[60px] ${hasAppointment ? 'has-appointment' : ''}`}
                    >
                      {hasAppointment && appointmentsByDateTime[key].map(apt => (
                        <div
                          key={apt.id}
                          className="appointment-block"
                          onClick={() => showAppointmentDetail(apt)}
                        >
                          <div className="text-xs font-bold text-white">{apt.time}</div>
                          <div className="text-xs truncate text-white">{apt.client_name}</div>
                          <div className="text-xs text-gray-400 truncate">{apt.service}</div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // VISTA GIORNO
  const renderDayView = () => {
    const dateStr = format(currentDay, 'yyyy-MM-dd')
    const dayAppointments = allAppointments.filter(a => a.date === dateStr)

    // Ore visibili: 8:00 - 22:00 (15 ore)
    const hours = Array.from({ length: 15 }, (_, i) => i + 8)

    // Raggruppa per ora
    const appointmentsByHour: Record<number, AppointmentData[]> = {}
    dayAppointments.forEach(apt => {
      const hour = parseInt(apt.time.split(':')[0])
      if (hour >= 8 && hour <= 22) {
        if (!appointmentsByHour[hour]) {
          appointmentsByHour[hour] = []
        }
        appointmentsByHour[hour].push(apt)
      }
    })

    return (
      <div className="space-y-4">
        {/* Header giorno */}
        <div className="glass-card rounded-lg p-4 mb-4">
          <h3 className="text-xl font-bold gold-text-gradient heading-font mb-2">
            {dayAppointments.length} Appuntament{dayAppointments.length !== 1 ? 'i' : 'o'}
          </h3>
          <p className="text-sm text-gray-400">Orario: 08:00 - 22:00</p>
        </div>

        {/* Griglia giornaliera */}
        <div className="space-y-1">
          {hours.map((hour) => {
            const hasAppointment = appointmentsByHour[hour]?.length > 0

            return (
              <div key={hour} className="grid grid-cols-12 gap-2">
                <div className="col-span-1 time-label flex items-center">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className={`col-span-11 time-slot min-h-[60px] ${hasAppointment ? 'has-appointment' : ''}`}>
                  {hasAppointment && appointmentsByHour[hour].map(apt => (
                    <div
                      key={apt.id}
                      className="appointment-block"
                      onClick={() => showAppointmentDetail(apt)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-bold text-white">{apt.client_name}</div>
                          <div className="text-sm text-gray-400">{apt.time} • {apt.service}</div>
                          <div className="text-xs mt-1">
                            <Badge variant={apt.status === 'confirmed' ? 'success' : apt.status === 'pending' ? 'warning' : 'info'}>
                              {apt.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        {apt.phone && (
                          <div className="text-xs text-gray-400 ml-2">{apt.phone}</div>
                        )}
                      </div>
                      {apt.notes && (
                        <div className="text-xs text-gray-300 mt-2">{apt.notes}</div>
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
    // Puoi implementare un modal qui
    alert(`Appuntamento:\n${apt.client_name}\n${apt.date} ${apt.time}\n${apt.service}\n${apt.status}`)
  }

  // Periodo corrente per il display
  const getCurrentPeriod = () => {
    if (calendarView === 'month') {
      return format(currentMonth, 'MMMM yyyy', { locale: it })
    } else if (calendarView === 'week') {
      const start = getStartOfWeek(currentWeek)
      const end = addDays(start, 6)
      return `${format(start, 'd MMM', { locale: it })} - ${format(end, 'd MMM yyyy', { locale: it })}`
    } else {
      return format(currentDay, 'EEEE d MMMM yyyy', { locale: it })
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline-gold"
            size="sm"
            onClick={() => navigatePeriod('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-[#E8DCA0] hover:text-[#F5ECC8]"
          >
            Oggi
          </Button>

          <Button
            variant="outline-gold"
            size="sm"
            onClick={() => navigatePeriod('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="text-white font-semibold min-w-[200px] text-center heading-font">
            {getCurrentPeriod()}
          </div>
        </div>

        {/* View buttons */}
        <div className="flex items-center space-x-2">
          <button
            className={`calendar-view-btn ${calendarView === 'month' ? 'active' : ''}`}
            onClick={() => setCalendarView('month')}
            data-view="month"
          >
            Mese
          </button>
          <button
            className={`calendar-view-btn ${calendarView === 'week' ? 'active' : ''}`}
            onClick={() => setCalendarView('week')}
            data-view="week"
          >
            Settimana
          </button>
          <button
            className={`calendar-view-btn ${calendarView === 'day' ? 'active' : ''}`}
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
            {calendarView === 'week' && renderWeekView()}
            {calendarView === 'day' && renderDayView()}
          </>
        )}
      </div>
    </div>
  )
}
