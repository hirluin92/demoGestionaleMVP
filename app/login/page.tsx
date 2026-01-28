'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lock, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import HugemassLogo from '@/components/HugemassLogo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        // Forza il refresh della sessione
        const session = await getSession()
        
        console.log('Session after login:', session)
        console.log('User role:', session?.user?.role)
        
        // Usa un redirect completo per forzare il refresh della pagina
        if (session?.user?.role === 'ADMIN') {
          console.log('Redirecting ADMIN to /admin')
          window.location.replace('/admin')
        } else if (session?.user?.role === 'CLIENT') {
          console.log('Redirecting CLIENT to /dashboard')
          window.location.replace('/dashboard')
        } else {
          // Se non c'è ruolo, redirect alla home che gestirà il redirect
          console.log('No role found, redirecting to /')
          window.location.replace('/')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-card rounded-2xl p-8 md:p-10 fade-in">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <HugemassLogo variant="full" size="md" className="animate-fade-in" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Form di accesso">
            {error && (
              <div 
                className="bg-accent-danger/10 border-2 border-accent-danger/30 rounded-xl p-4 backdrop-blur-sm"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-accent-danger mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-semibold text-accent-danger">{error}</p>
                </div>
              </div>
            )}

            <div className="w-full">
              <Input
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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

          {/* Footer */}
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
