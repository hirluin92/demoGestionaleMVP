'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning'
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Elimina',
  cancelText = 'Annulla',
  variant = 'danger',
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || !isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-card rounded-xl p-8"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', width: '90vw' }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              variant === 'danger' 
                ? 'bg-red-500/20 border border-red-500/50' 
                : 'bg-yellow-500/20 border border-yellow-500/50'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                variant === 'danger' ? 'text-red-400' : 'text-yellow-400'
              }`} />
            </div>
            <h2 className="text-2xl font-bold gold-text-gradient heading-font">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-4xl text-gray-400 hover:text-white transition"
            aria-label="Chiudi"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-6">
          <p className="text-white text-base leading-relaxed font-sans">
            {message}
          </p>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline-gold"
              onClick={onClose}
              className="min-w-[120px]"
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'gold'}
              onClick={handleConfirm}
              className="min-w-[120px]"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
