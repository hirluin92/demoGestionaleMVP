import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  // Proteggi solo le route tenant (dashboard, calendar, ecc.)
  // NON proteggere: /, /login, /register, /[tenant]/prenota, /api/stripe/webhook, /api/twilio/webhook
  matcher: [
    '/:tenant/dashboard/:path*',
    '/:tenant/calendar/:path*',
    '/:tenant/clients/:path*',
    '/:tenant/services/:path*',
    '/:tenant/staff/:path*',
    '/:tenant/settings/:path*',
    '/:tenant/billing/:path*',
  ],
}
