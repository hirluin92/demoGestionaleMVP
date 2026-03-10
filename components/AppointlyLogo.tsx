'use client'

import React from 'react'

interface AppointlyLogoProps {
  variant?: 'full' | 'icon' | 'text-only'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function AppointlyLogo({ 
  variant = 'full', 
  size = 'md',
  className = '' 
}: AppointlyLogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }

  const textSize = sizeClasses[size]

  // Variante solo testo
  if (variant === 'text-only') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <h1 className={`font-display font-bold ${textSize} mb-1`}>
          <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
            Appointly
          </span>
        </h1>
        <div className="w-full max-w-[120%] h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent mb-1"></div>
        <p className="text-sm md:text-base text-white font-semibold tracking-wider uppercase">
          Gestione Appuntamenti
        </p>
      </div>
    )
  }

  // Variante icona (solo testo stilizzato)
  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`${textSize} font-display font-bold`}>
          <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
            A
          </span>
        </div>
      </div>
    )
  }

  // Variante full (testo completo)
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <h1 className={`font-display font-bold ${textSize} mb-1`}>
        <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
          Appointly
        </span>
      </h1>
      <div className="w-full max-w-[120%] h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent mb-1"></div>
      <p className="text-xs md:text-sm text-white font-semibold tracking-wider uppercase opacity-80">
        Gestione Appuntamenti
      </p>
    </div>
  )
}
