import { useState, useRef, useCallback, useEffect } from "react"

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function useTTS() {
  const [speaking,  setSpeaking]  = useState(false)
  const [ttsReady,  setTtsReady]  = useState(false)   // true = ElevenLabs available
  const [ttsError,  setTtsError]  = useState("")
  const [voice,     setVoice]     = useState("")
  const [voices,    setVoices]    = useState([])

  const audioRef    = useRef(null)   // current HTMLAudioElement
  const abortRef    = useRef(null)   // AbortController for in-flight request

  /* ── Check ElevenLabs status on mount ── */
  useEffect(() => {
    fetch(`${BASE}/tts/status`)
      .then(r => r.json())
      .then(d => {
        setTtsReady(d.configured && d.enabled)
        if (!d.configured) setTtsError(d.message)
      })
      .catch(() => setTtsReady(false))

    fetch(`${BASE}/tts/settings`)
      .then(r => r.json())
      .then(d => setVoice(d.voice_id || ""))
      .catch(() => {})
  }, [])

  /* ── Load voices ── */
  const loadVoices = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/tts/voices`)
      const d = await r.json()
      setVoices(d.voices || [])
      return d.voices || []
    } catch { return [] }
  }, [])

  /* ── Stop any current audio ── */
  const stop = useCallback(() => {
    // Stop ElevenLabs audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    // Abort in-flight streaming request
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    // Stop browser TTS
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  /* ── Browser TTS fallback ── */
  const browserSpeak = useCallback((text, onEnd) => {
    if (!("speechSynthesis" in window)) { onEnd?.(); return }
    window.speechSynthesis.cancel()
    const utt   = new SpeechSynthesisUtterance(text)
    utt.lang    = "en-US"
    utt.rate    = 1
    utt.pitch   = 1
    utt.onend   = () => { setSpeaking(false); onEnd?.() }
    utt.onerror = () => { setSpeaking(false); onEnd?.() }
    setSpeaking(true)
    window.speechSynthesis.speak(utt)
  }, [])

  /* ── Main speak function ── */
  const speak = useCallback(async (text, { onEnd, voiceId } = {}) => {
    if (!text?.trim()) return
    stop()   // cancel previous

    // ── ElevenLabs streaming path ──────────────────────────────
    if (ttsReady) {
      setSpeaking(true)
      setTtsError("")

      const controller  = new AbortController()
      abortRef.current  = controller

      try {
        const resp = await fetch(`${BASE}/tts/speak`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ text, voice_id: voiceId || voice || undefined }),
          signal:  controller.signal,
        })

        if (!resp.ok) {
          throw new Error(`TTS API error: ${resp.status}`)
        }

        // Collect streaming chunks into a Blob
        const reader = resp.body.getReader()
        const chunks = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) chunks.push(value)
        }

        if (controller.signal.aborted) return

        // Build blob URL and play
        const blob = new Blob(chunks, { type: "audio/mpeg" })
        const url  = URL.createObjectURL(blob)
        const audio = new Audio()
        audioRef.current = audio
        audio.preload = "auto"
        audio.src = url

        audio.onended = () => {
          URL.revokeObjectURL(url)
          setSpeaking(false)
          audioRef.current = null
          onEnd?.()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          setSpeaking(false)
          audioRef.current = null
          browserSpeak(text, onEnd)
        }
        audio.oncanplaythrough = async () => {
          try {
            await audio.play()
          } catch (err) {
            URL.revokeObjectURL(url)
            setSpeaking(false)
            audioRef.current = null
            browserSpeak(text, onEnd)
          }
        }
        audio.load()


      } catch (err) {
        if (err.name === "AbortError") {
          setSpeaking(false)
          return
        }
        // Any error → fall back to browser TTS
        console.warn("[TTS] ElevenLabs failed, using browser fallback:", err.message)
        setTtsError(`ElevenLabs error: ${err.message}`)
        browserSpeak(text, onEnd)
      }

    } else {
      // ── Browser TTS path (no ElevenLabs key) ──────────────────
      browserSpeak(text, onEnd)
    }
  }, [ttsReady, voice, stop, browserSpeak])

  /* ── Update voice setting ── */
  const changeVoice = useCallback(async (voiceId) => {
    setVoice(voiceId)
    try {
      await fetch(`${BASE}/tts/settings`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ voice_id: voiceId }),
      })
    } catch (e) { console.error(e) }
  }, [])

  /* ── Update any setting ── */
  const updateSetting = useCallback(async (key, value) => {
    try {
      await fetch(`${BASE}/tts/settings`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [key]: value }),
      })
    } catch (e) { console.error(e) }
  }, [])

  return {
    speak,           // (text, { onEnd, voiceId }?) → void
    stop,            // stop current audio immediately
    speaking,        // boolean — is audio playing?
    ttsReady,        // boolean — is ElevenLabs configured?
    ttsError,        // string  — last error message
    voice,           // string  — current voice_id
    voices,          // array   — available voices
    loadVoices,      // () → Promise<voices[]>
    changeVoice,     // (voiceId) → void
    updateSetting,   // (key, value) → void
  }
}