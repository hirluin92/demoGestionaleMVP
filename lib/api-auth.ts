import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'
import { prisma } from './prisma'

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

  // Gestione accesso tenant: OWNER / STAFF devono avere tenantSlug uguale,
  // SUPER_ADMIN può accedere a qualsiasi tenant passando lo slug.
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

  let tenantId = session.user.tenantId

  // Commento in italiano: se è SUPER_ADMIN che accede a un altro tenant,
  // risolviamo il tenantId partendo dallo slug richiesto.
  if (
    session.user.role === 'SUPER_ADMIN' &&
    session.user.tenantSlug !== tenantSlug
  ) {
    const target = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    })

    if (!target) {
      return {
        error: NextResponse.json(
          { success: false, error: 'Tenant non trovato' },
          { status: 404 }
        ),
        session: null,
        tenantId: null,
      }
    }

    tenantId = target.id
  }

  return {
    error: null,
    session,
    tenantId,
  }
}
