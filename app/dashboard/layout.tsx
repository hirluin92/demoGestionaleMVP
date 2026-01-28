import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Se non c'è sessione, reindirizza al login
  if (!session) {
    redirect('/login')
  }

  // Se l'utente è admin, reindirizza al pannello admin
  if (session.user.role === 'ADMIN') {
    redirect('/admin')
  }

  return <>{children}</>
}
