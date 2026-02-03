'use client'

import { useState, useEffect } from 'react'
import { User, Phone, Mail, Edit, Trash2, X, ChevronDown, ChevronUp, Calendar, Ruler } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import Button from '@/components/ui/Button'
import BodyMeasurementModal from '@/components/BodyMeasurementModal'
import EditUserModal from '@/components/EditUserModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

interface UserData {
  id: string
  name: string
  email: string
  phone: string | null
  collaborationStartDate: string | null
  userPackages: Array<{
    id: string
    usedSessions: number
    package: {
      id: string
      name: string
      totalSessions: number
      _count?: {
        userPackages: number
      }
    }
  }>
  _count: {
    bookings: number
  }
}

type SortBy = 'name' | 'collaborationStartDate'
type SortOrder = 'asc' | 'desc'

export default function AdminUsersList() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [packages, setPackages] = useState<Array<{ id: string; name: string; totalSessions: number }>>([])
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userBookings, setUserBookings] = useState<Record<string, any[]>>({})
  const [loadingBookings, setLoadingBookings] = useState<Record<string, boolean>>({})
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null)
  const [bookingToCancel, setBookingToCancel] = useState<{ id: string; userId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    fetchUsers()
    fetchPackages()
  }, [sortBy, sortOrder, selectedPackageId])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      // Prima recupera il conteggio totale (senza filtri) per distinguere tra "nessun cliente" e "nessun risultato"
      const totalResponse = await fetch('/api/admin/users?sortBy=name&sortOrder=asc')
      if (totalResponse.ok) {
        const totalData = await totalResponse.json()
        setTotalUsersCount(totalData.length)
      }

      // Poi recupera i clienti filtrati
      const url = new URL('/api/admin/users', window.location.origin)
      url.searchParams.set('sortBy', sortBy)
      url.searchParams.set('sortOrder', sortOrder)
      if (selectedPackageId) {
        url.searchParams.set('packageId', selectedPackageId)
      }
      
      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        console.error('Errore nella risposta API:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Errore recupero utenti:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/admin/packages')
      if (response.ok) {
        const data = await response.json()
        // Estrai i pacchetti unici (potrebbero esserci duplicati se un pacchetto è assegnato a più utenti)
        const packageMap = new Map<string, { id: string; name: string; totalSessions: number }>(
          data.map((pkg: any) => [pkg.id, { id: pkg.id, name: pkg.name, totalSessions: pkg.totalSessions }])
        )
        const uniquePackages = Array.from(packageMap.values())
        setPackages(uniquePackages)
      }
    } catch (error) {
      console.error('Errore recupero pacchetti:', error)
    }
  }

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const fetchUserBookings = async (userId: string) => {
    if (userBookings[userId]) {
      return
    }

    setLoadingBookings(prev => ({ ...prev, [userId]: true }))
    try {
      const response = await fetch(`/api/admin/bookings?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserBookings(prev => ({ ...prev, [userId]: data }))
      }
    } catch (error) {
      console.error('Errore recupero prenotazioni:', error)
    } finally {
      setLoadingBookings(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleToggleExpanded = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null)
    } else {
      setExpandedUser(userId)
      fetchUserBookings(userId)
    }
  }

  const handleDeleteUserClick = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName })
  }

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return

    setDeletingUser(userToDelete.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'eliminazione')
      }

      fetchUsers()
      setUserToDelete(null)
    } catch (error: any) {
      setError(error.message || 'Errore nell\'eliminazione del cliente')
    } finally {
      setDeletingUser(null)
    }
  }

  const handleCancelBookingClick = (bookingId: string, userId: string) => {
    setBookingToCancel({ id: bookingId, userId })
  }

  const handleCancelBookingConfirm = async () => {
    if (!bookingToCancel) return

    setCancellingBooking(bookingToCancel.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingToCancel.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nella disdetta')
      }

      setUserBookings(prev => {
        const updated = { ...prev }
        if (updated[bookingToCancel.userId]) {
          updated[bookingToCancel.userId] = updated[bookingToCancel.userId].filter((b: any) => b.id !== bookingToCancel.id)
        }
        return updated
      })
      fetchUsers()
      setBookingToCancel(null)
    } catch (error: any) {
      setError(error.message || 'Errore nella disdetta della prenotazione')
    } finally {
      setCancellingBooking(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner-gold w-12 h-12 mx-auto mb-4"></div>
        <p className="mt-4 text-dark-600">Caricamento clienti...</p>
      </div>
    )
  }

  // Filtra i clienti in base al termine di ricerca
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.phone && user.phone.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="w-full space-y-2 md:space-y-3">
      {/* Barra di ricerca */}
      <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2 items-start sm:items-center">
        <Label className="text-xs md:text-sm whitespace-nowrap">
          Cerca cliente
        </Label>
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca per nome, email o telefono..."
            className="input-field w-full text-xs md:text-sm py-1 md:py-1.5 h-auto pr-8"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filtri e Ordinamento - dimensioni ridotte */}
      <div className="flex flex-col gap-2 md:gap-3">
        {/* Filtro per Pacchetto */}
        <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2 items-start sm:items-center">
          <Label className="text-xs md:text-sm whitespace-nowrap">
            Filtra per pacchetto
          </Label>
          <div className="relative flex-1 max-w-xs">
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="input-field w-full appearance-none pr-7 text-xs md:text-sm py-1 md:py-1.5 h-auto"
            >
              <option value="">Tutti i clienti</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.totalSessions} sessioni)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 md:w-3.5 md:h-3.5 text-dark-500 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* Ordinamento */}
        <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2 items-start sm:items-center justify-between">
          <div className="flex items-center gap-1 md:gap-1.5 flex-nowrap">
            <span className="text-xs md:text-sm font-semibold text-dark-600 whitespace-nowrap">Ordina per:</span>
            <Button
              variant={sortBy === 'name' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => handleSort('name')}
              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 h-auto whitespace-nowrap"
            >
              Cliente {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'collaborationStartDate' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => handleSort('collaborationStartDate')}
              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 h-auto whitespace-nowrap"
            >
              Inizio {sortBy === 'collaborationStartDate' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>
      </div>

      {/* Messaggio quando non ci sono risultati */}
      {!loading && filteredUsers.length === 0 && users.length > 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          {totalUsersCount === 0 ? (
            <>
              <p className="text-dark-600 font-semibold">Nessun cliente registrato</p>
              <p className="text-sm text-dark-500 mt-2">Aggiungi il primo cliente utilizzando il pulsante sopra</p>
            </>
          ) : (
            <>
              <p className="text-dark-600 font-semibold">Nessun cliente corrisponde ai filtri selezionati</p>
              <p className="text-sm text-dark-500 mt-2">
                {searchTerm || selectedPackageId 
                  ? 'Prova a modificare la ricerca o i filtri per vedere più clienti'
                  : 'Nessun cliente trovato con i criteri selezionati'}
              </p>
              {(selectedPackageId || searchTerm) && (
                <Button
                  variant="outline-gold"
                  size="sm"
                  onClick={() => {
                    setSelectedPackageId('')
                    setSearchTerm('')
                  }}
                  className="mt-4"
                >
                  Rimuovi filtri
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {filteredUsers.length > 0 && (
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="w-full min-w-0">
        {/* Mobile: Card Layout - Versione ultra compatta */}
        <div className="lg:hidden space-y-1.5">
          {filteredUsers.map((user) => {
            const hasActivePackage = user.userPackages && user.userPackages.length > 0
            const activePackage = hasActivePackage ? user.userPackages[0] : null
            const packageType = activePackage && (activePackage.package._count?.userPackages || 0) > 1 ? 'MULTIPLO' : 'SINGOLO'
            
            return (
              <div
                key={user.id}
                data-animate
                className="bg-dark-100/50 backdrop-blur-sm border border-dark-200/30 rounded-xl p-2 hover:border-gold-400/50 transition-smooth hover:shadow-card-hover"
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
                    <h4 className="text-xs font-bold text-white mb-0.5 truncate leading-tight">{user.name}</h4>
                    
                    {/* Informazioni essenziali - dimensioni ultra ridotte */}
                    <div className="space-y-0">
                      {user.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-2.5 h-2.5 flex-shrink-0 text-dark-500" />
                          <a href={`tel:${user.phone}`} className="text-[9px] text-dark-500 underline truncate leading-tight">{user.phone}</a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Badge e azioni a destra - dimensioni ultra ridotte */}
                  <div className="flex flex-col items-end space-y-0.5 flex-shrink-0">
                    {/* Badge uno sotto l'altro per risparmiare spazio orizzontale */}
                    <div className="flex flex-col items-end space-y-0.5">
                      {/* Badge stato pacchetto - ultra piccolo */}
                      {hasActivePackage && activePackage ? (
                        <Badge 
                          variant={activePackage.package.totalSessions - activePackage.usedSessions > 0 ? 'gold' : 'danger'} 
                          size="sm"
                          className="text-[6px] px-0.5 py-0 leading-none h-auto scale-90"
                        >
                          {activePackage.usedSessions}/{activePackage.package.totalSessions} • {packageType}
                        </Badge>
                      ) : (
                        <Badge variant="info" size="sm" className="text-[6px] px-0.5 py-0 leading-none h-auto scale-90">
                          Nessun pacchetto
                        </Badge>
                      )}
                      
                      {/* Badge prenotazioni - ultra piccolo */}
                      {user._count.bookings > 0 && (
                        <Badge variant="gold" size="sm" className="text-[6px] px-0.5 py-0 leading-none h-auto scale-90">
                          {user._count.bookings} {user._count.bookings === 1 ? 'PRENOTAZIONE' : 'PRENOTAZIONI'}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Freccia per dettagli - ultra piccola */}
                    <button
                      onClick={() => handleToggleExpanded(user.id)}
                      className="text-dark-500 hover:text-gold-400 transition-colors mt-0.5"
                      aria-label="Dettagli"
                    >
                      {expandedUser === user.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Sezione espansa con dettagli e azioni - dimensioni ultra ridotte */}
                {expandedUser === user.id && (
                  <div className="mt-1.5 pt-1.5 border-t border-dark-200/30 space-y-1.5">
                    {/* Email (nella sezione espansa) */}
                    <div className="flex items-center space-x-1 text-[9px] text-dark-600">
                      <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                      <a href={`mailto:${user.email}`} className="underline truncate leading-tight">{user.email}</a>
                    </div>
                    
                    {/* Data collaborazione */}
                    <div className="flex items-center space-x-1 text-[9px] text-dark-600">
                      <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="leading-tight">
                        Inizio Collaborazione: {user.collaborationStartDate 
                          ? new Date(user.collaborationStartDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'Non specificato'}
                      </span>
                    </div>
                    
                    {/* Prenotazioni */}
                    {loadingBookings[user.id] ? (
                      <div className="text-center py-1.5">
                        <div className="inline-block w-3 h-3 border-2 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
                      </div>
                    ) : userBookings[user.id] && userBookings[user.id].length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[9px] font-semibold text-dark-600 uppercase">Prenotazioni Attive:</p>
                        {userBookings[user.id].map((booking: any) => (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between bg-dark-200/30 rounded-md p-1.5"
                          >
                            <div className="text-[9px] font-semibold text-white leading-tight">
                              {new Date(booking.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} alle {booking.time}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelBookingClick(booking.id, user.id)}
                              disabled={cancellingBooking === booking.id}
                              className="text-red-400 hover:text-red-300 p-0.5 h-auto"
                            >
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-dark-500 text-center">Nessuna prenotazione attiva</p>
                    )}
                    
                    {/* Azioni - dimensioni ultra ridotte */}
                    <div className="flex gap-0.5 pt-1 border-t border-dark-200/30">
                      <Button
                        variant="outline-gold"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingUser(user)
                          setIsEditModalOpen(true)
                        }}
                        className="flex-1 text-[8px] px-1 py-0.5 h-auto"
                      >
                        <Edit className="w-2 h-2 mr-0.5" />
                        Modifica
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedUser({ id: user.id, name: user.name, email: user.email })
                          setIsMeasurementModalOpen(true)
                        }}
                        className="flex-1 text-[8px] px-1 py-0.5 h-auto"
                      >
                        <Ruler className="w-2 h-2 mr-0.5" />
                        Misure
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteUserClick(user.id, user.name)
                        }}
                        disabled={deletingUser === user.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 text-[8px] px-1 py-0.5 h-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Desktop: Table Layout */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
            <thead>
              <tr className="border-b border-dark-200/30">
                <th className="px-4 xl:px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 xl:px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">
                  Contatti
                </th>
                <th className="px-4 xl:px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">
                  Pacchetti Attivi
                </th>
                <th className="px-4 xl:px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">
                  Prenotazioni
                </th>
                <th className="px-4 xl:px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">
                  Inizio Collaborazione
                </th>
                <th className="px-4 xl:px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider min-w-[180px]">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200/30">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  data-animate
                  className="table-row"
                >
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-gold">
                          <User className="w-5 h-5 text-dark-950" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-white">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-dark-600 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gold-400 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gold-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {user.userPackages && user.userPackages.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {user.userPackages.map((userPackage) => {
                            const isMultiple = (userPackage.package._count?.userPackages || 0) > 1
                            const packageType = isMultiple ? 'Multiplo' : 'Singolo'
                            return (
                              <div key={userPackage.id} className="flex items-center space-x-1">
                                <Badge variant={userPackage.package.totalSessions - userPackage.usedSessions > 0 ? 'gold' : 'danger'} size="sm" className="flex-shrink-0">
                                  {userPackage.usedSessions} / {userPackage.package.totalSessions}
                                </Badge>
                                <span className="text-xs text-dark-600">{packageType}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-dark-500">Nessun pacchetto</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <Badge variant="gold" size="sm">
                      {user._count.bookings}
                    </Badge>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    {user.collaborationStartDate ? (
                      <span className="text-sm text-dark-600">
                        {new Date(user.collaborationStartDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-sm text-dark-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="outline-gold"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user)
                          setIsEditModalOpen(true)
                        }}
                        className="whitespace-nowrap"
                      >
                        <Edit className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        <span className="hidden xl:inline">Modifica</span>
                        <span className="xl:hidden">Mod.</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser({ id: user.id, name: user.name, email: user.email })
                          setIsMeasurementModalOpen(true)
                        }}
                        className="whitespace-nowrap"
                      >
                        <span className="hidden xl:inline">Misurazioni</span>
                        <span className="xl:hidden">Mis.</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleDeleteUserClick(user.id, user.name)
                        }}
                        disabled={deletingUser === user.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        </div>
      </div>
      )}

      {selectedUser && (
        <BodyMeasurementModal
          userId={selectedUser.id}
          userName={selectedUser.name}
          userEmail={selectedUser.email}
          isOpen={isMeasurementModalOpen}
          onClose={() => {
            setIsMeasurementModalOpen(false)
            setSelectedUser(null)
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingUser(null)
          }}
          onSuccess={() => {
            fetchUsers()
          }}
        />
      )}

      {userToDelete && (
        <DeleteConfirmModal
          isOpen={!!userToDelete}
          onClose={() => {
            setUserToDelete(null)
            setError(null)
          }}
          onConfirm={handleDeleteUserConfirm}
          title="Elimina Cliente"
          message={`Sei sicuro di voler eliminare il cliente "${userToDelete.name}"? Questa azione è irreversibile e eliminerà anche tutti i pacchetti e le prenotazioni associate.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deletingUser === userToDelete.id}
        />
      )}

      {bookingToCancel && (
        <DeleteConfirmModal
          isOpen={!!bookingToCancel}
          onClose={() => {
            setBookingToCancel(null)
            setError(null)
          }}
          onConfirm={handleCancelBookingConfirm}
          title="Disdici Prenotazione"
          message="Sei sicuro di voler disdire questa prenotazione?"
          confirmText="Disdici"
          cancelText="Annulla"
          variant="warning"
          isLoading={cancellingBooking === bookingToCancel.id}
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
