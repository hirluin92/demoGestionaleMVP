'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Lock, CheckCircle, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import HugemassLogo from '@/components/HugemassLogo'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Token non valido')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Le password non corrispondono')
      return
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Errore durante il reset della password')
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (error) {
      setError('Errore durante il reset della password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/sfondo.jpg')" }}>
        <div className="relative z-10 w-full max-w-md px-4">
          <div className="bg-dark-50/80 backdrop-blur-xl border border-gold-400/20 rounded-2xl shadow-dark-lg p-8 md:p-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <HugemassLogo variant="full" size="md" className="animate-fade-in" />
              </div>
            </div>

            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="bg-green-500/20 rounded-full p-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-dark-900">Password aggiornata!</h1>
              
              <p className="text-dark-700">
                La tua password è stata aggiornata con successo.
              </p>
              
              <p className="text-sm text-dark-600">
                Verrai reindirizzato al login tra qualche secondo...
              </p>

              <div className="pt-4">
                <Link href="/login">
                  <Button variant="gold" size="lg" fullWidth>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Vai al login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/sfondo.jpg')" }}>
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-dark-50/80 backdrop-blur-xl border border-gold-400/20 rounded-2xl shadow-dark-lg p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <HugemassLogo variant="full" size="md" className="animate-fade-in" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-dark-900 mb-2 text-center">
            Reimposta Password
          </h1>
          <p className="text-dark-700 text-center mb-6">
            Inserisci la tua nuova password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div 
                className="bg-accent-danger/10 border-2 border-accent-danger/30 rounded-xl p-4 backdrop-blur-sm"
                role="alert"
              >
                <p className="text-sm font-semibold text-accent-danger">{error}</p>
              </div>
            )}

            <div>
              <Input
                id="password"
                type="password"
                label="Nuova Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="text-base"
                minLength={6}
              />
            </div>

            <div>
              <Input
                id="confirmPassword"
                type="password"
                label="Conferma Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="text-base"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              fullWidth
              loading={loading}
            >
              {!loading && <Lock className="w-5 h-5 mr-2" />}
              {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-gold-400 hover:text-gold-300 text-sm font-medium">
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Torna al login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
