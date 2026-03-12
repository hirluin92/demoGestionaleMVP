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
    <div className="min-h-screen bg-dark-900 text-white relative flex">
      {/* Sidebar - nascosta su mobile, visibile su desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-dark-800 border-r border-dark-700
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
      <main className="flex-1 overflow-auto">
        <div className="md:hidden p-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md bg-dark-800 text-white hover:bg-dark-700"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-4">
          {children}
        </div>
      </main>
      <button
        type="button"
        onClick={() => setPhoneModeActive(true)}
        className="fixed bottom-4 right-4 z-30 px-3 py-2 rounded-full bg-gold-400 text-xs text-black shadow-lg hover:bg-gold-300"
      >
        📞 Telefono
      </button>
      <PhoneMode isActive={phoneModeActive} onClose={() => setPhoneModeActive(false)} />
    </div>
  )
}

