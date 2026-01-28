'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, User as UserIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSession } from 'next-auth/react'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  session: any
}

export default function ProfileModal({ isOpen, onClose, session }: ProfileModalProps) {
  const { update } = useSession()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen && session) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '', // Phone non è nella sessione, lo recuperiamo dall'API
      })
      setError(null)
      setSuccess(false)
      fetchProfile()
    }
  }, [isOpen, session])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
        })
      }
    } catch (error) {
      console.error('Errore recupero profilo:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
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
        setError(errorMessages[response.status] || data.error || 'Errore durante il salvataggio')
        return
      }

      setSuccess(true)
      // Aggiorna la sessione per riflettere le modifiche
      await update()
      
      // Chiudi il modale dopo 1 secondo
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Errore aggiornamento profilo:', error)
      setError('Impossibile connettersi al server. Verifica la connessione.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
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
            Profilo Utente
          </h2>
          <button
            onClick={onClose}
            className="text-4xl text-gray-400 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
              Profilo aggiornato con successo!
            </div>
          )}

          <div className="flex items-center space-x-4 pb-4 border-b border-dark-200/30">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-gold">
              <UserIcon className="w-10 h-10 text-dark-950" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white heading-font">{session?.user.name}</h3>
              <p className="text-sm text-dark-600 font-sans">{session?.user.email}</p>
              <Badge variant="gold" size="sm" className="mt-2">
                {session?.user.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-light mb-2 heading-font"
                style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
              >
                Nome Completo
              </label>
              <input
                id="name"
                type="text"
                className="input-field w-full"
                placeholder="Mario Rossi"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-light mb-2 heading-font"
                style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field w-full"
                placeholder="mario.rossi@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-light mb-2 heading-font"
                style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
              >
                Telefono
              </label>
              <input
                id="phone"
                type="tel"
                className="input-field w-full"
                placeholder="+39 123 456 7890"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
              <p className="mt-2 text-sm text-dark-600">Formato: +39XXXXXXXXXX</p>
            </div>
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
              {loading ? 'Salvando...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
