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
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group gpu-accelerated font-sans'
    
    const variants = {
      gold: 'btn-gold text-black font-bold hover:scale-105 hover:shadow-gold-glow',
      'outline-gold': 'border-2 border-gold-400 text-gold-400 hover:bg-gold-400/10 hover:border-gold-300 hover:shadow-gold-glow backdrop-blur-sm',
      dark: 'bg-dark-100 hover:bg-dark-200 text-white shadow-card hover:shadow-card-hover hover:scale-105',
      ghost: 'hover:bg-dark-100/50 text-dark-700 hover:text-dark-800 hover:scale-105',
      danger: 'bg-gradient-to-r from-accent-danger to-red-500 hover:from-red-500 hover:to-red-600 text-white shadow-lg hover:scale-105',
    }
    
    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
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
        {/* Shimmer effect - only if prefers-reduced-motion is not set */}
        <span 
          className="absolute inset-0 bg-shimmer bg-[length:200%_100%] opacity-0 group-hover:opacity-100 transition-opacity will-change-opacity"
          aria-hidden="true"
        />
        
        <span className="relative z-10 flex items-center justify-center">
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
