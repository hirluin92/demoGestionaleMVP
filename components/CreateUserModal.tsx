'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'

interface CreateUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '+39',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validazione telefono: deve essere diverso da "+39" solo
    if (!formData.phone || formData.phone.trim() === '' || formData.phone.trim() === '+39') {
      setError('Il telefono è obbligatorio e deve essere completo')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          400: data.details 
            ? `Dati non validi: ${data.details.map((d: any) => d.message).join(', ')}`
            : data.error || 'Verifica i dati inseriti',
          409: 'Un cliente con questa email esiste già',
          500: 'Errore del server. Riprova tra qualche minuto.',
        }
        setError(errorMessages[response.status] || data.error || 'Errore nella creazione del cliente')
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
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
            Nuovo Cliente
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

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Nome Completo
            </label>
            <input
              type="text"
              id="name"
              required
              className="input-field w-full"
              placeholder="Mario Rossi"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
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
              type="email"
              id="email"
              required
              className="input-field w-full"
              placeholder="mario.rossi@email.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              required
              minLength={6}
              className="input-field w-full"
              placeholder="Minimo 6 caratteri"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
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
              type="tel"
              id="phone"
              required
              className="input-field w-full"
              placeholder="+39 123 456 7890"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
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
              {loading ? 'Creazione...' : 'Crea Cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
