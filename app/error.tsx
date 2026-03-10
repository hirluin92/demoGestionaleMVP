'use client'

import { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// Commenti in italiano: error boundary globale per gestire errori non catturati

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log errore per monitoring
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <Card variant="dark" className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-400">Errore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-dark-400">
            Si è verificato un errore imprevisto. Riprova o contatta il supporto se il problema persiste.
          </p>
          {error.digest && (
            <p className="text-xs text-dark-500 font-mono">
              ID errore: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={reset}
              className="flex-1"
            >
              Riprova
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="ghost"
              className="flex-1"
            >
              Torna alla home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
