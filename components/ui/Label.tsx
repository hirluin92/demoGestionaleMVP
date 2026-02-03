'use client'

import { cn } from '@/lib/utils'

interface LabelProps {
  children: React.ReactNode
  className?: string
}

export function Label({ children, className }: LabelProps) {
  return (
    <div className={cn(
      'inline-block text-sm font-bold tracking-[0.18em]',
      'text-[var(--color-gold-main)]',
      'drop-shadow-[0_0_8px_rgba(var(--color-gold-main-rgb),0.3)]',
      className
    )}>
      {String(children).toUpperCase()}
    </div>
  )
}
