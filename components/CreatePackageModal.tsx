'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'

interface User {
  id: string
  name: string
  email: string
}

interface CreatePackageModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreatePackageModal({ onClose, onSuccess }: CreatePackageModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [packageType, setPackageType] = useState<'singolo' | 'multiplo' | null>(null)
  const [numberOfAthletes, setNumberOfAthletes] = useState<number>(2)
  const [selectedSingleUserId, setSelectedSingleUserId] = useState<string>('')
  const [selectedMultipleUserIds, setSelectedMultipleUserIds] = useState<Record<number, string>>({})
  const [formData, setFormData] = useState({
    name: '',
    totalSessions: '10',
    durationMinutes: '60',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Errore recupero utenti:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validazione tipo pacchetto
    if (!packageType) {
      setError('Seleziona il tipo di pacchetto')
      setLoading(false)
      return
    }

    // Validazione numeri
    const totalSessions = parseInt(formData.totalSessions, 10)
    const durationMinutes = parseInt(formData.durationMinutes, 10)

    if (isNaN(totalSessions) || totalSessions < 1) {
      setError('Il numero di sessioni deve essere un numero positivo')
      setLoading(false)
      return
    }

    if (isNaN(durationMinutes) || durationMinutes < 15) {
      setError('La durata deve essere almeno 15 minuti')
      setLoading(false)
      return
    }

    // Raccogli gli user IDs in base al tipo
    let userIdsToSubmit: string[] = []
    
    if (packageType === 'singolo') {
      if (!selectedSingleUserId) {
        setError('Seleziona un cliente')
        setLoading(false)
        return
      }
      userIdsToSubmit = [selectedSingleUserId]
    } else {
      // Multiplo: verifica che tutti gli atleti siano selezionati
      const selectedIds = Object.values(selectedMultipleUserIds).filter(id => id !== '')
      if (selectedIds.length !== numberOfAthletes) {
        setError(`Seleziona tutti i ${numberOfAthletes} atleti`)
        setLoading(false)
        return
      }
      // Verifica che non ci siano duplicati
      if (new Set(selectedIds).size !== selectedIds.length) {
        setError('Ogni atleta può essere selezionato solo una volta')
        setLoading(false)
        return
      }
      userIdsToSubmit = selectedIds
    }

    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: userIdsToSubmit,
          name: formData.name,
          totalSessions,
          durationMinutes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          400: data.details 
            ? `Dati non validi: ${data.details.map((d: any) => d.message).join(', ')}`
            : data.error || 'Verifica i dati inseriti',
          404: 'Cliente non trovato',
          500: 'Errore del server. Riprova tra qualche minuto.',
        }
        setError(errorMessages[response.status] || data.error || 'Errore nella creazione del pacchetto')
        return
      }

      onSuccess()
      onClose()
    } catch (error) {
      setError('Impossibile connettersi al server. Verifica la connessione.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Funzione per ottenere i clienti disponibili per una tendina specifica
  const getAvailableUsersForSelect = (excludeIndex?: number): User[] => {
    if (packageType === 'singolo') {
      return users
    }
    
    // Per multiplo: escludi i clienti già selezionati nelle altre tendine
    const selectedIds = Object.entries(selectedMultipleUserIds)
      .filter(([index]) => excludeIndex === undefined || index !== excludeIndex.toString())
      .map(([, id]) => id)
      .filter(id => id !== '')
    
    return users.filter(user => !selectedIds.includes(user.id))
  }

  const handleMultipleUserSelect = (index: number, userId: string) => {
    setSelectedMultipleUserIds((prev) => ({
      ...prev,
      [index]: userId,
    }))
  }

  const handlePackageTypeChange = (type: 'singolo' | 'multiplo') => {
    setPackageType(type)
    setSelectedSingleUserId('')
    setSelectedMultipleUserIds({})
    setNumberOfAthletes(2)
  }

  const handleNumberOfAthletesChange = (num: number) => {
    setNumberOfAthletes(num)
    // Rimuovi le selezioni oltre il nuovo numero
    setSelectedMultipleUserIds((prev) => {
      const newState: Record<number, string> = {}
      for (let i = 0; i < num; i++) {
        if (prev[i]) {
          newState[i] = prev[i]
        }
      }
      return newState
    })
  }

  if (!mounted) return null

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90vw' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gold-text-gradient heading-font">
            Nuovo Pacchetto
          </h2>
          <button
            onClick={onClose}
            className="text-4xl text-gray-400 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Selezione tipo pacchetto */}
          <div>
            <label
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Tipo Pacchetto
            </label>
            <div className="relative">
              <select
                value={packageType || ''}
                onChange={(e) => {
                  const value = e.target.value as 'singolo' | 'multiplo' | ''
                  if (value === 'singolo' || value === 'multiplo') {
                    handlePackageTypeChange(value)
                  }
                }}
                className="input-field w-full appearance-none pr-10"
                required
              >
                <option value="">Seleziona tipo pacchetto</option>
                <option value="singolo">Singolo</option>
                <option value="multiplo">Multiplo</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          {/* Se singolo: tendina cliente */}
          {packageType === 'singolo' && (
            <div>
              <label
                className="block text-sm font-light mb-2 heading-font"
                style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
              >
                Cliente
              </label>
              <div className="relative">
                <select
                  value={selectedSingleUserId}
                  onChange={(e) => setSelectedSingleUserId(e.target.value)}
                  className="input-field w-full appearance-none pr-10"
                  required
                >
                  <option value="">Seleziona un cliente</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Se multiplo: tendina numero atleti + tante tendine quanti sono gli atleti */}
          {packageType === 'multiplo' && (
            <>
              <div>
                <label
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                >
                  Numero Atleti
                </label>
                <div className="relative">
                  <select
                    value={numberOfAthletes}
                    onChange={(e) => handleNumberOfAthletesChange(parseInt(e.target.value, 10))}
                    className="input-field w-full appearance-none pr-10"
                    required
                  >
                    {[2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num} atleti
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
                </div>
              </div>

              {/* Tante tendine quanti sono gli atleti */}
              {Array.from({ length: numberOfAthletes }, (_, i) => i).map((index) => {
                const availableUsers = getAvailableUsersForSelect(index)
                return (
                  <div key={index}>
                    <label
                      className="block text-sm font-light mb-2 heading-font"
                      style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                    >
                      Atleta {index + 1}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedMultipleUserIds[index] || ''}
                        onChange={(e) => handleMultipleUserSelect(index, e.target.value)}
                        className="input-field w-full appearance-none pr-10"
                        required
                      >
                        <option value="">Seleziona atleta {index + 1}</option>
                        {availableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
                    </div>
                  </div>
                )
              })}
            </>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Nome Pacchetto
            </label>
            <input
              type="text"
              id="name"
              required
              className="input-field w-full"
              placeholder="Es: Pacchetto Base 10 Sessioni"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="totalSessions"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Numero Sessioni
            </label>
            <input
              type="text"
              id="totalSessions"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              className="input-field w-full"
              placeholder="Es: 10"
              value={formData.totalSessions}
              onChange={(e) => {
                const value = e.target.value
                // Permetti solo numeri o campo vuoto
                if (value === '' || /^\d+$/.test(value)) {
                  handleInputChange('totalSessions', value)
                }
              }}
            />
          </div>

          <div>
            <label
              htmlFor="durationMinutes"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Durata Sessione (minuti)
            </label>
            <input
              type="text"
              id="durationMinutes"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              className="input-field w-full"
              placeholder="60"
              value={formData.durationMinutes}
              onChange={(e) => {
                const value = e.target.value
                // Permetti solo numeri o campo vuoto
                if (value === '' || /^\d+$/.test(value)) {
                  handleInputChange('durationMinutes', value)
                }
              }}
            />
            <p className="mt-2 text-xs text-dark-600">
              Durata di ogni sessione in minuti (es: 60 = 1 ora, 90 = 1.5 ore, 120 = 2 ore)
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="flex-1"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Creazione...' : 'Crea Pacchetto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
