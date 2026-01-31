import type { Metadata } from 'next'
import { Russo_One } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ParallaxBackground } from '@/components/ParallaxBackground'
import { Particles } from '@/components/Particles'

const russoOne = Russo_One({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-russo-one',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  weight: ['400'],
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
    <html lang="it" className={`${russoOne.variable} h-full`}>
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
