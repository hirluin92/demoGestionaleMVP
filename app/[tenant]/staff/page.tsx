'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

// Commenti in italiano: gestione staff (CRUD completo con associazione servizi)

interface Service {
  id: string
  name: string
  duration: number
  price: number
  color: string
}

interface Staff {
  id: string
  name: string
  color: string
  isActive: boolean
  workingHours: Record<string, unknown>
  serviceLinks: Array<{
    service: Service
  }>
}

export default function TenantStaffPage() {
  const params = useParams<{ tenant: string }>()
  const tenantSlug = params?.tenant

  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    isActive: true,
    serviceIds: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; staff: Staff | null }>({
    isOpen: false,
    staff: null,
  })

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug])

  const loadData = async () => {
    if (!tenantSlug) return
    setLoading(true)
    setError(null)

    try {
      const [staffRes, servicesRes] = await Promise.all([
        fetch(`/api/${tenantSlug}/staff`),
        fetch(`/api/${tenantSlug}/services?activeOnly=true`),
      ])

      const staffJson = (await staffRes.json().catch(() => null)) as
        | { success?: boolean; data?: Staff[]; error?: string }
        | null

      const servicesJson = (await servicesRes.json().catch(() => null)) as
        | { success?: boolean; data?: Service[]; error?: string }
        | null

      if (!staffRes.ok || !staffJson?.success || !staffJson.data) {
        setError(staffJson?.error ?? 'Impossibile caricare gli operatori.')
        return
      }

      if (servicesRes.ok && servicesJson?.success && servicesJson.data) {
        setServices(servicesJson.data)
      }

      setStaff(staffJson.data)
    } catch {
      setError('Errore di rete durante il caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (staffMember?: Staff) => {
    if (staffMember) {
      setEditingStaff(staffMember)
      setFormData({
        name: staffMember.name,
        color: staffMember.color,
        isActive: staffMember.isActive,
        serviceIds: staffMember.serviceLinks.map((link) => link.service.id),
      })
    } else {
      setEditingStaff(null)
      setFormData({
        name: '',
        color: '#3B82F6',
        isActive: true,
        serviceIds: [],
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingStaff(null)
    setFormData({
      name: '',
      color: '#3B82F6',
      isActive: true,
      serviceIds: [],
    })
  }

  const handleToggleService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantSlug) return
    setSaving(true)
    setError(null)

    try {
      const url = editingStaff
        ? `/api/${tenantSlug}/staff/${editingStaff.id}`
        : `/api/${tenantSlug}/staff`
      const method = editingStaff ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore salvataggio operatore')
      }

      handleCloseModal()
      void loadData()
    } catch (err) {
      console.error(err)
      setError('Impossibile salvare l\'operatore.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!tenantSlug || !deleteModal.staff) return

    try {
      const res = await fetch(
        `/api/${tenantSlug}/staff/${deleteModal.staff.id}`,
        { method: 'DELETE' }
      )

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore eliminazione operatore')
      }

      setDeleteModal({ isOpen: false, staff: null })
      void loadData()
    } catch (err) {
      console.error(err)
      setError('Impossibile eliminare l\'operatore.')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <Button onClick={() => handleOpenModal()} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo operatore
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-dark-400">Caricamento...</p>
      ) : staff.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-dark-400 mb-4">Nessun operatore configurato.</p>
          <Button onClick={() => handleOpenModal()} size="sm">
            Aggiungi il primo operatore
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((staffMember) => (
            <Card key={staffMember.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: staffMember.color }}
                  />
                  <h3 className="font-semibold text-lg">{staffMember.name}</h3>
                </div>
                {!staffMember.isActive && (
                  <span className="text-xs text-dark-500 bg-dark-100/40 px-2 py-1 rounded">
                    Inattivo
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-dark-400 mb-4">
                <div>
                  Servizi: {staffMember.serviceLinks.length > 0
                    ? staffMember.serviceLinks.map((link) => link.service.name).join(', ')
                    : 'Nessuno'}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenModal(staffMember)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setDeleteModal({ isOpen: true, staff: staffMember })
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
                {editingStaff ? 'Modifica operatore' : 'Nuovo operatore'}
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
                label="Nome operatore"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Es. Mario Rossi"
              />

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
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">
                  Servizi associati
                </label>
                {services.length === 0 ? (
                  <p className="text-sm text-dark-500">
                    Nessun servizio disponibile. Crea prima dei servizi.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-dark-100/20 rounded-lg">
                    {services.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center gap-2 p-2 hover:bg-dark-100/30 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.serviceIds.includes(service.id)}
                          onChange={() => handleToggleService(service.id)}
                          className="w-4 h-4 rounded border-dark-200 bg-dark-100/40"
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: service.color }}
                        />
                        <span className="text-sm text-dark-300">
                          {service.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
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
                  Operatore attivo
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
                  {editingStaff ? 'Salva modifiche' : 'Crea operatore'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal conferma eliminazione */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, staff: null })}
        onConfirm={handleDelete}
        title="Elimina operatore"
        message={`Sei sicuro di voler eliminare "${deleteModal.staff?.name}"? L'operatore verrà disattivato.`}
      />
    </section>
  )
}
