'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Dumbbell, Plus, Eye, Edit3, Copy, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import WorkoutPlanModal, { type WorkoutPlan } from '@/components/WorkoutPlanModal'
import WorkoutPlanViewModal from '@/components/WorkoutPlanViewModal'

export default function AdminWorkoutPlansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams<{ userId: string }>()
  const userId = params.userId

  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ id: string; name: string; email: string } | null>(null)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null)
  const [viewPlan, setViewPlan] = useState<WorkoutPlan | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<WorkoutPlan | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'ADMIN') {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, userId])

  const fetchData = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [userRes, plansRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch(`/api/admin/workout-plans?userId=${userId}`),
      ])

      if (userRes.ok) {
        const users = await userRes.json()
        const found = users.find((u: any) => u.id === userId)
        if (found) {
          setUserInfo({ id: found.id, name: found.name, email: found.email })
        }
      }

      if (plansRes.ok) {
        const data = await plansRes.json()
        setPlans(data || [])
      } else {
        setPlans([])
      }
    } catch (error) {
      console.error('Errore caricamento schede:', error)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedPlan(null)
    setIsModalOpen(true)
  }

  const handleEdit = (plan: WorkoutPlan) => {
    setSelectedPlan(plan)
    setIsModalOpen(true)
  }

  const handleDuplicate = (plan: WorkoutPlan) => {
    // Apri modal in modalità creazione ma con dati precompilati
    const duplicated: WorkoutPlan = {
      ...plan,
      id: '',
      name: `${plan.name} (Copia)`,
    }
    setSelectedPlan(duplicated)
    setIsModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/workout-plans/${planToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Errore durante l\'eliminazione della scheda')
        return
      }
      setPlanToDelete(null)
      fetchData()
    } catch (error) {
      console.error('Errore eliminazione scheda:', error)
      alert('Errore durante l\'eliminazione della scheda')
    } finally {
      setDeleting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-gold w-12 h-12 mx-auto mb-4"></div>
          <p className="mt-4 text-dark-600">Caricamento schede di allenamento...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <button
        type="button"
        onClick={() => router.push('/admin')}
        className="inline-flex items-center text-xs md:text-sm text-dark-500 hover:text-white mb-4 md:mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Torna alla lista clienti
      </button>

      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl heading-font font-bold gold-text-gradient mb-1">
          Schede di Allenamento
        </h1>
        {userInfo && (
          <p className="text-xs md:text-sm text-dark-600">
            Cliente: <span className="font-semibold text-white">{userInfo.name}</span>{' '}
            <span className="text-dark-500">({userInfo.email})</span>
          </p>
        )}
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center text-sm md:text-lg heading-font gold-text-gradient">
                <Dumbbell className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 text-[#D3AF37]" />
                Schede di Allenamento
              </CardTitle>
              <CardDescription className="text-[10px] md:text-xs">
                Crea, modifica e gestisci le schede di allenamento del cliente
              </CardDescription>
            </div>
            <Button
              variant="gold"
              size="sm"
              onClick={handleCreate}
              className="w-full sm:w-auto text-xs md:text-sm px-3 py-1.5 h-auto"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nuova Scheda
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {plans.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell className="w-10 h-10 text-[#D3AF37] mx-auto mb-3" />
              <p className="text-sm md:text-base text-white font-semibold">
                Nessuna scheda di allenamento presente
              </p>
              <p className="text-xs md:text-sm text-dark-500 mt-1">
                Crea la prima scheda personalizzata per questo cliente
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="glass-card border border-dark-200/30 rounded-lg p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:border-gold-400/50 transition-all duration-300"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm md:text-base font-semibold text-white">
                        {plan.name}
                      </h3>
                      <Badge
                        variant={plan.isActive ? 'success' : 'warning'}
                        className="text-[10px] md:text-xs"
                      >
                        {plan.isActive ? 'Attiva' : 'Inattiva'}
                      </Badge>
                    </div>
                    <p className="text-[11px] md:text-xs text-dark-500 line-clamp-2">
                      {plan.description || 'Nessuna descrizione'}
                    </p>
                    <p className="text-[10px] text-dark-600 mt-1">
                      {plan.days.length} giorni •{' '}
                      {plan.days.reduce(
                        (sum, day) => sum + (day.exercises ? day.exercises.length : 0),
                        0
                      )}{' '}
                      esercizi • creata il{' '}
                      {new Date(plan.createdAt).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewPlan(plan)
                        setIsViewModalOpen(true)
                      }}
                      className="text-[10px] md:text-xs px-2 py-1 h-auto"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Visualizza
                    </Button>
                    <Button
                      variant="outline-gold"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                      className="text-[10px] md:text-xs px-2 py-1 h-auto"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Modifica
                    </Button>
                    <Button
                      variant="outline-gold"
                      size="sm"
                      onClick={() => handleDuplicate(plan)}
                      className="text-[10px] md:text-xs px-2 py-1 h-auto"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Duplica
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlanToDelete(plan)}
                      className="text-[10px] md:text-xs px-2 py-1 h-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Elimina
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modale creazione/modifica scheda */}
      {isModalOpen && userInfo && (
        <WorkoutPlanModal
          userId={userInfo.id}
          userName={userInfo.name}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
          editPlan={selectedPlan && selectedPlan.id ? selectedPlan : null}
        />
      )}

      {/* Modale visualizzazione scheda */}
      {isViewModalOpen && viewPlan && (
        <WorkoutPlanViewModal
          isOpen={isViewModalOpen}
          plan={viewPlan}
          onClose={() => setIsViewModalOpen(false)}
          onEdit={() => handleEdit(viewPlan)}
        />
      )}

      {/* Modale conferma eliminazione */}
      {planToDelete && (
        <DeleteConfirmModal
          isOpen={!!planToDelete}
          onClose={() => setPlanToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Elimina Scheda"
          message={`Sei sicuro di voler eliminare la scheda "${planToDelete.name}"? Questa azione non può essere annullata.`}
          confirmText="Elimina"
          cancelText="Annulla"
          variant="danger"
          isLoading={deleting}
        />
      )}
    </div>
  )
}

