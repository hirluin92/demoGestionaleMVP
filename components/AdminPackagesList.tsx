'use client'

import { useState, useEffect, useMemo } from 'react'
import { Package, User, Mail, Phone, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

interface PackageData {
  id: string
  name: string
  totalSessions: number
  usedSessions: number
  isActive: boolean
  createdAt: string
  userPackages: Array<{
    id: string
    userId: string
    usedSessions: number
    user: {
      id: string
      name: string
      email: string
      phone: string | null
    }
  }>
}

const PACKAGE_TYPES = [24, 48, 80] as const
type PackageType = typeof PACKAGE_TYPES[number]

interface UserWithPackage {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  packages: Array<{
    id: string
    name: string
    totalSessions: number
    usedSessions: number
    remaining: number
    isActive: boolean
    athletes?: Array<{
      id: string
      name: string
      email: string
      phone: string | null
      usedSessions: number
      remaining: number
    }>
  }>
}

type SortBy = 'userName' | 'totalSessions'
type SortOrder = 'asc' | 'desc'

export default function AdminPackagesList() {
  const [packages, setPackages] = useState<PackageData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPackageType, setSelectedPackageType] = useState<PackageType | 'all' | 'multipli'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('userName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [packageToDelete, setPackageToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deletingPackage, setDeletingPackage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/admin/packages')
      if (response.ok) {
        const data = await response.json()
        setPackages(data)
      }
    } catch (error) {
      console.error('Errore recupero pacchetti:', error)
    } finally {
      setLoading(false)
    }
  }

  // Raggruppa pacchetti per tipo e utente, ordinati per nome utente o numero sessioni
  // Per pacchetti multipli, mostra un singolo record con tutti gli atleti
  const usersByPackageType = useMemo(() => {
    let filtered: PackageData[]
    
    if (selectedPackageType === 'all') {
      filtered = packages
    } else if (selectedPackageType === 'multipli') {
      // Filtra solo i pacchetti assegnati a più di un utente
      filtered = packages.filter(pkg => pkg.userPackages.length > 1)
    } else {
      // Filtra per numero di sessioni (24, 48, 80)
      filtered = packages.filter(pkg => pkg.totalSessions === selectedPackageType)
    }

    const grouped: Record<string, UserWithPackage> = {}

    // Itera su tutti i pacchetti e le loro relazioni userPackages
    filtered.forEach(pkg => {
      // Se è un pacchetto multiplo, crea un singolo record con tutti gli atleti
      if (pkg.userPackages.length > 1) {
        // Crea un record unico per il pacchetto multiplo
        const packageKey = `package-${pkg.id}`
        if (!grouped[packageKey]) {
          // Usa il primo utente come "rappresentante" per il record
          const firstUser = pkg.userPackages[0].user
          grouped[packageKey] = {
            user: {
              ...firstUser,
              // Modifica il nome per mostrare tutti gli atleti
              name: pkg.userPackages.map(up => up.user.name).join(' - '),
            },
            packages: []
          }
        }
        // Aggiungi il pacchetto con le informazioni aggregate
        if (!grouped[packageKey].packages.find(p => p.id === pkg.id)) {
          // Per i pacchetti multipli, mostra le sessioni totali e quelle usate aggregate
          const totalUsed = pkg.userPackages.reduce((sum, up) => sum + up.usedSessions, 0)
          grouped[packageKey].packages.push({
            id: pkg.id,
            name: pkg.name,
            totalSessions: pkg.totalSessions,
            usedSessions: totalUsed, // Somma delle sessioni usate da tutti gli atleti
            remaining: pkg.totalSessions - totalUsed,
            isActive: pkg.isActive,
            // Aggiungi informazioni sugli atleti
            athletes: pkg.userPackages.map(up => ({
              id: up.user.id,
              name: up.user.name,
              email: up.user.email,
              phone: up.user.phone,
              usedSessions: up.usedSessions,
              remaining: pkg.totalSessions - up.usedSessions,
            })),
          })
        }
      } else {
        // Per pacchetti singoli, mantieni la logica originale
        pkg.userPackages.forEach(userPackage => {
          const userId = userPackage.user.id
          if (!grouped[userId]) {
            grouped[userId] = {
              user: userPackage.user,
              packages: []
            }
          }
          // Aggiungi il pacchetto all'utente (evita duplicati)
          if (!grouped[userId].packages.find(p => p.id === pkg.id)) {
            grouped[userId].packages.push({
              id: pkg.id,
              name: pkg.name,
              totalSessions: pkg.totalSessions,
              usedSessions: userPackage.usedSessions,
              remaining: pkg.totalSessions - userPackage.usedSessions,
              isActive: pkg.isActive
            })
          }
        })
      }
    })

    // Converti in array e ordina gli utenti
    const usersArray = Object.values(grouped)
    
    usersArray.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'userName') {
        // Ordina per nome utente
        comparison = a.user.name.localeCompare(b.user.name, 'it', { sensitivity: 'base' })
      } else if (sortBy === 'totalSessions') {
        // Ordina per numero totale di sessioni (somma di tutti i pacchetti dell'utente)
        const totalA = a.packages.reduce((sum, pkg) => sum + pkg.totalSessions, 0)
        const totalB = b.packages.reduce((sum, pkg) => sum + pkg.totalSessions, 0)
        comparison = totalA - totalB
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Ordina anche i pacchetti dentro ogni utente per numero sessioni (opzionale, per consistenza)
    usersArray.forEach(userData => {
      userData.packages.sort((a, b) => a.totalSessions - b.totalSessions)
    })

    return usersArray
  }, [packages, selectedPackageType, sortBy, sortOrder])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
        <p className="mt-4 text-dark-600">Caricamento pacchetti...</p>
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-dark-500 mx-auto mb-4" />
        <p className="text-dark-600 font-semibold">Nessun pacchetto creato</p>
        <p className="text-sm text-dark-500 mt-2">Crea il primo pacchetto utilizzando il pulsante sopra</p>
      </div>
    )
  }

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleDeletePackageClick = (packageId: string, packageName: string) => {
    setPackageToDelete({ id: packageId, name: packageName })
  }

  const handleDeletePackageConfirm = async () => {
    if (!packageToDelete) return

    setDeletingPackage(packageToDelete.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/packages/${packageToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'eliminazione')
      }

      fetchPackages()
      setPackageToDelete(null)
    } catch (error: any) {
      setError(error.message || 'Errore nell\'eliminazione del pacchetto')
    } finally {
      setDeletingPackage(null)
    }
  }

  return (
    <div className="w-full space-y-2 md:space-y-3">
      {/* Filtri e ordinamento */}
      <div className="flex flex-col gap-2 md:gap-3">
        {/* Selezione tipo pacchetto */}
        <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2 items-start sm:items-center">
          <label className="text-xs md:text-sm font-semibold text-dark-600 whitespace-nowrap">
            Filtra per tipo pacchetto:
          </label>
          <div className="flex flex-wrap gap-1 md:gap-1.5">
            <Button
              variant={selectedPackageType === 'all' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => setSelectedPackageType('all')}
              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 h-auto whitespace-nowrap"
            >
              Tutti
            </Button>
            {PACKAGE_TYPES.map(type => (
              <Button
                key={type}
                variant={selectedPackageType === type ? 'gold' : 'outline-gold'}
                size="sm"
                onClick={() => setSelectedPackageType(type)}
                className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 h-auto whitespace-nowrap"
              >
                {type} lezioni
              </Button>
            ))}
            <Button
              variant={selectedPackageType === 'multipli' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => setSelectedPackageType('multipli')}
              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 h-auto whitespace-nowrap"
            >
              Multipli
            </Button>
          </div>
        </div>

        {/* Ordinamento */}
        <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2 items-start sm:items-center">
          <label className="text-xs md:text-sm font-semibold text-dark-600 whitespace-nowrap">
            Ordina utenti per:
          </label>
          <div className="flex items-center gap-1 md:gap-1.5 flex-nowrap">
            <Button
              variant={sortBy === 'userName' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => handleSort('userName')}
              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 h-auto whitespace-nowrap"
            >
              Nome {sortBy === 'userName' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'totalSessions' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => handleSort('totalSessions')}
              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 h-auto whitespace-nowrap"
            >
              Sessioni {sortBy === 'totalSessions' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>
      </div>

      {/* Lista utenti con pacchetti */}
      {usersByPackageType.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <p className="text-dark-600 font-semibold">
            {selectedPackageType === 'multipli' 
              ? 'Nessun utente con pacchetti multipli'
              : selectedPackageType !== 'all' 
                ? `Nessun utente con pacchetti da ${selectedPackageType} lezioni`
                : 'Nessun utente con pacchetti'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto no-scrollbar">
          <div className="w-full min-w-0">
            {/* Mobile: Card Layout - Versione ultra compatta */}
            <div className="lg:hidden space-y-1.5">
              {usersByPackageType.map((userData) => {
                const firstPackage = userData.packages[0]
                const isMultiple = firstPackage?.athletes && firstPackage.athletes.length > 0
                const packageType = isMultiple ? 'MULTIPLO' : 'SINGOLO'
                // Per pacchetti multipli, estrai i nomi degli atleti
                const athleteNames = isMultiple && firstPackage?.athletes 
                  ? firstPackage.athletes.map(a => a.name)
                  : [userData.user.name]
                
                return (
                  <div
                    key={userData.user.id}
                    className="bg-dark-100/50 backdrop-blur-sm border border-dark-200/30 rounded-md p-2 hover:border-gold-400/50 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-1.5">
                      {/* Icona ultra piccola */}
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-gold-400/20 to-gold-500/20 border border-gold-400/30 flex items-center justify-center">
                          <User className="w-4 h-4 text-gold-400" />
                        </div>
                      </div>
                      
                      {/* Contenuto principale - testi ultra ridotti */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white mb-0.5 truncate leading-tight">{athleteNames[0]}</h4>
                        
                        {/* Secondo atleta (se multiplo) o spazio vuoto */}
                        <div className="space-y-0">
                          {athleteNames.length > 1 ? (
                            <h4 className="text-xs font-bold text-white truncate leading-tight">{athleteNames[1]}</h4>
                          ) : (
                            <div className="h-[18px]"></div> // Mantiene l'altezza consistente (stessa altezza di text-xs)
                          )}
                        </div>
                      </div>
                      
                      {/* Badge e azioni a destra - dimensioni ultra ridotte */}
                      <div className="flex flex-col items-end space-y-0.5 flex-shrink-0">
                        {/* Badge uno sotto l'altro per risparmiare spazio orizzontale */}
                        <div className="flex flex-col items-end space-y-0.5">
                          {/* Badge tipo pacchetto - ultra piccolo */}
                          {firstPackage && (
                            <Badge 
                              variant={firstPackage.isActive ? 'gold' : 'danger'} 
                              size="sm"
                              className="text-[6px] px-0.5 py-0 leading-none h-auto scale-90"
                            >
                              {firstPackage.totalSessions} lezioni • {packageType}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Freccia per dettagli - ultra piccola */}
                        <button
                          onClick={() => setExpandedUser(expandedUser === userData.user.id ? null : userData.user.id)}
                          className="text-dark-500 hover:text-gold-400 transition-colors mt-0.5"
                          aria-label="Dettagli"
                        >
                          {expandedUser === userData.user.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Sezione espansa con dettagli - dimensioni ultra ridotte */}
                    {expandedUser === userData.user.id && (
                      <div className="mt-1.5 pt-1.5 border-t border-dark-200/30 space-y-1.5">
                        {/* Email (nella sezione espansa) */}
                        <div className="flex items-center space-x-1 text-[9px] text-dark-600">
                          <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                          <a href={`mailto:${userData.user.email}`} className="underline truncate leading-tight">{userData.user.email}</a>
                        </div>
                        
                        {/* Telefono (nella sezione espansa) */}
                        {userData.user.phone && (
                          <div className="flex items-center space-x-1 text-[9px] text-dark-600">
                            <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                            <a href={`tel:${userData.user.phone}`} className="underline truncate leading-tight">{userData.user.phone}</a>
                          </div>
                        )}
                        
                        {/* Lista pacchetti */}
                        <div className="space-y-2">
                          {userData.packages.map((pkg) => {
                            const percentage = (pkg.usedSessions / pkg.totalSessions) * 100
                            const isMultiple = pkg.athletes && pkg.athletes.length > 0
                            
                            return (
                              <div
                                key={pkg.id}
                                className="bg-dark-200/30 rounded-md p-2"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center space-x-1">
                                    <Package className="w-3 h-3 text-gold-400 flex-shrink-0" />
                                    <span className="text-[9px] font-semibold text-white">
                                      {isMultiple ? 'Multiplo' : 'Singolo'} • {pkg.totalSessions} lezioni
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Badge variant={pkg.isActive ? 'success' : 'warning'} size="sm" className="text-[8px] px-0.5 py-0 h-auto">
                                      {pkg.isActive ? 'Attivo' : 'Inattivo'}
                                    </Badge>
                                    <Badge variant={pkg.remaining > 0 ? 'gold' : 'danger'} size="sm" className="text-[8px] px-0.5 py-0 h-auto">
                                      {pkg.remaining} rimaste
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeletePackageClick(pkg.id, pkg.name)}
                                      disabled={deletingPackage === pkg.id}
                                      className="text-red-400 hover:text-red-300 p-0.5 h-auto"
                                      aria-label="Elimina pacchetto"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Dettagli atleti per pacchetti multipli */}
                                {isMultiple && pkg.athletes && (
                                  <div className="mb-1.5 space-y-1">
                                    <p className="text-[9px] font-semibold text-dark-600 uppercase">Atleti:</p>
                                    {pkg.athletes.map((athlete) => (
                                      <div
                                        key={athlete.id}
                                        className="bg-dark-100/50 rounded-md p-1.5"
                                      >
                                        <div className="text-[9px] font-semibold text-white">{athlete.name}</div>
                                        <div className="text-[8px] text-dark-600">{athlete.email}</div>
                                        {athlete.phone && (
                                          <div className="text-[8px] text-dark-600">{athlete.phone}</div>
                                        )}
                                        <Badge variant={athlete.remaining > 0 ? 'gold' : 'danger'} size="sm" className="text-[8px] px-0.5 py-0 h-auto mt-0.5">
                                          {athlete.remaining} / {pkg.totalSessions} rimaste
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Progress bar */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[9px]">
                                    <span className="text-dark-600">Progresso</span>
                                    <span className="font-bold text-white">
                                      {pkg.usedSessions} / {pkg.totalSessions}
                                    </span>
                                  </div>
                                  <div className="relative w-full h-1.5 bg-dark-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        pkg.remaining > 0 
                                          ? 'bg-gradient-to-r from-gold-400 to-gold-500' 
                                          : 'bg-accent-danger'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="space-y-4">
                {usersByPackageType.map((userData) => (
                  <div
                    key={userData.user.id}
                    className="glass-card rounded-xl p-4 sm:p-6 hover:border-gold-400/50 transition-all duration-300"
                  >
                    {/* Header utente */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-gold flex-shrink-0">
                          <User className="w-6 h-6 text-dark-950" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base sm:text-lg font-bold text-white truncate">{userData.user.name}</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                            <div className="flex items-center space-x-1 text-sm text-dark-600">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{userData.user.email}</span>
                            </div>
                            {userData.user.phone && (
                              <div className="flex items-center space-x-1 text-sm text-dark-600">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span>{userData.user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="info" size="sm" className="w-fit">
                        {userData.packages.length} {userData.packages.length === 1 ? 'pacchetto' : 'pacchetti'}
                      </Badge>
                    </div>

                    {/* Lista pacchetti */}
                    <div className="space-y-3 pt-4 border-t border-dark-200/30">
                      {userData.packages.map((pkg) => {
                        const percentage = (pkg.usedSessions / pkg.totalSessions) * 100
                        
                        return (
                          <div
                            key={pkg.id}
                            className="bg-dark-100/30 rounded-lg p-3 sm:p-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                              <div className="flex items-center space-x-2">
                                <Package className="w-5 h-5 text-gold-400 flex-shrink-0" />
                                <div>
                                  <div className="font-bold text-white">
                                    {pkg.athletes && pkg.athletes.length > 0 ? 'Multiplo' : 'Singolo'}
                                  </div>
                                  <div className="text-sm text-dark-600">
                                    {pkg.totalSessions} lezioni totali
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={pkg.isActive ? 'success' : 'warning'} size="sm">
                                  {pkg.isActive ? 'Attivo' : 'Inattivo'}
                                </Badge>
                                <Badge variant={pkg.remaining > 0 ? 'gold' : 'danger'} size="sm">
                                  {pkg.remaining} rimaste
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePackageClick(pkg.id, pkg.name)}
                                  disabled={deletingPackage === pkg.id}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2"
                                  aria-label="Elimina pacchetto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Dettagli atleti per pacchetti multipli */}
                            {pkg.athletes && pkg.athletes.length > 0 && (
                              <div className="mb-3 space-y-2">
                                <div className="text-sm font-semibold text-dark-600 mb-2">Atleti:</div>
                                {pkg.athletes.map((athlete) => (
                                  <div
                                    key={athlete.id}
                                    className="bg-dark-200/50 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                  >
                                    <div className="flex-1">
                                      <div className="font-semibold text-white text-sm">{athlete.name}</div>
                                      <div className="text-xs text-dark-600">{athlete.email}</div>
                                      {athlete.phone && (
                                        <div className="text-xs text-dark-600">{athlete.phone}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={athlete.remaining > 0 ? 'gold' : 'danger'} size="sm">
                                        {athlete.remaining} / {pkg.totalSessions} rimaste
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Progress bar */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-dark-600">Progresso</span>
                                <span className="font-bold text-white">
                                  {pkg.usedSessions} / {pkg.totalSessions}
                                </span>
                              </div>
                              <div className="relative w-full h-2 bg-dark-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    pkg.remaining > 0 
                                      ? 'bg-gradient-to-r from-gold-400 to-gold-500' 
                                      : 'bg-accent-danger'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                  role="progressbar"
                                  aria-valuenow={percentage}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {packageToDelete && (
        <DeleteConfirmModal
          isOpen={!!packageToDelete}
          onClose={() => {
            setPackageToDelete(null)
            setError(null)
          }}
          onConfirm={handleDeletePackageConfirm}
          title="Elimina Pacchetto"
          message="Sei sicuro di voler eliminare questo pacchetto? Questa azione è irreversibile. Il pacchetto può essere eliminato solo se non ci sono prenotazioni attive associate."
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
        />
      )}

      {error && (
        <DeleteConfirmModal
          isOpen={!!error}
          onClose={() => setError(null)}
          onConfirm={() => setError(null)}
          title="Errore"
          message={error}
          confirmText="Ok"
          variant="danger"
        />
      )}
    </div>
  )
}
