'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import Input from '@/components/ui/Input'

// Commenti in italiano:
// Wizard onboarding in 3 step:
// 1) Servizi (crea Service per il tenant)
// 2) Staff (crea Staff e StaffService)
// 3) Orari apertura (salvati in Tenant.settings.businessHours via API settings)

type Step = 1 | 2 | 3

interface ServiceDraft {
  id?: string
  name: string
  duration: number
  price: number
  color: string
  isActive: boolean
}

interface StaffDraft {
  id?: string
  name: string
  color: string
  isActive: boolean
  serviceIds: string[]
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

interface DayHours {
  start: string
  end: string
  break?: {
    start: string
    end: string
  }
}

type BusinessHoursState = Partial<Record<DayKey, DayHours | null>>

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lunedì',
  tue: 'Martedì',
  wed: 'Mercoledì',
  thu: 'Giovedì',
  fri: 'Venerdì',
  sat: 'Sabato',
  sun: 'Domenica',
}

const SERVICE_TEMPLATES: Record<string, Array<{ name: string; duration: number; price: number }>> = {
  parrucchiere: [
    { name: 'Taglio Uomo', duration: 30, price: 2000 },
    { name: 'Taglio Donna', duration: 45, price: 3500 },
    { name: 'Piega', duration: 30, price: 2500 },
    { name: 'Colore', duration: 90, price: 6000 },
    { name: 'Meches / Balayage', duration: 120, price: 8000 },
    { name: 'Trattamento Ristrutturante', duration: 45, price: 3000 },
  ],
  estetista: [
    { name: 'Pulizia Viso', duration: 60, price: 5000 },
    { name: 'Ceretta Gambe', duration: 30, price: 2500 },
    { name: 'Ceretta Inguine', duration: 20, price: 1500 },
    { name: 'Manicure', duration: 45, price: 2500 },
    { name: 'Pedicure', duration: 60, price: 3500 },
    { name: 'Massaggio Rilassante 60min', duration: 60, price: 5500 },
  ],
  fisioterapista: [
    { name: 'Prima Visita + Valutazione', duration: 60, price: 7000 },
    { name: 'Seduta Fisioterapia', duration: 45, price: 5000 },
    { name: 'Terapia Manuale', duration: 50, price: 6000 },
    { name: 'Riabilitazione Post-Operatoria', duration: 60, price: 6500 },
  ],
}

