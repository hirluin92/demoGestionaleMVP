import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Gestione riconnessione automatica
prisma.$connect().catch(() => {
  // Ignora errori di connessione iniziale, verranno gestiti al primo uso
})

// Helper per eseguire query con retry
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | unknown
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Verifica connessione prima di eseguire
      await prisma.$connect()
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Se è un errore di connessione chiusa, prova a riconnettere
      if (error?.code === 'P1017' || error?.message?.includes('closed the connection')) {
        if (i < maxRetries - 1) {
          // Disconnetti e riconnetti
          await prisma.$disconnect().catch(() => {})
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
          await prisma.$connect().catch(() => {})
          continue
        }
      }
      
      // Se non è un errore di connessione o abbiamo esaurito i retry, rilancia
      throw error
    }
  }
  
  throw lastError
}
