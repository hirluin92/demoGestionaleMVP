'use client'

import { addDays } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Commenti in italiano: header calendario con navigazione settimana via query string ?date=

interface CalendarHeaderProps {
  currentDate: Date
}

export function CalendarHeader({
  currentDate,
}: CalendarHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateDate = (next: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', next.toISOString())
    router.push(`?${params.toString()}`)
  }

  const goPrev = () => {
    updateDate(addDays(currentDate, -7))
  }

  const goNext = () => {
    updateDate(addDays(currentDate, 7))
  }

  const label = new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate)

  const dayLabel = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(currentDate)

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-dark-500">
          {label}
        </div>
        <div className="text-lg font-semibold">
          {dayLabel}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-full border border-dark-600 bg-dark-800 p-1.5 text-dark-100 hover:bg-dark-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-full border border-dark-600 bg-dark-800 p-1.5 text-dark-100 hover:bg-dark-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