export default function OnboardingPage() {
  const params = useParams<{ tenant: string }>()
  const router = useRouter()
  const tenantSlug = params?.tenant

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const [category, setCategory] = useState<string>('parrucchiere')
  const [services, setServices] = useState<ServiceDraft[]>([])
  const [staff, setStaff] = useState<StaffDraft[]>([])
  const [businessHours, setBusinessHours] = useState<BusinessHoursState>({})

  const loadTenantData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Tenant base (per categoria)
      const tenantRes = await fetch(`/api/${tenantSlug}/settings`, {
        method: 'GET',
      })
      const tenantJson = (await tenantRes.json().catch(() => null)) as
        | { success?: boolean; data?: { businessHours?: BusinessHoursState; category?: string }; error?: string }
        | null

      if (!tenantRes.ok || !tenantJson?.success) {
        // Non è bloccante: continuiamo con default
        console.warn('Impossibile caricare impostazioni tenant', tenantJson?.error)
      } else if (tenantJson.data?.businessHours) {
        setBusinessHours(tenantJson.data.businessHours)
      }

      // 2. Servizi esistenti
      const servicesRes = await fetch(`/api/${tenantSlug}/services`)
      const servicesJson = (await servicesRes.json().catch(() => null)) as
        | {
            success?: boolean
            data?: Array<{
              id: string
              name: string
              duration: number
              price: number
              color: string
              isActive: boolean
            }>
            error?: string
          }
        | null

      if (servicesRes.ok && servicesJson?.success && servicesJson.data) {
        setServices(
          servicesJson.data.map(s => ({
            id: s.id,
            name: s.name,
            duration: s.duration,
            price: s.price,
            color: s.color,
            isActive: s.isActive,
          })),
        )
      }

      // 3. Staff esistente
      const staffRes = await fetch(`/api/${tenantSlug}/staff`)
      const staffJson = (await staffRes.json().catch(() => null)) as
        | {
            success?: boolean
            data?: Array<{
              id: string
              name: string
              color: string
              isActive: boolean
              serviceLinks?: Array<{ serviceId: string }>
            }>
            error?: string
          }
        | null

      if (staffRes.ok && staffJson?.success && staffJson.data) {
        setStaff(
          staffJson.data.map(s => ({
            id: s.id,
            name: s.name,
            color: s.color,
            isActive: s.isActive,
            serviceIds: (s.serviceLinks ?? []).map(sl => sl.serviceId),
          })),
        )
      }
    } catch (err) {
      console.error('Errore caricamento onboarding:', err)
      setError('Errore durante il caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  // Carica info tenant (categoria) e impostazioni esistenti
  useEffect(() => {
    if (!tenantSlug) return
    void loadTenantData()
  }, [tenantSlug, loadTenantData])

  const prefillServicesFromCategory = () => {
    const templates = SERVICE_TEMPLATES[category] ?? []
    if (!templates.length) return
    setServices(
      templates.map(t => ({
        name: t.name,
        duration: t.duration,
        price: t.price,
        color: '#8B5CF6',
        isActive: true,
      })),
    )
  }

  const handleSaveServices = async () => {
    if (!tenantSlug) return
    setLoading(true)
    setError(null)
    try {
      // Crea solo i servizi che non hanno id (nuovi)
      const newServices = services.filter(s => !s.id)
      for (const service of newServices) {
        const res = await fetch(`/api/${tenantSlug}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: service.name,
            duration: service.duration,
            price: service.price,
            color: service.color,
            isActive: service.isActive,
          }),
        })
        const json = (await res.json().catch(() => null)) as
          | { success?: boolean; data?: { id: string }; error?: string }
          | null
        if (!res.ok || !json?.success || !json.data) {
          throw new Error(json?.error ?? 'Errore creazione servizi')
        }
      }
      setStep(2)
    } catch (err) {
      console.error(err)
      setError('Errore durante il salvataggio dei servizi.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStaff = async () => {
    if (!tenantSlug) return
    setLoading(true)
    setError(null)
    try {
      const newStaff = staff.filter(s => !s.id)
      for (const member of newStaff) {
        const res = await fetch(`/api/${tenantSlug}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: member.name,
            color: member.color,
            isActive: member.isActive,
            workingHours: {}, // verrà popolato con businessHours generali in futuro
            serviceIds: member.serviceIds,
          }),
        })
        const json = (await res.json().catch(() => null)) as
          | { success?: boolean; data?: { id: string }; error?: string }
          | null
        if (!res.ok || !json?.success || !json.data) {
          throw new Error(json?.error ?? 'Errore creazione staff')
        }
      }
      setStep(3)
    } catch (err) {
      console.error(err)
      setError('Errore durante il salvataggio dello staff.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBusinessHours = async () => {
    if (!tenantSlug) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/${tenantSlug}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessHours,
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore salvataggio orari')
      }

      setCompleted(true)
      setTimeout(() => {
        if (tenantSlug) {
          router.push(`/${tenantSlug}/dashboard`)
        }
      }, 1200)
    } catch (err) {
      console.error(err)
      setError('Errore durante il salvataggio degli orari di apertura.')
    } finally {
      setLoading(false)
    }
  }

  const canContinueServices = services.length > 0
  const canContinueStaff = staff.length > 0

  const handleAddService = () => {
    setServices(prev => [
      ...prev,
      {
        name: '',
        duration: 30,
        price: 2500,
        color: '#8B5CF6',
        isActive: true,
      },
    ])
  }

  const handleAddStaff = () => {
    setStaff(prev => [
      ...prev,
      {
        name: '',
        color: '#3B82F6',
        isActive: true,
        serviceIds: [],
      },
    ])
  }

  const handleBusinessHoursChange = (
    day: DayKey,
    field: keyof DayHours | 'breakStart' | 'breakEnd',
    value: string,
  ) => {
    setBusinessHours(prev => {
      const current = (prev[day] ?? { start: '09:00', end: '18:00' }) as DayHours
      if (field === 'breakStart' || field === 'breakEnd') {
        const existingBreak = current.break ?? { start: '13:00', end: '14:00' }
        const nextBreak = {
          ...existingBreak,
          [field === 'breakStart' ? 'start' : 'end']: value,
        }
        return {
          ...prev,
          [day]: {
            ...current,
            break: nextBreak,
          },
        }
      }
      return {
        ...prev,
        [day]: {
          ...current,
          [field]: value,
        },
      }
    })
  }

  const toggleDayClosed = (day: DayKey) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: prev[day] === null ? undefined : null,
    }))
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4 text-xs text-dark-600">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`w-7 h-1.5 rounded-full ${
            step >= s ? 'bg-gold-400' : 'bg-dark-200'
          }`}
        />
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-4">
      <p className="text-xs md:text-sm text-dark-600">
        Step 1 di 3 – Configura i servizi principali. Puoi partire da un set consigliato in base alla categoria.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-dark-700 mb-1">
            Categoria attività
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs md:text-sm text-white"
          >
            <option value="parrucchiere">Parrucchiere</option>
            <option value="estetista">Estetista</option>
            <option value="fisioterapista">Fisioterapista</option>
            <option value="personal_trainer">Personal trainer</option>
            <option value="barbiere">Barbiere</option>
            <option value="altro">Altro</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={prefillServicesFromCategory}
          >
            Usa servizi suggeriti
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {services.map((service, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-2 items-center border border-dark-700 rounded-lg px-3 py-2"
          >
            <div className="col-span-5">
              <Input
                label="Nome"
                value={service.name}
                onChange={e =>
                  setServices(prev => {
                    const next = [...prev]
                    const current = next[index]
                    if (current) {
                      next[index] = { ...current, name: e.target.value }
                    }
                    return next
                  })
                }
                className="text-xs"
              />
            </div>
            <div className="col-span-3">
              <Input
                label="Durata (min)"
                type="number"
                value={service.duration}
                onChange={e =>
                  setServices(prev => {
                    const next = [...prev]
                    const current = next[index]
                    if (current) {
                      next[index] = {
                        ...current,
                        duration: Number(e.target.value || 0),
                      }
                    }
                    return next
                  })
                }
                className="text-xs"
              />
            </div>
            <div className="col-span-4">
              <Input
                label="Prezzo (€)"
                type="number"
                value={service.price / 100}
                onChange={e =>
                  setServices(prev => {
                    const next = [...prev]
                    const current = next[index]
                    if (current) {
                      next[index] = {
                        ...current,
                        price: Math.round(Number(e.target.value || 0) * 100),
                      }
                    }
                    return next
                  })
                }
                className="text-xs"
              />
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={handleAddService}>
        + Aggiungi servizio
      </Button>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-xs md:text-sm text-dark-600">
        Step 2 di 3 – Aggiungi gli operatori e associa i servizi che svolgono.
      </p>

      <div className="space-y-2">
        {staff.map((member, index) => (
          <div
            key={index}
            className="border border-dark-700 rounded-lg px-3 py-2 space-y-2"
          >
            <Input
              label="Nome operatore"
              value={member.name}
              onChange={e =>
                setStaff(prev => {
                  const next = [...prev]
                  const current = next[index]
                  if (current) {
                    next[index] = { ...current, name: e.target.value }
                  }
                  return next
                })
              }
              className="text-xs"
            />
            <div>
              <div className="text-[11px] font-semibold text-dark-600 mb-1">
                Servizi che svolge
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map(s => (
                  <button
                    key={s.name + String(s.duration)}
                    type="button"
                    onClick={() =>
                      setStaff(prev => {
                        const next = [...prev]
                        const current = next[index]
                        if (!current) return next
                        const exists = current.serviceIds.includes(s.id ?? s.name)
                        const nextIds = exists
                          ? current.serviceIds.filter(id => id !== (s.id ?? s.name))
                          : [...current.serviceIds, s.id ?? s.name]
                        next[index] = { ...current, serviceIds: nextIds }
                        return next
                      })
                    }
                    className={`px-2 py-1 rounded-full text-[11px] border ${
                      member.serviceIds.includes(s.id ?? s.name)
                        ? 'border-gold-400 bg-gold-400/10'
                        : 'border-dark-500 bg-dark-900'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={handleAddStaff}>
        + Aggiungi operatore
      </Button>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <p className="text-xs md:text-sm text-dark-600">
        Step 3 di 3 – Imposta gli orari di apertura dell&apos;attività.
      </p>

      <div className="space-y-2">
        {(Object.keys(DAY_LABELS) as DayKey[]).map(day => {
          const value = businessHours[day]
          const isClosed = value === null
          const current = (value ?? { start: '09:00', end: '18:00' }) as DayHours
          return (
            <div
              key={day}
              className="border border-dark-700 rounded-lg px-3 py-2 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {DAY_LABELS[day]}
                </span>
                <button
                  type="button"
                  onClick={() => toggleDayClosed(day)}
                  className="text-[11px] text-dark-400 hover:text-dark-200"
                >
                  {isClosed ? 'Segna come aperto' : 'Segna come chiuso'}
                </button>
              </div>

              {!isClosed && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-dark-500 mb-1">
                      Apertura
                    </label>
                    <input
                      type="time"
                      value={current.start}
                      onChange={e => handleBusinessHoursChange(day, 'start', e.target.value)}
                      className="w-full px-2 py-1 rounded bg-dark-100/40 border border-dark-200 text-[11px] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-dark-500 mb-1">
                      Chiusura
                    </label>
                    <input
                      type="time"
                      value={current.end}
                      onChange={e => handleBusinessHoursChange(day, 'end', e.target.value)}
                      className="w-full px-2 py-1 rounded bg-dark-100/40 border border-dark-200 text-[11px] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-dark-500 mb-1">
                      Pausa (opzionale)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="time"
                        value={current.break?.start ?? ''}
                        onChange={e =>
                          handleBusinessHoursChange(day, 'breakStart', e.target.value)
                        }
                        className="w-full px-2 py-1 rounded bg-dark-100/40 border border-dark-200 text-[11px] text-white"
                      />
                      <input
                        type="time"
                        value={current.break?.end ?? ''}
                        onChange={e =>
                          handleBusinessHoursChange(day, 'breakEnd', e.target.value)
                        }
                        className="w-full px-2 py-1 rounded bg-dark-100/40 border border-dark-200 text-[11px] text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  const handlePrimaryAction = async () => {
    if (step === 1) {
      await handleSaveServices()
    } else if (step === 2) {
      await handleSaveStaff()
    } else if (step === 3) {
      await handleSaveBusinessHours()
    }
  }

  const canContinue =
    (step === 1 && canContinueServices) ||
    (step === 2 && canContinueStaff) ||
    step === 3

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-2xl flex items-center gap-2">
              Onboarding attività
              {completed && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Completa questi 3 step per iniziare a usare il calendario e la prenotazione online.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderStepIndicator()}

            {error && (
              <p className="text-xs text-red-400">
                {error}
              </p>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(prev => (prev > 1 ? (prev - 1) as Step : prev))}
                disabled={step === 1 || loading}
              >
                Indietro
              </Button>
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={handlePrimaryAction}
                disabled={!canContinue || loading}
                loading={loading}
              >
                {step < 3 ? 'Avanti' : 'Completa onboarding'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

