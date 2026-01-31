import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { env } from './env'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          console.log('[AUTH] Tentativo di login iniziato')
          
          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Credenziali mancanti')
            return null
          }

          const emailLower = credentials.email.toLowerCase().trim()
          console.log('[AUTH] Cercando utente con email:', emailLower)

          const user = await prisma.user.findUnique({
            where: { email: emailLower }
          })

          if (!user) {
            console.log('[AUTH] Utente non trovato nel database per email:', emailLower)
            // Verifica se ci sono utenti nel database
            const userCount = await prisma.user.count()
            console.log('[AUTH] Totale utenti nel database:', userCount)
            return null
          }

          console.log('[AUTH] Utente trovato:', { id: user.id, email: user.email, role: user.role })

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.log('[AUTH] Password non valida per:', emailLower)
            return null
          }

          console.log('[AUTH] Login riuscito:', { email: user.email, role: user.role })
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('[AUTH] Errore durante authorize:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Quando l'utente fa login, inizializza il token
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email
        token.name = user.name
        token.iat = Math.floor(Date.now() / 1000) // Issued at time
        return token
      }
      
      // Se non c'è un token valido, restituisci un token vuoto ma valido
      if (!token || !token.id) {
        return {
          ...token,
          id: '',
          role: '',
          email: '',
          name: '',
        }
      }
      
      // Quando viene chiamato update(), ricarica i dati dal database
      if (trigger === 'update' && token.id) {
        try {
          const updatedUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          })
          
          if (updatedUser) {
            token.email = updatedUser.email
            token.name = updatedUser.name
            token.role = updatedUser.role
          }
        } catch (error) {
          console.error('[AUTH] Errore aggiornamento token:', error)
        }
      }
      
      // Verifica scadenza token (8 ore)
      const now = Math.floor(Date.now() / 1000)
      const tokenIat = (token.iat as number) || 0
      const tokenAge = now - tokenIat
      const maxAge = 8 * 60 * 60 // 8 ore in secondi
      
      // Se il token è scaduto, restituisci un token vuoto ma valido
      // NextAuth gestirà il redirect al login
      if (tokenAge > maxAge) {
        return {
          ...token,
          id: '',
          role: '',
          email: '',
          name: '',
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // Se il token non è valido o è scaduto, restituisci una sessione vuota
      if (!token || !token.id || !token.role) {
        return {
          ...session,
          user: {
            ...session.user,
            id: '',
            role: '',
            email: '',
            name: '',
          },
        }
      }
      
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = (token.email as string) || session.user.email
        session.user.name = (token.name as string) || session.user.name
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Se l'URL è relativo, usa baseUrl
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Se l'URL è sulla stessa origine, permetti
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 ore (scadenza automatica)
    updateAge: 60 * 60, // Aggiorna la sessione ogni ora se attiva
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 ore (scadenza automatica)
  },
  secret: env.NEXTAUTH_SECRET,
}
