'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface BillingButtonProps {
  currentPlan: string
}

export function BillingButton({ currentPlan }: BillingButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: currentPlan }),
      })
      const json = await res.json()
      if (json.success && json.data?.url) {
        window.location.href = json.data.url
      } else {
        console.error('Errore checkout:', json.error)
        alert('Errore durante il checkout. Riprova più tardi.')
      }
    } catch (error) {
      console.error('Errore checkout:', error)
      alert('Errore durante il checkout. Riprova più tardi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <Button
        type="button"
        onClick={handleCheckout}
        variant="gold"
        size="sm"
        disabled={loading}
      >
        {loading ? 'Caricamento...' : 'Gestisci abbonamento'}
      </Button>
    </div>
  )
}
