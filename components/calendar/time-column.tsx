'use client'

// Commenti in italiano: colonna orari a sinistra del calendario

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

interface TimeColumnProps {
  startHour?: number
  endHour?: number
  slotMinutes?: number
  slotHeight?: number
}

export function TimeColumn({
  startHour = 8,
  endHour = 20,
  slotMinutes = 15,
  slotHeight = 20,
}: TimeColumnProps) {
  const hours = HOURS.filter(h => h >= startHour && h <= endHour)

  const slotsPerHour = 60 / slotMinutes

  return (
    <div
      className="border-r border-dark-700 text-[11px] text-dark-500 select-none"
      style={{
        gridColumn: 1,
        gridRow: `2 / span ${hours.length * slotsPerHour}`,
      }}
    >
      {hours.map(hour => (
        <div
          key={hour}
          className="relative flex items-start justify-end pr-1"
          style={{ height: slotHeight * slotsPerHour }}
        >
          <span className="translate-y-[-50%]">
            {hour.toString().padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  )
}

