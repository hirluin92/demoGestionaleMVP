'use client'

import React from 'react'
import Image from 'next/image'

interface HugemassLogoProps {
  variant?: 'full' | 'icon' | 'text-only'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function HugemassLogo({ 
  variant = 'full', 
  size = 'md',
  className = '' 
}: HugemassLogoProps) {
  const sizeClasses = {
    sm: { width: 120, height: 60 },
    md: { width: 180, height: 90 },
    lg: { width: 240, height: 120 },
    xl: { width: 320, height: 160 },
  }

  const dimensions = sizeClasses[size]

  // Per variant 'icon' o 'text-only', usiamo comunque l'immagine completa
  // ma possiamo aggiungere classi CSS per nascondere parti se necessario
  if (variant === 'text-only') {
    // Solo testo - non usiamo l'immagine
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <h1 className="font-display font-bold text-2xl md:text-3xl mb-1">
          <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
            HUGE MASS
          </span>
        </h1>
        <div className="w-full max-w-[120%] h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent mb-1"></div>
        <p className="text-sm md:text-base text-white font-semibold tracking-wider uppercase">
          PERSONAL TRAINING
        </p>
      </div>
    )
  }

  // Per 'full' e 'icon' usiamo l'immagine SVG
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/logo-hugemass.svg"
        alt="HUGE MASS PERSONAL TRAINING"
        width={dimensions.width}
        height={dimensions.height}
        className="object-contain"
        priority={variant === 'full'} // Priorità alta per il logo nella pagina di login
      />
    </div>
  )
}
