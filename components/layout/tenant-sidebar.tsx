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
    <div className="w-full h-full bg-[#1A1D26] border-r border-[#2E3240] flex flex-col">
      {/* Logo/Header */}
      <div className="p-4 border-b border-[#2E3240] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#C9A84C]">
            {tenantName || 'Appointly'}
          </h2>
          <p className="text-xs text-[#9BA1B0] mt-1">Gestione Appuntamenti</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-[#9BA1B0] hover:text-white p-1"
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
                  ? 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30'
                  : 'text-[#9BA1B0] hover:bg-[#242833] hover:text-white'
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
      <div className="p-4 border-t border-[#2E3240]">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#9BA1B0] hover:bg-[#242833] hover:text-white w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}
