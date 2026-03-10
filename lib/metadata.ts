import { Metadata } from 'next'
import { prisma } from './prisma'

// Commenti in italiano: helper per generare metadata SEO dinamici per tenant

export async function generateTenantMetadata(
  tenantSlug: string,
  pageTitle?: string
): Promise<Metadata> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { name: true, category: true, city: true },
  })

  if (!tenant) {
    return {
      title: 'Appointly - Prenotazioni Online',
      description: 'Sistema di prenotazioni online',
    }
  }

  const title = pageTitle
    ? `${pageTitle} - ${tenant.name} | Appointly`
    : `${tenant.name} - Prenotazioni Online | Appointly`

  const description = `${tenant.name} - ${tenant.category} a ${tenant.city}. Prenota il tuo appuntamento online in modo semplice e veloce.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'it_IT',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}
