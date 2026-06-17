import { useEffect, useState } from "react"
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"
const glass = {
  background:          "rgba(15,15,40,0.92)",
  backdropFilter:      "blur(24px)",
  WebkitBackdropFilter:"blur(24px)",
  border:              "1px solid rgba(255,255,255,0.12)",
  borderRadius:        "20px",
}

const MODELS = [
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5 — lowest latency ⚡" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2 — best quality 🎯" },
  { id: "eleven_monolingual_v1", label: "Monolingual v1 — English only" },
]

const Slider = ({ label, value, min, max, step, onChange, hint }) => (
  <div style={{ marginBottom: "14px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "#a78bfa" }}>{value}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: "100%", accentColor: "#8b5cf6", cursor: "pointer" }}
    />
    {hint && <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: "3px 0 0" }}>{hint}</p>}
  </div>
)

const TTSSettings = ({ tts, onClose }) => {
  const { ttsReady, ttsError, voice, voices, loadVoices, changeVoice, updateSetting, speak } = tts

  const [model,     setModel]     = useState("eleven_turbo_v2_5")
  const [stability, setStability] = useState(0.5)
  const [similarity,setSimilarity]= useState(0.8)
  const [speed,     setSpeed]     = useState(1.0)
  const [loadingV,  setLoadingV]  = useState(false)
  const [saved,     setSaved]     = useState(false)

  /* Load voices on open */
  useEffect(() => {
    if (ttsReady && voices.length === 0) {
      setLoadingV(true)
      loadVoices().finally(() => setLoadingV(false))
    }
    /* Load current settings */
fetch(`${BASE}/tts/settings`)
      .then(r => r.json())
      .then(d => {
        setModel(d.model_id     || "eleven_turbo_v2_5")
        setStability(d.stability ?? 0.5)
        setSimilarity(d.similarity_boost ?? 0.8)
        setSpeed(d.speed        ?? 1.0)
      })
      .catch(() => {})
  }, [ttsReady])

  const saveAll = async () => {
    await Promise.all([
      updateSetting("model_id",         model),
      updateSetting("stability",        stability),
      updateSetting("similarity_boost", similarity),
      updateSetting("speed",            speed),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const testVoice = () => speak("Hello! I am VoxMind Chronos, your AI second brain.")

  const inp = {
    width: "100%", padding: "8px 12px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px", color: "#f0f0ff",
    fontSize: "13px", outline: "none",
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div style={{ ...glass, width: "420px", maxHeight: "88vh", overflowY: "auto", padding: "22px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>🔊 Voice Settings</h2>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "3px 0 0" }}>
              {ttsReady ? "ElevenLabs connected ✅" : "Browser TTS (add ELEVENLABS_API_KEY for neural voice)"}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "5px 10px", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
            ✕
          </button>
        </div>

        {/* Error */}
        {ttsError && (
          <div style={{ padding: "8px 12px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", fontSize: "12px", color: "#fca5a5", marginBottom: "14px" }}>
            {ttsError}
          </div>
        )}

        {/* No key warning */}
        {!ttsReady && (
          <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "10px", fontSize: "12px", color: "#fbbf24", marginBottom: "16px", lineHeight: 1.6 }}>
            <strong>Using browser TTS.</strong> Add <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: "4px" }}>ELEVENLABS_API_KEY</code> to your <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: "4px" }}>.env</code> for neural streaming voice.
            <br />
            <a href="https://elevenlabs.io/sign-up" target="_blank" rel="noreferrer"
              style={{ color: "#fbbf24", marginTop: "4px", display: "inline-block" }}>
              Get free API key →
            </a>
          </div>
        )}

        {ttsReady && (
          <>
            {/* Voice picker */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "6px", fontWeight: 600 }}>VOICE</p>
              {loadingV
                ? <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Loading voices…</p>
                : (
                  <select value={voice} onChange={e => changeVoice(e.target.value)} style={{ ...inp }}>
                    {voices.filter(v => !v.error).map(v => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name} {v.category ? `· ${v.category}` : ""}
                      </option>
                    ))}
                    {voices.length === 0 && <option value="">No voices loaded</option>}
                  </select>
                )
              }
            </div>

            {/* Model picker */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "6px", fontWeight: 600 }}>MODEL</p>
              <select value={model} onChange={e => setModel(e.target.value)} style={{ ...inp }}>
                {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "14px 0" }} />

            {/* Sliders */}
            <Slider
              label="Speed" value={speed} min={0.7} max={1.2} step={0.05}
              onChange={setSpeed}
              hint="0.7 = slow · 1.0 = normal · 1.2 = fast"
            />
            <Slider
              label="Stability" value={stability} min={0} max={1} step={0.05}
              onChange={setStability}
              hint="Higher = more consistent, lower = more expressive"
            />
            <Slider
              label="Clarity / Similarity" value={similarity} min={0} max={1} step={0.05}
              onChange={setSimilarity}
              hint="Higher = closer to original voice"
            />
          </>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={testVoice}
            style={{ flex: 1, padding: "9px", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: "10px", cursor: "pointer", fontSize: "13px", color: "#a78bfa", fontWeight: 600 }}>
            ▶ Test Voice
          </button>
          {ttsReady && (
            <button onClick={saveAll}
              style={{ flex: 1, padding: "9px", background: saved ? "rgba(52,211,153,0.2)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#fff" }}>
              {saved ? "✅ Saved!" : "Save Settings"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TTSSettings
