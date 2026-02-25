'use client'

import { useState, useEffect, useRef } from 'react'
import {
  format, addDays, addMonths, addWeeks, subDays, subMonths, subWeeks,
  startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, getDay, parseISO
} from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import AppointmentDetailModal from '@/components/AppointmentDetailModal'
import AdminBookingModal from '@/components/AdminBookingModal'

// ============================================================================
// TIPI
// ============================================================================
interface Booking {
  id: string
  date: string
  time: string
  status: string
  user: { id: string; name: string; email: string; phone: string | null }
  package: {
    id: string; name: string; durationMinutes: number; isMultiple?: boolean
    athletes?: Array<{ id: string; name: string; email: string; phone: string | null }>
  }
}

type CalendarView = 'month' | 'week' | 'day'

interface AptData {
  id: string
  client_name: string
  client_email: string
  phone: string | null
  date: string        // 'yyyy-MM-dd'
  time: string        // 'HH:mm'
  service: string
  status: string
  isPast: boolean
  userId: string
  packageId: string
  durationMinutes: number
  isMultiplePackage: boolean
}

// ============================================================================
// COSTANTI TIMELINE
// Tutte le posizioni derivano da queste. Non usare altri valori.
// ============================================================================
const SLOT_MIN    = 30          // minuti per slot
const DAY_START   = 6 * 60      // 360 min = 06:00
const DAY_END     = 23 * 60     // 1380 min = 23:00
const LUNCH_START = 14 * 60     // 840 = 14:00
const LUNCH_END   = 15 * 60 + 30 // 930 = 15:30
const TOTAL_SLOTS = (DAY_END - DAY_START) / SLOT_MIN  // 34

// ============================================================================
// FUNZIONI PURE DI COORDINATA — unica fonte di verità
// ============================================================================

/** minuti → pixel: minToY(420, 30) = 60px */
function minToY(minutes: number, slotH: number): number {
  return ((minutes - DAY_START) / SLOT_MIN) * slotH
}

/** pixel → minuti (floor = slot corrente): yToMin(89, 30) = 420 (07:00) */
function yToMin(y: number, slotH: number): number {
  return Math.floor(y / slotH) * SLOT_MIN + DAY_START
}

/** Snappa al più vicino multiplo di SLOT_MIN */
function snapMin(raw: number): number {
  return Math.round(raw / SLOT_MIN) * SLOT_MIN
}

/** Minuti → 'HH:mm' */
function minsToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 'HH:mm' → minuti */
function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Y → orario snappato e bookable (salta pausa pranzo, clamp 06:00-21:30) */
function yToBookableTime(y: number, slotH: number): string {
  let snapped = snapMin(yToMin(y, slotH))
  if (snapped >= LUNCH_START && snapped < LUNCH_END) snapped = LUNCH_END
  snapped = Math.max(DAY_START, Math.min(snapped, 21 * 60 + 30))
  return minsToTime(snapped)
}

/** Y → orario snappato per hover (null se fuori range o in pausa pranzo) */
function yToHoverTime(y: number, slotH: number): string | null {
  const snapped = snapMin(yToMin(y, slotH))
  if (snapped < DAY_START || snapped >= DAY_END) return null
  if (snapped >= LUNCH_START && snapped < LUNCH_END) return null
  return minsToTime(snapped)
}

/** true se l'orario è già passato */
function isPastTime(dateStr: string, timeStr: string): boolean {
  return new Date(`${dateStr}T${timeStr}:00`) < new Date()
}

// ============================================================================
// Timeline — gestisce hover isolato per colonna
// ============================================================================
function Timeline({
  slotH, dateStr, onClick, onDragOver, onDrop, children,
}: {
  slotH: number
  dateStr: string
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  children: React.ReactNode
}) {
  const totalH = TOTAL_SLOTS * slotH
  const [hoverY, setHoverY] = useState<number | null>(null)
  const [hoverLabel, setHoverLabel] = useState('')

  return (
    <div
      className="relative time-slot"
      data-date={dateStr}
      style={{ height: totalH }}
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseMove={e => {
        if ((e.target as HTMLElement).closest('.apt-block, .resize-handle')) {
          setHoverY(null); return
        }
        const rect = e.currentTarget.getBoundingClientRect()
        const rawY = e.clientY - rect.top
        const time = yToHoverTime(rawY, slotH)
        if (!time || isPastTime(dateStr, time)) { setHoverY(null); return }
        const snappedMins = snapMin(yToMin(rawY, slotH))
        setHoverY(minToY(snappedMins, slotH))
        setHoverLabel(time)
      }}
      onMouseLeave={() => setHoverY(null)}
    >
      {hoverY !== null && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-[5]"
          style={{
            top: hoverY, height: slotH,
            background: 'rgba(255,255,255,0.04)',
            borderTop: '1px solid rgba(212,175,55,0.35)',
          }}
        >
          <span className="absolute right-1 top-0.5 text-[9px] text-gold-400/70 font-mono select-none">
            {hoverLabel}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

// ============================================================================
// GridLines — linee orizzontali della griglia
// ============================================================================
function GridLines({ slotH }: { slotH: number }) {
  return (
    <>
      {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
        const absMin = DAY_START + i * SLOT_MIN
        const isHour = absMin % 60 === 0
        return (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{
              top: i * slotH,
              height: 0,
              borderTop: isHour
                ? '1px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(255,255,255,0.05)',
            }}
          />
        )
      })}
    </>
  )
}

