'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  UserCog, 
  Settings, 
  CreditCard,
  LogOut 
} from 'lucide-react'
import { signOut } from 'next-auth/react'

interface TenantSidebarProps {
  tenantSlug: string
  tenantName?: string
  onClose?: () => void
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Calendario', href: '/calendar', icon: Calendar },
  { name: 'Clienti', href: '/clients', icon: Users },
  { name: 'Servizi', href: '/services', icon: Scissors },
  { name: 'Staff', href: '/staff', icon: UserCog },
  { name: 'Impostazioni', href: '/settings', icon: Settings },
  { name: 'Billing', href: '/billing', icon: CreditCard },
]

export function TenantSidebar({ tenantSlug, tenantName, onClose }: TenantSidebarProps) {
  const pathname = usePathname()
  const basePath = `/${tenantSlug}`

  return (
    <div className="w-full h-full bg-dark-800 border-r border-dark-700 flex flex-col">
      {/* Logo/Header */}
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gold-400">
            {tenantName || 'Appointly'}
          </h2>
          <p className="text-xs text-dark-400 mt-1">Gestione Appuntamenti</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-dark-300 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const href = `${basePath}${item.href}`
          const isActive = pathname === href || pathname?.startsWith(`${href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${isActive
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                  : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-dark-700">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-dark-300 hover:bg-dark-700 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}
