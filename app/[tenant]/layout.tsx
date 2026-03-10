 'use client'

import { ReactNode, useEffect, useState } from 'react'
import { PhoneMode } from '@/components/phone-mode/phone-mode'

// Commenti in italiano: layout base per tutte le pagine tenant, include pulsante modalità telefono

export default function TenantLayout({
  children,
}: {
  children: ReactNode
}) {
  const [phoneModeActive, setPhoneModeActive] = useState(false)

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
    <div className="min-h-screen bg-dark-900 text-white relative">
      <div className="mx-auto max-w-7xl px-4 py-4">
        {children}
      </div>
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

