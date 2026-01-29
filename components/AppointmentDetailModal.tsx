'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, User, Mail, Phone, Package, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import EditAppointmentModal from '@/components/EditAppointmentModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

interface AppointmentData {
  id: string
  client_name: string
  client_email: string
  phone: string | null
  date: string // YYYY-MM-DD
  time: string // HH:MM
  service: string
  status: string
  notes?: string
  userId?: string
  packageId?: string
}

interface AppointmentDetailModalProps {
  appointment: AppointmentData | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void // Callback quando l'appuntamento viene modificato o cancellato
}

export default function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
  onUpdate,
}: AppointmentDetailModalProps) {
  const [mounted, setMounted] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleDelete = async () => {
    if (!appointment) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/bookings/${appointment.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nella cancellazione')
      }

      // Chiudi prima il modal di conferma
      setShowDeleteModal(false)
      
      // Poi chiudi il modal principale
      onClose()
      
      // Infine aggiorna il calendario (con un piccolo delay per assicurarsi che i modals si chiudano)
      setTimeout(() => {
        if (onUpdate) {
          onUpdate()
        }
      }, 100)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nella cancellazione')
      setIsDeleting(false)
    } finally {
      // Reset dello stato di cancellazione dopo un breve delay
      setTimeout(() => {
        setIsDeleting(false)
      }, 200)
    }
  }

  const handleEditSuccess = () => {
    if (onUpdate) {
      onUpdate()
    }
    setShowEditModal(false)
    onClose()
  }

  if (!isOpen || !appointment || !mounted) return null

  const date = parseISO(appointment.date)
  const formattedDate = format(date, 'dd/MM/yyyy', { locale: it })
  const formattedTime = appointment.time

  const getStatusVariant = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === 'confirmed') return 'success'
    if (statusLower === 'pending') return 'warning'
    return 'info'
  }

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90vw' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold gold-text-gradient heading-font">
            Dettagli Appuntamento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Chiudi"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Data e Ora */}
          <div className="flex items-start space-x-3 p-4 bg-dark-100/30 rounded-lg">
            <Calendar className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-dark-600 font-semibold mb-1">Data e Ora</div>
              <div className="text-white font-semibold">
                {formattedDate} alle {formattedTime}
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="flex items-start space-x-3 p-4 bg-dark-100/30 rounded-lg">
            <User className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-dark-600 font-semibold mb-1">Cliente</div>
              <div className="text-white font-semibold">{appointment.client_name}</div>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start space-x-3 p-4 bg-dark-100/30 rounded-lg">
            <Mail className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-dark-600 font-semibold mb-1">Email</div>
              <div className="text-white break-words">{appointment.client_email}</div>
            </div>
          </div>

          {/* Telefono */}
          {appointment.phone && (
            <div className="flex items-start space-x-3 p-4 bg-dark-100/30 rounded-lg">
              <Phone className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-dark-600 font-semibold mb-1">Telefono</div>
                <div className="text-white">{appointment.phone}</div>
              </div>
            </div>
          )}

          {/* Servizio */}
          <div className="flex items-start space-x-3 p-4 bg-dark-100/30 rounded-lg">
            <Package className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-dark-600 font-semibold mb-1">Servizio</div>
              <div className="text-white font-semibold">{appointment.service}</div>
            </div>
          </div>

          {/* Durata */}
          {appointment.notes && (
            <div className="flex items-start space-x-3 p-4 bg-dark-100/30 rounded-lg">
              <Clock className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-dark-600 font-semibold mb-1">Durata</div>
                <div className="text-white">{appointment.notes}</div>
              </div>
            </div>
          )}

          {/* Stato */}
          <div className="flex items-start space-x-3 p-4 bg-dark-100/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-dark-600 font-semibold mb-2">Stato</div>
              <Badge variant={getStatusVariant(appointment.status)} size="md">
                {appointment.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-dark-200/30 flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline-gold"
            onClick={() => setShowEditModal(true)}
            className="flex items-center justify-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Modifica
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Disdici
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {createPortal(modalContent, document.body)}
      {showEditModal && (
        <EditAppointmentModal
          appointment={appointment}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}
      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Disdici Appuntamento"
          message={`Sei sicuro di voler disdire l'appuntamento di ${appointment.client_name} per il ${format(parseISO(appointment.date), 'dd/MM/yyyy', { locale: it })} alle ${appointment.time}?`}
          confirmText="Sì, disdici"
          cancelText="Annulla"
          variant="danger"
          isLoading={isDeleting}
        />
      )}
    </>
  )
}
