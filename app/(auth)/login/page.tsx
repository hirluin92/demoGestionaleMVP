'use client'

// Commenti in italiano: pagina di login principale per titolari e staff

import { useEffect, useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { Lock } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AppointlyLogo from '@/components/AppointlyLogo'

export default function LoginPage() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  // Commento in italiano: mostra un messaggio se la sessione è scaduta
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'SessionExpired') {
      setError('La sessione è scaduta. Effettua nuovamente il login.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email o password non validi')
        return
      }

      if (result?.ok) {
        const session = await getSession()

        // Commento in italiano: redirect basato sul tenant se presente
        if (session?.user?.tenantId && session.user.tenantSlug) {
          window.location.replace(`/${session.user.tenantSlug}/dashboard`)
        } else if (session?.user?.role === 'SUPER_ADMIN') {
          window.location.replace('/')
        } else {
          window.location.replace('/')
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Errore durante il login')
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

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card p-8 md:p-10 fade-in">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AppointlyLogo variant="full" size="md" className="animate-fade-in" />
            </div>
            <h1
              className="text-xl md:text-2xl font-semibold"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                color: '#f0ede6',
                letterSpacing: '-0.04em',
              }}
            >
              Accedi al tuo account
            </h1>
            <p className="text-xs md:text-sm mt-1" style={{ color: '#7f8daa' }}>
              Inserisci le credenziali che hai ricevuto per gestire il tuo salone.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="mb-2 rounded-lg border border-red-400/40 bg-red-900/30 px-3 py-2 flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-red-300 mt-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm font-semibold text-red-300">{error}</p>
              </div>
            )}

            <div className="w-full space-y-3">
              <Input
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tuo@email.com"
                aria-required="true"
                className="text-base w-full"
              />

              <Input
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                aria-required="true"
                className="text-base w-full"
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              fullWidth
              loading={loading}
              aria-label="Accedi al tuo account"
            >
              {!loading && <Lock className="w-5 h-5 mr-2" aria-hidden="true" />}
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>

            <div className="text-center">
              <a
                href="/forgot-password"
                className="text-[#E8DCA0] hover:text-[#F5ECC8] text-sm font-medium"
              >
                Password dimenticata?
              </a>
            </div>
          </form>

          <div
            className="mt-8 pt-6 text-center"
            style={{ borderTop: '1px solid rgba(122, 168, 255, 0.14)' }}
          >
            <p className="text-xs flex items-center justify-center" style={{ color: '#7f8daa' }}>
              Sistema di gestione premium
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

