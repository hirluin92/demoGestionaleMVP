import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Se non c'è sessione, reindirizza al login
  if (!session) {
    redirect('/login')
  }

  // Se l'utente non è admin, reindirizza alla dashboard
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
