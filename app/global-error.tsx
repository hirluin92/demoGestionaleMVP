'use client'

// Commenti in italiano: error boundary globale per errori critici del root layout

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="it">
      <body>
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-400">Errore Critico</h1>
            <p className="text-sm text-dark-400">
              Si è verificato un errore critico. Ricarica la pagina o contatta il supporto.
            </p>
            {error.digest && (
              <p className="text-xs text-dark-500 font-mono">
                ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="px-4 py-2 bg-gold-400 text-black rounded-lg hover:bg-gold-300"
            >
              Riprova
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