// ============================================================================
// HourLabels — etichette ore nella colonna sinistra
// ============================================================================
function HourLabels({ slotH }: { slotH: number }) {
  const totalH = TOTAL_SLOTS * slotH
  const hours: number[] = []
  for (let min = DAY_START; min < DAY_END; min += 60) hours.push(min)

  return (
    <div className="relative" style={{ height: totalH }}>
      {hours.map(absMin => {
        const top = minToY(absMin, slotH)
        return (
          <div
            key={absMin}
            // top coincide con la linea marcata corrispondente
            // items-start + pt-px → il testo inizia sulla linea
            // height = slotH*2 → spazio per non sovrapporre l'etichetta successiva
            className="absolute right-0 left-0 flex items-start text-[10px] text-gray-500 select-none pr-1 pt-px"
            style={{ top, height: slotH * 2 }}
          >
            {String(absMin / 60).padStart(2, '0')}:00
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// LunchBreak — fascia pausa pranzo
// ============================================================================
function LunchBreak({ slotH }: { slotH: number }) {
  const top    = minToY(LUNCH_START, slotH)
  const height = minToY(LUNCH_END, slotH) - top
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-[1]"
      style={{
        top, height,
        background: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,0.01) 4px,rgba(255,255,255,0.01) 8px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span className="absolute left-1 top-1 text-[9px] text-gray-600 select-none">
        Pausa pranzo
      </span>
    </div>
  )
}

// ============================================================================
// NowLine — linea rossa ora corrente
// ============================================================================
function NowLine({ dateStr, slotH, nowMin }: { dateStr: string; slotH: number; nowMin: number }) {
  if (dateStr !== format(new Date(), 'yyyy-MM-dd')) return null
  if (nowMin < DAY_START || nowMin >= DAY_END) return null
  const top = minToY(nowMin, slotH)
  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top: top - 1 }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
      <div className="flex-1 h-[1.5px] bg-red-500 opacity-80" />
    </div>
  )
}

// ============================================================================
// AptBlock — blocco appuntamento con drag + resize + touch drag mobile
// ============================================================================

// Ghost element globale per il touch drag — creato una sola volta nel DOM
let touchGhost: HTMLDivElement | null = null
function getOrCreateGhost(): HTMLDivElement {
  if (!touchGhost) {
    touchGhost = document.createElement('div')
    touchGhost.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      border-radius: 12px;
      border: 1.5px solid rgba(212,175,55,0.8);
      background: linear-gradient(135deg, rgba(212,175,55,0.55) 0%, rgba(184,134,11,0.45) 100%);
      backdrop-filter: blur(8px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      opacity: 0;
      transition: opacity 0.15s;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      color: white;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 120px;
      touch-action: none;
    `
    document.body.appendChild(touchGhost)
  }
  return touchGhost
}

function AptBlock({
  apt, top, height, left, right, width, zIndex, slotH, isMobile, onClickApt, onResizeEnd, onTouchDrop,
}: {
  apt: AptData; top: number; height: number
  left: string; right: string; width: string
  zIndex?: number
  slotH: number; isMobile: boolean
  onClickApt: (a: AptData) => void
  onResizeEnd: (id: string, newDuration: number) => void
  onTouchDrop?: (aptId: string, clientX: number, clientY: number) => void
}) {
  const [localH, setLocalH]     = useState(height)
  const [isDragging, setIsDragging] = useState(false)
  const resizing  = useRef(false)
  const startY    = useRef(0)
  const startH    = useRef(0)
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didDrag   = useRef(false)

  useEffect(() => setLocalH(height), [height])

  // ── Resize (mouse desktop) ────────────────────────────────────────────────
  const onResizeDown = (e: React.MouseEvent) => {
    if (apt.isPast) return
    e.preventDefault(); e.stopPropagation()
    resizing.current = true
    startY.current = e.clientY
    startH.current = localH
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return
      const delta = Math.round((ev.clientY - startY.current) / slotH) * slotH
      setLocalH(Math.max(slotH, startH.current + delta))
    }
    const onUp = (ev: MouseEvent) => {
      resizing.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const delta = Math.round((ev.clientY - startY.current) / slotH) * slotH
      onResizeEnd(apt.id, Math.round((Math.max(slotH, startH.current + delta) / slotH) * SLOT_MIN))
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Touch drag mobile ─────────────────────────────────────────────────────
  const onTouchStartBlock = (e: React.TouchEvent) => {
    if (apt.isPast || resizing.current || !isMobile || !onTouchDrop) return

    const touch = e.touches[0]
    didDrag.current  = false

    // Long press (300ms) → attiva il drag
    longPress.current = setTimeout(() => {
      didDrag.current = true
      setIsDragging(true)

      // Feedback vibrazione se disponibile
      if (navigator.vibrate) navigator.vibrate(40)

      // Blocca lo scroll del body durante il drag
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'

      // Mostra ghost
      const ghost = getOrCreateGhost()
      ghost.innerHTML = `<span>${apt.client_name}</span><span style="font-weight:400;font-size:9px;color:rgba(255,255,255,0.7)">${apt.time} · ${apt.service}</span>`
      ghost.style.width = '160px'
      ghost.style.left  = `${touch.clientX - 80}px`
      ghost.style.top   = `${touch.clientY - 30}px`
      ghost.style.opacity = '1'
    }, 300)

    const onMove = (ev: TouchEvent) => {
      if (!didDrag.current) {
        // Se il dito si muove troppo prima del long press → cancella
        const t = ev.touches[0]
        const dx = Math.abs(t.clientX - touch.clientX)
        const dy = Math.abs(t.clientY - touch.clientY)
        if (dx > 8 || dy > 8) {
          if (longPress.current) { clearTimeout(longPress.current); longPress.current = null }
          cleanup()
          return
        }
        return
      }
      // Drag attivo — blocca scroll e muovi ghost
      ev.preventDefault()
      const t = ev.touches[0]
      const ghost = getOrCreateGhost()
      ghost.style.left = `${t.clientX - 80}px`
      ghost.style.top  = `${t.clientY - 30}px`
    }

    const onEnd = (ev: TouchEvent) => {
      if (longPress.current) { clearTimeout(longPress.current); longPress.current = null }
      
      if (didDrag.current) {
        const t = ev.changedTouches[0]
        // Nascondi ghost
        const ghost = getOrCreateGhost()
        ghost.style.opacity = '0'
        // Drop
        onTouchDrop(apt.id, t.clientX, t.clientY)
      } else {
        // Era un semplice tap
        onClickApt(apt)
      }
      cleanup()
    }

    const cleanup = () => {
      didDrag.current = false
      setIsDragging(false)
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      document.removeEventListener('touchmove', onMove, { passive: false } as EventListenerOptions)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
  }

  const compact = localH < (isMobile ? 36 : 46)

  return (
    <div
      draggable={!apt.isPast && !isMobile}
      onDragStart={e => {
        if (resizing.current || isMobile) { e.preventDefault(); return }
        e.stopPropagation()
        e.dataTransfer.setData('aptId', apt.id)
        e.dataTransfer.setData('aptTime', apt.time)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onTouchStart={onTouchStartBlock}
      className={`apt-block absolute overflow-hidden rounded-xl border
        backdrop-blur-sm shadow-lg
        ${apt.isPast
          ? 'border-gold-400/15 grayscale brightness-60 cursor-not-allowed'
          : isDragging
            ? 'border-gold-400/80 opacity-40 scale-[0.98]'
            : 'border-gold-400/40 cursor-move hover:border-gold-400/70'
        }`}
      style={{
        top, height: localH, left, right, width,
        zIndex: isDragging ? 5 : (zIndex ?? 10),
        background: apt.isPast
          ? 'rgba(212, 175, 55, 0.12)'
          : 'linear-gradient(135deg, rgba(212, 175, 55, 0.32) 0%, rgba(184, 134, 11, 0.22) 100%)',
        transition: isDragging ? 'opacity 0.1s, transform 0.1s' : 'border-color 0.15s',
        touchAction: 'none',
      }}
      onClick={e => { if (!isMobile) { e.stopPropagation(); onClickApt(apt) } }}
    >
      <div className="h-full flex flex-col justify-center px-2 py-1 leading-tight select-none pb-3">
        <div className="font-semibold text-[10px] md:text-xs text-white truncate">
          {apt.client_name}
          {apt.isMultiplePackage && !compact && (
            <Badge variant="info" size="sm" className="ml-1 text-[8px]">(Multiplo)</Badge>
          )}
        </div>
        {!compact && (
          <div className="text-[9px] md:text-[11px] text-gray-400 truncate mt-0.5">
            {apt.time} · {apt.service}
          </div>
        )}
      </div>
      {!apt.isPast && (
        <div
          className="resize-handle absolute bottom-0 left-0 right-0 h-3 cursor-s-resize flex items-center justify-center group touch-none"
          onMouseDown={onResizeDown}
          onClick={e => e.stopPropagation()}
        >
          <div className="w-8 h-0.5 rounded-full bg-gold-400/30 group-hover:bg-gold-400/70 transition-colors" />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================
export default function AdminCalendar() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<CalendarView>('day')
  const [currentDay, setCurrentDay] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedApt, setSelectedApt] = useState<AptData | null>(null)
  const [aptModalOpen, setAptModalOpen] = useState(false)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [prefilledDate, setPrefilledDate] = useState('')
  const [prefilledTime, setPrefilledTime] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })

  const dayRef  = useRef<HTMLDivElement>(null)
  const weekRef = useRef<HTMLDivElement>(null)
  const scrolled = useRef(false)

  // Slot height dipende dal dispositivo
  const SH = isMobile ? 20 : 30

  // ─── Effetti ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => {
      const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes())
    }, 60000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { scrolled.current = false }, [view, currentDay, currentWeek])

  useEffect(() => {
    if (loading || scrolled.current) return
    const ref = view === 'day' ? dayRef.current : weekRef.current
    if (!ref) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const inView = view === 'day'
      ? format(currentDay, 'yyyy-MM-dd') === today
      : eachDayOfInterval({
          start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
          end:   endOfWeek(currentWeek,   { weekStartsOn: 1 }),
        }).some(d => format(d, 'yyyy-MM-dd') === today)
    if (!inView) return
    const targetY = minToY(nowMin, SH)
    ref.scrollTo({ top: Math.max(0, targetY - ref.clientHeight / 3), behavior: 'smooth' })
    scrolled.current = true
  }, [loading, view, currentDay, currentWeek, nowMin, SH])

  // ─── Dati ─────────────────────────────────────────────────────────────────
  const transform = (bs: Booking[]): AptData[] =>
    bs.map(b => {
      const dateStr = format(parseISO(b.date), 'yyyy-MM-dd')
      const isMultiple = b.package.isMultiple === true && (b.package.athletes?.length ?? 0) > 1
      return {
        id: b.id,
        client_name: isMultiple
          ? b.package.athletes!.map(a => a.name).join(', ')
          : b.user.name,
        client_email: b.user.email,
        phone: b.user.phone,
        date: dateStr,
        time: b.time,
        service: b.package.name,
        status: b.status.toLowerCase(),
        isPast: isPastTime(dateStr, b.time),
        userId: b.user.id,
        packageId: b.package.id,
        durationMinutes: b.package.durationMinutes,
        isMultiplePackage: isMultiple,
      }
    })

  const apts = transform(bookings)

  useEffect(() => { fetchBookings() }, [view, currentDay, currentWeek, currentMonth])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      let start: Date, end: Date
      if (view === 'day') {
        start = startOfDay(currentDay); end = addDays(start, 1)
      } else if (view === 'week') {
        start = startOfWeek(currentWeek, { weekStartsOn: 1 })
        end   = endOfWeek(currentWeek,   { weekStartsOn: 1 })
      } else {
        start = startOfMonth(currentMonth); end = endOfMonth(currentMonth)
      }
      const res = await fetch(
        `/api/admin/bookings?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )
      if (res.ok) setBookings(await res.json())
    } catch (err) {
      console.error('Errore fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Navigazione ──────────────────────────────────────────────────────────
  const nav = (d: 'prev' | 'next') => {
    const n = d === 'prev' ? -1 : 1
    if (view === 'month') setCurrentMonth(m => addMonths(m, n))
    else if (view === 'week') setCurrentWeek(w => addWeeks(w, n))
    else setCurrentDay(day => addDays(day, n))
  }

  const goToday = () => {
    const t = new Date()
    setCurrentDay(new Date(t)); setCurrentWeek(new Date(t)); setCurrentMonth(new Date(t))
  }

  const goDay = (ds: string) => { setCurrentDay(parseISO(ds)); setView('day') }

  const openCreate = (ds: string, ts?: string) => {
    setPrefilledDate(ds); setPrefilledTime(ts ?? ''); setBookingModalOpen(true)
  }

  const showApt = (a: AptData) => { setSelectedApt(a); setAptModalOpen(true) }

  const periodLabel = () => {
    if (view === 'month') return format(currentMonth, 'MMMM yyyy', { locale: it })
    if (view === 'week') {
      const ws = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const we = endOfWeek(currentWeek, { weekStartsOn: 1 })
      return `${format(ws, 'd MMM', { locale: it })} – ${format(we, 'd MMM yyyy', { locale: it })}`
    }
    return format(currentDay, 'EEEE d MMMM yyyy', { locale: it })
  }

  // ─── Drop handler (mouse desktop) ────────────────────────────────────────
  const buildDrop = (dateStr: string) => async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const id       = e.dataTransfer.getData('aptId')
    const prevTime = e.dataTransfer.getData('aptTime')
    if (!id) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const newTime = yToBookableTime(e.clientY - rect.top, SH)
    if (newTime === prevTime) return
    await applyDrop(id, dateStr, newTime)
  }

  // ─── Drop handler (touch mobile) ──────────────────────────────────────────
  const handleTouchDrop = async (aptId: string, clientX: number, clientY: number) => {
    // Trova la timeline sotto il punto di rilascio ignorando il ghost (pointer-events:none)
    const elements = document.elementsFromPoint(clientX, clientY)
    const timeline = elements.find(el => el.classList.contains('time-slot')) as HTMLElement | undefined
    if (!timeline) return
    const dateStr = timeline.dataset.date
    if (!dateStr) return
    const rect    = timeline.getBoundingClientRect()
    const newTime = yToBookableTime(clientY - rect.top, SH)
    const booking = bookings.find(b => b.id === aptId)
    if (booking && newTime === booking.time && dateStr === format(parseISO(booking.date), 'yyyy-MM-dd')) return
    await applyDrop(aptId, dateStr, newTime)
  }

  // ─── Logica comune drop ───────────────────────────────────────────────────
  const applyDrop = async (id: string, dateStr: string, newTime: string) => {
    setBookings(prev => prev.map(b =>
      b.id === id ? { ...b, date: dateStr, time: newTime } : b
    ))
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, time: newTime }),
      })
      if (!res.ok) { alert((await res.json()).error || 'Errore spostamento'); fetchBookings() }
    } catch { alert('Errore di rete'); fetchBookings() }
  }

  // ─── Resize handler ───────────────────────────────────────────────────────
  const handleResizeEnd = async (id: string, newDuration: number) => {
    setBookings(prev => prev.map(b =>
      b.id === id ? { ...b, package: { ...b.package, durationMinutes: newDuration } } : b
    ))
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: newDuration }),
      })
      if (!res.ok) { alert((await res.json()).error || 'Errore resize'); fetchBookings() }
    } catch { alert('Errore di rete'); fetchBookings() }
  }

  // ─── Render appuntamenti — layout stile Apple Calendar ──────────────────────
  // Gli eventi si sovrappongono fisicamente con un offset orizzontale crescente,
  // esattamente come Apple/Fantastical. NON dividono lo spazio al 50%.
  //
  // Formula:
  //   col  = prima colonna libera (greedy overlap-aware)
  //   left = col * INDENT
  //   width = calc(100% - col*INDENT - RIGHT_MARGIN)  ← quasi full, decresce con col
  //   zIndex = 10 + col  → l'evento "più in profondità" sta sopra
  const renderApts = (dayApts: AptData[]) => {
    type AptExt = AptData & { startMins: number; endMins: number }

    const evs: AptExt[] = dayApts
      .map(apt => {
        const startMins = timeToMins(apt.time)
        if (startMins >= LUNCH_START && startMins < LUNCH_END) return null
        const duration = apt.durationMinutes || 60
        let endMins = Math.min(startMins + duration, DAY_END)
        if (startMins < LUNCH_START && endMins > LUNCH_START) endMins = LUNCH_START
        return { ...apt, startMins, endMins }
      })
      .filter((e): e is AptExt => e !== null)
      .sort((a, b) => a.startMins - b.startMins || b.endMins - a.endMins)

    const ov = (a: AptExt, b: AptExt) => a.startMins < b.endMins && a.endMins > b.startMins

    // col = max depth degli overlapper precedenti + 1
    // "depth" si propaga lungo la catena: G1(col0)→G2(col1)→Mario(col2)
    // anche quando gli estremi non si sovrappongono direttamente (G1 e Mario)
    const colOf: Record<string, number> = {}
    for (const ev of evs) {
      const earlierOverlapping = evs.filter(other =>
        other.id !== ev.id &&
        ov(ev, other) &&
        other.id in colOf  // già processato (evs è ordinato per start)
      )
      colOf[ev.id] = earlierOverlapping.length === 0
        ? 0
        : Math.max(...earlierOverlapping.map(o => colOf[o.id])) + 1
    }

    // Apple Calendar layout: offset fisso per colonna, width quasi full
    const INDENT = isMobile ? 12 : 18 // px di offset per ogni livello di colonna
    const RIGHT  = 4                   // px di margine destro fisso

    return evs.map(apt => {
      const col    = colOf[apt.id]
      const top    = minToY(apt.startMins, SH)
      const height = Math.max(minToY(apt.endMins, SH) - top, SH)
      const left   = `${col * INDENT}px`
      const width  = `calc(100% - ${col * INDENT + RIGHT}px)`

      return (
        <AptBlock
          key={apt.id}
          apt={apt}
          top={top}
          height={height}
          left={left}
          right="auto"
          width={width}
          zIndex={10 + col}
          slotH={SH}
          isMobile={isMobile}
          onClickApt={showApt}
          onResizeEnd={handleResizeEnd}
          onTouchDrop={isMobile ? handleTouchDrop : undefined}
        />
      )
    })
  }
  // ─── Click handler timeline ───────────────────────────────────────────────
  const buildClick = (dateStr: string) => (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.apt-block')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const time = yToBookableTime(e.clientY - rect.top, SH)
    if (isPastTime(dateStr, time)) return
    openCreate(dateStr, time)
  }

  // ============================================================================
  // VISTA MESE
  // ============================================================================
  const renderMonth = () => {
    const year  = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay    = new Date(year, month, 1)
    const lastDayNum  = new Date(year, month + 1, 0).getDate()
    const startOffset = getDay(firstDay) === 0 ? 6 : getDay(firstDay) - 1
    const todayStr    = format(new Date(), 'yyyy-MM-dd')

    const byDate: Record<string, AptData[]> = {}
    apts.forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = []
      byDate[a.date].push(a)
    })

    return (
      <div className="space-y-4">
        <div className="calendar-header">
          {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d =>
            <div key={d} className="calendar-header-day">{d}</div>
          )}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: lastDayNum }).map((_, i) => {
            const day     = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === todayStr
            const dayApts = byDate[dateStr] || []
            return (
              <div
                key={dateStr}
                className={`calendar-day ${dayApts.length ? 'has-appointments' : ''} ${isToday ? 'today' : ''} cursor-pointer`}
                onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                onDoubleClick={() => goDay(dateStr)}
              >
                <div className={`calendar-day-number ${isToday ? 'today-circle' : ''}`}>{day}</div>
                {dayApts.slice(0, 2).map(a => (
                  <div
                    key={a.id}
                    className={`month-event-pill truncate text-[9px] md:text-[10px] px-1 rounded mb-0.5 cursor-pointer
                      ${a.isPast ? 'opacity-50 bg-dark-400/40 text-gray-500' : 'bg-gold-400/20 text-gold-300'}`}
                    onClick={ev => { ev.stopPropagation(); showApt(a) }}
                  >
                    {a.time} {a.client_name}
                  </div>
                ))}
                {dayApts.length > 2 && (
                  <div className="text-[9px] text-gray-500 px-1">+{dayApts.length - 2} altri</div>
                )}
              </div>
            )
          })}
        </div>

        {selectedDate && (
          <div className="glass-card rounded-lg p-2 md:p-3 mt-2 md:mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold gold-text-gradient heading-font">
                {format(parseISO(selectedDate), 'dd/MM/yyyy', { locale: it })}
                {byDate[selectedDate]
                  ? ` — ${byDate[selectedDate].length} appuntament${byDate[selectedDate].length !== 1 ? 'i' : 'o'}`
                  : ' — Nessun appuntamento'}
              </p>
              <button className="text-[10px] text-gold-400 hover:text-gold-300 underline" onClick={() => goDay(selectedDate)}>
                Apri giornata →
              </button>
            </div>
            {byDate[selectedDate] ? (
              <div className="space-y-1.5">
                {byDate[selectedDate].map(a => (
                  <div
                    key={a.id}
                    className={`glass-card rounded-lg p-2 cursor-pointer transition-smooth ${a.isPast ? 'opacity-60' : 'hover:border-gold-400/50'}`}
                    onClick={() => showApt(a)}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <p className="font-semibold text-xs text-white">{a.client_name}</p>
                        <p className="text-[10px] text-gray-400">{a.time} · ${a.service}</p>
                      </div>
                      <Badge variant={a.status === 'confirmed' ? 'success' : a.status === 'pending' ? 'warning' : 'info'} size="sm">
                        {a.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button className="flex items-center gap-1 text-[11px] text-gold-400 hover:text-gold-300" onClick={() => openCreate(selectedDate)}>
                <Plus className="w-3 h-3" /> Aggiungi appuntamento
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ============================================================================
  // VISTA GIORNO
  // ============================================================================
  const renderDay = () => {
    const dateStr = format(currentDay, 'yyyy-MM-dd')
    const dayApts = apts.filter(a => a.date === dateStr)

    return (
      <div className="space-y-2 md:space-y-3">
        <div className="glass-card rounded-lg p-2 md:p-3">
          <h3 className="text-sm md:text-base font-bold gold-text-gradient heading-font">
            {dayApts.length} Appuntament{dayApts.length !== 1 ? 'i' : 'o'}
          </h3>
          <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">
            Click su slot vuoto per aggiungere · Trascina il bordo inferiore per ridimensionare
          </p>
        </div>

        <div
          ref={dayRef}
          className="overflow-y-auto rounded-lg no-scrollbar"
          style={{ height: isMobile ? '60vh' : '70vh' }}
        >
          <div className="flex">
            {/* Colonna ore — larghezza fissa */}
            <div className="flex-shrink-0 w-10 md:w-12">
              <HourLabels slotH={SH} />
            </div>
            {/* Colonna timeline — prende il resto */}
            <div className="flex-1 min-w-0">
              <Timeline
                slotH={SH}
                dateStr={dateStr}
                onClick={buildClick(dateStr)}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDrop={buildDrop(dateStr)}
              >
                <GridLines slotH={SH} />
                <LunchBreak slotH={SH} />
                <NowLine dateStr={dateStr} slotH={SH} nowMin={nowMin} />
                {renderApts(dayApts)}
              </Timeline>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // VISTA SETTIMANA
  // ============================================================================
  const renderWeek = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
    const weekDays  = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentWeek, { weekStartsOn: 1 }) })
    const todayStr  = format(new Date(), 'yyyy-MM-dd')

    // ── MOBILE: layout flex orizzontale con scroll, 2 giorni visibili ─────────
    if (isMobile) {
      const HOUR_W = 40
      const DAY_W  = '50vw' // 2 giorni visibili contemporaneamente

      return (
        <div
          ref={weekRef}
          className="overflow-auto rounded-lg no-scrollbar"
          style={{ height: '70vh' }}
        >
          {/* Header sticky top — minWidth = larghezza totale per evitare barra nera */}
          <div
            className="sticky top-0 z-30"
            style={{
              backgroundColor: '#0a0a0a',
              minWidth: `calc(${HOUR_W}px + ${DAY_W} * 7)`,
            }}
          >
            <div className="flex">
              <div className="flex-shrink-0" style={{ width: HOUR_W }} />
              <div className="flex" style={{ width: `calc(${DAY_W} * 7)` }}>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const isToday = dateStr === todayStr
                  return (
                    <div
                      key={dateStr}
                      className="flex-shrink-0 text-center cursor-pointer group py-1.5"
                      style={{ width: DAY_W }}
                      onClick={() => goDay(dateStr)}
                    >
                      <div className={`text-[9px] font-semibold transition group-hover:text-gold-300
                        ${isToday ? 'text-gold-400' : 'text-gray-400'}`}>
                        {format(day, 'EEE d MMM', { locale: it })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Griglia timeline */}
          <div className="flex" style={{ minWidth: `calc(${HOUR_W}px + ${DAY_W} * 7)` }}>
            <div className="sticky left-0 z-20 flex-shrink-0" style={{ width: HOUR_W, backgroundColor: '#0a0a0a' }}>
              <HourLabels slotH={SH} />
            </div>
            <div className="flex" style={{ width: `calc(${DAY_W} * 7)` }}>
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayApts = apts.filter(a => a.date === dateStr)
                return (
                  <div
                    key={dateStr}
                    className="flex-shrink-0"
                    style={{ width: DAY_W, borderLeft: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <Timeline
                      slotH={SH}
                      dateStr={dateStr}
                      onClick={buildClick(dateStr)}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                      onDrop={buildDrop(dateStr)}
                    >
                      <GridLines slotH={SH} />
                      <LunchBreak slotH={SH} />
                      <NowLine dateStr={dateStr} slotH={SH} nowMin={nowMin} />
                      {renderApts(dayApts)}
                    </Timeline>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    // ── DESKTOP: grid con tutti i 7 giorni ────────────────────────────────────
    const HOUR_W    = 48
    const GRID_COLS = `${HOUR_W}px repeat(7, 1fr)`

    return (
      <div
        ref={weekRef}
        className="overflow-auto rounded-lg no-scrollbar"
        style={{ height: '70vh' }}
      >
        <div>
          <div className="sticky top-0 z-30" style={{ backgroundColor: '#0a0a0a' }}>
            <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS }}>
              <div className="sticky left-0 z-10" style={{ backgroundColor: '#0a0a0a' }} />
              {weekDays.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isToday = dateStr === todayStr
                return (
                  <div
                    key={dateStr}
                    className="text-center cursor-pointer group py-1.5"
                    onClick={() => goDay(dateStr)}
                  >
                    <div className={`text-[10px] font-semibold mb-0.5 transition group-hover:text-gold-300
                      ${isToday ? 'text-gold-400' : 'text-gray-400'}`}>
                      {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'][i]}
                    </div>
                    <div className={`mx-auto w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition
                      ${isToday ? 'bg-gold-400 text-black' : 'text-white group-hover:bg-dark-300'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS }}>
            <div className="sticky left-0 z-20" style={{ backgroundColor: '#0a0a0a' }}>
              <HourLabels slotH={SH} />
            </div>
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayApts = apts.filter(a => a.date === dateStr)
              return (
                <div key={dateStr} style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
                  <Timeline
                    slotH={SH}
                    dateStr={dateStr}
                    onClick={buildClick(dateStr)}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={buildDrop(dateStr)}
                  >
                    <GridLines slotH={SH} />
                    <LunchBreak slotH={SH} />
                    <NowLine dateStr={dateStr} slotH={SH} nowMin={nowMin} />
                    {renderApts(dayApts)}
                  </Timeline>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
  // ============================================================================
  // RENDER PRINCIPALE
  // ============================================================================
  return (
    <div className="space-y-2 md:space-y-4 calendar-container">
      {/* Barra navigazione */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="outline-gold" size="sm" className="p-2" onClick={() => nav('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gold-400 hover:text-gold-300 text-xs md:text-sm px-2" onClick={goToday}>
            Oggi
          </Button>
          <Button variant="outline-gold" size="sm" className="p-2" onClick={() => nav('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-white font-semibold text-xs md:text-sm heading-font min-w-[140px] md:min-w-[210px] text-center px-2">
            {periodLabel()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="gold"
            size="sm"
            className="flex items-center gap-1.5 text-xs md:text-sm px-3"
            onClick={() => openCreate(format(currentDay, 'yyyy-MM-dd'))}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuovo</span>
          </Button>
          {(['month', 'week', 'day'] as CalendarView[]).map(v => (
            <button
              key={v}
              className={`calendar-view-btn text-xs md:text-sm px-3 md:px-4 ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
            >
              {v === 'month' ? 'Mese' : v === 'week' ? 'Settimana' : 'Giorno'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto */}
      <div>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin" />
            <p className="mt-4 text-dark-600 text-sm">Caricamento...</p>
          </div>
        ) : (
          <>
            {view === 'month' && renderMonth()}
            {view === 'week'  && renderWeek()}
            {view === 'day'   && renderDay()}
          </>
        )}
      </div>

      {/* Modali */}
      {selectedApt && (
        <AppointmentDetailModal
          appointment={selectedApt}
          isOpen={aptModalOpen}
          onClose={() => { setAptModalOpen(false); setSelectedApt(null) }}
          onUpdate={fetchBookings}
        />
      )}
      <AdminBookingModal
        isOpen={bookingModalOpen}
        onClose={() => { setBookingModalOpen(false); setPrefilledDate(''); setPrefilledTime('') }}
        onSuccess={() => { setBookingModalOpen(false); fetchBookings() }}
        prefilledDate={prefilledDate}
        prefilledTime={prefilledTime}
      />
    </div>
  )
}
