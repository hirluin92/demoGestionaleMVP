'use client'

import { useEffect, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface WorkoutExercise {
  id: string
  orderIndex: number
  name: string
  sets: number
  reps: string
  weight?: string | null
  restSeconds?: number | null
  tempo?: string | null
  notes?: string | null
  exercise?: {
    id: string
    name: string
    equipment?: string | null
    category?: {
      id: string
      name: string
    } | null
  } | null
}

interface WorkoutDay {
  id: string
  dayNumber: number
  name: string
  notes?: string | null
  exercises: WorkoutExercise[]
}

interface WorkoutPlan {
  id: string
  name: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  isActive: boolean
  createdAt: string
  days: WorkoutDay[]
}

export default function ClientWorkoutPlansView() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [activeDayIndex, setActiveDayIndex] = useState(0)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/workout-plans')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('Errore recupero schede:', res.status, data)
        setError('Impossibile caricare le schede. Riprova più tardi.')
        setPlans([])
        return
      }
      const data = await res.json()
      setPlans(Array.isArray(data) ? data : [])

      if (Array.isArray(data) && data.length > 0) {
        // se una sola scheda, attivala direttamente
        if (data.length === 1) {
          setActivePlanId(data[0].id)
          setActiveDayIndex(0)
        }
      }
    } catch (err) {
      console.error('Errore recupero schede:', err)
      setError('Errore di connessione. Verifica la tua connessione internet e riprova.')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner-gold w-12 h-12 mx-auto mb-4"></div>
        <p className="mt-4 text-dark-600">Caricamento schede di allenamento...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Dumbbell className="w-10 h-10 text-[#D3AF37]" />
        </div>
        <h3 className="empty-state-title">Errore nel caricamento</h3>
        <p className="empty-state-description">{error}</p>
        <button
          onClick={fetchPlans}
          className="mt-4 px-4 py-2 bg-[#D3AF37] text-dark-950 rounded-lg font-semibold hover:bg-[#E8DCA0] transition-colors"
        >
          Riprova
        </button>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Dumbbell className="w-10 h-10 text-[#D3AF37]" />
        </div>
        <h3 className="empty-state-title">Nessuna scheda assegnata</h3>
        <p className="empty-state-description">
          Il tuo trainer creerà una scheda personalizzata per te. Quando sarà pronta, la troverai
          qui.
        </p>
      </div>
    )
  }

  const activePlan =
    (activePlanId && plans.find((p) => p.id === activePlanId)) ||
    (plans.length === 1 ? plans[0] : plans[0])

  const handleSelectPlan = (planId: string) => {
    setActivePlanId(planId)
    setActiveDayIndex(0)
  }

  return (
    <div className="space-y-4">
      {/* Se più schede, mostra lista selezionabile */}
      {plans.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plans.map((plan) => {
            const isActive = activePlan?.id === plan.id
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full text-left rounded-xl glass-card border p-3 md:p-4 transition-all duration-300 ${
                  isActive
                    ? 'border-gold-400/70 shadow-gold'
                    : 'border-dark-200/30 hover:border-gold-400/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm md:text-base font-semibold text-white">{plan.name}</p>
                  <Badge
                    variant={plan.isActive ? 'success' : 'warning'}
                    className="text-[10px] md:text-xs"
                  >
                    {plan.isActive ? 'Attiva' : 'Inattiva'}
                  </Badge>
                </div>
                <p className="text-[11px] md:text-xs text-dark-500 line-clamp-2">
                  {plan.description || 'Nessuna descrizione'}
                </p>
                {(plan.startDate || plan.endDate) && (
                  <p className="text-[10px] text-dark-600 mt-1">
                    {formatDate(plan.startDate) || 'N/D'}{' '}
                    <span className="mx-1">→</span>
                    {formatDate(plan.endDate) || 'N/D'}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Scheda attiva */}
      {activePlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg md:text-2xl heading-font gold-text-gradient">
              <Dumbbell className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#D3AF37]" />
              {activePlan.name}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {activePlan.description || 'Scheda di allenamento personalizzata'}
            </CardDescription>
            {(activePlan.startDate || activePlan.endDate) && (
              <p className="text-xs md:text-sm text-dark-500 mt-1">
                {formatDate(activePlan.startDate) || 'N/D'}{' '}
                <span className="mx-1">→</span>
                {formatDate(activePlan.endDate) || 'N/D'}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {/* Tabs Giorni */}
            {activePlan.days.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                  {activePlan.days
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
            activeDayIndex < activePlan.days.length &&
            activePlan.days[activeDayIndex] ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-white mb-1">
                    {activePlan.days[activeDayIndex].name}
                  </h3>
                  {activePlan.days[activeDayIndex].notes && (
                    <p className="text-xs md:text-sm text-dark-500 italic">
                      {activePlan.days[activeDayIndex].notes}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {(() => {
                    const sorted = activePlan.days[activeDayIndex].exercises
                      .slice()
                      .sort((a, b) => a.orderIndex - b.orderIndex)

                    if (sorted.length === 0) {
                      return (
                        <p className="text-xs text-dark-500">
                          Nessun esercizio per questo giorno.
                        </p>
                      )
                    }

                    const groups: Record<string, { ex: WorkoutExercise; index: number }[]> = {}

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
      )}
    </div>
  )
}

