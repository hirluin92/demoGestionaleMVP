'use client'

import { useState, useEffect } from 'react'
import { User, Phone, Mail, Edit, Trash2, X, ChevronDown, ChevronUp, Calendar, Ruler } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
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
  packages?: Array<{
    id: string
    name: string
    totalSessions: number
    usedSessions: number
  }>
  userPackages: Array<{
    id: string
    usedSessions: number
    package: {
      id: string
      name: string
      totalSessions: number
    }
  }> | []
  _count: {
    bookings: number
  }
}

interface Booking {
  id: string
  date: string
  time: string
  status: string
  package: {
    name: string
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
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userBookings, setUserBookings] = useState<Record<string, Booking[]>>({})
  const [loadingBookings, setLoadingBookings] = useState<Record<string, boolean>>({})
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null)
  const [bookingToCancel, setBookingToCancel] = useState<{ id: string; userId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [packages, setPackages] = useState<Array<{ id: string; name: string; totalSessions: number }>>([])
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0) // Contatore totale clienti (senza filtri)

  useEffect(() => {
    fetchUsers()
  }, [sortBy, sortOrder, selectedPackageId])

  useEffect(() => {
    fetchPackages()
  }, [])

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

  const fetchUserBookings = async (userId: string) => {
    if (userBookings[userId]) {
      // Se abbiamo già i dati, non ricaricare
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

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
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

      // Ricarica prenotazioni e utenti
      setUserBookings(prev => {
        const updated = { ...prev }
        if (updated[bookingToCancel.userId]) {
          updated[bookingToCancel.userId] = updated[bookingToCancel.userId].filter(b => b.id !== bookingToCancel.id)
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
        <div className="inline-block w-8 h-8 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
        <p className="mt-4 text-dark-600">Caricamento clienti...</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Filtri e Ordinamento */}
      <div className="flex flex-col gap-4">
        {/* Filtro per Pacchetto */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-semibold text-dark-600 whitespace-nowrap">
            Filtra per pacchetto:
          </label>
          <div className="relative flex-1 max-w-xs">
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="input-field w-full appearance-none pr-10"
            >
              <option value="">Tutti i clienti</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.totalSessions} sessioni)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* Ordinamento */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-dark-600">Ordina per:</span>
            <Button
              variant={sortBy === 'name' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => handleSort('name')}
            >
              Cliente {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'collaborationStartDate' ? 'gold' : 'outline-gold'}
              size="sm"
              onClick={() => handleSort('collaborationStartDate')}
            >
              Inizio Collaborazione {sortBy === 'collaborationStartDate' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>
      </div>

      {/* Messaggio quando non ci sono risultati */}
      {!loading && users.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          {totalUsersCount === 0 ? (
            <>
              <p className="text-dark-600 font-semibold">Nessun cliente registrato</p>
              <p className="text-sm text-dark-500 mt-2">Aggiungi il primo cliente utilizzando il pulsante sopra</p>
            </>
          ) : (
            <>
              <p className="text-dark-600 font-semibold">Nessun cliente corrisponde al filtro selezionato</p>
              <p className="text-sm text-dark-500 mt-2">
                {selectedPackageId 
                  ? 'Prova a selezionare un altro pacchetto o rimuovi il filtro per vedere tutti i clienti'
                  : 'Nessun cliente trovato con i criteri selezionati'}
              </p>
              {selectedPackageId && (
                <Button
                  variant="outline-gold"
                  size="sm"
                  onClick={() => setSelectedPackageId('')}
                  className="mt-4"
                >
                  Rimuovi filtri
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {users.length > 0 && (
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="w-full min-w-0">
          {/* Mobile: Card Layout */}
          <div className="lg:hidden space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-dark-100/50 backdrop-blur-sm border border-dark-200/30 rounded-xl p-4 hover:border-gold-400/50 transition-all duration-300"
              >
                <div className="flex items-start space-x-3 mb-3">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-gold">
                      <User className="w-6 h-6 text-dark-950" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-white mb-1">{user.name}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2 text-dark-600">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center space-x-2 text-dark-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-3 border-t border-dark-200/30">
                  <Badge variant="info" size="sm">
                    {user.userPackages.length} {user.userPackages.length === 1 ? 'Pacchetto' : 'Pacchetti'}
                  </Badge>
                  <Badge variant="gold" size="sm">
                    {user._count.bookings} {user._count.bookings === 1 ? 'Prenotazione' : 'Prenotazioni'}
                  </Badge>
                  {user.collaborationStartDate && (
                    <Badge variant="info" size="sm">
                      Inizio: {new Date(user.collaborationStartDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 pt-3 border-t border-dark-200/30 mt-3">
                  <Button
                    variant="outline-gold"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingUser(user)
                      setIsEditModalOpen(true)
                    }}
                    className="p-2 flex-1"
                    aria-label="Modifica"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedUser({ id: user.id, name: user.name, email: user.email })
                      setIsMeasurementModalOpen(true)
                    }}
                    className="p-2 flex-1"
                    aria-label="Misurazioni"
                  >
                    <Ruler className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleExpanded(user.id)
                    }}
                    className="p-2 flex-1"
                    aria-label="Prenotazioni"
                  >
                    <Calendar className="w-4 h-4" />
                    {expandedUser === user.id ? (
                      <ChevronUp className="w-3 h-3 ml-1" />
                    ) : (
                      <ChevronDown className="w-3 h-3 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteUserClick(user.id, user.name)
                    }}
                    disabled={deletingUser === user.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 flex-1"
                    aria-label="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {expandedUser === user.id && (
                  <div className="mt-4 pt-4 border-t border-dark-200/30">
                    {loadingBookings[user.id] ? (
                      <div className="text-center py-4">
                        <div className="inline-block w-6 h-6 border-2 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
                      </div>
                    ) : userBookings[user.id] && userBookings[user.id].length > 0 ? (
                      <div className="space-y-2">
                        {userBookings[user.id].map((booking) => (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between bg-dark-200/30 rounded-lg p-3"
                          >
                            <div>
                                      <div className="text-sm font-semibold text-white">
                                        {new Date(booking.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} alle {booking.time}
                                      </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelBookingClick(booking.id, user.id)}
                              disabled={cancellingBooking === booking.id}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-dark-500 text-center">Nessuna prenotazione attiva</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden lg:block overflow-x-auto no-scrollbar">
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
                    <th className="px-4 xl:px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider min-w-[240px]">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200/30">
                  {users.map((user) => (
                    <>
                      <tr
                        key={user.id}
                        className="hover:bg-dark-100/30 transition-colors"
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
                            {user.userPackages.length > 0 ? (
                              <div className="space-y-1">
                                {user.userPackages.map((userPackage) => {
                                  // Determina se è multiplo controllando il conteggio di userPackages del pacchetto
                                  const isMultiple = (userPackage.package as any)._count?.userPackages > 1
                                  const packageType = isMultiple ? 'Multiplo' : 'Singolo'
                                  
                                  return (
                                    <div key={userPackage.id} className="flex items-center space-x-2">
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
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline-gold"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user)
                                setIsEditModalOpen(true)
                              }}
                              className="p-2"
                              aria-label="Modifica"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser({ id: user.id, name: user.name, email: user.email })
                                setIsMeasurementModalOpen(true)
                              }}
                              className="p-2"
                              aria-label="Misurazioni"
                            >
                              <Ruler className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleExpanded(user.id)}
                              className="p-2"
                              aria-label="Prenotazioni"
                            >
                              <Calendar className="w-4 h-4" />
                              {expandedUser === user.id ? (
                                <ChevronUp className="w-3 h-3 ml-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 ml-1" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUserClick(user.id, user.name)}
                              disabled={deletingUser === user.id}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2"
                              aria-label="Elimina"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedUser === user.id && (
                        <tr>
                          <td colSpan={6} className="px-4 xl:px-6 py-4 bg-dark-100/20">
                            {loadingBookings[user.id] ? (
                              <div className="text-center py-4">
                                <div className="inline-block w-6 h-6 border-2 border-dark-200 border-t-gold-400 rounded-full animate-spin"></div>
                              </div>
                            ) : userBookings[user.id] && userBookings[user.id].length > 0 ? (
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-dark-600 mb-2">Prenotazioni Attive:</div>
                                {userBookings[user.id].map((booking) => (
                                  <div
                                    key={booking.id}
                                    className="flex items-center justify-between bg-dark-200/30 rounded-lg p-3"
                                  >
                                    <div>
                                      <div className="text-sm font-semibold text-white">
                                        {new Date(booking.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} alle {booking.time}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCancelBookingClick(booking.id, user.id)}
                                      disabled={cancellingBooking === booking.id}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Disdici
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-dark-500 text-center py-4">Nessuna prenotazione attiva</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
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
