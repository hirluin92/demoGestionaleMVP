// Commenti in italiano: loading state per pagine tenant

export default function TenantLoading() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-dark-400">Caricamento...</p>
      </div>
    </div>
  )
}
