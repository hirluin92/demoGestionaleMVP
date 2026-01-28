'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface BodyMeasurement {
  id?: string
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
  const [highlightedMuscle, setHighlightedMuscle] = useState<string | null>(null)
  const [selectedMeasurement, setSelectedMeasurement] = useState<BodyMeasurement | null>(null)

  const [formData, setFormData] = useState<Partial<BodyMeasurement>>({
    peso: undefined,
    altezza: undefined,
    bodyFat: undefined,
    collo: undefined,
    spalle: undefined,
    torace: undefined,
    vita: undefined,
    fianchi: undefined,
    bicipiteDx: undefined,
    bicipiteSx: undefined,
    avambraccioDx: undefined,
    avambraccioSx: undefined,
    cosciaDx: undefined,
    cosciaSx: undefined,
    polpaccioDx: undefined,
    polpaccioSx: undefined,
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
        bodyFat: latest.bodyFat ?? undefined,
        collo: latest.collo ?? undefined,
        spalle: latest.spalle ?? undefined,
        torace: latest.torace ?? undefined,
        vita: latest.vita ?? undefined,
        fianchi: latest.fianchi ?? undefined,
        bicipiteDx: latest.bicipiteDx ?? undefined,
        bicipiteSx: latest.bicipiteSx ?? undefined,
        avambraccioDx: latest.avambraccioDx ?? undefined,
        avambraccioSx: latest.avambraccioSx ?? undefined,
        cosciaDx: latest.cosciaDx ?? undefined,
        cosciaSx: latest.cosciaSx ?? undefined,
        polpaccioDx: latest.polpaccioDx ?? undefined,
        polpaccioSx: latest.polpaccioSx ?? undefined,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

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
        // Reset form mantiene i valori appena salvati
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Errore durante il salvataggio'}`)
      }
    } catch (error) {
      console.error('Errore salvataggio misurazione:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof BodyMeasurement, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }))
  }

  const handleMuscleClick = (muscleId: string) => {
    const inputField = document.getElementById(muscleId)
    if (inputField) {
      inputField.focus()
      inputField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Visual feedback
      inputField.style.transform = 'scale(1.05)'
      inputField.style.boxShadow = '0 0 0 4px rgba(232, 220, 160, 0.3), 0 8px 25px rgba(232, 220, 160, 0.3)'
      setTimeout(() => {
        inputField.style.transform = ''
        inputField.style.boxShadow = ''
      }, 600)
    }
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
          <div>
            <h3 className="text-xl font-bold mb-4 gold-text-gradient heading-font">
              Visualizzazione Corporea
            </h3>
            <div className="body-silhouette" style={{ position: 'relative' }}>
              <svg viewBox="0 0 300 500" style={{ width: '100%', height: 'auto' }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Testa */}
                <ellipse cx="150" cy="40" rx="25" ry="30" fill="#2a2a2a" stroke="#444" strokeWidth="1" />

                {/* Collo */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'collo' ? 'highlighted' : ''}`}
                  data-muscle="collo"
                  onClick={() => handleMuscleClick('collo')}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d="M 138 70 L 138 85 L 162 85 L 162 70"
                    fill="#3a3a3a"
                    stroke="#555"
                    strokeWidth="1"
                  />
                </g>

                {/* Spalle */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'spalle' ? 'highlighted' : ''}`}
                  data-muscle="spalle"
                  onClick={() => handleMuscleClick('spalle')}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse
                    cx="115"
                    cy="105"
                    rx="22"
                    ry="28"
                    fill="#3a3a3a"
                    stroke="#555"
                    strokeWidth="1.5"
                    transform="rotate(-15 115 105)"
                  />
                  <ellipse
                    cx="185"
                    cy="105"
                    rx="22"
                    ry="28"
                    fill="#3a3a3a"
                    stroke="#555"
                    strokeWidth="1.5"
                    transform="rotate(15 185 105)"
                  />
                </g>

                {/* Torace */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'torace' ? 'highlighted' : ''}`}
                  data-muscle="torace"
                  onClick={() => handleMuscleClick('torace')}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d="M 130 90 Q 125 110, 130 135 L 145 135 L 150 100 Z"
                    fill="#3a3a3a"
                    stroke="#555"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 170 90 Q 175 110, 170 135 L 155 135 L 150 100 Z"
                    fill="#3a3a3a"
                    stroke="#555"
                    strokeWidth="1.5"
                  />
                  <line x1="150" y1="100" x2="150" y2="135" stroke="#2a2a2a" strokeWidth="2" />
                </g>

                {/* Addominali/Vita */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'vita' ? 'highlighted' : ''}`}
                  data-muscle="vita"
                  onClick={() => handleMuscleClick('vita')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect x="135" y="135" width="30" height="70" rx="5" fill="#3a3a3a" stroke="#555" strokeWidth="1.5" />
                  <line x1="150" y1="135" x2="150" y2="205" stroke="#2a2a2a" strokeWidth="2" />
                  <line x1="135" y1="155" x2="165" y2="155" stroke="#2a2a2a" strokeWidth="1.5" />
                  <line x1="135" y1="170" x2="165" y2="170" stroke="#2a2a2a" strokeWidth="1.5" />
                  <line x1="135" y1="185" x2="165" y2="185" stroke="#2a2a2a" strokeWidth="1.5" />
                </g>

                {/* Fianchi */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'fianchi' ? 'highlighted' : ''}`}
                  data-muscle="fianchi"
                  onClick={() => handleMuscleClick('fianchi')}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse cx="150" cy="220" rx="35" ry="22" fill="#3a3a3a" stroke="#555" strokeWidth="1.5" />
                </g>

                {/* Bicipiti */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'bicipite_sx' ? 'highlighted' : ''}`}
                  data-muscle="bicipite_sx"
                  onClick={() => handleMuscleClick('bicipiteSx')}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse
                    cx="95"
                    cy="140"
                    rx="13"
                    ry="35"
                    fill="#3a3a3a"
                    stroke="#555"
                    strokeWidth="1.5"
                    transform="rotate(20 95 140)"
                  />
                </g>
                <g
                  className={`muscle-group ${highlightedMuscle === 'bicipite_dx' ? 'highlighted' : ''}`}
                  data-muscle="bicipite_dx"
                  onClick={() => handleMuscleClick('bicipiteDx')}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse
                    cx="205"
                    cy="140"
                    rx="13"
                    ry="35"
                    fill="#3a3a3a"
                    stroke="#555"
                    strokeWidth="1.5"
                    transform="rotate(-20 205 140)"
                  />
                </g>

                {/* Avambracci */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'avambraccio_sx' ? 'highlighted' : ''}`}
                  data-muscle="avambraccio_sx"
                  onClick={() => handleMuscleClick('avambraccioSx')}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d="M 85 175 Q 75 205, 70 240"
                    stroke="#555"
                    strokeWidth="18"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
                <g
                  className={`muscle-group ${highlightedMuscle === 'avambraccio_dx' ? 'highlighted' : ''}`}
                  data-muscle="avambraccio_dx"
                  onClick={() => handleMuscleClick('avambraccioDx')}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d="M 215 175 Q 225 205, 230 240"
                    stroke="#555"
                    strokeWidth="18"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>

                {/* Cosce */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'coscia_sx' ? 'highlighted' : ''}`}
                  data-muscle="coscia_sx"
                  onClick={() => handleMuscleClick('cosciaSx')}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse cx="138" cy="290" rx="20" ry="50" fill="#3a3a3a" stroke="#555" strokeWidth="1.5" />
                </g>
                <g
                  className={`muscle-group ${highlightedMuscle === 'coscia_dx' ? 'highlighted' : ''}`}
                  data-muscle="coscia_dx"
                  onClick={() => handleMuscleClick('cosciaDx')}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse cx="162" cy="290" rx="20" ry="50" fill="#3a3a3a" stroke="#555" strokeWidth="1.5" />
                </g>

                {/* Polpacci */}
                <g
                  className={`muscle-group ${highlightedMuscle === 'polpaccio_sx' ? 'highlighted' : ''}`}
                  data-muscle="polpaccio_sx"
                  onClick={() => handleMuscleClick('polpaccioSx')}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse cx="138" cy="390" rx="15" ry="35" fill="#3a3a3a" stroke="#555" strokeWidth="1.5" />
                </g>
                <g
                  className={`muscle-group ${highlightedMuscle === 'polpaccio_dx' ? 'highlighted' : ''}`}
                  data-muscle="polpaccio_dx"
                  onClick={() => handleMuscleClick('polpaccioDx')}
                  style={{ cursor: 'pointer' }}
                >
                  <ellipse cx="162" cy="390" rx="15" ry="35" fill="#3a3a3a" stroke="#555" strokeWidth="1.5" />
                </g>
              </svg>

              {/* Measurement Points */}
              <div
                className="measurement-point"
                style={{ left: '50%', top: '16%' }}
                data-muscle="collo"
                data-label="Collo"
                onClick={() => handleMuscleClick('collo')}
                onMouseEnter={() => setHighlightedMuscle('collo')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '22%', top: '21%' }}
                data-muscle="spalle"
                data-label="Spalle"
                onClick={() => handleMuscleClick('spalle')}
                onMouseEnter={() => setHighlightedMuscle('spalle')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '50%', top: '25%' }}
                data-muscle="torace"
                data-label="Torace"
                onClick={() => handleMuscleClick('torace')}
                onMouseEnter={() => setHighlightedMuscle('torace')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '15%', top: '30%' }}
                data-muscle="bicipite_sx"
                data-label="Bicipite SX"
                onClick={() => handleMuscleClick('bicipiteSx')}
                onMouseEnter={() => setHighlightedMuscle('bicipite_sx')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '85%', top: '30%' }}
                data-muscle="bicipite_dx"
                data-label="Bicipite DX"
                onClick={() => handleMuscleClick('bicipiteDx')}
                onMouseEnter={() => setHighlightedMuscle('bicipite_dx')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '10%', top: '42%' }}
                data-muscle="avambraccio_sx"
                data-label="Avambraccio SX"
                onClick={() => handleMuscleClick('avambraccioSx')}
                onMouseEnter={() => setHighlightedMuscle('avambraccio_sx')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '90%', top: '42%' }}
                data-muscle="avambraccio_dx"
                data-label="Avambraccio DX"
                onClick={() => handleMuscleClick('avambraccioDx')}
                onMouseEnter={() => setHighlightedMuscle('avambraccio_dx')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '50%', top: '37%' }}
                data-muscle="vita"
                data-label="Vita"
                onClick={() => handleMuscleClick('vita')}
                onMouseEnter={() => setHighlightedMuscle('vita')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '50%', top: '44%' }}
                data-muscle="fianchi"
                data-label="Fianchi"
                onClick={() => handleMuscleClick('fianchi')}
                onMouseEnter={() => setHighlightedMuscle('fianchi')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '38%', top: '60%' }}
                data-muscle="coscia_sx"
                data-label="Coscia SX"
                onClick={() => handleMuscleClick('cosciaSx')}
                onMouseEnter={() => setHighlightedMuscle('coscia_sx')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '62%', top: '60%' }}
                data-muscle="coscia_dx"
                data-label="Coscia DX"
                onClick={() => handleMuscleClick('cosciaDx')}
                onMouseEnter={() => setHighlightedMuscle('coscia_dx')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '38%', top: '80%' }}
                data-muscle="polpaccio_sx"
                data-label="Polpaccio SX"
                onClick={() => handleMuscleClick('polpaccioSx')}
                onMouseEnter={() => setHighlightedMuscle('polpaccio_sx')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
              <div
                className="measurement-point"
                style={{ left: '62%', top: '80%' }}
                data-muscle="polpaccio_dx"
                data-label="Polpaccio DX"
                onClick={() => handleMuscleClick('polpaccioDx')}
                onMouseEnter={() => setHighlightedMuscle('polpaccio_dx')}
                onMouseLeave={() => setHighlightedMuscle(null)}
              />
            </div>

            {latestMeasurement && (
              <div className="mt-6 p-4 glass-card rounded-lg">
                <p className="text-sm text-gray-400 mb-2">
                  Ultima misurazione:{' '}
                  {latestMeasurement.measurementDate
                    ? formatDate(latestMeasurement.measurementDate)
                    : 'Nessuna'}
                </p>
                <p className="text-xs text-gray-500">
                  💡 Clicca sulla silhouette o sui punti per inserire le misure
                </p>
              </div>
            )}
          </div>

          {/* Right: Measurements Form */}
          <div>
            <h3 className="text-xl font-bold mb-4 gold-text-gradient heading-font">
              Nuova Misurazione
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="peso"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
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
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="collo"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Collo (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="collo"
                    className="input-field w-full"
                    placeholder="38"
                    value={formData.collo ?? ''}
                    onChange={(e) => handleInputChange('collo', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="spalle"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="torace"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
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
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
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
              </div>

              <div>
                <label
                  htmlFor="fianchi"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bicipiteDx"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Bicipite DX (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="bicipiteDx"
                    className="input-field w-full"
                    placeholder="35"
                    value={formData.bicipiteDx ?? ''}
                    onChange={(e) => handleInputChange('bicipiteDx', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="bicipiteSx"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Bicipite SX (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="bicipiteSx"
                    className="input-field w-full"
                    placeholder="34.5"
                    value={formData.bicipiteSx ?? ''}
                    onChange={(e) => handleInputChange('bicipiteSx', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="avambraccioDx"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Avambraccio DX (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="avambraccioDx"
                    className="input-field w-full"
                    placeholder="28"
                    value={formData.avambraccioDx ?? ''}
                    onChange={(e) => handleInputChange('avambraccioDx', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="avambraccioSx"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Avambraccio SX (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="avambraccioSx"
                    className="input-field w-full"
                    placeholder="27.5"
                    value={formData.avambraccioSx ?? ''}
                    onChange={(e) => handleInputChange('avambraccioSx', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cosciaDx"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Coscia DX (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="cosciaDx"
                    className="input-field w-full"
                    placeholder="58"
                    value={formData.cosciaDx ?? ''}
                    onChange={(e) => handleInputChange('cosciaDx', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cosciaSx"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Coscia SX (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="cosciaSx"
                    className="input-field w-full"
                    placeholder="57.5"
                    value={formData.cosciaSx ?? ''}
                    onChange={(e) => handleInputChange('cosciaSx', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="polpaccioDx"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Polpaccio DX (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="polpaccioDx"
                    className="input-field w-full"
                    placeholder="38"
                    value={formData.polpaccioDx ?? ''}
                    onChange={(e) => handleInputChange('polpaccioDx', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="polpaccioSx"
                    className="block text-sm font-light mb-2 heading-font"
                    style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                  >
                    Polpaccio SX (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    id="polpaccioSx"
                    className="input-field w-full"
                    placeholder="37.5"
                    value={formData.polpaccioSx ?? ''}
                    onChange={(e) => handleInputChange('polpaccioSx', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bodyFat"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                >
                  Body Fat % (opzionale)
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="bodyFat"
                  className="input-field w-full"
                  placeholder="15.5"
                  value={formData.bodyFat ?? ''}
                  onChange={(e) => handleInputChange('bodyFat', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
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
        </div>
      )}
    </div>
  )

  return createPortal(modalContent, document.body)
}
