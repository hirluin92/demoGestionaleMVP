'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Search,
  Dumbbell,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'

const REP_OPTIONS = [
  '3-5',
  '4-6',
  '6-8',
  '8-10',
  '10-12',
  '12-15',
  '15-20',
  '20+',
  'AMRAP',
]

interface WorkoutExercise {
  id: string
  workoutDayId: string
  orderIndex: number
  exerciseId?: string | null
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
  workoutPlanId: string
  dayNumber: number
  name: string
  notes?: string | null
  exercises: WorkoutExercise[]
}

export interface WorkoutPlan {
  id: string
  userId: string
  name: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  days: WorkoutDay[]
}

interface ExerciseCategory {
  id: string
  name: string
  sortOrder: number
  _count?: {
    exercises: number
  }
}

interface Exercise {
  id: string
  name: string
  categoryId: string
  equipment?: string | null
  category: ExerciseCategory
}

interface LocalWorkoutExercise {
  tempId: string
  exerciseId?: string | null
  name: string
  sets: number
  reps: string
  weight?: string | null
  restSeconds?: number | null
  tempo?: string | null
  notes?: string | null
  expanded?: boolean
  categoryName?: string | null
}

interface LocalWorkoutDay {
  tempId: string
  name: string
  notes?: string | null
  exercises: LocalWorkoutExercise[]
}

interface WorkoutPlanModalProps {
  userId: string
  userName: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editPlan?: WorkoutPlan | null
}

function createTempId() {
  return Math.random().toString(36).slice(2)
}

