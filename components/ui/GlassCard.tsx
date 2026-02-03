'use client'

import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'advanced' | 'enhanced'
  hover?: boolean
}

export function GlassCard({ children, className, variant = 'default', hover = true }: GlassCardProps) {
  if (variant === 'advanced' || variant === 'enhanced') {
    return (
      <div className={cn('glass-card-enhanced', className)}>
        <div className={cn('p-6', hover && 'hover:shadow-[0_25px_100px_rgba(0,0,0,0.75),0_0_60px_rgba(var(--color-gold-main-rgb),0.12)]')}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('glass-card rounded-2xl p-6', className)}>
      {children}
    </div>
  )
}
