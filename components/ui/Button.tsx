'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline-gold' | 'dark' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'gold', 
    size = 'md', 
    loading = false,
    fullWidth = false,
    disabled,
    className = '',
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    // Commento in italiano: stile base ispirato ai bottoni della landing (pill, nessuno shimmer, focus chiaro)
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-2xl transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 disabled:opacity-50 disabled:cursor-not-allowed relative gpu-accelerated font-sans'
    
    const variants = {
      gold: 'btn-gold text-[#041018] font-bold hover:translate-y-[-1px] hover:shadow-gold-glow',
      'outline-gold':
        'border border-gold-400/70 text-gold-400 hover:bg-gold-400/10 hover:border-gold-300 hover:shadow-gold-glow backdrop-blur-sm',
      dark: 'bg-dark-100/60 hover:bg-dark-200/80 text-white shadow-card hover:shadow-card-hover',
      ghost: 'hover:bg-dark-100/40 text-dark-300 hover:text-dark-100',
      danger: 'bg-gradient-to-r from-accent-danger to-red-500 hover:from-red-500 hover:to-red-600 text-white shadow-lg',
    }
    
    const sizes = {
      sm: 'px-4 py-2 text-xs md:text-sm',
      md: 'px-5 py-3 text-sm md:text-base',
      lg: 'px-6 py-3.5 text-base md:text-lg',
    }
    
    const widthClass = fullWidth ? 'w-full' : ''
    
    // Accessibility: Announce loading state
    const loadingAriaLabel = loading ? 'Caricamento in corso' : ariaLabel
    
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-label={loadingAriaLabel}
        aria-busy={loading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        {...props}
      >
        <span className="relative flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
              <span>Caricamento...</span>
            </>
          ) : (
            children
          )}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
