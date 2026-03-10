'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { Lock, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AppointlyLogo from '@/components/AppointlyLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Commento in italiano: mostra messaggio se la sessione è scaduta
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'SessionExpired') {
      setError('La sessione è scaduta. Effettua nuovamente il login.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
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
        setLoading(false)
        return
      }

      if (result?.ok) {
        const session = await getSession()

        // Redirect basato su tenantSlug se disponibile
        if (session?.user?.tenantSlug) {
          window.location.replace(`/${session.user.tenantSlug}/dashboard`)
        } else if (session?.user?.role === 'SUPER_ADMIN') {
          // SUPER_ADMIN potrebbe non avere tenantSlug, redirect a home
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card rounded-2xl p-8 md:p-10 fade-in">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AppointlyLogo variant="full" size="md" className="animate-fade-in" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Form di accesso">
            {error && (
              <div
                className="alert-error"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-center">
                  <svg
                    className="w-6 h-6 text-red-400 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
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
              </div>
            )}

            <div className="w-full">
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
            </div>

            <div className="w-full">
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

          <div className="mt-8 pt-6 border-t border-dark-200/30 text-center">
            <p className="text-xs text-dark-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 mr-1 text-[#E8DCA0]" aria-hidden="true" />
              Sistema di gestione premium
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

