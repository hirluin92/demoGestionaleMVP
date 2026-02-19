'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import AnatomyPickerSVG from '@/components/AnatomyPickerSVG'

interface BodyMeasurement {
  id?: string
  userId: string
  measurementDate: string
  peso?: number | null
  altezza?: number | null  // Altezza
  massaGrassa?: number | null  // % Massa Grassa
  braccio?: number | null  // Circonferenza braccio
  spalle?: number | null  // Circonferenza spalle
  torace?: number | null
  vita?: number | null
  gamba?: number | null  // Circonferenza gamba
  fianchi?: number | null
  notes?: string | null
}

interface BodyMeasurementModalProps {
  userId: string
  userName: string
  userEmail: string
  isOpen: boolean
  onClose: () => void
}

export default function BodyMeasurementModal({
  userId,
  userName,
  userEmail,
  isOpen,
  onClose,
}: BodyMeasurementModalProps) {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [latestMeasurement, setLatestMeasurement] = useState<BodyMeasurement | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedMeasurement, setSelectedMeasurement] = useState<BodyMeasurement | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [selectedGraph, setSelectedGraph] = useState<string | null>(null) // Per i micro grafici

  const [formData, setFormData] = useState<Partial<BodyMeasurement>>({
    peso: undefined,
    altezza: undefined,
    massaGrassa: undefined,
    braccio: undefined,
    spalle: undefined,
    torace: undefined,
    vita: undefined,
    gamba: undefined,
    fianchi: undefined,
    notes: '',
  })

  useEffect(() => {
    if (isOpen && userId) {
      fetchMeasurements()
    }
  }, [isOpen, userId])

  useEffect(() => {
    if (measurements.length > 0) {
      setLatestMeasurement(measurements[0])
      // Pre-compila il form con l'ultima misurazione
      const latest = measurements[0]
      setFormData({
        peso: latest.peso ?? undefined,
        altezza: latest.altezza ?? undefined,
        massaGrassa: latest.massaGrassa ?? undefined,
        braccio: latest.braccio ?? undefined,
        spalle: latest.spalle ?? undefined,
        torace: latest.torace ?? undefined,
        vita: latest.vita ?? undefined,
        gamba: latest.gamba ?? undefined,
        fianchi: latest.fianchi ?? undefined,
        notes: latest.notes ?? '',
      })
    }
  }, [measurements])

  const fetchMeasurements = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/measurements?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setMeasurements(data)
      }
    } catch (error) {
      console.error('Errore recupero misurazioni:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkTodayMeasurements = (): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return measurements.some(measurement => {
      const measurementDate = new Date(measurement.measurementDate)
      measurementDate.setHours(0, 0, 0, 0)
      return measurementDate.getTime() === today.getTime()
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Controlla se ci sono già misurazioni oggi
    const hasTodayMeasurements = checkTodayMeasurements()
    
    if (hasTodayMeasurements) {
      // Mostra modal di avvertimento invece di confirm nativo
      setShowWarningModal(true)
      setPendingSubmit(true)
      return
    }
    
    // Procede direttamente con il salvataggio se non ci sono misurazioni oggi
    performSave()
  }

  const performSave = async () => {
    setSaving(true)
    setShowWarningModal(false)
    setPendingSubmit(false)

    try {
      const response = await fetch('/api/admin/measurements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          measurementDate: new Date().toISOString(),
          ...formData,
        }),
      })

      if (response.ok) {
        await fetchMeasurements()
        // Mostra modal di successo personalizzato
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        const errorMessage = error.details 
          ? error.details.map((d: any) => d.message).join('\n')
          : error.error || 'Errore durante il salvataggio'
        alert(`Errore: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Errore salvataggio misurazione:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleWarningConfirm = () => {
    performSave()
  }

  const handleWarningCancel = () => {
    setShowWarningModal(false)
    setPendingSubmit(false)
  }

  const handleInputChange = (field: keyof BodyMeasurement, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }))
  }

  const handleMuscleClick = (muscleId: string) => {
    // Salva la posizione di scroll corrente per evitare che cambi
    const scrollPosition = window.scrollY || document.documentElement.scrollTop
    
    // Se c'è già un grafico aperto per questa parte, chiudilo, altrimenti aprilo
    if (selectedGraph === muscleId) {
      setSelectedGraph(null)
    } else {
      setSelectedGraph(muscleId)
    }
    
    // Ripristina la posizione di scroll dopo un breve delay per evitare scroll automatico
    setTimeout(() => {
      window.scrollTo(0, scrollPosition)
    }, 0)
  }

  // Funzione per generare dati del grafico per una misura specifica
  const getGraphData = (measurementType: string) => {
    if (!measurements.length) return []
    
    return measurements
      .filter(m => {
        const value = m[measurementType as keyof BodyMeasurement] as number | null | undefined
        return value !== null && value !== undefined
      })
      .map(m => ({
        date: new Date(m.measurementDate),
        value: m[measurementType as keyof BodyMeasurement] as number,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-card rounded-xl p-8" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold gold-text-gradient heading-font">
            📏 Scheda Antropometrica - {userName}
          </h2>
          <button
            onClick={onClose}
            className="text-4xl text-gray-400 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Body Silhouette */}
          <div className="w-full overflow-x-hidden">
            <h3 className="text-xl font-bold mb-4 gold-text-gradient heading-font">
              Visualizzazione Corporea
            </h3>
            
            {/* Pulsanti Misurazioni */}
            <div className="flex gap-2 items-center mb-3 flex-wrap">
              <button
                className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                  selectedGraph === 'peso'
                    ? 'bg-[#D3AF37] text-dark-950 border-[#D3AF37]'
                    : 'border-[#D3AF37]/60 text-white hover:bg-white/10'
                }`}
                onClick={() => {
                  if (selectedGraph === 'peso') {
                    setSelectedGraph(null)
                  } else {
                    setSelectedGraph('peso')
                  }
                }}
              >
                Peso
              </button>
              <button
                className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                  selectedGraph === 'massaGrassa'
                    ? 'bg-[#D3AF37] text-dark-950 border-[#D3AF37]'
                    : 'border-[#D3AF37]/60 text-white hover:bg-white/10'
                }`}
                onClick={() => {
                  if (selectedGraph === 'massaGrassa') {
                    setSelectedGraph(null)
                  } else {
                    setSelectedGraph('massaGrassa')
                  }
                }}
              >
                % Massa Grassa
              </button>
              <span className="text-xs text-gray-400">Clicca i muscoli sul modello</span>
            </div>
            
            <div className="w-full overflow-x-hidden">
              <AnatomyPickerSVG 
                selected={selectedGraph as 'peso' | 'altezza' | 'massaGrassa' | 'braccio' | 'spalle' | 'torace' | 'vita' | 'gamba' | 'fianchi' | null} 
                onSelect={handleMuscleClick} 
              />
            </div>

            {/* Micro Grafico - Appare quando si clicca su una parte del corpo */}
            {selectedGraph && (
              <div className="mt-6 p-4 glass-card rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold gold-text-gradient">
                    {selectedGraph === 'peso' && 'Peso'}
                    {selectedGraph === 'altezza' && 'Altezza'}
                    {selectedGraph === 'massaGrassa' && '% Massa Grassa'}
                    {selectedGraph === 'braccio' && 'Braccio'}
                    {selectedGraph === 'spalle' && 'Spalle'}
                    {selectedGraph === 'torace' && 'Torace'}
                    {selectedGraph === 'vita' && 'Vita'}
                    {selectedGraph === 'gamba' && 'Gamba'}
                    {selectedGraph === 'fianchi' && 'Fianchi'}
                  </h4>
                  <button
                    onClick={() => setSelectedGraph(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-48 relative">
                  <svg width="100%" height="100%" viewBox="0 0 350 150" className="overflow-visible">
                    <defs>
                      <linearGradient id="graphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#D3AF37" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#D3AF37" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const graphData = getGraphData(selectedGraph)
                      if (graphData.length === 0) {
                        return (
                          <text
                            x="175"
                            y="75"
                            textAnchor="middle"
                            className="text-xs fill-gray-400"
                          >
                            Nessun dato disponibile
                          </text>
                        )
                      }
                      
                      const minValue = Math.min(...graphData.map(d => d.value))
                      const maxValue = Math.max(...graphData.map(d => d.value))
                      const dataRange = maxValue - minValue || 1
                      const paddingLeft = 40
                      const paddingRight = 20
                      const paddingTop = 20
                      const paddingBottom = 30
                      const width = 350
                      const height = 150
                      const graphWidth = width - paddingLeft - paddingRight
                      const graphHeight = height - paddingTop - paddingBottom
                      
                      // Offset per asse X: ridotti per avere punti più vicini
                      const xStartOffset = 5 // Spazio iniziale minimo
                      const xEndOffset = 5 // Spazio finale minimo
                      const effectiveGraphWidth = graphWidth - xStartOffset - xEndOffset
                      // Calcola lo step: spaziatura più compatta, specialmente per pochi dati
                      // Per 2 punti: usa ~60px di spaziatura invece di distribuire su tutta la larghezza
                      const compactSpacing = graphData.length <= 2 ? 60 : 50
                      const xStep = graphData.length <= 2 
                        ? compactSpacing 
                        : effectiveGraphWidth / (graphData.length - 1 || 1)
                      
                      // Range esteso per asse Y: copre un range molto più ampio
                      // Se il range dei dati è piccolo, estendiamo molto di più
                      const rangeMultiplier = dataRange < 10 ? 5 : dataRange < 50 ? 3 : 2 // Moltiplicatore basato sul range
                      const extendedRange = dataRange * rangeMultiplier
                      const centerValue = (minValue + maxValue) / 2
                      const adjustedMinValue = centerValue - extendedRange / 2
                      const adjustedMaxValue = centerValue + extendedRange / 2
                      const adjustedRange = adjustedMaxValue - adjustedMinValue
                      const yAxisSteps = 5
                      const yStep = graphHeight / (yAxisSteps - 1)
                      
                      const points = graphData.map((d, i) => {
                        const x = paddingLeft + xStartOffset + i * xStep
                        const y = paddingTop + graphHeight - ((d.value - adjustedMinValue) / adjustedRange) * graphHeight
                        return `${x},${y}`
                      }).join(' ')
                      
                      const areaPoints = `${paddingLeft + xStartOffset},${height - paddingBottom} ${points} ${paddingLeft + xStartOffset + effectiveGraphWidth},${height - paddingBottom}`
                      
                      return (
                        <>
                          {/* Griglia orizzontale (asse Y) */}
                          {Array.from({ length: yAxisSteps }, (_, i) => {
                            const y = paddingTop + (yAxisSteps - 1 - i) * yStep
                            return (
                              <line
                                key={`grid-y-${i}`}
                                x1={paddingLeft}
                                y1={y}
                                x2={width - paddingRight}
                                y2={y}
                                stroke="#333"
                                strokeWidth="0.5"
                                strokeDasharray="2,2"
                              />
                            )
                          })}
                          
                          {/* Griglia verticale (asse X) */}
                          {graphData.map((_, i) => {
                            const x = paddingLeft + xStartOffset + i * xStep
                            return (
                              <line
                                key={`grid-x-${i}`}
                                x1={x}
                                y1={paddingTop}
                                x2={x}
                                y2={height - paddingBottom}
                                stroke="#333"
                                strokeWidth="0.5"
                                strokeDasharray="2,2"
                              />
                            )
                          })}
                          
                          {/* Area sotto la linea */}
                          <polyline
                            points={areaPoints}
                            fill="url(#graphGradient)"
                            stroke="none"
                          />
                          
                          {/* Linea del grafico */}
                          <polyline
                            points={points}
                            fill="none"
                            stroke="#D3AF37"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Punti e valori */}
                          {graphData.map((d, i) => {
                            const x = paddingLeft + xStartOffset + i * xStep
                            const y = paddingTop + graphHeight - ((d.value - adjustedMinValue) / adjustedRange) * graphHeight
                            return (
                              <g key={i}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="#D3AF37"
                                  stroke="#0a0a0a"
                                  strokeWidth="2"
                                />
                                <text
                                  x={x}
                                  y={y - 10}
                                  textAnchor="middle"
                                  className="text-[8px] fill-[#D3AF37]"
                                >
                                  {d.value.toFixed(1)}
                                </text>
                              </g>
                            )
                          })}
                          
                          {/* Etichette asse Y (valori) */}
                          {Array.from({ length: yAxisSteps }, (_, i) => {
                            const y = paddingTop + (yAxisSteps - 1 - i) * yStep
                            const value = adjustedMinValue + (adjustedRange / (yAxisSteps - 1)) * i
                            return (
                              <text
                                key={`label-y-${i}`}
                                x={paddingLeft - 5}
                                y={y + 4}
                                textAnchor="end"
                                className="text-[9px] fill-gray-500"
                              >
                                {value.toFixed(1)}
                              </text>
                            )
                          })}
                          
                          {/* Etichette asse X (date) */}
                          {graphData.map((d, i) => {
                            const x = paddingLeft + xStartOffset + i * xStep
                            // Mostra solo alcuni punti per non sovraffollare
                            if (i === 0 || i === graphData.length - 1 || (graphData.length > 4 && i % Math.ceil(graphData.length / 4) === 0)) {
                              return (
                                <text
                                  key={`label-x-${i}`}
                                  x={x}
                                  y={height - paddingBottom + 15}
                                  textAnchor="middle"
                                  className="text-[8px] fill-gray-500"
                                  transform={`rotate(-45 ${x} ${height - paddingBottom + 15})`}
                                >
                                  {new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                </text>
                              )
                            }
                            return null
                          })}
                          
                          {/* Linea asse Y */}
                          <line
                            x1={paddingLeft}
                            y1={paddingTop}
                            x2={paddingLeft}
                            y2={height - paddingBottom}
                            stroke="#666"
                            strokeWidth="1"
                          />
                          
                          {/* Linea asse X */}
                          <line
                            x1={paddingLeft}
                            y1={height - paddingBottom}
                            x2={width - paddingRight}
                            y2={height - paddingBottom}
                            stroke="#666"
                            strokeWidth="1"
                          />
                        </>
                      )
                    })()}
                  </svg>
                </div>
              </div>
            )}

            {latestMeasurement && (
              <div className="mt-6 p-4 glass-card rounded-lg">
                <p className="text-sm text-gray-400 mb-2">
                  Ultima misurazione:{' '}
                  {latestMeasurement.measurementDate
                    ? formatDate(latestMeasurement.measurementDate)
                    : 'Nessuna'}
                </p>
                <p className="text-xs text-gray-500">
                  💡 Clicca sulla silhouette o sui punti per vedere il grafico della misura
                </p>
              </div>
            )}
          </div>

          {/* Right: Measurements Form */}
          <div>
            <h3 className="text-xl font-bold mb-4 gold-text-gradient heading-font">
              Nuova Misurazione
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 pb-20 md:pb-4">
              <div>
                <label
                  htmlFor="peso"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="peso"
                  className="input-field w-full"
                  placeholder="75.5"
                  value={formData.peso ?? ''}
                  onChange={(e) => handleInputChange('peso', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="altezza"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Altezza (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="altezza"
                  className="input-field w-full"
                  placeholder="175"
                  value={formData.altezza ?? ''}
                  onChange={(e) => handleInputChange('altezza', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="massaGrassa"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  % Massa Grassa
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="massaGrassa"
                  className="input-field w-full"
                  placeholder="15.5"
                  value={formData.massaGrassa ?? ''}
                  onChange={(e) => handleInputChange('massaGrassa', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="braccio"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Braccio (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="braccio"
                  className="input-field w-full"
                  placeholder="35"
                  value={formData.braccio ?? ''}
                  onChange={(e) => handleInputChange('braccio', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="spalle"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Spalle (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="spalle"
                  className="input-field w-full"
                  placeholder="115"
                  value={formData.spalle ?? ''}
                  onChange={(e) => handleInputChange('spalle', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="torace"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Torace (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="torace"
                  className="input-field w-full"
                  placeholder="98"
                  value={formData.torace ?? ''}
                  onChange={(e) => handleInputChange('torace', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="vita"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Vita (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="vita"
                  className="input-field w-full"
                  placeholder="85"
                  value={formData.vita ?? ''}
                  onChange={(e) => handleInputChange('vita', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="gamba"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Gamba (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="gamba"
                  className="input-field w-full"
                  placeholder="58"
                  value={formData.gamba ?? ''}
                  onChange={(e) => handleInputChange('gamba', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="fianchi"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Fianchi (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="fianchi"
                  className="input-field w-full"
                  placeholder="95"
                  value={formData.fianchi ?? ''}
                  onChange={(e) => handleInputChange('fianchi', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#D3AF37' }}
                >
                  Note (opzionale)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="input-field w-full"
                  placeholder="Note aggiuntive..."
                  value={formData.notes ?? ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>

              <Button type="submit" variant="gold" className="w-full" disabled={saving} loading={saving}>
                {saving ? 'Salvando...' : 'Salva Misurazione'}
              </Button>
            </form>

            {measurements.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-3 gold-text-gradient heading-font">
                  📊 Storico Misurazioni
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {measurements.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="p-3 glass-card rounded-lg cursor-pointer hover:bg-white/10 transition"
                      onClick={() => setSelectedMeasurement(m)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold">
                          {m.measurementDate ? formatDate(m.measurementDate) : 'N/A'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {m.peso != null ? `${m.peso} kg` : '-'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                        <div>Altezza: {m.altezza != null ? `${m.altezza} cm` : '-'}</div>
                        <div>% Massa Grassa: {m.massaGrassa != null ? `${m.massaGrassa} %` : '-'}</div>
                        <div>Torace: {m.torace != null ? `${m.torace} cm` : '-'}</div>
                        <div>Vita: {m.vita != null ? `${m.vita} cm` : '-'}</div>
                        <div>Fianchi: {m.fianchi != null ? `${m.fianchi} cm` : '-'}</div>
                      </div>
                      <div className="text-xs text-[#D3AF37] mt-2 text-center">
                        👆 Clicca per dettagli completi
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Dettaglio Misurazione */}
      {selectedMeasurement && (
        <div className="modal-overlay" onClick={() => setSelectedMeasurement(null)}>
          <div 
            className="modal-content glass-card rounded-xl p-8" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', width: '90vw' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gold-text-gradient heading-font">
                📏 Dettaglio Misurazione
              </h2>
              <button
                onClick={() => setSelectedMeasurement(null)}
                className="text-4xl text-gray-400 hover:text-white transition"
                aria-label="Chiudi"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="glass-card rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Data Misurazione</p>
                <p className="text-lg font-semibold">
                  {selectedMeasurement.measurementDate 
                    ? formatDate(selectedMeasurement.measurementDate) 
                    : 'N/A'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Peso</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.peso != null ? `${selectedMeasurement.peso} kg` : '-'}
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Altezza</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.altezza != null ? `${selectedMeasurement.altezza} cm` : '-'}
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">% Massa Grassa</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.massaGrassa != null ? `${selectedMeasurement.massaGrassa} %` : '-'}
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Braccio</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.braccio != null ? `${selectedMeasurement.braccio} cm` : '-'}
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Spalle</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.spalle != null ? `${selectedMeasurement.spalle} cm` : '-'}
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Torace</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.torace != null ? `${selectedMeasurement.torace} cm` : '-'}
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Vita</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.vita != null ? `${selectedMeasurement.vita} cm` : '-'}
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Gamba</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.gamba != null ? `${selectedMeasurement.gamba} cm` : '-'}
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Fianchi</p>
                  <p className="text-lg font-semibold">
                    {selectedMeasurement.fianchi != null ? `${selectedMeasurement.fianchi} cm` : '-'}
                  </p>
                </div>
              </div>

              {selectedMeasurement.notes && (
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Note</p>
                  <p className="text-sm">{selectedMeasurement.notes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline-gold"
                  onClick={() => setSelectedMeasurement(null)}
                >
                  Chiudi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const successModalContent = showSuccessModal ? (
    <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
      <div
        className="modal-content glass-card rounded-xl p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90vw' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gold-text-gradient heading-font">
            ✅ Misurazioni Salvate
          </h2>
          <button
            onClick={() => setShowSuccessModal(false)}
            className="text-4xl text-gray-400 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-white text-lg">
            Le misurazioni sono state salvate con successo!
          </p>
        </div>

        <div className="flex gap-4 pt-6">
          <Button
            variant="gold"
            onClick={() => setShowSuccessModal(false)}
            className="flex-1"
          >
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  ) : null

  const warningModalContent = showWarningModal ? (
    <div className="modal-overlay" onClick={handleWarningCancel}>
      <div
        className="modal-content glass-card rounded-xl p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90vw' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gold-text-gradient heading-font">
            ⚠️ Attenzione
          </h2>
          <button
            onClick={handleWarningCancel}
            className="text-4xl text-gray-400 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-white text-lg">
            Hai già salvato delle misurazioni oggi.
          </p>
          <p className="text-dark-400 text-base">
            Vuoi continuare e salvare una nuova misurazione per oggi?
          </p>
        </div>

        <div className="flex gap-4 pt-6">
          <Button
            variant="ghost"
            onClick={handleWarningCancel}
            className="flex-1"
          >
            Annulla
          </Button>
          <Button
            variant="gold"
            onClick={handleWarningConfirm}
            className="flex-1"
            disabled={saving}
            loading={saving}
          >
            {saving ? 'Salvataggio...' : 'Continua'}
          </Button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {createPortal(modalContent, document.body)}
      {showSuccessModal && createPortal(successModalContent, document.body)}
      {showWarningModal && createPortal(warningModalContent, document.body)}
    </>
  )
}
