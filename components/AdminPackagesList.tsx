'use client'

import { useState, useEffect, useMemo } from 'react'
import { Package, User, Mail, Phone, Trash2 } from 'lucide-react'
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
  user: {
    id: string
    name: string
    email: string
    phone: string | null
  }
}

const PACKAGE_TYPES = [24, 48, 80] as const
type PackageType = typeof PACKAGE_TYPES[number]

interface UserWithPackage {
  user: PackageData['user']
  packages: Array<{
    id: string
    name: string
    totalSessions: number
    usedSessions: number
    remaining: number
    isActive: boolean
  }>
}

type SortBy = 'name' | 'totalSessions'
type SortOrder = 'asc' | 'desc'

export default function AdminPackagesList() {
  const [packages, setPackages] = useState<PackageData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPackageType, setSelectedPackageType] = useState<PackageType | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('totalSessions')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [packageToDelete, setPackageToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deletingPackage, setDeletingPackage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  // Raggruppa pacchetti per tipo e utente, ordinati per numero sessioni
  const usersByPackageType = useMemo(() => {
    const filtered = selectedPackageType === 'all' 
      ? packages 
      : packages.filter(pkg => pkg.totalSessions === selectedPackageType)

    const grouped: Record<string, UserWithPackage> = {}

    filtered.forEach(pkg => {
      const userId = pkg.user.id
      if (!grouped[userId]) {
        grouped[userId] = {
          user: pkg.user,
          packages: []
        }
      }
      grouped[userId].packages.push({
        id: pkg.id,
        name: pkg.name,
        totalSessions: pkg.totalSessions,
        usedSessions: pkg.usedSessions,
        remaining: pkg.totalSessions - pkg.usedSessions,
        isActive: pkg.isActive
      })
    })

    // Ordina i pacchetti in base al criterio selezionato
    Object.values(grouped).forEach(userData => {
      userData.packages.sort((a, b) => {
        let comparison = 0
        
        if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
        } else if (sortBy === 'totalSessions') {
          comparison = a.totalSessions - b.totalSessions
        }
        
        return sortOrder === 'asc' ? comparison : -comparison
      })
    })

    return Object.values(grouped)
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
    <div className="space-y-6">
      {/* Filtri e ordinamento */}
      <div className="flex flex-col gap-4">
        {/* Selezione tipo pacchetto */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-semibold text-dark-600 whitespace-nowrap">
            Filtra per tipo pacchetto:
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPackageType === 'all' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => setSelectedPackageType('all')}
            >
              Tutti
            </Button>
            {PACKAGE_TYPES.map(type => (
              <Button
                key={type}
                variant={selectedPackageType === type ? 'gold' : 'outline-gold'}
                size="sm"
                onClick={() => setSelectedPackageType(type)}
              >
                {type} lezioni
              </Button>
            ))}
          </div>
        </div>

        {/* Ordinamento */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-semibold text-dark-600 whitespace-nowrap">
            Ordina pacchetti per:
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sortBy === 'name' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => handleSort('name')}
            >
              Nome Pacchetto {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'totalSessions' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => handleSort('totalSessions')}
            >
              Numero Sessioni {sortBy === 'totalSessions' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>
      </div>

      {/* Lista utenti con pacchetti */}
      {usersByPackageType.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <p className="text-dark-600 font-semibold">
            Nessun utente con pacchetti {selectedPackageType !== 'all' ? `da ${selectedPackageType} lezioni` : ''}
          </p>
        </div>
      ) : (
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
                            <div className="font-bold text-white">{pkg.name}</div>
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
          message={`Sei sicuro di voler eliminare il pacchetto "${packageToDelete.name}"? Questa azione è irreversibile. Il pacchetto può essere eliminato solo se non ci sono prenotazioni attive associate.`}
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
