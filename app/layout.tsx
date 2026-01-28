import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import { Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ParallaxBackground } from '@/components/ParallaxBackground'
import { Particles } from '@/components/Particles'

const outfit = Outfit({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cormorant',
  preload: true,
  fallback: ['Georgia', 'serif'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Hugemass - Sistema Prenotazioni',
  description: 'Sistema di gestione prenotazioni per studio di personal training',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" className={`${outfit.variable} ${cormorant.variable} h-full`}>
      <head>
        {/* Preconnect per performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased bg-[#0a0a0a] text-white h-full overflow-hidden">
        <ParallaxBackground />
        <Particles />
        <main className="w-full h-full overflow-y-auto overflow-x-hidden main-content no-scrollbar">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  )
}
