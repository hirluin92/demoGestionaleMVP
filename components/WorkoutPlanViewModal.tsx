'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { X, Dumbbell } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { WorkoutPlan } from '@/components/WorkoutPlanModal'

interface WorkoutPlanViewModalProps {
  plan: WorkoutPlan | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
}

export default function WorkoutPlanViewModal({
  plan,
  isOpen,
  onClose,
  onEdit,
}: WorkoutPlanViewModalProps) {
  const [mounted, setMounted] = useState(false)
  const [activeDayIndex, setActiveDayIndex] = useState(0)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    setActiveDayIndex(0)
  }, [plan])

  if (!mounted || !isOpen || !plan) return null

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-4 md:p-6 lg:p-8 max-h-[95vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95vw' }}
      >
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold gold-text-gradient heading-font flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-[#D3AF37]" />
              {plan.name}
            </h2>
            <p className="text-xs md:text-sm text-dark-600 mt-1">
              Visualizzazione completa della scheda di allenamento
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-3xl md:text-4xl"
            aria-label="Chiudi"
          >
            <X className="w-7 h-7 md:w-8 md:h-8" />
          </button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center text-lg md:text-2xl heading-font gold-text-gradient">
                  <Dumbbell className="w-5 h-5 md:w-6 md:h-6 mr-2 text-[#D3AF37]" />
                  Dettagli scheda
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  {plan.description || 'Scheda di allenamento personalizzata'}
                </CardDescription>
                {(plan.startDate || plan.endDate) && (
                  <p className="text-xs md:text-sm text-dark-500 mt-1">
                    {formatDate(plan.startDate) || 'N/D'}{' '}
                    <span className="mx-1">→</span>
                    {formatDate(plan.endDate) || 'N/D'}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-start md:items-end gap-1">
                <Badge variant={plan.isActive ? 'success' : 'warning'} className="text-xs">
                  {plan.isActive ? 'Attiva' : 'Inattiva'}
                </Badge>
                <p className="text-[11px] text-dark-500">
                  {plan.days.length} giorni •{' '}
                  {plan.days.reduce(
                    (sum, day) => sum + (day.exercises ? day.exercises.length : 0),
                    0
                  )}{' '}
                  esercizi totali
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tabs Giorni */}
            {plan.days.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                  {plan.days
                    .slice()
                    .sort((a, b) => a.dayNumber - b.dayNumber)
                    .map((day, index) => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setActiveDayIndex(index)}
                        className={`px-3 py-1.5 rounded-full text-xs md:text-sm border transition-all duration-300 whitespace-nowrap ${
                          activeDayIndex === index
                            ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-dark-950 border-gold-400'
                            : 'border-gold-400/60 text-white hover:bg-white/10'
                        }`}
                      >
                        {day.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Contenuto Giorno */}
            {activeDayIndex >= 0 &&
            activeDayIndex < plan.days.length &&
            plan.days[activeDayIndex] ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-white mb-1">
                    {plan.days[activeDayIndex].name}
                  </h3>
                  {plan.days[activeDayIndex].notes && (
                    <p className="text-xs md:text-sm text-dark-500 italic">
                      {plan.days[activeDayIndex].notes}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {(() => {
                    const sorted = plan.days[activeDayIndex].exercises
                      .slice()
                      .sort((a, b) => a.orderIndex - b.orderIndex)

                    if (sorted.length === 0) {
                      return (
                        <p className="text-xs text-dark-500">
                          Nessun esercizio per questo giorno.
                        </p>
                      )
                    }

                    const groups: Record<string, { ex: any; index: number }[]> = {}

                    sorted.forEach((ex, index) => {
                      const label = ex.exercise?.category?.name || 'Altro'
                      if (!groups[label]) {
                        groups[label] = []
                      }
                      groups[label].push({ ex, index })
                    })

                    return Object.entries(groups).map(([label, items]) => (
                      <div key={label} className="space-y-2">
                        <p className="text-[11px] md:text-xs font-semibold text-gold-400 uppercase tracking-wide mt-1">
                          {label}
                        </p>
                        {items.map(({ ex, index }) => (
                          <div
                            key={ex.id}
                            className="glass-card border border-dark-200/30 rounded-lg p-3 md:p-4"
                          >
                            <p className="text-xs md:text-sm font-semibold text-white">
                              {index + 1}. {ex.name}
                            </p>
                            <p className="text-[11px] md:text-xs text-dark-600 mt-1">
                              {ex.sets} × {ex.reps}
                              {ex.weight && ` • ${ex.weight}`}
                              {ex.restSeconds != null && ` • rec ${ex.restSeconds}s`}
                              {ex.tempo && ` • tempo ${ex.tempo}`}
                            </p>
                            {ex.notes && (
                              <p className="text-[11px] text-dark-500 italic mt-1">
                                📝 {ex.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-xs text-dark-500">Nessun giorno configurato per questa scheda.</p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 flex flex-col md:flex-row justify-end gap-3">
          {onEdit && (
            <Button
              variant="outline-gold"
              size="md"
              onClick={() => {
                onClose()
                onEdit()
              }}
              className="w-full md:w-auto"
            >
              Modifica Scheda
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={onClose} className="w-full md:w-auto">
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

