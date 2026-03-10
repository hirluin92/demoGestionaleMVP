import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenantAccess } from '@/lib/api-auth'
import { env } from '@/lib/env'

// Commenti in italiano: API per nota vocale cliente, usa Claude per strutturare la trascrizione

const paramsSchema = z.object({
  tenant: z.string().min(1),
  clientId: z.string().cuid(),
})

const bodySchema = z.object({
  rawTranscript: z.string().min(5),
})

export async function POST(
  req: Request,
  { params }: { params: { tenant: string; clientId: string } },
) {
  try {
    const parsedParams = paramsSchema.parse(params)
    const auth = await requireTenantAccess(parsedParams.tenant)
    if (auth.error) return auth.error

    const body = await req.json()
    const data = bodySchema.parse(body)

    // Verifica che il cliente appartenga al tenant
    const client = await prisma.client.findFirst({
      where: {
        id: parsedParams.clientId,
        tenantId: auth.tenantId!,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente non trovato' },
        { status: 404 },
      )
    }

    if (!env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Funzionalità note vocali non configurata' },
        { status: 503 },
      )
    }

    // Chiamata a Claude per strutturare la nota
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        system:
          'Sei un assistente per un salone/centro estetico. ' +
          'Struttura questa nota vocale di un operatore su un cliente. ' +
          'Rispondi in JSON con i campi: ' +
          'summary (string), preferences (string[]), allergies (string[]), products (string[]), notes (string). ' +
          'Non aggiungere testo fuori dal JSON.',
        messages: [
          {
            role: 'user',
            content: data.rawTranscript,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      console.error('Errore Claude API', await claudeResponse.text())
      return NextResponse.json(
        { success: false, error: 'Errore elaborazione nota vocale' },
        { status: 502 },
      )
    }

    const claudeJson = (await claudeResponse.json()) as {
      content?: Array<{ type: string; text?: string }>
    }

    const textBlock = claudeJson.content?.find(c => c.type === 'text')?.text
    if (!textBlock) {
      return NextResponse.json(
        { success: false, error: 'Risposta Claude non valida' },
        { status: 502 },
      )
    }

    let structured: unknown
    try {
      structured = JSON.parse(textBlock)
    } catch (parseError) {
      console.error('Errore parse JSON Claude:', parseError, textBlock)
      return NextResponse.json(
        { success: false, error: 'Formato risposta nota vocale non valido' },
        { status: 502 },
      )
    }

    // Salva come nota VOICE con contenuto JSON strutturato
    const note = await prisma.clientNote.create({
      data: {
        clientId: client.id,
        type: 'VOICE',
        content: JSON.stringify(structured),
      },
    })

    return NextResponse.json({
      success: true,
      data: note,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dati non validi', details: error.errors },
        { status: 400 },
      )
    }
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno' },
      { status: 500 },
    )
  }
}

