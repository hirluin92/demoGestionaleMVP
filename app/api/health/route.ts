import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

// Forza rendering dinamico (fa query al database)
export const dynamic = 'force-dynamic'

export async function GET() {
  const healthCheck = {
    status: 'ok' as 'ok' | 'degraded' | 'error',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {
      database: { status: 'unknown' as 'ok' | 'error' | 'unknown', responseTime: 0 },
      googleCalendar: { status: 'unknown' as 'ok' | 'not_configured' | 'unknown' },
      twilio: { status: 'unknown' as 'ok' | 'not_configured' | 'unknown' },
    },
  }

  // Check database
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    healthCheck.checks.database = {
      status: 'ok',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    healthCheck.status = 'error'
    healthCheck.checks.database = { status: 'error', responseTime: 0 }
  }

  // Check Google Calendar config
  try {
    if (env.GOOGLE_CLIENT_ID) {
      const calendarConfig = await prisma.googleCalendar.findFirst()
      healthCheck.checks.googleCalendar = {
        status: calendarConfig ? 'ok' : 'not_configured',
      }
    } else {
      healthCheck.checks.googleCalendar = { status: 'not_configured' }
    }
  } catch (error) {
    healthCheck.checks.googleCalendar = { status: 'unknown' }
  }

  // Check Twilio config
  healthCheck.checks.twilio = {
    status: env.TWILIO_ACCOUNT_SID ? 'ok' : 'not_configured',
  }

  // Set overall status
  if (healthCheck.checks.database.status === 'error') {
    healthCheck.status = 'error'
  } else if (
    healthCheck.checks.googleCalendar.status === 'not_configured' ||
    healthCheck.checks.twilio.status === 'not_configured'
  ) {
    healthCheck.status = 'degraded'
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : healthCheck.status === 'degraded' ? 200 : 503

  return NextResponse.json(healthCheck, { status: statusCode })
}
