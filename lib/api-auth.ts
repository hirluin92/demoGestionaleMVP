import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

/**
 * Verifica che l'utente abbia accesso al tenant specificato
 * Usa questa funzione in OGNI API route come prima cosa
 * 
 * @param tenantSlug Slug del tenant da verificare
 * @returns Oggetto con error (se presente), session e tenantId
 */
export async function requireTenantAccess(tenantSlug: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Non autenticato' },
        { status: 401 }
      ),
      session: null,
      tenantId: null,
    }
  }

  if (
    session.user.tenantSlug !== tenantSlug &&
    session.user.role !== 'SUPER_ADMIN'
  ) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Accesso negato' },
        { status: 403 }
      ),
      session: null,
      tenantId: null,
    }
  }

  return {
    error: null,
    session,
    tenantId: session.user.tenantId,
  }
}
