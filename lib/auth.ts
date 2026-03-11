import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { env } from './env'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { tenant: true },
          })

          if (!user) {
            console.log('❌ Utente non trovato:', credentials.email)
            return null
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!passwordMatch) {
            console.log('❌ Password non corrisponde per:', credentials.email)
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            tenantSlug: user.tenant.slug,
          }
        } catch (error) {
          console.error('❌ Errore durante authorize:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantSlug = user.tenantSlug
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantSlug = token.tenantSlug as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: env.NEXTAUTH_SECRET,
}
