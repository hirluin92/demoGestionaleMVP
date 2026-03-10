'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AppointlyLogo from '@/components/AppointlyLogo'

// Commenti in italiano: pagina di registrazione tenant minimale che chiama l'API /api/tenants

export default function RegisterPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('parrucchiere')
  const [city, setCity] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          category,
          city,
          ownerName,
          email,
          password,
          phone: phone || undefined,
        }),
      })

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; data?: { tenantSlug: string } }
        | null

      if (!res.ok || !json?.success || !json.data) {
        setError(json?.error ?? 'Registrazione non riuscita.')
        return
      }

      setSuccess('Registrazione completata! Ora puoi accedere.')
      setTimeout(() => {
        router.push('/login')
      }, 1200)
    } catch (err) {
      console.error('Registration error:', err)
      setError('Errore durante la registrazione.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="relative z-10 w-full max-w-xl px-4">
        <div className="glass-card rounded-2xl p-6 md:p-8 fade-in">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="inline-flex items-center text-xs text-dark-500 hover:text-dark-300"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Torna al login
            </button>
            <AppointlyLogo variant="icon" size="sm" />
          </div>

          <h1 className="text-lg md:text-2xl font-semibold text-white mb-1">
            Crea il tuo account salone
          </h1>
          <p className="text-xs md:text-sm text-dark-500 mb-4">
            Inserisci solo le informazioni essenziali. Potrai completare i dettagli in seguito.
          </p>

          {error && (
            <p className="text-xs text-red-400 mb-3">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-green-400 mb-3">
              {success}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                id="businessName"
                label="Nome attività"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                required
                className="text-xs md:text-sm"
              />
              <Input
                id="city"
                label="Città"
                value={city}
                onChange={e => setCity(e.target.value)}
                required
                className="text-xs md:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-dark-500 mb-1">
                  Categoria
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
              <Input
                id="phone"
                label="Telefono (opzionale)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="text-xs md:text-sm"
              />
            </div>

            <Input
              id="ownerName"
              label="Nome titolare"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              required
              className="text-xs md:text-sm"
            />

            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="text-xs md:text-sm"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="text-xs md:text-sm"
            />

            <Button
              type="submit"
              variant="gold"
              size="lg"
              fullWidth
              loading={loading}
            >
              {!loading && <UserPlus className="w-4 h-4 mr-2" />}
              {loading ? 'Creazione in corso...' : 'Crea account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

