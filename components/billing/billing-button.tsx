'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface BillingButtonProps {
  currentPlan: string
  hasSubscription: boolean
}

export function BillingButton({ currentPlan, hasSubscription }: BillingButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      // Commento in italiano: se ha già un abbonamento, apri il portal; altrimenti crea checkout
      const endpoint = hasSubscription ? '/api/stripe/portal' : '/api/stripe/checkout'
      const body = hasSubscription ? {} : { plan: currentPlan }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success && json.data?.url) {
        window.location.href = json.data.url
      } else {
        console.error('Errore billing:', json.error)
        alert("Errore durante l'operazione. Riprova più tardi.")
      }
    } catch (error) {
      console.error('Errore billing:', error)
      alert("Errore durante l'operazione. Riprova più tardi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <Button
        type="button"
        onClick={handleClick}
        variant="gold"
        size="sm"
        disabled={loading}
      >
        {loading ? 'Caricamento...' : hasSubscription ? 'Gestisci abbonamento' : 'Attiva piano'}
      </Button>
    </div>
  )
}
