import { useState, useEffect, useCallback } from "react"
import {
  Calendar, Plus, Trash2, RefreshCw, LogOut,
  Clock, MapPin, Users, Zap, CheckCircle
} from "lucide-react"

const BASE = "http://localhost:8000"

const glass = {
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "16px",
  },
}

const COLOR = {
  purple: "#a78bfa",
  cyan:   "#67e8f9",
  green:  "#34d399",
  red:    "#f87171",
  amber:  "#fbbf24",
  muted:  "rgba(255,255,255,0.4)",
  faint:  "rgba(255,255,255,0.07)",
}

const inp = {
  padding: "9px 12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  color: "#f0f0ff",
  fontSize: "13px",
  outline: "none",
  width: "100%",
}
const btnPrimary = {
  padding: "9px 16px",
  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  gap: "6px",
}
const btnGhost = (color = COLOR.purple) => ({
  padding: "7px 12px",
  background: `${color}18`,
  border: `1px solid ${color}40`,
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
  color,
  display: "flex",
  alignItems: "center",
  gap: "5px",
})

/* ── event card — now receives onEventChange ── */
const EventCard = ({ event, onDelete, userId, onEventChange }) => {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${event.title}"?`)) return
    setDeleting(true)
    await fetch(`${BASE}/calendar/events/${event.id}?user_id=${encodeURIComponent(userId)}`, { method: "DELETE" })
    onDelete(event.id)
    onEventChange?.()   
    setDeleting(false)
  }

  return (
    <div style={{ padding: "11px 14px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: "12px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 3px" }}>{event.title}</p>
        <p style={{ fontSize: "12px", color: COLOR.cyan, margin: "0 0 4px", display: "flex", alignItems: "center", gap: "5px" }}>
          <Clock size={11} /> {event.start_human}
        </p>
        {event.location && (
          <p style={{ fontSize: "11px", color: COLOR.muted, margin: "0 0 2px", display: "flex", alignItems: "center", gap: "5px" }}>
            <MapPin size={11} /> {event.location}
          </p>
        )}
        {event.attendees?.length > 0 && (
          <p style={{ fontSize: "11px", color: COLOR.muted, margin: 0, display: "flex", alignItems: "center", gap: "5px" }}>
            <Users size={11} /> {event.attendees.slice(0, 3).join(", ")}{event.attendees.length > 3 ? ` +${event.attendees.length - 3}` : ""}
          </p>
        )}
      </div>
      <button onClick={handleDelete} disabled={deleting}
        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "5px 7px", cursor: "pointer", color: COLOR.red, flexShrink: 0 }}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}

