import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// Commenti in italiano: pagina 404 personalizzata

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <Card variant="dark" className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle className="text-6xl font-bold text-gold-400 mb-2">404</CardTitle>
          <CardTitle>Pagina non trovata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-dark-400">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
          <Link href="/">
            <Button className="w-full">
              Torna alla home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
