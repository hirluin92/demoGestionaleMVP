'use client'

import { useEffect } from 'react'

export function Particles() {
  useEffect(() => {
    const container = document.getElementById('particles-container')
    if (!container) return

    // Detect mobile device
    const isMobile = window.innerWidth <= 768
    const particleCount = isMobile ? 30 : 20 // Più particelle su mobile per compensare le dimensioni piccole

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.left = Math.random() * 100 + '%'
      particle.style.setProperty('--tx', (Math.random() - 0.5) * 300 + 'px')
      
      // Durata animazione: leggermente più veloce su mobile
      const duration = isMobile ? (12 + Math.random() * 15) : (15 + Math.random() * 20)
      particle.style.animationDuration = duration + 's'
      particle.style.animationDelay = Math.random() * 5 + 's'
      
      // Forza rendering hardware su mobile
      if (isMobile) {
        particle.style.willChange = 'transform, opacity'
        particle.style.transform = 'translateZ(0)'
        particle.style.webkitTransform = 'translateZ(0)'
        // L'animazione viene applicata via CSS, non qui
      }
      
      container.appendChild(particle)
    }

    return () => {
      // Cleanup on unmount
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [])

  return <div className="particles-container" id="particles-container" />
}
