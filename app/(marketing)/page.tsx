import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import AppointlyLogo from '@/components/AppointlyLogo'
import Button from '@/components/ui/Button'

// Commenti in italiano: landing minimale che porta a registrazione o login

export default async function MarketingHome() {
  const session = await getServerSession(authOptions)

  if (session) {
    // Redirect verso dashboard tenant-specific se disponibile
    if (session.user.tenantSlug) {
      redirect(`/${session.user.tenantSlug}/dashboard`)
    }
    redirect('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <AppointlyLogo variant="full" size="lg" />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-white">
          Agenda intelligente per saloni, centri estetici e studi.
        </h1>
        <p className="text-sm md:text-base text-dark-400 max-w-xl mx-auto">
          Riduci i buchi in agenda, elimina il caos di WhatsApp e gestisci appuntamenti,
          clienti e promemoria da un&apos;unica interfaccia pensata per il tablet in salone.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button variant="gold" size="lg">
              Prova gratuita 30 giorni
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline-gold" size="lg">
              Ho già un account
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-dark-500">
          Nessuna carta richiesta per iniziare. Pensato per funzionare al meglio su tablet.
        </p>
      </div>
    </main>
  )
}