export default function WorkoutPlanModal({
  userId,
  userName,
  isOpen,
  onClose,
  onSuccess,
  editPlan,
}: WorkoutPlanModalProps) {
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [days, setDays] = useState<LocalWorkoutDay[]>([])
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      initStateFromPlan()
      fetchLibrary()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editPlan])

  const initStateFromPlan = () => {
    if (editPlan) {
      setPlanName(editPlan.name)
      setPlanDescription(editPlan.description ?? '')
      setStartDate(editPlan.startDate ? editPlan.startDate.slice(0, 10) : '')
      setEndDate(editPlan.endDate ? editPlan.endDate.slice(0, 10) : '')
      const mappedDays: LocalWorkoutDay[] = (editPlan.days || [])
        .sort((a, b) => a.dayNumber - b.dayNumber)
        .map((day) => ({
          tempId: createTempId(),
          name: day.name,
          notes: day.notes ?? '',
          exercises: (day.exercises || [])
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((ex) => ({
              tempId: createTempId(),
              exerciseId: ex.exerciseId ?? null,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight ?? '',
              restSeconds: ex.restSeconds ?? null,
              tempo: ex.tempo ?? '',
              notes: ex.notes ?? '',
              expanded: false,
              categoryName: ex.exercise?.category?.name ?? null,
            })),
        }))
      setDays(mappedDays)
      setActiveDayIndex(0)
    } else {
      setPlanName('')
      setPlanDescription('')
      setStartDate('')
      setEndDate('')
      setDays([])
      setActiveDayIndex(0)
    }
    setHasChanges(false)
  }

  const fetchLibrary = async () => {
    try {
      const [catRes, exRes] = await Promise.all([
        fetch('/api/exercises/categories'),
        fetch('/api/exercises'),
      ])
      if (catRes.ok) {
        const data = await catRes.json()
        setCategories(data)
      }
      if (exRes.ok) {
        const data = await exRes.json()
        setExercises(data)
      }
    } catch (error) {
      console.error('Errore caricamento libreria esercizi:', error)
    }
  }

  const markChanged = () => {
    setHasChanges(true)
  }

  const handleClose = () => {
    if (hasChanges && !saving) {
      const confirmLeave = window.confirm('Hai modifiche non salvate, vuoi uscire senza salvare?')
      if (!confirmLeave) return
    }
    onClose()
  }

  const addDay = () => {
    const newDay: LocalWorkoutDay = {
      tempId: createTempId(),
      name: `Giorno ${days.length + 1}`,
      notes: '',
      exercises: [],
    }
    setDays((prev) => [...prev, newDay])
    setActiveDayIndex(days.length)
    markChanged()
  }

  const removeDay = (index: number) => {
    const day = days[index]
    if (!day) return
    if (day.exercises.length > 0) {
      const confirmDelete = window.confirm(
        'Questo giorno contiene esercizi. Sei sicuro di volerlo eliminare?'
      )
      if (!confirmDelete) return
    }
    const updated = days.filter((_, i) => i !== index)
    setDays(updated)
    setActiveDayIndex((prev) => Math.max(0, prev - (index <= prev ? 1 : 0)))
    markChanged()
  }

  const updateDay = (index: number, updater: (day: LocalWorkoutDay) => LocalWorkoutDay) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? updater(d) : d))
    )
    markChanged()
  }

  const addExerciseToActiveDay = (exercise: { id?: string; name: string; categoryName?: string | null }) => {
    if (activeDayIndex < 0 || activeDayIndex >= days.length) return
    const newEx: LocalWorkoutExercise = {
      tempId: createTempId(),
      exerciseId: exercise.id ?? null,
      name: exercise.name,
      sets: 3,
      reps: '8-10',
      weight: '',
      restSeconds: 60,
      tempo: '',
      notes: '',
      expanded: true,
      categoryName: exercise.categoryName ?? null,
    }
    updateDay(activeDayIndex, (day) => ({
      ...day,
      exercises: [...day.exercises, newEx],
    }))
    setShowExerciseSearch(false)
  }

  const moveExercise = (dayIndex: number, exIndex: number, direction: 'up' | 'down') => {
    const day = days[dayIndex]
    if (!day) return
    const targetIndex = direction === 'up' ? exIndex - 1 : exIndex + 1
    if (targetIndex < 0 || targetIndex >= day.exercises.length) return
    const newExercises = [...day.exercises]
    const [moved] = newExercises.splice(exIndex, 1)
    newExercises.splice(targetIndex, 0, moved)
    updateDay(dayIndex, (d) => ({ ...d, exercises: newExercises }))
  }

  const filteredExercises = useMemo(() => {
    let list = exercises
    if (selectedCategoryId) {
      list = list.filter((ex) => ex.categoryId === selectedCategoryId)
    }
    if (exerciseSearch.trim()) {
      const q = exerciseSearch.toLowerCase()
      list = list.filter((ex) => ex.name.toLowerCase().includes(q))
    }
    return list
  }, [exercises, selectedCategoryId, exerciseSearch])

  const handleSave = async () => {
    if (!planName.trim() || days.length === 0) {
      alert('Inserisci un nome scheda e almeno un giorno di allenamento.')
      return
    }
    if (days.some((d) => !d.name.trim() || d.exercises.length === 0)) {
      alert('Ogni giorno deve avere un nome e almeno un esercizio.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        userId,
        name: planName.trim(),
        description: planDescription.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        days: days.map((day) => ({
          name: day.name.trim(),
          notes: day.notes?.trim() || null,
          exercises: day.exercises.map((ex) => ({
            exerciseId: ex.exerciseId ?? null,
            name: ex.name.trim(),
            sets: Number(ex.sets) || 1,
            reps: ex.reps.trim(),
            weight: ex.weight?.trim() || null,
            restSeconds:
              ex.restSeconds !== undefined && ex.restSeconds !== null
                ? Number(ex.restSeconds)
                : null,
            tempo: ex.tempo?.trim() || null,
            notes: ex.notes?.trim() || null,
          })),
        })),
      }

      const url = editPlan ? `/api/admin/workout-plans/${editPlan.id}` : '/api/admin/workout-plans'
      const method = editPlan ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPlan ? { ...payload, isActive: editPlan.isActive } : payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('Errore salvataggio scheda:', res.status, data)
        alert(data.error || 'Errore durante il salvataggio della scheda')
        return
      }

      setHasChanges(false)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Errore salvataggio scheda:', error)
      alert('Errore durante il salvataggio della scheda')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted || !isOpen) return null

  const modalContent = (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content glass-card rounded-xl p-4 md:p-6 lg:p-8 max-h-[95vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1100px', width: '95vw' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold gold-text-gradient heading-font flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-[#D3AF37]" />
              {editPlan ? `Modifica Scheda: ${editPlan.name}` : `Nuova Scheda per: ${userName}`}
            </h2>
            <p className="text-xs md:text-sm text-dark-600 mt-1">
              Definisci giorni ed esercizi della scheda di allenamento personalizzata
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition text-3xl md:text-4xl"
            aria-label="Chiudi"
          >
            <X className="w-7 h-7 md:w-8 md:h-8" />
          </button>
        </div>

        {/* Info scheda */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <div>
              <Label className="text-xs md:text-sm text-gold-400 heading-font">Nome Scheda</Label>
              <input
                type="text"
                className="input-field w-full mt-1 text-sm md:text-base"
                placeholder="es. Scheda Massa - Fase 1"
                value={planName}
                onChange={(e) => {
                  setPlanName(e.target.value)
                  markChanged()
                }}
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm text-gold-400 heading-font">
                Note generali (opzionale)
              </Label>
              <textarea
                className="input-field w-full mt-1 text-xs md:text-sm"
                rows={3}
                placeholder="es. Focus su aumento carichi progressivo"
                value={planDescription}
                onChange={(e) => {
                  setPlanDescription(e.target.value)
                  markChanged()
                }}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs md:text-sm text-gold-400 heading-font">
                  Data Inizio
                </Label>
                <input
                  type="date"
                  className="input-field w-full mt-1 text-sm"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    markChanged()
                  }}
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm text-gold-400 heading-font">
                  Data Fine
                </Label>
                <input
                  type="date"
                  className="input-field w-full mt-1 text-sm"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    markChanged()
                  }}
                />
              </div>
            </div>
            {editPlan && (
              <div className="mt-2">
                <Badge variant={editPlan.isActive ? 'success' : 'warning'} className="text-xs">
                  {editPlan.isActive ? 'Attiva' : 'Inattiva'}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Giorni */}
        <div className="mb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {days.map((day, index) => (
              <div key={day.tempId} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveDayIndex(index)}
                  className={`px-3 py-1.5 rounded-full text-xs md:text-sm border transition-all duration-300 whitespace-nowrap ${
                    activeDayIndex === index
                      ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-dark-950 border-gold-400'
                      : 'border-gold-400/60 text-white hover:bg-white/10'
                  }`}
                >
                  {day.name || `Giorno ${index + 1}`}
                </button>
                <button
                  type="button"
                  onClick={() => removeDay(index)}
                  className="text-dark-500 hover:text-red-400 text-xs"
                  aria-label="Rimuovi giorno"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <Button
              variant="outline-gold"
              size="sm"
              onClick={addDay}
              className="text-xs md:text-sm flex-shrink-0"
            >
              <Plus className="w-3 h-3 mr-1" />
              Nuovo Giorno
            </Button>
          </div>
        </div>

        {/* Contenuto Giorno selezionato */}
        {activeDayIndex >= 0 && activeDayIndex < days.length ? (
          <div className="space-y-4">
            <Card variant="dark">
              <CardHeader className="mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-xs md:text-sm text-gold-400 heading-font">
                      Nome Giorno
                    </Label>
                    <input
                      type="text"
                      className="input-field w-full mt-1 text-sm md:text-base"
                      value={days[activeDayIndex].name}
                      onChange={(e) =>
                        updateDay(activeDayIndex, (d) => ({ ...d, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="gold" className="text-[10px] md:text-xs">
                      {days[activeDayIndex].exercises.length} esercizi
                    </Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs md:text-sm text-gold-400 heading-font">
                    Note giorno (opzionale)
                  </Label>
                  <textarea
                    className="input-field w-full mt-1 text-xs md:text-sm"
                    rows={2}
                    value={days[activeDayIndex].notes ?? ''}
                    onChange={(e) =>
                      updateDay(activeDayIndex, (d) => ({ ...d, notes: e.target.value }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Lista esercizi */}
                <div className="space-y-3">
                  {(() => {
                    const sorted = days[activeDayIndex].exercises
                      .slice()
                      .sort((a, b) => a.tempId.localeCompare(b.tempId))

                    if (sorted.length === 0) {
                      return (
                        <p className="text-xs md:text-sm text-dark-500">
                          Nessun esercizio ancora aggiunto a questo giorno.
                        </p>
                      )
                    }

                    const groups: Record<string, { ex: LocalWorkoutExercise; index: number }[]> = {}

                    sorted.forEach((ex, index) => {
                      const label = ex.categoryName || 'Altro'
                      if (!groups[label]) {
                        groups[label] = []
                      }
                      // Usa l'indice reale all'interno dell'array del giorno
                      const realIndex = days[activeDayIndex].exercises.indexOf(ex)
                      groups[label].push({ ex, index: realIndex === -1 ? index : realIndex })
                    })

                    return Object.entries(groups).map(([label, items]) => (
                      <div key={label} className="space-y-2">
                        <p className="text-[11px] md:text-xs font-semibold text-gold-400 uppercase tracking-wide mt-1">
                          {label}
                        </p>
                        {items.map(({ ex, index }) => (
                          <div
                            key={ex.tempId}
                            className="border border-dark-200/30 rounded-lg p-3 md:p-4 glass-card"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs md:text-sm text-dark-500">
                                    {index + 1}.
                                  </span>
                                  <p className="text-sm md:text-base font-semibold text-white">
                                    {ex.name}
                                  </p>
                                </div>
                                <p className="text-xs text-dark-600 mt-1">
                                  {ex.sets} × {ex.reps}
                                  {ex.weight && ` • ${ex.weight}`}
                                  {ex.restSeconds != null && ` • rec ${ex.restSeconds}s`}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveExercise(activeDayIndex, index, 'up')}
                                    className="text-dark-500 hover:text-gold-400 transition"
                                    aria-label="Sposta su"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveExercise(activeDayIndex, index, 'down')}
                                    className="text-dark-500 hover:text-gold-400 transition"
                                    aria-label="Sposta giù"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateDay(activeDayIndex, (d) => ({
                                        ...d,
                                        exercises: d.exercises.map((e, i) =>
                                          i === index ? { ...e, expanded: !e.expanded } : e
                                        ),
                                      }))
                                    }
                                    className="text-dark-500 hover:text-white transition text-xs flex items-center gap-1"
                                  >
                                    {ex.expanded ? (
                                      <>
                                        <ChevronUp className="w-3 h-3" /> Nascondi
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3" /> Dettagli
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateDay(activeDayIndex, (d) => ({
                                        ...d,
                                        exercises: d.exercises.filter((_, i) => i !== index),
                                      }))
                                    }
                                    className="text-dark-500 hover:text-red-400 transition text-xs"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {ex.expanded && (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                                <div className="flex flex-col gap-1">
                                  <Label className="text-[11px] text-gold-400">Serie</Label>
                                  <select
                                    className="input-field w-full text-xs"
                                    value={ex.sets}
                                    onChange={(e) =>
                                      updateDay(activeDayIndex, (d) => ({
                                        ...d,
                                        exercises: d.exercises.map((e2, i) =>
                                          i === index
                                            ? { ...e2, sets: Number(e.target.value) || 1 }
                                            : e2
                                        ),
                                      }))
                                    }
                                  >
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                                      <option key={val} value={val}>
                                        {val}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-[11px] text-gold-400">Ripetizioni</Label>
                                  <select
                                    className="input-field w-full text-xs"
                                    value={ex.reps}
                                    onChange={(e) =>
                                      updateDay(activeDayIndex, (d) => ({
                                        ...d,
                                        exercises: d.exercises.map((e2, i) =>
                                          i === index ? { ...e2, reps: e.target.value } : e2
                                        ),
                                      }))
                                    }
                                  >
                                    {REP_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-[11px] text-gold-400">Carico</Label>
                                  <input
                                    type="text"
                                    className="input-field w-full text-xs"
                                    placeholder="es. 80kg, 70% 1RM, Corpo libero"
                                    value={ex.weight ?? ''}
                                    onChange={(e) =>
                                      updateDay(activeDayIndex, (d) => ({
                                        ...d,
                                        exercises: d.exercises.map((e2, i) =>
                                          i === index ? { ...e2, weight: e.target.value } : e2
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-[11px] text-gold-400">Recupero (sec)</Label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={600}
                                    className="input-field w-full text-xs"
                                    value={ex.restSeconds ?? ''}
                                    onChange={(e) =>
                                      updateDay(activeDayIndex, (d) => ({
                                        ...d,
                                        exercises: d.exercises.map((e2, i) =>
                                          i === index
                                            ? {
                                                ...e2,
                                                restSeconds: e.target.value
                                                  ? Number(e.target.value)
                                                  : null,
                                              }
                                            : e2
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-[11px] text-gold-400">Tempo</Label>
                                  <input
                                    type="text"
                                    className="input-field w-full text-xs"
                                    placeholder="es. 3-1-2-0"
                                    value={ex.tempo ?? ''}
                                    onChange={(e) =>
                                      updateDay(activeDayIndex, (d) => ({
                                        ...d,
                                        exercises: d.exercises.map((e2, i) =>
                                          i === index ? { ...e2, tempo: e.target.value } : e2
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                  <Label className="text-[11px] text-gold-400">Note</Label>
                                  <textarea
                                    className="input-field w-full text-xs"
                                    rows={2}
                                    placeholder="Note tecniche sull'esecuzione..."
                                    value={ex.notes ?? ''}
                                    onChange={(e) =>
                                      updateDay(activeDayIndex, (d) => ({
                                        ...d,
                                        exercises: d.exercises.map((e2, i) =>
                                          i === index ? { ...e2, notes: e.target.value } : e2
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                  })()}
                </div>

                {/* Pulsante aggiungi esercizio */}
                <div className="mt-3">
                  <Button
                    variant="outline-gold"
                    size="sm"
                    onClick={() => setShowExerciseSearch((prev) => !prev)}
                    className="text-xs md:text-sm"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Aggiungi Esercizio
                  </Button>
                </div>

                {/* Pannello ricerca esercizi */}
                {showExerciseSearch && (
                  <div className="mt-4 border border-dark-200/40 rounded-lg p-3 md:p-4 glass-card">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-dark-500 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          className="input-field w-full pl-8 text-xs md:text-sm"
                          placeholder="Cerca esercizio..."
                          value={exerciseSearch}
                          onChange={(e) => setExerciseSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(null)}
                        className={`px-3 py-1 rounded-full border text-[10px] md:text-xs transition-colors ${
                          !selectedCategoryId
                            ? 'bg-[#D3AF37] text-dark-950 border-[#D3AF37]'
                            : 'border-[#D3AF37]/60 text-white hover:bg-white/10'
                        }`}
                      >
                        Tutti
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`px-3 py-1 rounded-full border text-[10px] md:text-xs transition-colors ${
                            selectedCategoryId === cat.id
                              ? 'bg-[#D3AF37] text-dark-950 border-[#D3AF37]'
                              : 'border-[#D3AF37]/60 text-white hover:bg-white/10'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-72 overflow-y-auto no-scrollbar space-y-2 text-xs md:text-sm">
                      {filteredExercises.length === 0 ? (
                        <p className="text-dark-500 text-xs">
                          Nessun esercizio trovato con questi filtri.
                        </p>
                      ) : (
                        filteredExercises.map((ex) => (
                          <button
                            key={ex.id}
                            type="button"
                            className="w-full text-left px-2 py-2 rounded-md hover:bg-white/5 flex items-center justify-between gap-2"
                            onClick={() =>
                              addExerciseToActiveDay({
                                id: ex.id,
                                name: ex.name,
                                categoryName: ex.category?.name ?? null,
                              })
                            }
                          >
                            <div>
                              <p className="text-xs md:text-sm text-white">{ex.name}</p>
                              <p className="text-[10px] text-dark-500">
                                {ex.category?.name}{' '}
                                {ex.equipment && `— ${ex.equipment}`}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mt-4 text-center text-sm text-dark-500">
            Aggiungi almeno un giorno per iniziare a compilare la scheda.
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex flex-col md:flex-row justify-end gap-3">
          <Button variant="ghost" size="md" onClick={handleClose} className="w-full md:w-auto">
            Annulla
          </Button>
          <Button
            variant="gold"
            size="md"
            onClick={handleSave}
            loading={saving}
            className="w-full md:w-auto"
          >
            💾 Salva Scheda
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

