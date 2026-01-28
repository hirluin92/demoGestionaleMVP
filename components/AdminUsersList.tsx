'use client'

import { useState, useEffect } from 'react'
import { User, Phone, Mail, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import BodyMeasurementModal from '@/components/BodyMeasurementModal'
import EditUserModal from '@/components/EditUserModal'

interface UserData {
  id: string
  name: string
  email: string
  phone: string | null
  collaborationStartDate: string | null
  packages: Array<{
    id: string
    name: string
    totalSessions: number
    usedSessions: number
  }>
  _count: {
    bookings: number
  }
}

export default function AdminUsersList() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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
    } finally {
      setLoading(false)
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

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-dark-500 mx-auto mb-4" />
        <p className="text-dark-600 font-semibold">Nessun cliente registrato</p>
        <p className="text-sm text-dark-500 mt-2">Aggiungi il primo cliente utilizzando il pulsante sopra</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="w-full min-w-0">
        {/* Mobile: Card Layout */}
        <div className="lg:hidden space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-dark-100/50 backdrop-blur-sm border border-dark-200/30 rounded-xl p-4 hover:border-gold-400/50 transition-all duration-300 cursor-pointer client-card"
              onClick={() => {
                setSelectedUser({ id: user.id, name: user.name, email: user.email })
                setIsMeasurementModalOpen(true)
              }}
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
                  {user.packages.length} {user.packages.length === 1 ? 'Pacchetto' : 'Pacchetti'}
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
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifica
                </Button>
              </div>
            </div>
          ))}
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
              {users.map((user) => (
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
                      {user.packages.length > 0 ? (
                        <div className="space-y-1">
                          {user.packages.map((pkg) => (
                            <div key={pkg.id} className="flex items-center space-x-2">
                              <span className="font-semibold truncate max-w-[120px]">{pkg.name}</span>
                              <Badge variant={pkg.totalSessions - pkg.usedSessions > 0 ? 'gold' : 'danger'} size="sm" className="flex-shrink-0">
                                {pkg.totalSessions - pkg.usedSessions} / {pkg.totalSessions}
                              </Badge>
                            </div>
                          ))}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

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
    </div>
  )
}
