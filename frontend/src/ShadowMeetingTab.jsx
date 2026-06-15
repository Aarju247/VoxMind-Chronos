import { useState, useRef, useEffect, useCallback } from "react"
import { Users, Mic, MicOff, Square, FileText, Download, Zap, Clock, Copy } from "lucide-react"

const BASE    = "http://localhost:8000"
const WS_BASE = "ws://localhost:8000"

const glass = {
  card: {
    background:          "rgba(255,255,255,0.05)",
    backdropFilter:      "blur(16px)",
    WebkitBackdropFilter:"blur(16px)",
    border:              "1px solid rgba(255,255,255,0.10)",
    borderRadius:        "16px",
  }
}

const SPEAKER_COLORS = [
  "#a78bfa", "#67e8f9", "#34d399", "#fbbf24",
  "#f87171", "#fb7185", "#60a5fa", "#a3e635",
]

/* ── Transcript line ── */
const TranscriptLine = ({ entry, isInterim }) => {
  const color = SPEAKER_COLORS[entry.speaker % SPEAKER_COLORS.length]
  return (
    <div style={{
      padding: "7px 12px",
      background: isInterim ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${isInterim ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.09)"}`,
      borderRadius: "10px",
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      opacity: isInterim ? 0.6 : 1,
    }}>
      <span style={{
        fontSize: "10px", fontWeight: 700, color,
        background: `${color}22`, border: `1px solid ${color}44`,
        borderRadius: "6px", padding: "2px 7px",
        flexShrink: 0, marginTop: "1px", whiteSpace: "nowrap",
      }}>
        S{entry.speaker}
      </span>
      <span style={{ fontSize: "13px", color: isInterim ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.85)", lineHeight: 1.5, flex: 1 }}>
        {entry.text}
      </span>
      {entry.time && (
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", flexShrink: 0, marginTop: "2px" }}>
          {entry.time}
        </span>
      )}
    </div>
  )
}

/* ── Summary section ── */
const SummarySection = ({ icon, title, items, color }) => {
  if (!items || items.length === 0) return null
  return (
    <div style={{ marginBottom: "14px" }}>
      <p style={{ fontSize: "12px", fontWeight: 700, color, margin: "0 0 7px", display: "flex", alignItems: "center", gap: "6px" }}>
        {icon} {title}
      </p>
      {Array.isArray(items)
        ? items.map((item, i) => (
          <div key={i} style={{ padding: "6px 10px", background: `${color}10`, border: `1px solid ${color}25`, borderRadius: "8px", fontSize: "12px", color: "rgba(255,255,255,0.78)", marginBottom: "4px", lineHeight: 1.5 }}>
            {item}
          </div>
        ))
        : <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{items}</div>
      }
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const ShadowMeetingTab = () => {
  /* State */
  const [status,      setStatus]      = useState("idle")   // idle|requesting|active|ended|summarizing
  const [sessionId,   setSessionId]   = useState(null)
  const [title,       setTitle]       = useState("Team Meeting")
  const [transcript,  setTranscript]  = useState([])        // final lines
  const [interim,     setInterim]     = useState("")         // partial text
  const [summary,     setSummary]     = useState(null)
  const [elapsed,     setElapsed]     = useState(0)          // seconds
  const [wordCount,   setWordCount]   = useState(0)
  const [msg,         setMsg]         = useState("")
  const [copied,      setCopied]      = useState(false)

  /* Refs */
  const wsRef           = useRef(null)
  const streamRef       = useRef(null)   // MediaStream (screen capture)
  const audioCtxRef     = useRef(null)
  const workletNodeRef  = useRef(null)
  const sourceNodeRef   = useRef(null)
  const timerRef        = useRef(null)
  const startTimeRef    = useRef(null)
  const transcriptEndRef= useRef(null)

  /* Auto-scroll transcript */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript, interim])

  /* Timer */
  useEffect(() => {
    if (status === "active") {
      startTimeRef.current = Date.now() - elapsed * 1000
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [status])

  const flash = (m, t = 4000) => { setMsg(m); setTimeout(() => setMsg(""), t) }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  /* ── START MEETING ── */
  const startMeeting = useCallback(async () => {
    setStatus("requesting")
    setTranscript([])
    setInterim("")
    setSummary(null)
    setElapsed(0)
    setWordCount(0)

    try {
      // 1. Request screen/system audio via getDisplayMedia
      //    Chrome shows a picker — user selects tab or screen
      //    and checks "Share audio" / "Share tab audio"
      let stream
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,    // must request video to get audio on most browsers
          audio: {
            echoCancellation:   false,
            noiseSuppression:   false,
            sampleRate:         48000,
            channelCount:       1,
          },
          selfBrowserSurface: "include",
        })
      } catch (err) {
        if (err.name === "NotAllowedError") {
          flash("❌ Screen share was cancelled or denied. Please try again and select a tab/screen.")
        } else {
          flash(`❌ Screen capture failed: ${err.message}`)
        }
        setStatus("idle")
        return
      }

      // Check we got audio track
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        flash("⚠️ No audio track captured. Make sure to check 'Share tab audio' in the dialog.")
        stream.getTracks().forEach(t => t.stop())
        setStatus("idle")
        return
      }

      streamRef.current = stream

      // 2. Create backend session
      const sessRes = await fetch(`${BASE}/meeting/start`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title }),
      })
      const sessData = await sessRes.json()
      const sid      = sessData.session_id
      setSessionId(sid)

      // 3. Open WebSocket to backend
      const ws = new WebSocket(`${WS_BASE}/ws/meeting/${sid}`)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus("active")
        flash("🎙 Shadow Meeting Mode active — capturing system audio")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === "transcript") {
            setTranscript(prev => [...prev, {
              speaker: data.speaker,
              text:    data.text,
              time:    data.time,
            }])
            setInterim("")
            setWordCount(prev => prev + data.text.split(" ").length)
          }

          if (data.type === "interim") {
            setInterim(data.text)
          }

          if (data.type === "error") {
            flash(`❌ ${data.message}`)
            console.error("[Shadow] WS error:", data.message)
          }

          if (data.type === "stopped") {
            console.log("[Shadow] WebSocket stopped cleanly")
          }
        } catch (e) {
          console.error("[Shadow] parse error:", e)
        }
      }

      ws.onerror = (e) => {
        flash("❌ WebSocket error. Check backend is running.")
        console.error("[Shadow] WS error:", e)
      }

      ws.onclose = () => {
        console.log("[Shadow] WebSocket closed")
      }

      // 4. Set up AudioWorklet pipeline
      //    AudioContext → source → worklet → sends PCM bytes over WS
      const audioCtx = new AudioContext({ sampleRate: 48000 })
      audioCtxRef.current = audioCtx

      // Load worklet (must be in public/ folder)
      await audioCtx.audioWorklet.addModule("/audio-processor.worklet.js")

      const source     = audioCtx.createMediaStreamSource(stream)
      const worklet    = new AudioWorkletNode(audioCtx, "audio-processor")
      sourceNodeRef.current  = source
      workletNodeRef.current = worklet

      // Receive PCM chunks from worklet → send over WebSocket
      worklet.port.onmessage = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(event.data)   // ArrayBuffer of Int16 PCM
        }
      }

      source.connect(worklet)
      // Don't connect worklet to destination — we don't want audio feedback!

      // Stop if user ends screen share from browser UI
      stream.getTracks().forEach(track => {
        track.onended = () => {
          flash("⚠️ Screen share stopped by browser.")
          stopCapture()
        }
      })

    } catch (err) {
      flash(`❌ Failed to start: ${err.message}`)
      console.error("[Shadow] start error:", err)
      setStatus("idle")
    }
  }, [title])

  /* ── STOP CAPTURE (internal — doesn't summarize) ── */
  const stopCapture = useCallback(() => {
    // Stop audio pipeline
    try { workletNodeRef.current?.disconnect() } catch (e) {}
    try { sourceNodeRef.current?.disconnect()  } catch (e) {}
    try { audioCtxRef.current?.close()         } catch (e) {}

    // Stop media stream
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    // Close WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }))
      wsRef.current.close()
    }
    wsRef.current = null
  }, [])

  /* ── END MEETING + SUMMARIZE ── */
  const endMeeting = useCallback(async () => {
    if (status !== "active") return

    setStatus("summarizing")
    stopCapture()
    setInterim("")

    if (transcript.length === 0) {
      flash("⚠️ No transcript captured — nothing to summarize.")
      setStatus("ended")
      return
    }

    try {
      const res  = await fetch(`${BASE}/meeting/summarize`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionId, title }),
      })
      const data = await res.json()

      if (data.error) {
        flash(`❌ ${data.error}`)
        setStatus("ended")
        return
      }

      setSummary(data)
      setStatus("ended")
    } catch (err) {
      flash(`❌ Summary failed: ${err.message}`)
      setStatus("ended")
    }
  }, [status, sessionId, title, transcript, stopCapture])

  /* ── COPY TRANSCRIPT ── */
  const copyTranscript = () => {
    const text = transcript.map(e => `[${e.time}] Speaker ${e.speaker}: ${e.text}`).join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── DOWNLOAD SUMMARY ── */
  const downloadSummary = () => {
    if (!summary) return
    const lines = [
      `# ${summary.title}`,
      `Duration: ${summary.duration} | Speakers: ${summary.speakers} | Words: ${summary.word_count}`,
      "",
      "## Summary",
      summary.summary,
      "",
      "## Action Items",
      ...(summary.action_items || []).map(a => `- ${a}`),
      "",
      "## Decisions",
      ...(summary.decisions || []).map(d => `- ${d}`),
      "",
      "## Unresolved Issues",
      ...(summary.conflicts || []).map(c => `- ${c}`),
      "",
      "## Transcript",
      ...transcript.map(e => `[${e.time}] Speaker ${e.speaker}: ${e.text}`),
    ].join("\n")

    const blob = new Blob([lines], { type: "text/markdown" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `${summary.title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── RESET ── */
  const reset = () => {
    stopCapture()
    setStatus("idle")
    setSessionId(null)
    setTranscript([])
    setInterim("")
    setSummary(null)
    setElapsed(0)
    setWordCount(0)
  }

  /* ── Sentiment badge ── */
  const sentimentColor = { positive: "#34d399", neutral: "#a78bfa", tense: "#f87171" }
  const sentimentEmoji = { positive: "😊", neutral: "😐", tense: "😤" }

  const btnPrimary = {
    padding: "10px 20px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    border: "none", borderRadius: "12px", cursor: "pointer",
    fontSize: "13px", fontWeight: 600, color: "#fff",
    display: "flex", alignItems: "center", gap: "7px",
  }

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={18} color="#a78bfa" /> Shadow Meeting Mode
          </h2>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "3px 0 0" }}>
            Deepgram nova-2-meeting · Speaker diarization · AI summary
          </p>
        </div>

        {/* Status pill */}
        <div style={{
          padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
          background: status === "active" ? "rgba(16,185,129,0.2)" : status === "summarizing" ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.07)",
          border: `1px solid ${status === "active" ? "rgba(16,185,129,0.4)" : status === "summarizing" ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.1)"}`,
          color: status === "active" ? "#6ee7b7" : status === "summarizing" ? "#fbbf24" : "rgba(255,255,255,0.4)",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          {status === "active" && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6ee7b7", animation: "pulse 1.2s infinite" }} />}
          {status === "active" ? `● LIVE  ${formatTime(elapsed)}` :
           status === "summarizing" ? "⏳ Analyzing…" :
           status === "ended" ? "✅ Ended" :
           status === "requesting" ? "⏳ Starting…" : "⬤ Idle"}
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{ padding: "9px 14px", borderRadius: "10px", fontSize: "12px", lineHeight: 1.5,
          background: msg.startsWith("❌") ? "rgba(248,113,113,0.12)" : msg.startsWith("⚠️") ? "rgba(251,191,36,0.12)" : "rgba(52,211,153,0.12)",
          border: `1px solid ${msg.startsWith("❌") ? "rgba(248,113,113,0.3)" : msg.startsWith("⚠️") ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"}`,
          color: msg.startsWith("❌") ? "#fca5a5" : msg.startsWith("⚠️") ? "#fbbf24" : "#6ee7b7",
        }}>
          {msg}
        </div>
      )}

      {/* ── IDLE STATE ── */}
      {status === "idle" && (
        <div style={{ ...glass.card, padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 6px" }}>Start a new meeting</h3>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: "0 0 16px", lineHeight: 1.6 }}>
            VoxMind will silently capture and transcribe your meeting audio using Deepgram's
            meeting model with speaker diarization. Click End Meeting to get an AI summary.
          </p>

          {/* Meeting title */}
          <div style={{ marginBottom: "14px" }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Meeting title</p>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekly Standup, Product Review…"
              style={{ width: "100%", padding: "10px 13px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#f0f0ff", fontSize: "13px", outline: "none" }} />
          </div>

          {/* How it works */}
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>How it works</p>
            {[
              ["🖥️", "Screen share dialog opens — select your meeting tab (Zoom, Meet, Teams)"],
              ["☑️", "Check 'Share tab audio' or 'Share system audio' in the dialog"],
              ["🎙", "Audio streams to Deepgram in real-time — transcript appears live"],
              ["🤖", "Click End Meeting → AI generates summary, action items & decisions"],
            ].map(([icon, text], i) => (
              <div key={i} style={{ display: "flex", gap: "8px", fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "4px", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0 }}>{icon}</span> {text}
              </div>
            ))}
          </div>

          <button onClick={startMeeting} style={{ ...btnPrimary, width: "100%", justifyContent: "center", padding: "13px" }}>
            <Mic size={15} /> Start Shadow Meeting
          </button>

          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", margin: "10px 0 0", textAlign: "center" }}>
            Chrome/Edge only · Requires screen share permission · No audio is stored on our servers
          </p>
        </div>
      )}

      {/* ── ACTIVE / ENDED STATE ── */}
      {(status === "active" || status === "ended" || status === "summarizing") && (
        <>
          {/* Controls */}
          <div style={{ ...glass.card, padding: "14px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>

            <div style={{ display: "flex", gap: "8px", flex: 1 }}>
              <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={12} /> {formatTime(elapsed)}
              </div>
              <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                {transcript.length} lines · {wordCount} words
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {transcript.length > 0 && (
                <button onClick={copyTranscript}
                  style={{ padding: "8px 12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px" }}>
                  <Copy size={12} /> {copied ? "Copied!" : "Copy"}
                </button>
              )}
              {status === "active" && (
                <button onClick={endMeeting}
                  style={{ padding: "9px 18px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Square size={12} /> End Meeting
                </button>
              )}
              {(status === "ended") && (
                <button onClick={reset}
                  style={{ padding: "9px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", cursor: "pointer", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                  New Meeting
                </button>
              )}
            </div>
          </div>

          {/* Live transcript */}
          <div style={{ ...glass.card, padding: "14px", flex: "0 0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#a78bfa", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Live Transcript
              </p>
              {status === "active" && (
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#6ee7b7" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6ee7b7", animation: "pulse 1.2s infinite" }} />
                  Deepgram streaming
                </div>
              )}
            </div>

            <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px" }}>
              {transcript.length === 0 && status === "active" && (
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "20px 0" }}>
                  Waiting for speech…
                </p>
              )}
              {transcript.map((entry, i) => (
                <TranscriptLine key={i} entry={entry} isInterim={false} />
              ))}
              {interim && (
                <TranscriptLine entry={{ speaker: 0, text: interim + "…", time: "" }} isInterim={true} />
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Summary */}
          {status === "summarizing" && (
            <div style={{ ...glass.card, padding: "20px", textAlign: "center" }}>
              <div style={{ display: "flex", gap: "5px", justifyContent: "center", marginBottom: "10px" }}>
                {[0,.15,.3].map((d,i) => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a78bfa", animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}
              </div>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Analyzing {transcript.length} transcript lines with LLaMA 3.3…</p>
            </div>
          )}

          {summary && (
            <div style={{ ...glass.card, padding: "16px" }}>

              {/* Summary header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 3px" }}>{summary.title}</h3>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {[
                      { label: summary.duration,                color: "#67e8f9" },
                      { label: `${summary.speakers} speakers`,  color: "#a78bfa" },
                      { label: `${summary.word_count} words`,   color: "#34d399" },
                      summary.sentiment && {
                        label: `${sentimentEmoji[summary.sentiment]} ${summary.sentiment}`,
                        color: sentimentColor[summary.sentiment]
                      },
                    ].filter(Boolean).map((b, i) => (
                      <span key={i} style={{ fontSize: "11px", padding: "2px 9px", borderRadius: "20px", background: `${b.color}18`, border: `1px solid ${b.color}35`, color: b.color }}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={downloadSummary}
                  style={{ padding: "7px 12px", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "10px", cursor: "pointer", color: "#a78bfa", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Download size={12} /> Download .md
                </button>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "14px" }}>
                <SummarySection icon="📝" title="Summary"       items={summary.summary}      color="#a78bfa" />
                <SummarySection icon="✅" title="Action Items"  items={summary.action_items}  color="#34d399" />
                <SummarySection icon="🎯" title="Decisions"     items={summary.decisions}     color="#67e8f9" />
                <SummarySection icon="⚠️" title="Unresolved Issues" items={summary.conflicts} color="#fbbf24" />
                <SummarySection icon="🏷️" title="Key Topics"   items={summary.key_topics}    color="#f87171" />
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
    </div>
  )
}

export default ShadowMeetingTab
