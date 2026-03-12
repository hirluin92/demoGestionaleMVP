'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  UserCog,
  Settings,
  CreditCard,
  LogOut,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

interface TenantSidebarProps {
  tenantSlug: string
  tenantName?: string
  onClose?: () => void
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agenda', href: '/calendar', icon: Calendar },
  { name: 'Clienti', href: '/clients', icon: Users },
  { name: 'Servizi', href: '/services', icon: Scissors },
  { name: 'Staff', href: '/staff', icon: UserCog },
  { name: 'Impostazioni', href: '/settings', icon: Settings },
  { name: 'Billing', href: '/billing', icon: CreditCard },
]

export function TenantSidebar({ tenantSlug, tenantName, onClose }: TenantSidebarProps) {
  const pathname = usePathname()
  const basePath = `/${tenantSlug}`
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`tenant-sidebar-inner h-full flex flex-col preview-side ${expanded ? 'expanded' : ''}`}
    >
      <div className="side-top">
        <div
          className="logo"
          role="button"
          aria-label="Apri o chiudi il menu"
          onClick={() => setExpanded(prev => !prev)}
        >
          Ap.
        </div>
        <div className="side-stack" style={{ marginTop: 10 }}>
          {navigation.slice(0, 5).map((item) => {
            const href = `${basePath}${item.href}`
            const isActive = pathname === href || pathname?.startsWith(`${href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={href}
                className={`side-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="side-nav-icon" aria-hidden="true">
                  <Icon className="w-3.5 h-3.5 text-[rgba(226,232,255,0.9)]" />
                </span>
                <span className="side-nav-label">{item.name}</span>
              </Link>
            )
          })}
        </div>
        <div className="side-bottom">
          {navigation.slice(5).map((item) => {
            const href = `${basePath}${item.href}`
            const isActive = pathname === href || pathname?.startsWith(`${href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={href}
                className={`side-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="side-nav-icon" aria-hidden="true">
                  <Icon className="w-3.5 h-3.5 text-[rgba(226,232,255,0.9)]" />
                </span>
                <span className="side-nav-label">{item.name}</span>
              </Link>
            )
          })}

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="side-nav-item mt-1 text-[rgba(148,163,184,0.9)] hover:text-white"
          >
            <span className="side-nav-icon" aria-hidden="true">
              <LogOut className="w-3.5 h-3.5" />
            </span>
            <span className="side-nav-label">Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}
