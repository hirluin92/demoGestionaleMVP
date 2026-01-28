'use client'

import { useEffect } from 'react'

export function RippleEffect() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const ripple = document.createElement('div')
      ripple.className = 'ripple'
      ripple.style.left = e.clientX - 50 + 'px'
      ripple.style.top = e.clientY - 50 + 'px'
      document.body.appendChild(ripple)
      
      setTimeout(() => ripple.remove(), 800)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}
