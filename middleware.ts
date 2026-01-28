import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    
    // Se non c'è token, il middleware con withAuth dovrebbe già reindirizzare
    // ma aggiungiamo un controllo esplicito per sicurezza
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const isAdmin = token.role === 'ADMIN'
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

    // Se l'utente non è admin e cerca di accedere a route admin
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Se l'utente è admin e cerca di accedere a dashboard cliente
    if (req.nextUrl.pathname === '/dashboard' && isAdmin) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Verifica che il token esista e sia valido
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/bookings/:path*', '/api/packages/:path*', '/api/admin/:path*'],
}
