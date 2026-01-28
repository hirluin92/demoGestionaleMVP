'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { signOut } from 'next-auth/react'
import { 
  Calendar, 
  Package, 
  TrendingUp, 
  LogOut, 
  Zap,
  Clock,
  Sparkles,
  Award,
  Menu,
  X,
  Ruler,
  User,
  Settings,
  ChevronDown
} from 'lucide-react'
import BookingForm from '@/components/BookingForm'
import BookingsList from '@/components/BookingsList'
import ClientMeasurementsView from '@/components/ClientMeasurementsView'
import ProfileModal from '@/components/ProfileModal'
import SettingsModal from '@/components/SettingsModal'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import HugemassLogo from '@/components/HugemassLogo'

interface Package {
  id: string
  name: string
  totalSessions: number
  usedSessions: number
  isActive: boolean
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'measurements'>('dashboard')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
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
    }
  }, [status, router])

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

  // Calcola la posizione del dropdown quando si apre
  useEffect(() => {
    if (userMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [userMenuOpen])

  useEffect(() => {
    if (session) {
      fetchPackages()
    }
  }, [session])

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/packages')
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

  const handleBookingSuccess = () => {
    fetchPackages()
    setRefreshKey(prev => prev + 1)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin mx-auto"></div>
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-[#E8DCA0] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="mt-6 text-dark-600 font-semibold tracking-wide text-sm md:text-base">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  const activePackages = packages.filter(pkg => pkg.isActive)
  const totalRemainingSessions = activePackages.reduce(
    (sum, pkg) => sum + (pkg.totalSessions - pkg.usedSessions),
    0
  )

  return (
    <ErrorBoundary>
      <div className="min-h-screen relative overflow-hidden">
        
        {/* Header Premium - Mobile Optimized */}
        <nav className="glass-card border-b border-opacity-20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              {/* Logo */}
              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="hidden sm:block">
                  <HugemassLogo variant="icon" size="sm" />
                </div>
                <div className="sm:hidden">
                  <HugemassLogo variant="icon" size="sm" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl heading-font font-bold">
                    <span className="gold-text-gradient">
                      HUGE MASS
                    </span>
                  </h1>
                  <p className="text-xs text-dark-600 tracking-widest uppercase hidden sm:block">Elite Training</p>
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
                      <p className="text-xs text-dark-600 font-sans">{session.user.email}</p>
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
                  <div className="px-4 py-2 bg-dark-100/50 rounded-lg">
                    <p className="text-sm font-semibold text-white">{session.user.name}</p>
                    <p className="text-xs text-[#E8DCA0] mt-1">{session.user.email}</p>
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          {/* Hero Section - Mobile Optimized */}
          <div className="mb-8 md:mb-12 animate-fade-in">
            <div className="flex items-center space-x-2 mb-2 md:mb-3">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#E8DCA0] animate-pulse" aria-hidden="true" />
              <span className="text-[#E8DCA0] text-xs md:text-sm font-semibold tracking-wide uppercase">Welcome Back</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl heading-font font-bold gold-text-gradient mb-2 md:mb-3">
              Ciao, {session.user.name?.split(' ')[0]}
            </h2>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              role="tab"
              aria-selected={activeTab === 'dashboard'}
              className={`tab-button heading-font ${activeTab === 'dashboard' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Calendar className="w-4 h-4 md:w-5 md:h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('measurements')}
              role="tab"
              aria-selected={activeTab === 'measurements'}
              className={`tab-button heading-font ${activeTab === 'measurements' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Ruler className="w-4 h-4 md:w-5 md:h-5" />
              <span>Misurazioni</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <>

          {/* Stats Cards - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 animate-slide-up">
            {/* Sessioni Disponibili - Gold Highlight */}
            <Card variant="gold-border" hover className="relative overflow-hidden group">
              <div className="hidden md:block absolute inset-0 bg-gradient-to-br from-gold-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
              <CardContent className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-dark-600 text-xs md:text-sm font-semibold mb-1 md:mb-2 tracking-wide uppercase">Sessioni Disponibili</p>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-display font-bold bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
                    {totalRemainingSessions}
                  </p>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gold-400 to-gold-500 rounded-xl flex items-center justify-center shadow-gold group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-dark-950" />
                </div>
              </CardContent>
            </Card>

            {/* Pacchetti Attivi */}
            <Card hover>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-dark-600 text-xs md:text-sm font-semibold mb-1 md:mb-2 tracking-wide uppercase">Pacchetti Attivi</p>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white">{activePackages.length}</p>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-dark-100 rounded-xl flex items-center justify-center group-hover:bg-dark-200 transition-colors duration-300">
                  <Package className="w-6 h-6 md:w-8 md:h-8 text-[#E8DCA0]" />
                </div>
              </CardContent>
            </Card>

            {/* Status - Full width on mobile when 3rd item */}
            <Card hover className="sm:col-span-2 lg:col-span-1">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-dark-600 text-xs md:text-sm font-semibold mb-1 md:mb-2 tracking-wide uppercase">Livello</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="gold" glow>
                      <Award className="w-3 h-3 mr-1" />
                      ELITE
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-dark-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-[#E8DCA0]" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pacchetti - Mobile Optimized */}
          {activePackages.length > 0 && (
            <div className="mb-8 md:mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center text-lg md:text-2xl">
                        <Package className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#E8DCA0]" />
                        I Tuoi Pacchetti
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">Monitora i tuoi progressi</CardDescription>
                    </div>
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#E8DCA0] animate-pulse self-start sm:self-auto" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {activePackages.map((pkg) => {
                      const remaining = pkg.totalSessions - pkg.usedSessions
                      const percentage = (remaining / pkg.totalSessions) * 100
                      const isLow = remaining <= 2
                      
                      return (
                        <div 
                          key={pkg.id} 
                          className="relative p-4 md:p-6 rounded-xl bg-gradient-to-br from-dark-100/50 to-dark-200/30 border-2 border-dark-200/30 hover:border-gold-400/50 transition-all duration-300 group overflow-hidden"
                        >
                          {/* Glow effect - hidden on mobile for performance */}
                          <div className="hidden md:block absolute inset-0 bg-gradient-to-br from-gold-400/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
                          
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3 md:mb-4">
                              <div>
                                <h4 className="font-display font-bold text-base md:text-xl text-white mb-1">{pkg.name}</h4>
                                <p className="text-xs md:text-sm text-dark-600">
                                  {pkg.usedSessions} / {pkg.totalSessions} completate
                                </p>
                              </div>
                              <Badge 
                                variant={isLow ? 'danger' : remaining > 5 ? 'gold' : 'warning'}
                                glow={!isLow}
                                size="sm"
                              >
                                {remaining} rimaste
                              </Badge>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="relative w-full h-2 md:h-3 bg-dark-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                                style={{ width: `${percentage}%` }}
                                role="progressbar"
                                aria-valuenow={percentage}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${pkg.name}: ${remaining} sessioni rimaste su ${pkg.totalSessions}`}
                              >
                                <div className="hidden md:block absolute inset-0 bg-shimmer bg-[length:200%_100%]" aria-hidden="true" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Form Prenotazione + Lista - Mobile Stack */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {/* Form */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              {totalRemainingSessions > 0 ? (
                <Card as="section" aria-labelledby="booking-title">
                  <CardHeader>
                    <CardTitle id="booking-title" className="flex items-center text-lg md:text-2xl">
                      <Calendar className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#E8DCA0]" />
                      Prenota una Sessione
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Scegli data e orario per la tua prossima sessione</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BookingForm onSuccess={handleBookingSuccess} packages={activePackages} />
                  </CardContent>
                </Card>
              ) : (
                <Card variant="gold-border" className="text-center">
                  <CardContent className="py-12 md:py-16">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-gold-400 to-gold-500 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-gold">
                      <Package className="w-8 h-8 md:w-10 md:h-10 text-dark-950" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-2 md:mb-3">
                      Sessioni Esaurite
                    </h3>
                    <p className="text-sm md:text-base text-dark-600 mb-6 md:mb-8 px-4">
                      Contatta l'amministratore per acquistare un nuovo pacchetto premium
                    </p>
                    <Button variant="gold" size="lg">
                      <HugemassLogo variant="icon" size="sm" className="mr-2" />
                      Contatta Admin
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Lista Prenotazioni - Shows first on mobile */}
            <div className="order-1 lg:order-2">
              <Card className="lg:sticky lg:top-24" variant="darker" as="section" aria-labelledby="bookings-title">
                <CardHeader>
                  <CardTitle id="bookings-title" className="flex items-center text-base md:text-lg">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 mr-2 text-[#E8DCA0]" />
                    Prossime Sessioni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BookingsList key={refreshKey} onCancel={handleBookingSuccess} />
                </CardContent>
              </Card>
            </div>
          </div>
            </>
          )}

          {activeTab === 'measurements' && (
            <div className="animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg md:text-2xl heading-font gold-text-gradient">
                    <Ruler className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-[#E8DCA0]" />
                    Le Tue Misurazioni
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Visualizza lo storico delle tue misurazioni antropometriche
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ClientMeasurementsView />
                </CardContent>
              </Card>
            </div>
          )}
        </main>

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
        {showProfileModal && <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          session={session}
        />}

        {/* Settings Modal */}
        {showSettingsModal && <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />}
      </div>
    </ErrorBoundary>
  )
}
