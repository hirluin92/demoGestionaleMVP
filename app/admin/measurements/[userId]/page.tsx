'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import BodyMeasurementModal from '@/components/BodyMeasurementModal'

export default function BodyMeasurementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string
  
  const [userData, setUserData] = useState<{ id: string; name: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (userId && status === 'authenticated') {
      fetchUserData()
    }
  }, [userId, status])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const users = await response.json()
        const user = users.find((u: any) => u.id === userId)
        if (user) {
          setUserData({
            id: user.id,
            name: user.name,
            email: user.email,
          })
        } else {
          router.push('/admin')
        }
      }
    } catch (error) {
      console.error('Errore recupero dati utente:', error)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-dark-200 border-t-gold-400 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-dark-600 font-semibold">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con pulsante indietro */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin')}
            className="mb-4 text-[#E8DCA0] hover:text-[#F5ECC8]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla lista clienti
          </Button>
        </div>

        {/* Componente scheda antropometrica */}
        <div className="glass-card rounded-xl p-8">
          <BodyMeasurementModal
            userId={userData.id}
            userName={userData.name}
            userEmail={userData.email}
            isOpen={true}
            onClose={() => router.push('/admin')}
          />
        </div>
      </div>
    </div>
  )
}
