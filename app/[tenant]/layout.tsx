'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PhoneMode } from '@/components/phone-mode/phone-mode'
import { TenantSidebar } from '@/components/layout/tenant-sidebar'
import { Menu } from 'lucide-react'

// Commenti in italiano: layout base per tutte le pagine tenant, include sidebar navigazione e pulsante modalità telefono

export default function TenantLayout({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [phoneModeActive, setPhoneModeActive] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F8' || (e.ctrlKey && e.key.toLowerCase() === 't')) {
        e.preventDefault()
        setPhoneModeActive(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className="min-h-screen text-white relative flex tenant-shell"
      style={{
        background: `
        radial-gradient(circle at 15% 0%, rgba(87, 230, 214, 0.16), transparent 24%),
        radial-gradient(circle at 85% 0%, rgba(122, 168, 255, 0.18), transparent 24%),
        radial-gradient(circle at 50% 35%, rgba(142, 162, 255, 0.1), transparent 30%),
        linear-gradient(180deg, #05060b 0%, #060913 45%, #05060b 100%)
      `,
      }}
    >
      {/* Sidebar - nascosta su mobile, visibile su desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <TenantSidebar tenantSlug={tenantSlug} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenuto principale */}
      <main className="flex-1 overflow-auto relative">
        <div className="md:hidden p-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md bg-[rgba(10,14,24,0.9)] text-white border border-white/10 hover:bg-[rgba(14,20,32,0.95)]"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
          {children}
        </div>
      </main>
      <button
        type="button"
        onClick={() => setPhoneModeActive(true)}
        className="fixed bottom-4 right-4 z-30 px-3 py-2 rounded-full text-xs font-semibold shadow-lg
          bg-[linear-gradient(135deg,#57E6D6,#7AA8FF)] text-[#041018] hover:opacity-90
        "
      >
        📞 Telefono
      </button>
      <PhoneMode isActive={phoneModeActive} onClose={() => setPhoneModeActive(false)} />
    </div>
  )
}

