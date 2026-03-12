'use client'

// Commenti in italiano: pagina di registrazione minimale per creare un nuovo tenant

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AppointlyLogo from '@/components/AppointlyLogo'

export default function RegisterPage() {
  const router = useRouter()

  const [businessName, setBusinessName] = useState<string>('')
  const [category, setCategory] = useState<string>('parrucchiere')
  const [city, setCity] = useState<string>('')
  const [ownerName, setOwnerName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

      if (!res.ok || !json?.success) {
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
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: `
        radial-gradient(circle at 15% 0%, rgba(87, 230, 214, 0.16), transparent 24%),
        radial-gradient(circle at 85% 0%, rgba(122, 168, 255, 0.18), transparent 24%),
        radial-gradient(circle at 50% 35%, rgba(142, 162, 255, 0.1), transparent 30%),
        linear-gradient(180deg, #05060b 0%, #060913 45%, #05060b 100%)
      `,
      }}
    >
      {/* Overlay griglia di sfondo */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.18,
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(circle at center, black 35%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 35%, transparent 85%)',
        }}
      />

      <div className="relative z-10 w-full max-w-xl px-4">
        <div className="glass-card p-6 md:p-8 fade-in">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="inline-flex items-center text-xs transition-colors"
              style={{ color: '#7f8daa' }}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Torna al login
            </button>
            <AppointlyLogo variant="icon" size="sm" />
          </div>

          <h1
            className="text-lg md:text-2xl font-semibold mb-1"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              color: '#f0ede6',
              letterSpacing: '-0.04em',
            }}
          >
            Crea il tuo account salone
          </h1>
          <p className="text-xs md:text-sm mb-4" style={{ color: '#7f8daa' }}>
            Inserisci solo le informazioni essenziali. Potrai completare i dettagli in seguito.
          </p>

          {error && (
            <p className="text-xs mb-3" style={{ color: '#ff8ba7' }}>
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs mb-3" style={{ color: '#7df5c5' }}>
              {success}
            </p>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
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
                <label
                  className="block text-[11px] font-medium mb-1"
                  style={{ color: '#7f8daa' }}
                  htmlFor="category"
                >
                  Categoria
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="input-field w-full text-xs md:text-sm"
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
                id="ownerName"
                label="Nome titolare"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                required
                className="text-xs md:text-sm"
              />
            </div>

            <Input
              id="phone"
              label="Telefono (opzionale)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
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

