'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

// Commenti in italiano: error boundary per pagine tenant

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams<{ tenant: string }>()
  
  useEffect(() => {
    console.error('Tenant error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <Card variant="dark" className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-400">Errore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-dark-400">
            Si è verificato un errore. Riprova o torna alla dashboard.
          </p>
          {error.digest && (
            <p className="text-xs text-dark-500 font-mono">
              ID: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Riprova
            </Button>
            <Link href={`/${params.tenant}/dashboard`} className="flex-1">
              <Button variant="outline-gold" className="w-full">
                Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
