'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Ruler } from 'lucide-react'
import Button from '@/components/ui/Button'
import AnatomyPicker3D from '@/components/AnatomyPicker3D'

type MeasurementKey = 'peso' | 'braccio' | 'spalle' | 'torace' | 'vita' | 'gamba' | 'fianchi'

interface BodyMeasurement {
  id: string
  userId: string
  measurementDate: string
  peso?: number | null
  braccio?: number | null
  spalle?: number | null
  torace?: number | null
  vita?: number | null
  gamba?: number | null
  fianchi?: number | null
  notes?: string | null
}

export default function ClientMeasurementsView() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeasurement, setSelectedMeasurement] = useState<BodyMeasurement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedGraph, setSelectedGraph] = useState<MeasurementKey | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    fetchMeasurements()
  }, [])

  const fetchMeasurements = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/measurements')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner-gold w-12 h-12 mx-auto mb-4"></div>
        <p className="mt-4 text-dark-600">Caricamento misurazioni...</p>
      </div>
    )
  }

  if (measurements.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Ruler className="w-10 h-10 text-[#D3AF37]" />
        </div>
        <h3 className="empty-state-title">Nessuna misurazione disponibile</h3>
        <p className="empty-state-description">Le tue misurazioni verranno visualizzate qui</p>
        <p className="text-sm text-dark-500 mt-2">Le tue misurazioni verranno visualizzate qui</p>
      </div>
    )
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

  const handleMuscleClick = (muscleId: MeasurementKey) => {
    // Se c'è già un grafico aperto per questa parte, chiudilo, altrimenti aprilo
    if (selectedGraph === muscleId) {
      setSelectedGraph(null)
    } else {
      setSelectedGraph(muscleId)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-bold mb-4 gold-text-gradient heading-font">
          📊 Le Tue Misurazioni
        </h3>

        {/* Manichino Interattivo 3D */}
        <div className="mb-6">
          <h4 className="text-md font-bold mb-4 gold-text-gradient heading-font">
            Visualizzazione Corporea (3D)
          </h4>
          
          {/* Bottone Peso */}
          <div className="flex gap-2 items-center mb-3">
            <button
              className="px-3 py-1 rounded-full border border-[#D3AF37]/60 text-xs text-white hover:bg-white/10 transition-colors"
              onClick={() => handleMuscleClick('peso')}
            >
              Peso
            </button>
            <span className="text-xs text-gray-400">Clicca i muscoli sul modello 3D</span>
          </div>

          <AnatomyPicker3D
            modelUrl="/models/anatomy.glb"
            selected={selectedGraph}
            onSelect={handleMuscleClick}
          />
        </div>

          {/* Micro Grafico - Appare quando si clicca su una parte del corpo */}
          {selectedGraph && (
            <div className="mt-6 p-4 glass-card rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold gold-text-gradient">
                  {selectedGraph === 'peso' && 'Peso'}
                  {selectedGraph === 'braccio' && 'Braccio'}
                  {selectedGraph === 'spalle' && 'Circonferenza Spalle'}
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
                    
                    const xStartOffset = 5
                    const xEndOffset = 5
                    const effectiveGraphWidth = graphWidth - xStartOffset - xEndOffset
                    const compactSpacing = graphData.length <= 2 ? 60 : 50
                    const xStep = graphData.length <= 2 
                      ? compactSpacing 
                      : effectiveGraphWidth / (graphData.length - 1 || 1)
                    
                    const rangeMultiplier = dataRange < 10 ? 5 : dataRange < 50 ? 3 : 2
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
                        {/* Griglia orizzontale */}
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
                        
                        {/* Griglia verticale */}
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
                        
                        {/* Etichette asse Y */}
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
                        
                        {/* Etichette asse X */}
                        {graphData.map((d, i) => {
                          const x = paddingLeft + xStartOffset + i * xStep
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

        {/* Storico Misurazioni */}
        <div>
          <h4 className="text-md font-bold mb-4 gold-text-gradient heading-font">
            Storico Misurazioni
          </h4>
          <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar">
            {measurements.map((m) => (
              <div
                key={m.id}
                className="p-4 glass-card rounded-lg cursor-pointer hover:bg-white/10 transition"
                onClick={() => setSelectedMeasurement(m)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-semibold text-white">
                    {m.measurementDate ? formatDate(m.measurementDate) : 'N/A'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {m.peso || '-'}kg
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                  <div>Torace: {m.torace || '-'}cm</div>
                  <div>Vita: {m.vita || '-'}cm</div>
                  <div>Fianchi: {m.fianchi || '-'}cm</div>
                </div>
                <div className="text-xs text-gold-400 mt-2 text-center">
                  👆 Clicca per dettagli completi
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Dettaglio Misurazione */}
      {selectedMeasurement && mounted && createPortal(
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
                  <p className="text-lg font-semibold">{selectedMeasurement?.peso || '-'} kg</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Braccio</p>
                  <p className="text-lg font-semibold">{selectedMeasurement?.braccio || '-'} cm</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Spalle</p>
                  <p className="text-lg font-semibold">{selectedMeasurement?.spalle || '-'} cm</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Torace</p>
                  <p className="text-lg font-semibold">{selectedMeasurement?.torace || '-'} cm</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Vita</p>
                  <p className="text-lg font-semibold">{selectedMeasurement?.vita || '-'} cm</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Fianchi</p>
                  <p className="text-lg font-semibold">{selectedMeasurement?.fianchi || '-'} cm</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Gamba</p>
                  <p className="text-lg font-semibold">{selectedMeasurement?.gamba || '-'} cm</p>
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
        </div>,
        document.body
      )}
    </>
  )
}
