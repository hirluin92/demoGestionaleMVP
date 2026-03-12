'use client'

import { MouseEvent, PointerEvent, useEffect, useRef, useState } from 'react'

interface AppointmentBlockProps {
  id: string
  clientName: string
  serviceName: string
  startTime: Date
  endTime: Date
  staffIndex: number
  columnOffset: number
  slotMinutes?: number
  calendarStartHour?: number
  color: string
  status: string
  overlapColumn?: number
  slotHeight?: number
  onResizeEnd?: (id: string, newDurationMinutes: number) => void
  isDragging?: boolean
  onDragStart?: (
    id: string,
    clientX: number,
    clientY: number,
    offsetX: number,
    offsetY: number,
  ) => void
  onClick?: (id: string) => void
}

export function AppointmentBlock({
  id,
  clientName,
  serviceName,
  startTime,
  endTime,
  staffIndex,
  columnOffset,
  slotMinutes = 15,
  calendarStartHour = 0,
  color,
  status,
  overlapColumn = 0,
  slotHeight = 20,
  onResizeEnd,
  isDragging = false,
  onDragStart,
  onClick,
}: AppointmentBlockProps) {
  const calendarStartMinutes = calendarStartHour * 60
  const minutesFromCalendarStart =
    startTime.getHours() * 60 + startTime.getMinutes() - calendarStartMinutes
  const endMinutesFromCalendarStart =
    endTime.getHours() * 60 + endTime.getMinutes() - calendarStartMinutes

  const baseRowStart = Math.floor(minutesFromCalendarStart / slotMinutes) + 2
  const baseRowEnd = Math.ceil(endMinutesFromCalendarStart / slotMinutes) + 2

  // Stato locale per anteprima resize (in numero di slot)
  const [extraSlots, setExtraSlots] = useState(0)

  const rowStart = baseRowStart
  const rowEnd = baseRowEnd + extraSlots

  const gridColumn = columnOffset + staffIndex

  // Offset orizzontale per appuntamenti sovrapposti (stile Apple Calendar)
  const indentPx = 16
  const rightMarginPx = 4
  const leftOffset = overlapColumn * indentPx

  const isResizingRef = useRef(false)
  const wasDraggedRef = useRef(false)
  const wasResizedRef = useRef(false)

  useEffect(() => {
    return () => {
      document.body.style.userSelect = ''
    }
  }, [])

  // Quando endTime cambia (dopo risposta server), azzera l'anteprima locale
  // così l'altezza viene calcolata solo dalla durata reale salvata.
  const endTimestamp = endTime.getTime()
  useEffect(() => {
    setExtraSlots(0)
  }, [endTimestamp])

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (isResizingRef.current || wasDraggedRef.current || wasResizedRef.current) {
      wasDraggedRef.current = false
      wasResizedRef.current = false
      return
    }
    if (onClick) {
      onClick(id)
    }
  }

  const statusBorder =
    status === 'CONFIRMED'
      ? 'border-emerald-400'
      : status === 'CANCELLED'
      ? 'border-red-400'
      : status === 'NO_SHOW'
      ? 'border-orange-400'
      : 'border-transparent'

  const handleResizePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onResizeEnd) return
    event.preventDefault()
    event.stopPropagation()

    isResizingRef.current = true
    wasDraggedRef.current = false
    wasResizedRef.current = false
    document.body.style.userSelect = 'none'

    const startY = event.clientY
    const startExtraSlots = extraSlots
    const pointerId = event.pointerId

    event.currentTarget.setPointerCapture(pointerId)

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const deltaY = moveEvent.clientY - startY
      const slotsDelta = Math.round(deltaY / slotHeight)
      const minResizeSlots = -(baseRowEnd - baseRowStart - 1)
      setExtraSlots(Math.max(minResizeSlots, startExtraSlots + slotsDelta))
    }

    const handleUp = (upEvent: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      document.body.style.userSelect = ''

      const deltaY = upEvent.clientY - startY
      const slotsDelta = Math.round(deltaY / slotHeight)
      const minResizeSlots = -(baseRowEnd - baseRowStart - 1)
      const finalExtraSlots = Math.max(minResizeSlots, startExtraSlots + slotsDelta)
      setExtraSlots(finalExtraSlots)

      const totalSlots = (baseRowEnd - baseRowStart) + finalExtraSlots
      const newDurationMinutes = Math.max(slotMinutes, totalSlots * slotMinutes)
      onResizeEnd(id, newDurationMinutes)
      wasResizedRef.current = true
      isResizingRef.current = false
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  const handleBlockPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onDragStart) return
    // Se il target è l'handle di resize, lascia gestire al resize
    const target = event.target as HTMLElement
    if (target.dataset.resizeHandle === 'true') return

    event.preventDefault()
    event.stopPropagation()

    const element = event.currentTarget
    const startX = event.clientX
    const startY = event.clientY
    const rect = element.getBoundingClientRect()
    const offsetX = startX - rect.left
    const offsetY = startY - rect.top

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        wasDraggedRef.current = true
        onDragStart(id, moveEvent.clientX, moveEvent.clientY, offsetX, offsetY)
        element.removeEventListener('pointermove', handleMove)
        element.removeEventListener('pointerup', handleUp)
      }
    }

    const handleUp = () => {
      element.removeEventListener('pointermove', handleMove)
      element.removeEventListener('pointerup', handleUp)
    }

    element.addEventListener('pointermove', handleMove)
    element.addEventListener('pointerup', handleUp)
  }

  return (
    <div
      onPointerDown={handleBlockPointerDown}
      onClick={handleClick}
      className={`relative rounded-md px-2 py-1 text-[11px] cursor-pointer overflow-hidden border-l-2 ${statusBorder}`}
      style={{
        gridColumn,
        gridRowStart: rowStart,
        gridRowEnd: rowEnd,
        marginLeft: leftOffset,
        width: `calc(100% - ${leftOffset + rightMarginPx}px)`,
        zIndex: 10 + overlapColumn,
        opacity: isDragging ? 0.4 : 1,
        backgroundColor: `${color}33`,
      }}
    >
      <div className="font-medium truncate">{clientName}</div>
      <div className="text-[10px] text-dark-200 truncate">{serviceName}</div>
      {onResizeEnd && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center"
          data-resize-handle="true"
          onPointerDown={handleResizePointerDown}
        >
          <div className="w-8 h-0.5 rounded-full bg-[rgba(148,163,184,0.9)]" />
        </div>
      )}
    </div>
  )
}