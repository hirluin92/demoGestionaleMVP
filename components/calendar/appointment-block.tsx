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

  useEffect(() => {
    return () => {
      document.body.style.userSelect = ''
    }
  }, [])

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (isResizingRef.current || wasDraggedRef.current) {
      wasDraggedRef.current = false
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
      setExtraSlots(0)
      isResizingRef.current = false
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  return (
    <div
      draggable
      onDragStart={event => {
        event.stopPropagation()
        wasDraggedRef.current = false
        event.dataTransfer.setData('application/appointly-appointment-id', id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      onDrag={event => {
        if (event.clientX !== 0 || event.clientY !== 0) {
          wasDraggedRef.current = true
        }
      }}
      onClick={handleClick}
      className={`relative rounded-md px-2 py-1 text-[11px] cursor-pointer overflow-hidden border-l-2 ${statusBorder}`}
      style={{
        gridColumn,
        gridRowStart: rowStart,
        gridRowEnd: rowEnd,
        marginLeft: leftOffset,
        width: `calc(100% - ${leftOffset + rightMarginPx}px)`,
        zIndex: 10 + overlapColumn,
        backgroundColor: `${color}33`,
      }}
    >
      <div className="font-medium truncate">{clientName}</div>
      <div className="text-[10px] text-dark-200 truncate">{serviceName}</div>
      {onResizeEnd && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center"
          onPointerDown={handleResizePointerDown}
        >
          <div className="w-8 h-0.5 rounded-full bg-[rgba(148,163,184,0.9)]" />
        </div>
      )}
    </div>
  )
}