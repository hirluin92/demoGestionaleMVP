'use client'

import { MouseEvent } from 'react'

// Commenti in italiano: blocco singolo appuntamento nel calendario

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
  onClick,
}: AppointmentBlockProps) {
  const calendarStartMinutes = calendarStartHour * 60
  const minutesFromCalendarStart =
    startTime.getHours() * 60 + startTime.getMinutes() - calendarStartMinutes
  const endMinutesFromCalendarStart =
    endTime.getHours() * 60 + endTime.getMinutes() - calendarStartMinutes

  const rowStart = Math.floor(minutesFromCalendarStart / slotMinutes) + 2
  const rowEnd = Math.ceil(endMinutesFromCalendarStart / slotMinutes) + 2

  const gridColumn = columnOffset + staffIndex

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
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

  return (
    <div
      onClick={handleClick}
      className={`relative rounded-md px-2 py-1 text-[11px] cursor-pointer overflow-hidden border-l-2 ${statusBorder}`}
      style={{
        gridColumn,
        gridRowStart: rowStart,
        gridRowEnd: rowEnd,
        backgroundColor: `${color}33`,
      }}
    >
      <div className="font-medium truncate">{clientName}</div>
      <div className="text-[10px] text-dark-200 truncate">{serviceName}</div>
    </div>
  )
}

