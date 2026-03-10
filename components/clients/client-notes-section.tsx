'use client'

import { useState, useRef } from 'react'

// Commenti in italiano: sezione note cliente, con supporto per note vocali (Web Speech API + Claude)

export type NoteType = 'GENERAL' | 'ALLERGY' | 'PREFERENCE' | 'HISTORY' | 'VOICE'

export interface ClientNoteView {
  id: string
  type: NoteType
  content: string
  createdAt: string
}

interface ClientNotesSectionProps {
  tenantSlug: string
  clientId: string
  initialNotes: ClientNoteView[]
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

interface SpeechRecognitionResultLike {
  transcript: string
  isFinal: boolean
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike[]>
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
}

export function ClientNotesSection(props: ClientNotesSectionProps) {
  const { tenantSlug, clientId, initialNotes } = props
  const [notes, setNotes] = useState<ClientNoteView[]>(initialNotes)
  const [type, setType] = useState<NoteType>('GENERAL')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stato per nota vocale
  const [isRecording, setIsRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/${tenantSlug}/clients/${clientId}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            content,
          }),
        },
      )
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: { id: string; type: NoteType; content: string; createdAt: string }; error?: string }
        | null
      if (!res.ok || !json?.success || !json.data) {
        throw new Error(json?.error ?? 'Errore creazione nota')
      }
      const newNote = json.data
      setNotes(prev => [
        {
          id: newNote.id,
          type: newNote.type,
          content: newNote.content,
          createdAt: newNote.createdAt,
        },
        ...prev,
      ])
      setContent('')
      setType('GENERAL')
    } catch (err) {
      console.error(err)
      setError('Impossibile creare la nota.')
    } finally {
      setLoading(false)
    }
  }

  // Gestione nota vocale
  const startVoiceRecording = () => {
    setVoiceError(null)
    setVoiceTranscript('')

    if (typeof window === 'undefined') {
      setVoiceError('La dettatura vocale non è disponibile su questo dispositivo.')
      return
    }

    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }

    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setVoiceError('Il tuo browser non supporta la dettatura vocale.')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'it-IT'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalTranscript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        const resultArray = event.results[i]
        if (resultArray && resultArray[0]) {
          finalTranscript += resultArray[0].transcript
        }
      }
      setVoiceTranscript(finalTranscript.trim())
    }

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error', event.error)
      setVoiceError('Errore durante la registrazione. Riprova.')
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopVoiceRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  const handleSaveVoiceNote = async () => {
    if (!voiceTranscript) return
    setVoiceLoading(true)
    setVoiceError(null)
    try {
      const res = await fetch(
        `/api/${tenantSlug}/clients/${clientId}/notes/voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawTranscript: voiceTranscript,
          }),
        },
      )
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: ClientNoteView; error?: string }
        | null
      if (!res.ok || !json?.success || !json.data) {
        throw new Error(json?.error ?? 'Errore salvataggio nota vocale')
      }
      setNotes(prev => [json.data!, ...prev])
      setVoiceTranscript('')
    } catch (err) {
      console.error(err)
      setVoiceError('Impossibile salvare la nota vocale.')
    } finally {
      setVoiceLoading(false)
    }
  }

  const badgeForType = (t: NoteType) => {
    if (t === 'ALLERGY') return 'bg-red-500/20 text-red-300 border-red-500/40'
    if (t === 'PREFERENCE') return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    if (t === 'VOICE') return 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    if (t === 'HISTORY') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    return 'bg-dark-700 text-dark-200 border-dark-500'
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleAddNote} className="space-y-2">
        {error && (
          <p className="text-xs text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-2 text-[11px]">
          <select
            value={type}
            onChange={e => setType(e.target.value as NoteType)}
            className="px-2 py-1 rounded-lg bg-dark-100/40 border border-dark-300 text-xs text-white"
          >
            <option value="GENERAL">Generale</option>
            <option value="ALLERGY">Allergia</option>
            <option value="PREFERENCE">Preferenza</option>
            <option value="HISTORY">Storico</option>
          </select>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg bg-dark-100/40 border border-dark-200 text-xs text-white"
            placeholder="Aggiungi una nota (es. allergie, preferenze, storico)..."
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-gold-400 text-xs text-black disabled:opacity-60"
            disabled={loading || !content}
          >
            Salva
          </button>
        </div>
      </form>

      {/* Nota vocale */}
      <div className="space-y-1 text-[11px]">
        {voiceError && (
          <p className="text-xs text-red-400">
            {voiceError}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            className={`px-3 py-1.5 rounded-full border text-xs ${
              isRecording
                ? 'border-red-400 bg-red-500/20 text-red-200'
                : 'border-dark-400 bg-dark-800 text-dark-100'
            }`}
          >
            {isRecording ? 'Interrompi registrazione' : 'Detta una nota vocale'}
          </button>
          {voiceTranscript && !isRecording && (
            <button
              type="button"
              onClick={handleSaveVoiceNote}
              className="px-3 py-1.5 rounded-full bg-gold-400 text-xs text-black disabled:opacity-60"
              disabled={voiceLoading}
            >
              Salva nota vocale
            </button>
          )}
        </div>
        {voiceTranscript && (
          <div className="mt-1 px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-dark-100">
            {voiceTranscript}
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-dark-500">
          Nessuna nota ancora presente.
        </p>
      ) : (
        <div className="space-y-1 max-h-52 overflow-y-auto rounded-lg border border-dark-700 p-2">
          {notes.map(note => (
            <div
              key={note.id}
              className="border-b border-dark-800 last:border-b-0 py-1 text-[11px] flex gap-2"
            >
              <span
                className={`px-2 py-0.5 rounded-full border ${badgeForType(
                  note.type,
                )}`}
              >
                {note.type}
              </span>
              <div className="flex-1">
                <NoteContent note={note} />
                <div className="text-[10px] text-dark-500 mt-0.5">
                  {new Date(note.createdAt).toLocaleString('it-IT')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Commenti in italiano: rende il contenuto nota, parsando il JSON per le note VOICE
function NoteContent({ note }: { note: ClientNoteView }) {
  if (note.type !== 'VOICE') {
    return (
      <div className="text-dark-200 whitespace-pre-wrap">
        {note.content}
      </div>
    )
  }

  try {
    const parsed = JSON.parse(note.content) as {
      summary?: string
      preferences?: string[]
      allergies?: string[]
      products?: string[]
      notes?: string
    }
    return (
      <div className="text-dark-200 space-y-1 text-[11px]">
        {parsed.summary && (
          <div className="font-semibold text-white">
            {parsed.summary}
          </div>
        )}
        {parsed.allergies && parsed.allergies.length > 0 && (
          <div>
            <span className="font-semibold text-red-300">Allergie: </span>
            <span>{parsed.allergies.join(', ')}</span>
          </div>
        )}
        {parsed.preferences && parsed.preferences.length > 0 && (
          <div>
            <span className="font-semibold text-blue-300">Preferenze: </span>
            <span>{parsed.preferences.join(', ')}</span>
          </div>
        )}
        {parsed.products && parsed.products.length > 0 && (
          <div>
            <span className="font-semibold text-purple-300">Prodotti: </span>
            <span>{parsed.products.join(', ')}</span>
          </div>
        )}
        {parsed.notes && (
          <div>
            <span className="font-semibold">Note: </span>
            <span>{parsed.notes}</span>
          </div>
        )}
      </div>
    )
  } catch {
    return (
      <div className="text-dark-200 whitespace-pre-wrap">
        {note.content}
      </div>
    )
  }
}

