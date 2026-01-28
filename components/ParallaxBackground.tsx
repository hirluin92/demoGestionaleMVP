'use client'

import { useEffect } from 'react'

export function ParallaxBackground() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      const mouseY = (e.clientY / window.innerHeight - 0.5) * 2
      
      document.querySelectorAll('.parallax-layer').forEach((layer) => {
        const speed = parseFloat(layer.getAttribute('data-speed') || '0.5')
        const x = mouseX * 50 * speed
        const y = mouseY * 50 * speed
        ;(layer as HTMLElement).style.transform = `translate(${x}px, ${y}px)`
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="parallax-container" id="parallax-container">
      <div className="parallax-layer parallax-layer-1" data-speed="0.5" />
      <div className="parallax-layer parallax-layer-2" data-speed="0.3" />
      <div className="parallax-layer parallax-layer-3" data-speed="0.1" />
    </div>
  )
}
