'use client'

import { useEffect } from 'react'

export function Particles() {
  useEffect(() => {
    const container = document.getElementById('particles-container')
    if (!container) return

    // Create particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.left = Math.random() * 100 + '%'
      particle.style.setProperty('--tx', (Math.random() - 0.5) * 300 + 'px')
      particle.style.animationDuration = (15 + Math.random() * 20) + 's'
      particle.style.animationDelay = Math.random() * 5 + 's'
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
