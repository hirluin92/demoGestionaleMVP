'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import HugemassLogo from '@/components/HugemassLogo'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Errore durante l\'invio della richiesta')
      } else {
        setSuccess(true)
      }
    } catch (error) {
      setError('Errore durante l\'invio della richiesta')
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
                <div className="bg-gold-400/20 rounded-full p-4">
                  <Mail className="w-8 h-8 text-[#E8DCA0]" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-dark-900">Email inviata!</h1>
              
              <p className="text-dark-700">
                Se l'email esiste nel nostro sistema, riceverai un link per reimpostare la password.
              </p>
              
              <p className="text-sm text-dark-600">
                Controlla la tua casella di posta e segui le istruzioni.
              </p>

              <div className="pt-4">
                <Link href="/login">
                  <Button variant="gold" size="lg" fullWidth>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna al login
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
            Password dimenticata?
          </h1>
          <p className="text-dark-700 text-center mb-6">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
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
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tuo@email.com"
                className="text-base"
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              fullWidth
              loading={loading}
            >
              {!loading && <Mail className="w-5 h-5 mr-2" />}
              {loading ? 'Invio in corso...' : 'Invia link reset'}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-[#E8DCA0] hover:text-[#F5ECC8] text-sm font-medium">
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Torna al login
              </Link>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-dark-200/30 text-center">
            <p className="text-xs text-dark-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 mr-1 text-[#E8DCA0]" />
              Sistema di gestione premium
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
