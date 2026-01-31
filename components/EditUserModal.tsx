'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'

interface UserData {
  id: string
  name: string
  email: string
  phone: string | null
  collaborationStartDate: string | null
}

interface EditUserModalProps {
  user: UserData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditUserModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  const [formData, setFormData] = useState<Partial<UserData>>({
    name: '',
    email: '',
    phone: '',
    collaborationStartDate: null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        collaborationStartDate: user.collaborationStartDate
          ? new Date(user.collaborationStartDate).toISOString().split('T')[0]
          : null,
      })
      setError(null)
    }
  }, [user, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          collaborationStartDate: formData.collaborationStartDate || null,
        }),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore durante il salvataggio')
      }
    } catch (error) {
      console.error('Errore aggiornamento utente:', error)
      setError('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof UserData, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  if (!isOpen || !user || !mounted) return null

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90vw' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gold-text-gradient heading-font">
            Modifica Cliente
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
              className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
            >
              Nome Completo
            </label>
            <input
              type="text"
              id="name"
              required
              className="input-field w-full"
              placeholder="Mario Rossi"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-light mb-2 heading-font"
              className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              required
              className="input-field w-full"
              placeholder="mario.rossi@email.com"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-light mb-2 heading-font"
              className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
            >
              Telefono
            </label>
            <input
              type="tel"
              id="phone"
              className="input-field w-full"
              placeholder="+39 123 456 7890"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value || null)}
            />
          </div>

          <div>
            <label
              htmlFor="collaborationStartDate"
              className="block text-sm font-light mb-2 heading-font"
              className="text-gold-400"
              style={{ letterSpacing: '0.5px' }}
            >
              Data Inizio Collaborazione
            </label>
            <input
              type="date"
              id="collaborationStartDate"
              className="input-field w-full"
              value={formData.collaborationStartDate || ''}
              onChange={(e) => handleInputChange('collaborationStartDate', e.target.value || null)}
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
              disabled={saving}
              loading={saving}
            >
              {saving ? 'Salvando...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
