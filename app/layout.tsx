import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  preload: true,
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'Appointly - Sistema Prenotazioni Online',
    template: '%s | Appointly',
  },
  description: 'Sistema di gestione prenotazioni online per saloni, centri estetici e studi. Gestisci appuntamenti, clienti e promemoria da un\'unica interfaccia.',
  keywords: ['prenotazioni online', 'gestione appuntamenti', 'agenda digitale', 'salone', 'centro estetico'],
  authors: [{ name: 'Appointly' }],
  creator: 'Appointly',
  publisher: 'Appointly',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: '/',
    siteName: 'Appointly',
    title: 'Appointly - Sistema Prenotazioni Online',
    description: 'Sistema di gestione prenotazioni online per saloni, centri estetici e studi.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Appointly - Sistema Prenotazioni Online',
    description: 'Sistema di gestione prenotazioni online per saloni, centri estetici e studi.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" className={`${dmSans.variable} h-full`}>
      <body className="font-sans antialiased bg-[#0F1117] text-[#F0F1F4] h-full overflow-hidden">
        <main className="w-full h-full overflow-y-auto overflow-x-hidden main-content">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  )
}
