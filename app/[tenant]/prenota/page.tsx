'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  User,
  Phone,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

interface PublicService {
  id: string
  name: string
  duration: number
  price: number
  color: string
}

interface AvailableSlot {
  startTime: string
  staffId: string
  staffName: string
  staffColor: string
}

type Step = 1 | 2 | 3 | 4

// Commenti in italiano: flusso pubblico di prenotazione progressiva in 4 step

export default function PublicBookingPage() {
  const params = useParams<{ tenant: string }>()
  const tenantSlug = params?.tenant

  const [step, setStep] = useState<Step>(1)
  const [services, setServices] = useState<PublicService[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesError, setServicesError] = useState<string | null>(null)

  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [optInReminders, setOptInReminders] = useState(true)
  const [optInMarketing, setOptInMarketing] = useState(false)

  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [icsHref, setIcsHref] = useState<string | null>(null)

  // Genera prossimi 30 giorni
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), i)
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, "EEEE d MMMM yyyy", { locale: it }),
    }
  })

  const loadServices = useCallback(async () => {
    setServicesLoading(true)
    setServicesError(null)
    try {
      const res = await fetch(`/api/${tenantSlug}/services?activeOnly=true`)
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        setServicesError(json?.error ?? 'Impossibile caricare i servizi.')
        return
      }
      const json = (await res.json()) as {
        success: boolean
        data?: PublicService[]
        error?: string
      }
      if (!json.success || !json.data) {
        setServicesError(json.error ?? 'Impossibile caricare i servizi.')
        return
      }
      setServices(json.data)
    } catch {
      setServicesError('Errore di rete durante il caricamento dei servizi.')
    } finally {
      setServicesLoading(false)
    }
  }, [tenantSlug])

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true)
    setSlotsError(null)
    try {
      const res = await fetch(
        `/api/${tenantSlug}/availability?serviceId=${encodeURIComponent(
          selectedServiceId
        )}&date=${encodeURIComponent(selectedDate)}`
      )
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        setSlotsError(json?.error ?? 'Impossibile caricare gli orari disponibili.')
        return
      }
      const json = (await res.json()) as {
        success: boolean
        data?: { startTime: string; staffId: string; staffName: string; staffColor: string }[]
        error?: string
      }
      if (!json.success || !json.data) {
        setSlotsError(json.error ?? 'Impossibile caricare gli orari disponibili.')
        return
      }
      setSlots(
        json.data.map(slot => ({
          ...slot,
          startTime: slot.startTime,
        }))
      )
      setSelectedSlotIndex(null)
    } catch {
      setSlotsError('Errore di rete durante il caricamento degli orari disponibili.')
    } finally {
      setSlotsLoading(false)
    }
  }, [selectedServiceId, selectedDate, tenantSlug])

  useEffect(() => {
    if (!tenantSlug) return
    void loadServices()
  }, [tenantSlug, loadServices])

  useEffect(() => {
    if (!selectedServiceId || !selectedDate || !tenantSlug) {
      setSlots([])
      setSelectedSlotIndex(null)
      return
    }
    void loadSlots()
  }, [selectedServiceId, selectedDate, tenantSlug, loadSlots])

  const goNext = () => {
    setSubmitError(null)
    if (step === 1) {
      if (!selectedServiceId) return
      setStep(2)
    } else if (step === 2) {
      if (!selectedDate || selectedSlotIndex === null) return
      setStep(3)
    } else if (step === 3) {
      if (!clientName || !clientPhone) return
      setStep(4)
    }
  }

  const goBack = () => {
    setSubmitError(null)
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else if (step === 4) setStep(3)
  }

  const handleSubmit = async () => {
    if (!tenantSlug || selectedSlotIndex === null) return
    const service = services.find(s => s.id === selectedServiceId)
    const slot = slots[selectedSlotIndex]
    if (!service || !slot) return

      setSubmitLoading(true)
    setSubmitError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/${tenantSlug}/public-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          staffId: slot.staffId,
          startTime: slot.startTime,
          clientName,
          clientPhone,
          optInReminders,
          optInMarketing,
        }),
      })

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null

      if (!res.ok || !json?.success) {
        setSubmitError(json?.error ?? 'Impossibile completare la prenotazione.')
        return
      }

      setSuccess(true)

      // Commento in italiano: genera link .ics per aggiungere l'appuntamento al calendario
      const ics = buildIcsEvent({
        tenantSlug,
        serviceName: service.name,
        staffName: slot.staffName,
        start: new Date(slot.startTime),
        durationMinutes: service.duration,
        clientName,
      })
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      setIcsHref(url)
    } catch {
      setSubmitError('Errore di rete durante la prenotazione.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const selectedService = services.find(s => s.id === selectedServiceId) ?? null
  const selectedSlot = selectedSlotIndex !== null ? slots[selectedSlotIndex] : null

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4 text-xs text-dark-600">
      {[1, 2, 3, 4].map(s => (
        <div
          key={s}
          className={`w-7 h-1.5 rounded-full ${
            step >= s ? 'bg-gold-400' : 'bg-dark-200'
          }`}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
              <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-gold-400" />
              Prenota un appuntamento
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Seleziona servizio, orario e inserisci i tuoi dati in pochi passi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderStepIndicator()}

            {/* STEP 1: Servizio */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-xs md:text-sm text-dark-600">
                  1. Seleziona il servizio desiderato
                </p>
                {servicesLoading && (
                  <p className="text-sm text-dark-600">Caricamento servizi...</p>
                )}
                {servicesError && (
                  <p className="text-sm text-red-400">{servicesError}</p>
                )}
                {!servicesLoading && !servicesError && services.length === 0 && (
                  <p className="text-sm text-dark-600">
                    Nessun servizio disponibile al momento.
                  </p>
                )}
                <div className="space-y-2">
                  {services.map(service => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs md:text-sm transition-smooth ${
                        selectedServiceId === service.id
                          ? 'border-gold-400 bg-gold-400/10 text-white'
                          : 'border-dark-200 bg-dark-100/40 text-dark-600 hover:border-gold-400/60'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{service.name}</span>
                        <span className="text-[11px] text-gold-400">
                          {service.duration} min
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Data + orario */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-xs md:text-sm text-dark-600">
                  2. Scegli data e orario
                </p>
                <div>
                  <label className="block text-xs font-semibold text-dark-700 mb-1">
                    Data
                  </label>
                  <select
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs md:text-sm text-white"
                  >
                    <option value="">Seleziona una data</option>
                    {availableDates.map(d => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-xs font-semibold text-dark-700 mb-1">
                      Orario
                    </label>
                    {slotsLoading && (
                      <p className="text-xs text-dark-600">
                        Caricamento orari disponibili...
                      </p>
                    )}
                    {slotsError && (
                      <p className="text-xs text-red-400">{slotsError}</p>
                    )}
                    {!slotsLoading && !slotsError && slots.length === 0 && (
                      <p className="text-xs text-dark-600">
                        Nessuno slot disponibile per questa data.
                      </p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {slots.map((slot, index) => (
                        <button
                          key={slot.startTime + slot.staffId}
                          type="button"
                          onClick={() => setSelectedSlotIndex(index)}
                          className={`px-3 py-2 rounded-lg text-[11px] md:text-xs border transition-smooth ${
                            selectedSlotIndex === index
                              ? 'border-gold-400 bg-gold-400/15 text-white'
                              : 'border-dark-200 bg-dark-100/40 text-dark-600 hover:border-gold-400/60'
                          }`}
                        >
                          <div>{format(new Date(slot.startTime), 'HH:mm')}</div>
                          <div className="text-[10px] text-dark-600">
                            {slot.staffName}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Dati cliente */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-xs md:text-sm text-dark-600">
                  3. Inserisci i tuoi dati
                </p>
                <div>
                  <label className="block text-xs font-semibold text-dark-700 mb-1">
                    Nome
                  </label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gold-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs md:text-sm text-white"
                      placeholder="Es. Mario"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-700 mb-1">
                    Telefono
                  </label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gold-400 flex-shrink-0" />
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs md:text-sm text-white"
                      placeholder="Es. 3331234567"
                    />
                  </div>
                </div>
                <div className="space-y-2 text-[11px] text-dark-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={optInReminders}
                      onChange={e => setOptInReminders(e.target.checked)}
                      className="w-3 h-3"
                    />
                    <span>Voglio ricevere promemoria per questo appuntamento.</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={optInMarketing}
                      onChange={e => setOptInMarketing(e.target.checked)}
                      className="w-3 h-3"
                    />
                    <span>Acconsento a ricevere comunicazioni promozionali.</span>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 4: Riepilogo */}
            {step === 4 && selectedService && selectedSlot && (
              <div className="space-y-3">
                <p className="text-xs md:text-sm text-dark-600">
                  4. Conferma i dettagli dell&apos;appuntamento
                </p>
                <div className="space-y-2 text-xs md:text-sm text-dark-600">
                  <div>
                    <span className="font-semibold text-white">Servizio: </span>
                    <span>{selectedService.name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Data: </span>
                    <span>
                      {format(new Date(selectedSlot.startTime), "EEEE d MMMM yyyy", {
                        locale: it,
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Orario: </span>
                    <span>{format(new Date(selectedSlot.startTime), 'HH:mm')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Operatore: </span>
                    <span>{selectedSlot.staffName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Cliente: </span>
                    <span>
                      {clientName} ({clientPhone})
                    </span>
                  </div>
                </div>
                {submitError && (
                  <p className="text-xs text-red-400 mt-2">{submitError}</p>
                )}
                {success && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Prenotazione confermata! Riceverai un promemoria su WhatsApp.</span>
                  </div>
                )}
                {success && icsHref && (
                  <div className="mt-3">
                    <a
                      href={icsHref}
                      download="appuntamento.ics"
                      className="text-xs text-gold-400 hover:text-gold-200 underline"
                    >
                      Aggiungi al tuo calendario
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Azioni */}
            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={step === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Indietro
              </Button>

              {step < 4 && (
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={goNext}
                  disabled={
                    (step === 1 && !selectedServiceId) ||
                    (step === 2 &&
                      (!selectedDate || selectedSlotIndex === null)) ||
                    (step === 3 && (!clientName || !clientPhone))
                  }
                >
                  Avanti
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}

              {step === 4 && (
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleSubmit}
                  loading={submitLoading}
                  disabled={submitLoading || success}
                >
                  Conferma prenotazione
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Commento in italiano: genera contenuto .ics per l'evento prenotato
function buildIcsEvent(params: {
  tenantSlug: string | string[] | undefined
  serviceName: string
  staffName: string
  start: Date
  durationMinutes: number
  clientName: string
}): string {
  const end = new Date(params.start.getTime() + params.durationMinutes * 60000)
  const formatDate = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0] + 'Z'

  const dtStart = formatDate(params.start)
  const dtEnd = formatDate(end)

  const summary = `${params.serviceName} – ${params.staffName}`
  const description = `Appuntamento per ${params.clientName} presso ${String(
    params.tenantSlug,
  )}`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Appointly//IT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${params.start.getTime()}-${Math.random().toString(36).slice(2)}@appointly`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

