'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'

interface User {
  id: string
  name: string
  email: string
}

interface CreatePackageModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreatePackageModal({ onClose, onSuccess }: CreatePackageModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    totalSessions: 10,
    durationMinutes: 60,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          totalSessions: Number(formData.totalSessions),
          durationMinutes: Number(formData.durationMinutes),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          400: data.details 
            ? `Dati non validi: ${data.details.map((d: any) => d.message).join(', ')}`
            : data.error || 'Verifica i dati inseriti',
          404: 'Cliente non trovato',
          500: 'Errore del server. Riprova tra qualche minuto.',
        }
        setError(errorMessages[response.status] || data.error || 'Errore nella creazione del pacchetto')
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

  const handleInputChange = (field: string, value: string | number) => {
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
            Nuovo Pacchetto
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
              htmlFor="userId"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Cliente
            </label>
            <div className="relative">
              <select
                id="userId"
                value={formData.userId}
                onChange={(e) => handleInputChange('userId', e.target.value)}
                required
                className="input-field w-full appearance-none pr-10"
              >
                <option value="">-- Seleziona un cliente --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Nome Pacchetto
            </label>
            <input
              type="text"
              id="name"
              required
              className="input-field w-full"
              placeholder="Es: Pacchetto Base 10 Sessioni"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="totalSessions"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Numero Sessioni
            </label>
            <input
              type="number"
              id="totalSessions"
              required
              min="1"
              className="input-field w-full"
              value={formData.totalSessions}
              onChange={(e) => handleInputChange('totalSessions', parseInt(e.target.value) || 0)}
            />
          </div>

          <div>
            <label
              htmlFor="durationMinutes"
              className="block text-sm font-light mb-2 heading-font"
              style={{ letterSpacing: '0.5px', color: '#E8DCA0' }}
            >
              Durata Sessione (minuti)
            </label>
            <input
              type="number"
              id="durationMinutes"
              required
              min="15"
              step="15"
              className="input-field w-full"
              placeholder="60"
              value={formData.durationMinutes}
              onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value) || 60)}
            />
            <p className="mt-2 text-xs text-dark-600">
              Durata di ogni sessione in minuti (es: 60 = 1 ora, 90 = 1.5 ore, 120 = 2 ore)
            </p>
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
              {loading ? 'Creazione...' : 'Crea Pacchetto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
