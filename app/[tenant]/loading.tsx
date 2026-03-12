// Commenti in italiano: loading state per pagine tenant

export default function TenantLoading() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center text-white"
      style={{
        background: `
        radial-gradient(circle at 15% 0%, rgba(87, 230, 214, 0.16), transparent 24%),
        radial-gradient(circle at 85% 0%, rgba(122, 168, 255, 0.18), transparent 24%),
        radial-gradient(circle at 50% 35%, rgba(142, 162, 255, 0.1), transparent 30%),
        linear-gradient(180deg, #05060b 0%, #060913 45%, #05060b 100%)
      `,
      }}
    >
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-accent-main border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-dark-400">Caricamento...</p>
      </div>
    </div>
  )
}
