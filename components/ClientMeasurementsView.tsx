'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'

interface BodyMeasurement {
  id: string
  userId: string
  measurementDate: string
  peso?: number | null
  altezza?: number | null
  bodyFat?: number | null
  collo?: number | null
  spalle?: number | null
  torace?: number | null
  vita?: number | null
  fianchi?: number | null
  bicipiteDx?: number | null
  bicipiteSx?: number | null
  avambraccioDx?: number | null
  avambraccioSx?: number | null
  cosciaDx?: number | null
  cosciaSx?: number | null
  polpaccioDx?: number | null
  polpaccioSx?: number | null
  notes?: string | null
}

export default function ClientMeasurementsView() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeasurement, setSelectedMeasurement] = useState<BodyMeasurement | null>(null)
  const [mounted, setMounted] = useState(false)

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
        <div className="inline-block w-8 h-8 border-4 border-dark-200 border-t-[#E8DCA0] rounded-full animate-spin"></div>
        <p className="mt-4 text-dark-600">Caricamento misurazioni...</p>
      </div>
    )
  }

  if (measurements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-600 font-semibold">Nessuna misurazione disponibile</p>
        <p className="text-sm text-dark-500 mt-2">Le tue misurazioni verranno visualizzate qui</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-bold mb-4 gold-text-gradient heading-font">
          📊 Le Tue Misurazioni
        </h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
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
                  {m.peso || '-'}kg • {m.altezza || '-'}cm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                <div>Torace: {m.torace || '-'}cm</div>
                <div>Vita: {m.vita || '-'}cm</div>
                <div>Fianchi: {m.fianchi || '-'}cm</div>
              </div>
              {m.bodyFat && (
                <div className="text-xs text-gray-400 mt-1">Body Fat: {m.bodyFat}%</div>
              )}
              <div className="text-xs text-[#E8DCA0] mt-2 text-center">
                👆 Clicca per dettagli completi
              </div>
            </div>
          ))}
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
                  <p className="text-lg font-semibold">{selectedMeasurement.peso || '-'} kg</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Altezza</p>
                  <p className="text-lg font-semibold">{selectedMeasurement.altezza || '-'} cm</p>
                </div>
                {selectedMeasurement.bodyFat && (
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Body Fat</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.bodyFat}%</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 gold-text-gradient heading-font">
                  Circonferenze Torso
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Collo</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.collo || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Spalle</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.spalle || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Torace</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.torace || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Vita</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.vita || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Fianchi</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.fianchi || '-'} cm</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 gold-text-gradient heading-font">
                  Circonferenze Braccia
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Bicipite DX</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.bicipiteDx || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Bicipite SX</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.bicipiteSx || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Avambraccio DX</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.avambraccioDx || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Avambraccio SX</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.avambraccioSx || '-'} cm</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 gold-text-gradient heading-font">
                  Circonferenze Gambe
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Coscia DX</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.cosciaDx || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Coscia SX</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.cosciaSx || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Polpaccio DX</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.polpaccioDx || '-'} cm</p>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Polpaccio SX</p>
                    <p className="text-lg font-semibold">{selectedMeasurement.polpaccioSx || '-'} cm</p>
                  </div>
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
