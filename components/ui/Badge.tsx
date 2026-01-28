import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  glow?: boolean
}

export function Badge({ 
  children, 
  variant = 'gold', 
  size = 'md',
  glow = false,
  className = '',
  ...props 
}: BadgeProps) {
  const variants = {
    gold: 'status-badge status-confirmed',
    success: 'status-badge status-confirmed',
    warning: 'status-badge status-pending',
    danger: 'status-badge status-cancelled',
    info: 'status-badge status-completed',
  }
  
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  }
  
  const glowClass = glow ? 'animate-glow will-change-shadow' : ''
  
  return (
    <span 
      className={`inline-flex items-center rounded-full font-sans ${variants[variant]} ${sizes[size]} ${glowClass} ${className}`}
      role="status"
      {...props}
    >
      {children}
    </span>
  )
}
