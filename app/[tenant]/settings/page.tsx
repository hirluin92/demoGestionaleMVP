'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Save } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Input from '@/components/ui/Input'

// Commenti in italiano: impostazioni tenant (orari, fuso orario, brand color)

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

interface DayHours {
  start: string
  end: string
  break?: {
    start: string
    end: string
  }
}

type BusinessHours = Record<DayKey, DayHours | null>

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: 'mon', label: 'Lunedì' },
  { key: 'tue', label: 'Martedì' },
  { key: 'wed', label: 'Mercoledì' },
  { key: 'thu', label: 'Giovedì' },
  { key: 'fri', label: 'Venerdì' },
  { key: 'sat', label: 'Sabato' },
  { key: 'sun', label: 'Domenica' },
]

const TIMEZONES = [
  { value: 'Europe/Rome', label: 'Europa/Roma (GMT+1/+2)' },
  { value: 'Europe/London', label: 'Europa/Londra (GMT+0/+1)' },
  { value: 'Europe/Paris', label: 'Europa/Parigi (GMT+1/+2)' },
  { value: 'America/New_York', label: 'America/New York (GMT-5/-4)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (GMT-8/-7)' },
]

export default function TenantSettingsPage() {
  const params = useParams<{ tenant: string }>()
  const tenantSlug = params?.tenant

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  })

  const [timezone, setTimezone] = useState('Europe/Rome')
  const [brandColor, setBrandColor] = useState('#8B5CF6')

  useEffect(() => {
    void loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug])

  const loadSettings = async () => {
    if (!tenantSlug) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/${tenantSlug}/settings`)
      const json = (await res.json().catch(() => null)) as
        | {
            success?: boolean
            data?: {
              businessHours?: BusinessHours
              timezone?: string
              brandColor?: string
            }
            error?: string
          }
        | null

      if (!res.ok || !json?.success) {
        setError(json?.error ?? 'Impossibile caricare le impostazioni.')
        return
      }

      if (json.data) {
        if (json.data.businessHours) {
          setBusinessHours(json.data.businessHours as BusinessHours)
        }
        if (json.data.timezone) {
          setTimezone(json.data.timezone)
        }
        if (json.data.brandColor) {
          setBrandColor(json.data.brandColor)
        }
      }
    } catch {
      setError('Errore di rete durante il caricamento delle impostazioni.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDay = (day: DayKey) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]:
        prev[day] === null
          ? { start: '09:00', end: '18:00' }
          : null,
    }))
  }

  const handleDayChange = (
    day: DayKey,
    field: 'start' | 'end' | 'breakStart' | 'breakEnd',
    value: string,
  ) => {
    setBusinessHours((prev) => {
      const current = prev[day]
      if (!current) return prev

      if (field === 'breakStart' || field === 'breakEnd') {
        return {
          ...prev,
          [day]: {
            ...current,
            break: {
              ...current.break,
              start: field === 'breakStart' ? value : current.break?.start ?? '13:00',
              end: field === 'breakEnd' ? value : current.break?.end ?? '14:00',
            },
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

  const handleToggleBreak = (day: DayKey) => {
    setBusinessHours((prev) => {
      const current = prev[day]
      if (!current) return prev

      return {
        ...prev,
        [day]: {
          ...current,
          break: current.break
            ? undefined
            : { start: '13:00', end: '14:00' },
        },
      }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantSlug) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/${tenantSlug}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessHours,
          timezone,
          brandColor,
        }),
      })

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? 'Errore salvataggio impostazioni')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setError('Impossibile salvare le impostazioni.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Impostazioni</h1>
        <p className="text-dark-400">Caricamento...</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Impostazioni</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-2xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-sm">
          Impostazioni salvate con successo!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Orari di apertura */}
        <Card>
          <h2 className="text-xl font-semibold mb-4 tracking-tight">Orari di apertura</h2>
          <div className="space-y-4">
            {DAYS.map((day) => {
              const hours = businessHours[day.key]
              return (
                <div
                  key={day.key}
                  className="p-4 bg-dark-100/20 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hours !== null}
                        onChange={() => handleToggleDay(day.key)}
                        className="w-4 h-4 rounded border-dark-200 bg-dark-100/40"
                      />
                      <span className="font-semibold text-dark-300">
                        {day.label}
                      </span>
                    </label>
                  </div>

                  {hours && (
                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div>
                        <label className="block text-xs font-semibold text-dark-500 mb-1">
                          Apertura
                        </label>
                        <Input
                          type="time"
                          value={hours.start}
                          onChange={(e) =>
                            handleDayChange(day.key, 'start', e.target.value)
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-dark-500 mb-1">
                          Chiusura
                        </label>
                        <Input
                          type="time"
                          value={hours.end}
                          onChange={(e) =>
                            handleDayChange(day.key, 'end', e.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!hours.break}
                            onChange={() => handleToggleBreak(day.key)}
                            className="w-4 h-4 rounded border-dark-200 bg-dark-100/40"
                          />
                          <span className="text-xs text-dark-500">
                            Pausa pranzo
                          </span>
                        </label>
                      </div>

                      {hours.break && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-dark-500 mb-1">
                              Inizio pausa
                            </label>
                            <Input
                              type="time"
                              value={hours.break.start}
                              onChange={(e) =>
                                handleDayChange(
                                  day.key,
                                  'breakStart',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-dark-500 mb-1">
                              Fine pausa
                            </label>
                            <Input
                              type="time"
                              value={hours.break.end}
                              onChange={(e) =>
                                handleDayChange(
                                  day.key,
                                  'breakEnd',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Fuso orario */}
        <Card>
          <h2 className="text-xl font-semibold mb-4 tracking-tight">Fuso orario</h2>
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">
              Seleziona fuso orario
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-sm text-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Brand color */}
        <Card>
          <h2 className="text-xl font-semibold mb-4 tracking-tight">Colore brand</h2>
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">
              Colore principale
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-16 h-10 rounded-lg border border-dark-200 cursor-pointer"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#8B5CF6"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-dark-500 mt-2">
              Questo colore verrà utilizzato per personalizzare l&apos;interfaccia.
            </p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Salva impostazioni
          </Button>
        </div>
      </form>
    </section>
  )
}
