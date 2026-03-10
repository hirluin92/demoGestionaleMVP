import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANS } from '@/lib/stripe'
import { BillingButton } from '@/components/billing/billing-button'

// Commenti in italiano: pagina billing con stato piano corrente e pulsante per checkout Stripe

export default async function TenantBillingPage({
  params,
}: {
  params: { tenant: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (
    session.user.tenantSlug !== params.tenant &&
    session.user.role !== 'SUPER_ADMIN'
  ) {
    redirect('/login')
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: session.user.tenantId,
    },
  })

  if (!tenant) {
    redirect('/login')
  }

  const currentPlan = tenant.plan
  const planInfo = PLANS[currentPlan]

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">
        Billing & Piano
      </h1>

      <div className="border border-dark-700 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-dark-500">Piano attuale</div>
            <div className="text-lg font-semibold text-white">
              {planInfo.name}
            </div>
          </div>
          <div className="text-right text-xs text-dark-400">
            <div>Stato: <span className="text-white">{tenant.status}</span></div>
            {tenant.trialEndsAt && (
              <div>
                Trial fino al{' '}
                <span className="text-white">
                  {tenant.trialEndsAt.toLocaleDateString('it-IT')}
                </span>
              </div>
            )}
          </div>
        </div>
        <BillingButton currentPlan={currentPlan} />
      </div>
    </section>
  )
}

