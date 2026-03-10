'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { formatCurrency } from '@/lib/utils'

// Commenti in italiano: gestione servizi (CRUD completo)

interface Service {
  id: string
  name: string
  duration: number
  price: number
  color: string
  isActive: boolean
  sortOrder: number
}

export default function TenantServicesPage() {
  const params = useParams<{ tenant: string }>()
  const tenantSlug = params?.tenant

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    duration: 30,
    price: 0,
    color: '#8B5CF6',
    isActive: true,
    sortOrder: 0,
  })
  const [saving, setSaving] = useState(false)

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; service: Service | null }>({
    isOpen: false,
    service: null,
  })

  useEffect(() => {
    void loadServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug])

  const loadServices = async () => {
    if (!tenantSlug) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/${tenantSlug}/services`)
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: Service[]; error?: string }
        | null

      if (!res.ok || !json?.success || !json.data) {
        setError(json?.error ?? 'Impossibile caricare i servizi.')
        return
      }

      setServices(json.data)
    } catch {
      setError('Errore di rete durante il caricamento dei servizi.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        duration: service.duration,
        price: service.price,
        color: service.color,
        isActive: service.isActive,
        sortOrder: service.sortOrder,
      })
    } else {
      setEditingService(null)
      setFormData({
        name: '',
        duration: 30,
        price: 0,
        color: '#8B5CF6',
        isActive: true,
        sortOrder: 0,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingService(null)
    setFormData({
      name: '',
      duration: 30,
      price: 0,
      color: '#8B5CF6',
      isActive: true,
      sortOrder: 0,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantSlug) return
    setSaving(true)
    setError(null)

    try {
      const url = editingService
        ? `/api/${tenantSlug}/services/${editingService.id}`
        : `/api/${tenantSlug}/services`
      const method = editingService ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore salvataggio servizio')
      }

      handleCloseModal()
      void loadServices()
    } catch (err) {
      console.error(err)
      setError('Impossibile salvare il servizio.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!tenantSlug || !deleteModal.service) return

    try {
      const res = await fetch(
        `/api/${tenantSlug}/services/${deleteModal.service.id}`,
        { method: 'DELETE' }
      )

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore eliminazione servizio')
      }

      setDeleteModal({ isOpen: false, service: null })
      void loadServices()
    } catch (err) {
      console.error(err)
      setError('Impossibile eliminare il servizio.')
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Servizi</h1>
        <Button onClick={() => handleOpenModal()} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo servizio
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-dark-400">Caricamento...</p>
      ) : services.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-dark-400 mb-4">Nessun servizio configurato.</p>
          <Button onClick={() => handleOpenModal()} size="sm">
            Crea il primo servizio
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                </div>
                {!service.isActive && (
                  <span className="text-xs text-dark-500 bg-dark-100/40 px-2 py-1 rounded">
                    Inattivo
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-dark-400 mb-4">
                <div>Durata: {formatDuration(service.duration)}</div>
                <div>Prezzo: {formatCurrency(service.price)}</div>
                <div>Ordine: {service.sortOrder}</div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenModal(service)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setDeleteModal({ isOpen: true, service })
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal creazione/modifica */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content glass-card rounded-xl p-8"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', width: '90vw' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gold-text-gradient">
                {editingService ? 'Modifica servizio' : 'Nuovo servizio'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-4xl text-gray-400 hover:text-white transition"
                aria-label="Chiudi"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome servizio"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Es. Taglio Uomo"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Durata (minuti)"
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value) || 30,
                    })
                  }
                  required
                />

                <Input
                  label="Prezzo (centesimi)"
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                  helperText={`${formatCurrency(formData.price)}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">
                    Colore
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-16 h-10 rounded-lg border border-dark-200 cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      placeholder="#8B5CF6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <Input
                  label="Ordine di visualizzazione"
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-dark-200 bg-dark-100/40"
                />
                <label htmlFor="isActive" className="text-sm text-dark-400">
                  Servizio attivo
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                >
                  Annulla
                </Button>
                <Button type="submit" loading={saving}>
                  {editingService ? 'Salva modifiche' : 'Crea servizio'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal conferma eliminazione */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, service: null })}
        onConfirm={handleDelete}
        title="Elimina servizio"
        message={`Sei sicuro di voler eliminare "${deleteModal.service?.name}"? Il servizio verrà disattivato.`}
      />
    </section>
  )
}
