'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useSessionSecurity } from '@/hooks/useSessionSecurity'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { signOut } from 'next-auth/react'
import { Users, Package, LogOut, Plus, Menu, X, Settings, Calendar, User, ChevronDown } from 'lucide-react'
import HugemassLogo from '@/components/HugemassLogo'
import AdminUsersList from '@/components/AdminUsersList'
import AdminPackagesList from '@/components/AdminPackagesList'
import AdminCalendar from '@/components/AdminCalendar'
import CreateUserModal from '@/components/CreateUserModal'
import CreatePackageModal from '@/components/CreatePackageModal'
import AdminBookingModal from '@/components/AdminBookingModal'
import ProfileModal from '@/components/ProfileModal'
import SettingsModal from '@/components/SettingsModal'
// import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function AdminPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  useSessionSecurity() // Aggiunge controlli di sicurezza sulla sessione
  const [activeTab, setActiveTab] = useState<'users' | 'packages' | 'calendar'>('users')
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCreatePackage, setShowCreatePackage] = useState(false)
  const [showAdminBooking, setShowAdminBooking] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const userMenuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  // Calcola la posizione del dropdown quando si apre
  useEffect(() => {
    if (userMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8, // 8px = mt-2
        right: window.innerWidth - rect.right, // Distanza dal bordo destro dello schermo
      })
    }
  }, [userMenuOpen])

  // Chiudi il menu utente quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target) && !target.closest('.user-dropdown-menu')) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin mx-auto"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <HugemassLogo variant="icon" size="sm" className="animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-dark-600 font-semibold tracking-wide text-sm md:text-base">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen relative">
        
        {/* Header Premium */}
        <nav className="glass-card border-b border-opacity-20 sticky top-0 z-50 overflow-visible">
          <div className="max-w-[98%] xl:max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              {/* Logo */}
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="hidden sm:block">
                  <HugemassLogo variant="icon" size="sm" />
                </div>
                <div className="sm:hidden">
                  <HugemassLogo variant="icon" size="sm" />
                </div>
                <div>
                  <p className="text-xs text-dark-600 tracking-widest uppercase font-sans">CONTROL PANEL</p>
                </div>
              </div>
              
              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="relative user-menu-container" ref={userMenuRef}>
                  <button
                    ref={buttonRef}
                    onClick={(e) => {
                      e.stopPropagation()
                      setUserMenuOpen(!userMenuOpen)
                    }}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dark-100/50 transition-colors group"
                    aria-label="Menu utente"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-gold group-hover:scale-110 transition-transform">
                      <User className="w-5 h-5 text-dark-950" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white font-sans">{session.user.name}</p>
                      <p className="text-xs text-dark-600 font-sans">Admin</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-dark-600 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-dark-100/50 transition-colors"
                aria-label={mobileMenuOpen ? 'Chiudi menu' : 'Apri menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-[#E8DCA0]" />
                ) : (
                  <Menu className="w-6 h-6 text-[#E8DCA0]" />
                )}
              </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 border-t border-dark-200/30 animate-slide-down">
                <div className="space-y-3">
                  <div className="px-4 py-3 bg-dark-100/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-gold">
                        <User className="w-5 h-5 text-dark-950" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white font-sans">{session.user.name}</p>
                        <p className="text-xs text-dark-600 font-sans">{session.user.email}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setShowProfileModal(true)
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-dark-200/50 transition-colors rounded-lg flex items-center space-x-3"
                  >
                    <User className="w-4 h-4 text-[#E8DCA0]" />
                    <span>Profilo</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setShowSettingsModal(true)
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-white hover:bg-dark-200/50 transition-colors rounded-lg flex items-center space-x-3"
                  >
                    <Settings className="w-4 h-4 text-[#E8DCA0]" />
                    <span>Impostazioni</span>
                  </button>
                  <Button
                    variant="outline-gold"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      setMobileMenuOpen(false)
                      signOut({ callbackUrl: '/login' })
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Esci
                  </Button>
                </div>
              </div>
            )}
          </div>
        </nav>

        <main className="max-w-[98%] xl:max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-6 relative z-10">
          {/* Hero Section - dimensioni ridotte */}
          <div className="mb-4 md:mb-6 animate-fade-in">
            <h2 className="text-lg sm:text-xl md:text-2xl heading-font font-bold gold-text-gradient mb-1 md:mb-2">
              Pannello di Controllo
            </h2>
            <p className="text-dark-600 text-xs md:text-sm heading-font">
              Gestisci clienti e pacchetti
            </p>
          </div>

          {/* Tabs - dimensioni ridotte */}
          <div className="mb-4 md:mb-6">
            <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              <nav className="flex gap-1.5 md:gap-2 min-w-max" role="tablist" aria-label="Sezioni amministrazione">
                <button
                  onClick={() => setActiveTab('users')}
                  role="tab"
                  aria-selected={activeTab === 'users'}
                  aria-controls="users-panel"
                  id="users-tab"
                  className={`tab-button heading-font ${activeTab === 'users' ? 'active' : ''} whitespace-nowrap`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Users className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="text-xs md:text-sm">Clienti</span>
                </button>
                <button
                  onClick={() => setActiveTab('packages')}
                  role="tab"
                  aria-selected={activeTab === 'packages'}
                  aria-controls="packages-panel"
                  id="packages-tab"
                  className={`tab-button heading-font ${activeTab === 'packages' ? 'active' : ''} whitespace-nowrap`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Package className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="text-xs md:text-sm">Pacchetti</span>
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  role="tab"
                  aria-selected={activeTab === 'calendar'}
                  aria-controls="calendar-panel"
                  id="calendar-tab"
                  className={`tab-button heading-font ${activeTab === 'calendar' ? 'active' : ''} whitespace-nowrap`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="text-xs md:text-sm">Calendario</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <Card>
            {activeTab === 'users' && (
              <div role="tabpanel" id="users-panel" aria-labelledby="users-tab">
                <CardHeader className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3">
                    <div>
                      <CardTitle className="flex items-center text-sm md:text-lg heading-font gold-text-gradient">
                        <Users className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 text-[#E8DCA0]" />
                        Gestione Clienti
                      </CardTitle>
                      <CardDescription className="text-[10px] md:text-xs">Aggiungi e gestisci i clienti del sistema</CardDescription>
                    </div>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => setShowCreateUser(true)}
                      className="w-full sm:w-auto text-xs md:text-sm px-3 py-1.5 h-auto"
                    >
                      <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                      Nuovo Cliente
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AdminUsersList />
                </CardContent>
              </div>
            )}

            {activeTab === 'packages' && (
              <div role="tabpanel" id="packages-panel" aria-labelledby="packages-tab">
                <CardHeader className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3">
                    <div>
                      <CardTitle className="flex items-center text-sm md:text-lg heading-font gold-text-gradient">
                        <Package className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 text-[#E8DCA0]" />
                        Gestione Pacchetti
                      </CardTitle>
                      <CardDescription className="text-[10px] md:text-xs">Crea e gestisci i pacchetti per i clienti</CardDescription>
                    </div>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => setShowCreatePackage(true)}
                      className="w-full sm:w-auto text-xs md:text-sm px-3 py-1.5 h-auto"
                    >
                      <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                      Nuovo Pacchetto
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AdminPackagesList />
                </CardContent>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div role="tabpanel" id="calendar-panel" aria-labelledby="calendar-tab">
                <CardHeader className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3">
                    <div>
                      <CardTitle className="flex items-center text-sm md:text-lg heading-font gold-text-gradient">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 text-[#E8DCA0]" />
                        Calendario Appuntamenti
                      </CardTitle>
                      <CardDescription className="text-[10px] md:text-xs">Visualizza gli appuntamenti per mese o giorno</CardDescription>
                    </div>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => setShowAdminBooking(true)}
                      className="w-full sm:w-auto text-xs md:text-sm px-3 py-1.5 h-auto"
                    >
                      <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                      Prenota Lezione
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="max-w-[900px] mx-auto">
                  <AdminCalendar />
                </CardContent>
              </div>
            )}
          </Card>
        </main>

        {/* Modals */}
        {showCreateUser && (
          <CreateUserModal
            onClose={() => setShowCreateUser(false)}
            onSuccess={() => {
              setShowCreateUser(false)
              window.location.reload()
            }}
          />
        )}

        {showCreatePackage && (
          <CreatePackageModal
            onClose={() => setShowCreatePackage(false)}
            onSuccess={() => {
              setShowCreatePackage(false)
              window.location.reload()
            }}
          />
        )}

        {showAdminBooking && (
          <AdminBookingModal
            isOpen={showAdminBooking}
            onClose={() => setShowAdminBooking(false)}
            onSuccess={() => {
              setShowAdminBooking(false)
              window.location.reload()
            }}
          />
        )}

        {/* User Dropdown Menu - Portal */}
        {mounted && userMenuOpen && buttonRef.current && createPortal(
          <div
            className="user-dropdown-menu fixed w-56 bg-dark-100/95 backdrop-blur-xl border border-dark-200/30 rounded-xl shadow-2xl z-[100] animate-slide-down"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            <div className="py-2">
              <div className="px-4 py-3 border-b border-dark-200/30">
                <p className="text-sm font-semibold text-white font-sans">{session?.user.name}</p>
                <p className="text-xs text-dark-600 font-sans mt-1">{session?.user.email}</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  setShowProfileModal(true)
                }}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-dark-200/50 transition-colors flex items-center space-x-3"
              >
                <User className="w-4 h-4 text-[#E8DCA0]" />
                <span>Profilo</span>
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  setShowSettingsModal(true)
                }}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-dark-200/50 transition-colors flex items-center space-x-3"
              >
                <Settings className="w-4 h-4 text-[#E8DCA0]" />
                <span>Impostazioni</span>
              </button>
              <div className="border-t border-dark-200/30 my-1"></div>
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  signOut({ callbackUrl: '/login' })
                }}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center space-x-3"
              >
                <LogOut className="w-4 h-4" />
                <span>Esci</span>
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Profile Modal */}
        {showProfileModal && mounted && <ProfileModal
          isOpen={showProfileModal}
          onClose={async () => {
            setShowProfileModal(false)
            // Forza l'aggiornamento della sessione dopo la chiusura del modale
            await update()
          }}
          session={session}
        />}

        {/* Settings Modal */}
        {showSettingsModal && <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />}
      </div>
  )
}
