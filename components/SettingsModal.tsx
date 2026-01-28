'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Lock, Shield, Bell, Palette } from 'lucide-react'
import Button from '@/components/ui/Button'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [settings, setSettings] = useState({
    emailNotifications: true,
    bookingReminders: true,
    measurementUpdates: true,
    loginAlerts: true,
    sessionTimeout: 30,
  })
  const [loading, setLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setError(null)
      setSuccess(false)
      setSettingsError(null)
      setSettingsSuccess(false)
      fetchSettings()
    }
  }, [isOpen])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/profile/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          emailNotifications: data.emailNotifications ?? true,
          bookingReminders: data.bookingReminders ?? true,
          measurementUpdates: data.measurementUpdates ?? true,
          loginAlerts: data.loginAlerts ?? true,
          sessionTimeout: data.sessionTimeout ?? 30,
        })
      }
    } catch (error) {
      console.error('Errore recupero impostazioni:', error)
    }
  }

  const handleSettingsChange = async () => {
    setSettingsError(null)
    setSettingsSuccess(false)
    setSettingsLoading(true)

    try {
      const response = await fetch('/api/profile/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          400: data.details
            ? `Dati non validi: ${data.details.map((d: any) => d.message).join(', ')}`
            : data.error || 'Verifica i dati inseriti',
          401: 'Non autorizzato',
          404: 'Utente non trovato',
          500: 'Errore del server. Riprova tra qualche minuto.',
        }
        setSettingsError(errorMessages[response.status] || data.error || 'Errore durante il salvataggio')
        return
      }

      setSettingsSuccess(true)
      setTimeout(() => setSettingsSuccess(false), 3000)
    } catch (error) {
      console.error('Errore aggiornamento impostazioni:', error)
      setSettingsError('Impossibile connettersi al server. Verifica la connessione.')
    } finally {
      setSettingsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validazione
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Le password non corrispondono')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError('La password deve essere di almeno 8 caratteri')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          400: data.details
            ? `Dati non validi: ${data.details.map((d: any) => d.message).join(', ')}`
            : data.error || 'Verifica i dati inseriti',
          401: 'Non autorizzato',
          404: 'Utente non trovato',
          500: 'Errore del server. Riprova tra qualche minuto.',
        }
        setError(errorMessages[response.status] || data.error || 'Errore durante il cambio password')
        return
      }

      setSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      
      // Chiudi il modale dopo 2 secondi
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Errore cambio password:', error)
      setError('Impossibile connettersi al server. Verifica la connessione.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90vw' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gold-text-gradient heading-font">
            Impostazioni
          </h2>
          <button
            onClick={onClose}
            className="text-4xl text-gray-400 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Cambio Password */}
          <div className="p-4 bg-dark-100/50 rounded-lg border border-dark-200/30">
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="w-5 h-5 text-[#E8DCA0]" />
              <h3 className="text-lg font-semibold text-white heading-font">Cambio Password</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                  Password cambiata con successo!
                </div>
              )}

              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                >
                  Password Corrente
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  className="input-field w-full"
                  placeholder="••••••••"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                >
                  Nuova Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className="input-field w-full"
                  placeholder="••••••••"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="mt-2 text-sm text-dark-600">
                  Minimo 8 caratteri, deve contenere maiuscole, minuscole e numeri
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-light mb-2 heading-font"
                  style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
                >
                  Conferma Nuova Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input-field w-full"
                  placeholder="••••••••"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                variant="gold"
                className="w-full"
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Cambiando...' : 'Cambia Password'}
              </Button>
            </form>
          </div>

          {/* Notifiche */}
          <div className="p-4 bg-dark-100/50 rounded-lg border border-dark-200/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-[#E8DCA0]" />
                <h3 className="text-lg font-semibold text-white heading-font">Notifiche</h3>
              </div>
              {settingsSuccess && (
                <span className="text-xs text-green-400">Salvato!</span>
              )}
            </div>

            {settingsError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm mb-4">
                {settingsError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white font-sans">Notifiche Email</label>
                  <p className="text-xs text-dark-600 font-sans mt-1">Ricevi notifiche via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => {
                      setSettings({ ...settings, emailNotifications: e.target.checked })
                      handleSettingsChange()
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-400"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white font-sans">Promemoria Prenotazioni</label>
                  <p className="text-xs text-dark-600 font-sans mt-1">Ricevi promemoria per le tue prenotazioni</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.bookingReminders}
                    onChange={(e) => {
                      setSettings({ ...settings, bookingReminders: e.target.checked })
                      handleSettingsChange()
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-400"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white font-sans">Aggiornamenti Misurazioni</label>
                  <p className="text-xs text-dark-600 font-sans mt-1">Ricevi notifiche quando vengono aggiunte nuove misurazioni</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.measurementUpdates}
                    onChange={(e) => {
                      setSettings({ ...settings, measurementUpdates: e.target.checked })
                      handleSettingsChange()
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-400"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Sicurezza */}
          <div className="p-4 bg-dark-100/50 rounded-lg border border-dark-200/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-[#E8DCA0]" />
                <h3 className="text-lg font-semibold text-white heading-font">Sicurezza</h3>
              </div>
              {settingsSuccess && (
                <span className="text-xs text-green-400">Salvato!</span>
              )}
            </div>

            {settingsError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm mb-4">
                {settingsError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white font-sans">Avvisi di Accesso</label>
                  <p className="text-xs text-dark-600 font-sans mt-1">Ricevi avvisi per accessi sospetti</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.loginAlerts}
                    onChange={(e) => {
                      setSettings({ ...settings, loginAlerts: e.target.checked })
                      handleSettingsChange()
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-400"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white font-sans mb-2">
                  Timeout Sessione (giorni)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.sessionTimeout}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 30
                      setSettings({ ...settings, sessionTimeout: Math.min(Math.max(value, 1), 365) })
                    }}
                    onBlur={handleSettingsChange}
                    className="input-field w-24"
                  />
                  <span className="text-sm text-dark-600 font-sans">
                    La sessione scadrà dopo {settings.sessionTimeout} {settings.sessionTimeout === 1 ? 'giorno' : 'giorni'} di inattività
                  </span>
                </div>
                <p className="text-xs text-dark-600 font-sans mt-2">
                  Imposta dopo quanti giorni di inattività la sessione deve scadere (1-365 giorni)
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full"
            >
              Chiudi
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