/* ══ MAIN COMPONENT — accepts onEventChange prop ══ */
const CalendarTab = ({ onEventChange }) => {
  /* auth */
  const [userId,    setUserId]    = useState(() => localStorage.getItem("gcal_user_id") || "")
  const [userInfo,  setUserInfo]  = useState({})
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)

  /* events */
  const [events,       setEvents]       = useState([])
  const [todayEvents,  setTodayEvents]  = useState([])
  const [loading,      setLoading]      = useState(false)
  const [view,         setView]         = useState("upcoming")
  const [msg,          setMsg]          = useState("")

  /* create form */
  const [nlText,   setNlText]   = useState("")
  const [formMode, setFormMode] = useState("nl")
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: "", start_iso: "", end_iso: "",
    description: "", location: "", timezone: "UTC",
  })

  /* free-busy */
  const [fbDate,   setFbDate]   = useState(new Date().toISOString().slice(0, 10))
  const [fbResult, setFbResult] = useState(null)
  const [fbLoading, setFbLoading] = useState(false)

  const flash = (m, t = 3500) => { setMsg(m); setTimeout(() => setMsg(""), t) }

  const checkStatus = useCallback(async (uid) => {
    if (!uid) return
    try {
      const r = await fetch(`${BASE}/auth/google/status?user_id=${encodeURIComponent(uid)}`)
      const d = await r.json()
      setConnected(d.connected)
      if (d.connected) setUserInfo(d)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { if (userId) checkStatus(userId) }, [userId, checkStatus])

  const loadEvents = useCallback(async () => {
    if (!connected || !userId) return
    setLoading(true)
    try {
      const [up, tod] = await Promise.all([
        fetch(`${BASE}/calendar/events?user_id=${encodeURIComponent(userId)}&days=14`).then(r => r.json()),
        fetch(`${BASE}/calendar/today?user_id=${encodeURIComponent(userId)}`).then(r => r.json()),
      ])
      setEvents(up.events || [])
      setTodayEvents(tod.events || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [connected, userId])

  useEffect(() => { if (connected) loadEvents() }, [connected, loadEvents])

  /* OAuth popup */
  const connectGoogle = async () => {
    setConnecting(true)
    const sessionId = crypto.randomUUID()
    try {
      const r   = await fetch(`${BASE}/auth/google/login?session_id=${sessionId}`)
      const { auth_url } = await r.json()
      const popup = window.open(auth_url, "google_auth", "width=500,height=650,left=400,top=100")
      const handler = (event) => {
        if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
          const uid = event.data.user_id
          setUserId(uid)
          localStorage.setItem("gcal_user_id", uid)
          setConnected(true)
          checkStatus(uid)
          flash("✅ Google Calendar connected!")
          window.removeEventListener("message", handler)
          setConnecting(false)
          onEventChange?.()   // refresh dashboard counts
        }
        if (event.data?.type === "GOOGLE_AUTH_ERROR") {
          flash(`❌ Auth failed: ${event.data.error}`)
          window.removeEventListener("message", handler)
          setConnecting(false)
        }
      }
      window.addEventListener("message", handler)
      const poll = setInterval(() => {
        if (popup?.closed) { clearInterval(poll); setConnecting(false) }
      }, 800)
    } catch (e) {
      flash("❌ Could not start Google auth.")
      setConnecting(false)
    }
  }

  const disconnect = async () => {
    if (!window.confirm("Disconnect Google Calendar?")) return
    await fetch(`${BASE}/auth/google/disconnect?user_id=${encodeURIComponent(userId)}`, { method: "DELETE" })
    setConnected(false); setUserId(""); setUserInfo({})
    localStorage.removeItem("gcal_user_id")
    setEvents([]); setTodayEvents([])
    flash("Google Calendar disconnected.")
    onEventChange?.()   // refresh dashboard counts
  }

  /* Create via NL */
  const createNL = async () => {
    if (!nlText.trim()) return
    setCreating(true)
    try {
      const r = await fetch(`${BASE}/calendar/quick-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, text: nlText }),
      })
      const d = await r.json()
      if (d.event) {
        setEvents(p => [d.event, ...p])
        setNlText("")
        flash(`✅ ${d.message}`)
        setView("upcoming")
        onEventChange?.()   // ← refresh dashboard
      } else {
        flash(`❌ ${d.error}`)
      }
    } catch { flash("❌ Failed to create event.") }
    finally { setCreating(false) }
  }

  /* Create via form */
  const createManual = async () => {
    if (!form.title || !form.start_iso || !form.end_iso) {
      flash("Fill in title, start, and end time."); return
    }
    setCreating(true)
    try {
      const r = await fetch(`${BASE}/calendar/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, ...form }),
      })
      const d = await r.json()
      if (d.event) {
        setEvents(p => [d.event, ...p])
        setForm({ title: "", start_iso: "", end_iso: "", description: "", location: "", timezone: "UTC" })
        flash(`✅ Event created: ${d.event.title}`)
        setView("upcoming")
        onEventChange?.()   // ← refresh dashboard
      } else {
        flash(`❌ ${d.error}`)
      }
    } catch { flash("❌ Failed to create event.") }
    finally { setCreating(false) }
  }

  /* Free-busy */
  const checkFreeBusy = async () => {
    setFbLoading(true)
    try {
      const r = await fetch(`${BASE}/calendar/free-busy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, date: fbDate }),
      })
      setFbResult(await r.json())
    } catch { flash("❌ Free-busy check failed.") }
    finally { setFbLoading(false) }
  }

  const sectionTitle = (t) => (
    <p style={{ fontSize: "10px", fontWeight: 600, color: COLOR.muted, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>{t}</p>
  )

  /* NOT CONNECTED */
  if (!connected) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <div style={{ fontSize: "48px" }}>📅</div>
      <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, textAlign: "center" }}>Connect Google Calendar</h2>
      <p style={{ fontSize: "13px", color: COLOR.muted, textAlign: "center", maxWidth: "340px", lineHeight: 1.6 }}>
        Sign in with your Google account to sync events, create meetings by voice, and check your schedule.
      </p>
      <button onClick={connectGoogle} disabled={connecting}
        style={{ ...btnPrimary, padding: "12px 28px", fontSize: "14px", borderRadius: "14px", opacity: connecting ? 0.7 : 1 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {connecting ? "Connecting…" : "Connect with Google"}
      </button>
      {msg && <p style={{ fontSize: "12px", color: COLOR.green }}>{msg}</p>}
    </div>
  )

  /* CONNECTED */
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {userInfo.picture && <img src={userInfo.picture} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(167,139,250,0.4)" }} />}
          <div>
            <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Google Calendar</p>
            <p style={{ fontSize: "11px", color: COLOR.muted, margin: 0 }}>{userInfo.email}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "7px" }}>
          <button onClick={loadEvents} style={btnGhost(COLOR.cyan)}><RefreshCw size={12} /> Refresh</button>
          <button onClick={disconnect} style={btnGhost(COLOR.red)}><LogOut size={12} /> Disconnect</button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: "8px 12px", background: msg.startsWith("✅") ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)", border: `1px solid ${msg.startsWith("✅") ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`, borderRadius: "10px", fontSize: "12px", color: msg.startsWith("✅") ? COLOR.green : COLOR.red, marginBottom: "12px" }}>
          {msg}
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { id: "upcoming", label: `Upcoming (${events.length})` },
          { id: "today",    label: `Today (${todayEvents.length})` },
          { id: "create",   label: "+ New Event" },
          { id: "freebusy", label: "Free/Busy" },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            style={{ padding: "6px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: view === t.id ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.05)", border: `1px solid ${view === t.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)"}`, color: view === t.id ? COLOR.purple : COLOR.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* UPCOMING */}
      {view === "upcoming" && (
        <div style={{ ...glass.card, padding: "14px" }}>
          {sectionTitle("Next 14 days")}
          {loading
            ? <div style={{ display: "flex", gap: "4px", padding: "8px 0" }}>{[0,.15,.3].map((d,i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLOR.purple, animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}</div>
            : events.length === 0
            ? <p style={{ fontSize: "13px", color: COLOR.muted }}>No events in the next 14 days.</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {events.map(e => (
                  <EventCard
                    key={e.id} event={e} userId={userId}
                    onDelete={id => setEvents(p => p.filter(x => x.id !== id))}
                    onEventChange={onEventChange}   // ← pass down
                  />
                ))}
              </div>
          }
        </div>
      )}

      {/* TODAY */}
      {view === "today" && (
        <div style={{ ...glass.card, padding: "14px" }}>
          {sectionTitle("Today's schedule")}
          {todayEvents.length === 0
            ? <p style={{ fontSize: "13px", color: COLOR.muted }}>No events today — you're free! 🎉</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {todayEvents.map(e => (
                  <EventCard
                    key={e.id} event={e} userId={userId}
                    onDelete={id => setTodayEvents(p => p.filter(x => x.id !== id))}
                    onEventChange={onEventChange}   // ← pass down
                  />
                ))}
              </div>
          }
        </div>
      )}

      {/* CREATE */}
      {view === "create" && (
        <div style={{ ...glass.card, padding: "16px" }}>
          {sectionTitle("Create event")}
          <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
            <button onClick={() => setFormMode("nl")}
              style={{ ...btnGhost(formMode === "nl" ? COLOR.purple : COLOR.muted), fontWeight: formMode === "nl" ? 600 : 400 }}>
              <Zap size={12} /> Natural language
            </button>
            <button onClick={() => setFormMode("manual")}
              style={{ ...btnGhost(formMode === "manual" ? COLOR.purple : COLOR.muted), fontWeight: formMode === "manual" ? 600 : 400 }}>
              <Calendar size={12} /> Manual form
            </button>
          </div>

          {formMode === "nl" && (
            <div>
              <p style={{ fontSize: "12px", color: COLOR.muted, marginBottom: "8px" }}>Describe the event in plain English.</p>
              <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                <input value={nlText} onChange={e => setNlText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createNL()}
                  placeholder='"Team standup tomorrow at 9am for 30 minutes"'
                  style={{ ...inp }} />
                <button onClick={createNL} disabled={!nlText.trim() || creating}
                  style={{ ...btnPrimary, whiteSpace: "nowrap", opacity: !nlText.trim() ? 0.5 : 1 }}>
                  {creating ? "Creating…" : <><Zap size={13} /> Create</>}
                </button>
              </div>
            </div>
          )}

          {formMode === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Event title *" style={{ ...inp }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <p style={{ fontSize: "11px", color: COLOR.muted, margin: "0 0 4px" }}>Start *</p>
                  <input type="datetime-local" value={form.start_iso} onChange={e => setForm(p => ({...p, start_iso: e.target.value}))} style={{ ...inp }} />
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: COLOR.muted, margin: "0 0 4px" }}>End *</p>
                  <input type="datetime-local" value={form.end_iso} onChange={e => setForm(p => ({...p, end_iso: e.target.value}))} style={{ ...inp }} />
                </div>
              </div>
              <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder="Location (optional)" style={{ ...inp }} />
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Description (optional)" rows={2} style={{ ...inp, resize: "vertical" }} />
              <select value={form.timezone} onChange={e => setForm(p => ({...p, timezone: e.target.value}))} style={{ ...inp }}>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
              <button onClick={createManual} disabled={creating || !form.title}
                style={{ ...btnPrimary, justifyContent: "center", opacity: !form.title ? 0.5 : 1 }}>
                {creating ? "Creating…" : <><CheckCircle size={13} /> Create Event</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* FREE/BUSY */}
      {view === "freebusy" && (
        <div style={{ ...glass.card, padding: "16px" }}>
          {sectionTitle("Free/busy checker")}
          <p style={{ fontSize: "12px", color: COLOR.muted, marginBottom: "12px" }}>Check which time slots are busy on a given day.</p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <input type="date" value={fbDate} onChange={e => setFbDate(e.target.value)} style={{ ...inp, flex: 1 }} />
            <button onClick={checkFreeBusy} disabled={fbLoading} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>
              {fbLoading ? "Checking…" : "Check"}
            </button>
          </div>
          {fbResult && (
            <div>
              <p style={{ fontSize: "13px", color: fbResult.is_free ? COLOR.green : COLOR.amber, fontWeight: 600, marginBottom: "8px" }}>
                {fbResult.is_free ? "✅ You're free all day!" : `⚠️ ${fbResult.busy_slots.length} busy slot${fbResult.busy_slots.length > 1 ? "s" : ""}`}
              </p>
              {fbResult.busy_slots.map((slot, i) => {
                const fmt = (iso) => { try { return new Date(iso).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) } catch { return iso } }
                return (
                  <div key={i} style={{ padding: "7px 10px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "8px", fontSize: "12px", color: COLOR.amber, marginBottom: "5px" }}>
                    {fmt(slot.start)} — {fmt(slot.end)}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  )
}

export default CalendarTab
