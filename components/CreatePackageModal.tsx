'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Search } from 'lucide-react'
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
  const [usersWithActivePackages, setUsersWithActivePackages] = useState<Set<string>>(new Set())
  const [packageType, setPackageType] = useState<'singolo' | 'multiplo' | null>(null)
  const [numberOfAthletes, setNumberOfAthletes] = useState<number>(2)
  const [selectedSingleUserId, setSelectedSingleUserId] = useState<string>('')
  const [selectedMultipleUserIds, setSelectedMultipleUserIds] = useState<Record<number, string>>({})
  const [formData, setFormData] = useState({
    totalSessions: '10',
    durationMinutes: '60',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [singleUserSearch, setSingleUserSearch] = useState('')
  const [singleUserDropdownOpen, setSingleUserDropdownOpen] = useState(false)
  const [multipleUserSearch, setMultipleUserSearch] = useState<Record<number, string>>({})
  const [multipleUserDropdownOpen, setMultipleUserDropdownOpen] = useState<Record<number, boolean>>({})
  const singleUserDropdownRef = useRef<HTMLDivElement>(null)
  const multipleUserDropdownRefs = useRef<Record<number, HTMLDivElement | null>>({})

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [])

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (singleUserDropdownRef.current && !singleUserDropdownRef.current.contains(event.target as Node)) {
        setSingleUserDropdownOpen(false)
      }
      Object.entries(multipleUserDropdownRefs.current).forEach(([index, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setMultipleUserDropdownOpen(prev => ({ ...prev, [index]: false }))
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        
        // Identifica gli utenti con pacchetti attivi
        const activePackageUserIds = new Set<string>()
        data.forEach((user: any) => {
          if (user.userPackages && user.userPackages.length > 0) {
            // Controlla se ha almeno un pacchetto attivo
            const hasActivePackage = user.userPackages.some((up: any) => 
              up.package && up.package.isActive !== false
            )
            if (hasActivePackage) {
              activePackageUserIds.add(user.id)
            }
          }
        })
        setUsersWithActivePackages(activePackageUserIds)
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
          totalSessions,
          durationMinutes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Gestione speciale per errori 400 (utente con pacchetto attivo)
        if (response.status === 400 && data.usersWithPackages && data.usersWithPackages.length > 0) {
          const userNames = data.usersWithPackages.map((u: any) => u.userName || u.userEmail).join(', ')
          setError(`I seguenti clienti hanno già un pacchetto attivo: ${userNames}. Termina il pacchetto esistente prima di assegnarne uno nuovo.`)
          return
        }
        
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

  // Funzione per ottenere i clienti disponibili per una tendina specifica (senza pacchetti attivi)
  const getAvailableUsersForSelect = (excludeIndex?: number, searchTerm?: string): User[] => {
    let availableUsers = users
    
    // Filtra sempre per ricerca se presente
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase()
      availableUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchLower) || 
        user.email.toLowerCase().includes(searchLower)
      )
    }
    
    // Escludi sempre quelli con pacchetto attivo
    availableUsers = availableUsers.filter(user => !usersWithActivePackages.has(user.id))
    
    if (packageType === 'multiplo') {
      // Per multiplo: escludi anche i clienti già selezionati nelle altre tendine
      const selectedIds = Object.entries(selectedMultipleUserIds)
        .filter(([index]) => excludeIndex === undefined || index !== excludeIndex.toString())
        .map(([, id]) => id)
        .filter(id => id !== '')
      
      availableUsers = availableUsers.filter(user => !selectedIds.includes(user.id))
    }
    
    return availableUsers
  }

  // Funzione per ottenere i clienti con pacchetto attivo che corrispondono alla ricerca
  const getUsersWithActivePackagesForSearch = (searchTerm: string): User[] => {
    if (!searchTerm || searchTerm.trim() === '') {
      return []
    }
    
    const searchLower = searchTerm.toLowerCase()
    return users.filter(user => 
      usersWithActivePackages.has(user.id) &&
      (user.name.toLowerCase().includes(searchLower) || 
       user.email.toLowerCase().includes(searchLower))
    )
  }

  const handleSingleUserSelect = (userId: string) => {
    setSelectedSingleUserId(userId)
    const selectedUser = users.find(u => u.id === userId)
    if (selectedUser) {
      setSingleUserSearch(selectedUser.name)
    }
    setSingleUserDropdownOpen(false)
  }

  const handleMultipleUserSelect = (index: number, userId: string) => {
    setSelectedMultipleUserIds((prev) => ({
      ...prev,
      [index]: userId,
    }))
    const selectedUser = users.find(u => u.id === userId)
    if (selectedUser) {
      setMultipleUserSearch((prev) => ({
        ...prev,
        [index]: selectedUser.name,
      }))
    }
    setMultipleUserDropdownOpen((prev) => ({
      ...prev,
      [index]: false,
    }))
  }

  const handlePackageTypeChange = (type: 'singolo' | 'multiplo') => {
    setPackageType(type)
    setSelectedSingleUserId('')
    setSelectedMultipleUserIds({})
    setNumberOfAthletes(2)
    setSingleUserSearch('')
    setMultipleUserSearch({})
    setSingleUserDropdownOpen(false)
    setMultipleUserDropdownOpen({})
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
              className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
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

          {/* Se singolo: ricerca cliente */}
          {packageType === 'singolo' && (
            <div>
              <label
                className="block text-sm font-light mb-2 heading-font"
                className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
              >
                Cliente
              </label>
              <div className="relative" ref={singleUserDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={singleUserSearch}
                    onChange={(e) => {
                      setSingleUserSearch(e.target.value)
                      setSingleUserDropdownOpen(true)
                    }}
                    onFocus={() => setSingleUserDropdownOpen(true)}
                    placeholder="Cerca cliente per nome o email..."
                    className="input-field w-full pr-10"
                    required={!selectedSingleUserId}
                  />
                  {selectedSingleUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSingleUserId('')
                        setSingleUserSearch('')
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {singleUserDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-dark-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const availableUsers = getAvailableUsersForSelect(undefined, singleUserSearch)
                      const usersWithActive = getUsersWithActivePackagesForSearch(singleUserSearch)
                      const hasResults = availableUsers.length > 0 || usersWithActive.length > 0
                      
                      if (!hasResults) {
                        return (
                          <div className="px-4 py-2 text-dark-500 text-sm">
                            Nessun cliente trovato
                          </div>
                        )
                      }
                      
                      return (
                        <>
                          {availableUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleSingleUserSelect(user.id)}
                              className="w-full text-left px-4 py-2 hover:bg-dark-200 text-white text-sm transition-colors"
                            >
                              <div className="font-semibold">{user.name}</div>
                              <div className="text-xs text-dark-500">{user.email}</div>
                            </button>
                          ))}
                          {usersWithActive.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              disabled
                              className="w-full text-left px-4 py-2 text-dark-500 text-sm cursor-not-allowed opacity-60"
                            >
                              <div className="font-semibold">{user.name}</div>
                              <div className="text-xs">{user.email}</div>
                              <div className="text-xs text-red-400 mt-1">Pacchetto attivo</div>
                            </button>
                          ))}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Se multiplo: tendina numero atleti + tante tendine quanti sono gli atleti */}
          {packageType === 'multiplo' && (
            <>
              <div>
                <label
                  className="block text-sm font-light mb-2 heading-font"
                  className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
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

              {/* Tante ricerche quanti sono gli atleti */}
              {Array.from({ length: numberOfAthletes }, (_, i) => i).map((index) => {
                const searchTerm = multipleUserSearch[index] || ''
                const availableUsers = getAvailableUsersForSelect(index, searchTerm)
                return (
                  <div key={index} className="relative" ref={(el) => { multipleUserDropdownRefs.current[index] = el }}>
                    <label
                      className="block text-sm font-light mb-2 heading-font"
                      className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
                    >
                      Atleta {index + 1}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setMultipleUserSearch((prev) => ({ ...prev, [index]: e.target.value }))
                          setMultipleUserDropdownOpen((prev) => ({ ...prev, [index]: true }))
                        }}
                        onFocus={() => setMultipleUserDropdownOpen((prev) => ({ ...prev, [index]: true }))}
                        placeholder="Cerca atleta per nome o email..."
                        className="input-field w-full pr-10"
                        required={!selectedMultipleUserIds[index]}
                      />
                      {selectedMultipleUserIds[index] && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMultipleUserIds((prev) => {
                              const newState = { ...prev }
                              delete newState[index]
                              return newState
                            })
                            setMultipleUserSearch((prev) => {
                              const newState = { ...prev }
                              delete newState[index]
                              return newState
                            })
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {multipleUserDropdownOpen[index] && (
                      <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-dark-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {(() => {
                          const usersWithActive = getUsersWithActivePackagesForSearch(searchTerm)
                          const hasResults = availableUsers.length > 0 || usersWithActive.length > 0
                          
                          if (!hasResults) {
                            return (
                              <div className="px-4 py-2 text-dark-500 text-sm">
                                Nessun atleta trovato
                              </div>
                            )
                          }
                          
                          return (
                            <>
                              {availableUsers.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => handleMultipleUserSelect(index, user.id)}
                                  className="w-full text-left px-4 py-2 hover:bg-dark-200 text-white text-sm transition-colors"
                                >
                                  <div className="font-semibold">{user.name}</div>
                                  <div className="text-xs text-dark-500">{user.email}</div>
                                </button>
                              ))}
                              {usersWithActive.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  disabled
                                  className="w-full text-left px-4 py-2 text-dark-500 text-sm cursor-not-allowed opacity-60"
                                >
                                  <div className="font-semibold">{user.name}</div>
                                  <div className="text-xs">{user.email}</div>
                                  <div className="text-xs text-red-400 mt-1">Pacchetto attivo</div>
                                </button>
                              ))}
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          <div>
            <label
              htmlFor="totalSessions"
              className="block text-sm font-light mb-2 heading-font"
              className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
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
              className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
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
