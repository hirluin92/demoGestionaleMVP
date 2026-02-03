'use client'

import { useEffect } from 'react'

/**
 * Hook per attivare animazioni al scroll usando IntersectionObserver
 * Gli elementi con attributo data-animate verranno animati quando entrano nel viewport
 */
export function useScrollAnimation() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-animate]'))
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('animate-in')
            // Una volta animato, rimuovi l'observer per performance
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}
