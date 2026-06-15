import { useState, useEffect, useCallback } from "react"
import { Trash2, Plus, CheckSquare, FileText, Calendar, RefreshCw } from "lucide-react"

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

const inp = {
  flex: 1,
  padding: "9px 13px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  color: "#f0f0ff",
  fontSize: "13px",
  outline: "none",
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
  whiteSpace: "nowrap",
}

/* ── Section header ── */
const SectionHead = ({ icon, title, count, color, onRefresh }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ color }}>{icon}</span>
      <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#f0f0ff" }}>{title}</h3>
      <span style={{ fontSize: "11px", padding: "1px 8px", borderRadius: "20px", background: `${color}22`, border: `1px solid ${color}44`, color }}>{count}</span>
    </div>
    {onRefresh && (
      <button onClick={onRefresh} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: "4px" }}>
        <RefreshCw size={13} />
      </button>
    )}
  </div>
)

/* ── Feedback banner ── */
const Flash = ({ msg }) => {
  if (!msg) return null
  const isErr = msg.startsWith("❌")
  return (
    <div style={{
      padding: "8px 12px", borderRadius: "9px", fontSize: "12px", marginBottom: "10px",
      background: isErr ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)",
      border: `1px solid ${isErr ? "rgba(248,113,113,0.3)" : "rgba(52,211,153,0.3)"}`,
      color: isErr ? "#fca5a5" : "#6ee7b7",
    }}>
      {msg}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const TodosNotesTab = () => {
  const [section, setSection] = useState("todos")  // todos | notes | events

  /* Todos state */
  const [todos,       setTodos]       = useState([])
  const [todosLoading,setTodosLoading]= useState(false)
  const [newTask,     setNewTask]     = useState("")
  const [addingTodo,  setAddingTodo]  = useState(false)
  const [todoMsg,     setTodoMsg]     = useState("")

  /* Notes state */
  const [notes,       setNotes]       = useState([])
  const [notesLoading,setNotesLoading]= useState(false)
  const [newNote,     setNewNote]     = useState("")
  const [addingNote,  setAddingNote]  = useState(false)
  const [noteMsg,     setNoteMsg]     = useState("")

  /* Local Events state */
  const [events,        setEvents]        = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventMsg,      setEventMsg]      = useState("")

  const flash = (setter, msg, ms = 3000) => {
    setter(msg)
    setTimeout(() => setter(""), ms)
  }

  /* ── Load todos ── */
  const loadTodos = useCallback(async () => {
    setTodosLoading(true)
    try {
      const r = await fetch(`${BASE}/todos`)
      const d = await r.json()
      setTodos(d.todos || [])
    } catch { flash(setTodoMsg, "❌ Failed to load todos.") }
    finally { setTodosLoading(false) }
  }, [])

  /* ── Load notes ── */
  const loadNotes = useCallback(async () => {
    setNotesLoading(true)
    try {
      const r = await fetch(`${BASE}/notes`)
      const d = await r.json()
      setNotes(d.notes || [])
    } catch { flash(setNoteMsg, "❌ Failed to load notes.") }
    finally { setNotesLoading(false) }
  }, [])

  /* ── Load local events ── */
  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    try {
      const r = await fetch(`${BASE}/local-events`)
      const d = await r.json()
      setEvents(d.events || [])
    } catch { flash(setEventMsg, "❌ Failed to load events.") }
    finally { setEventsLoading(false) }
  }, [])

  /* Load on mount and section change */
  useEffect(() => { loadTodos() }, [])
  useEffect(() => {
    if (section === "todos")  loadTodos()
    if (section === "notes")  loadNotes()
    if (section === "events") loadEvents()
  }, [section])

  /* ── Add todo ── */
  const addTodo = async () => {
    if (!newTask.trim()) return
    setAddingTodo(true)
    try {
      const r = await fetch(`${BASE}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: newTask.trim() }),
      })
      const d = await r.json()
      if (d.error) { flash(setTodoMsg, `❌ ${d.error}`); return }
      setTodos(d.todos.map((t, i) => ({ ...t, index: i })))
      setNewTask("")
      flash(setTodoMsg, `✅ Added: ${newTask.trim()}`)
    } catch { flash(setTodoMsg, "❌ Failed to add todo.") }
    finally { setAddingTodo(false) }
  }

  /* ── Toggle todo ── */
  const toggleTodo = async (index) => {
    try {
      await fetch(`${BASE}/todos/${index}/complete`, { method: "PATCH" })
      setTodos(prev => prev.map(t => t.index === index ? { ...t, completed: !t.completed } : t))
    } catch { flash(setTodoMsg, "❌ Failed to update.") }
  }

  /* ── Delete todo ── */
  const deleteTodo = async (index) => {
    try {
      const r = await fetch(`${BASE}/todos/${index}`, { method: "DELETE" })
      const d = await r.json()
      if (d.error) { flash(setTodoMsg, `❌ ${d.error}`); return }
      setTodos(d.todos.map((t, i) => ({ ...t, index: i })))
      flash(setTodoMsg, "✅ Deleted.")
    } catch { flash(setTodoMsg, "❌ Delete failed.") }
  }

  /* ── Add note ── */
  const addNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      const r = await fetch(`${BASE}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      })
      const d = await r.json()
      if (d.error) { flash(setNoteMsg, `❌ ${d.error}`); return }
      setNotes(d.notes.map((n, i) => ({ ...n, index: i })))
      setNewNote("")
      flash(setNoteMsg, "✅ Note saved.")
    } catch { flash(setNoteMsg, "❌ Failed to save note.") }
    finally { setAddingNote(false) }
  }

  /* ── Delete note ── */
  const deleteNote = async (index) => {
    try {
      const r = await fetch(`${BASE}/notes/${index}`, { method: "DELETE" })
      const d = await r.json()
      if (d.error) { flash(setNoteMsg, `❌ ${d.error}`); return }
      setNotes(d.notes.map((n, i) => ({ ...n, index: i })))
      flash(setNoteMsg, "✅ Deleted.")
    } catch { flash(setNoteMsg, "❌ Delete failed.") }
  }

  /* ── Delete local event ── */
  const deleteEvent = async (index) => {
    try {
      const r = await fetch(`${BASE}/local-events/${index}`, { method: "DELETE" })
      const d = await r.json()
      if (d.error) { flash(setEventMsg, `❌ ${d.error}`); return }
      setEvents(d.events.map((e, i) => ({ ...e, index: i })))
      flash(setEventMsg, "✅ Deleted.")
    } catch { flash(setEventMsg, "❌ Delete failed.") }
  }

  /* ── Stats for section pills ── */
  const pendingCount   = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  const pillStyle = (active, color) => ({
    padding: "6px 14px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
    background: active ? `${color}25` : "rgba(255,255,255,0.05)",
    border: `1px solid ${active ? color + "55" : "rgba(255,255,255,0.08)"}`,
    color: active ? color : "rgba(255,255,255,0.4)",
    transition: "all 0.18s",
  })

  const delBtn = {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "7px",
    padding: "5px 6px",
    cursor: "pointer",
    color: "#fca5a5",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Section switcher */}
      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
        <button onClick={() => setSection("todos")}  style={pillStyle(section === "todos",  "#a78bfa")}>
          ✅ Todos ({todos.length})
        </button>
        <button onClick={() => setSection("notes")}  style={pillStyle(section === "notes",  "#67e8f9")}>
          📝 Notes ({notes.length})
        </button>
        <button onClick={() => setSection("events")} style={pillStyle(section === "events", "#fbbf24")}>
          📅 Chat Events ({events.length})
        </button>
      </div>

      {/* ══ TODOS ══ */}
      {section === "todos" && (
        <div style={{ ...glass.card, padding: "16px" }}>
          <SectionHead
            icon={<CheckSquare size={15} />}
            title="Todos"
            count={`${pendingCount} pending · ${completedCount} done`}
            color="#a78bfa"
            onRefresh={loadTodos}
          />

          <Flash msg={todoMsg} />

          {/* Add row */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTodo()}
              placeholder='Add a new task…'
              style={inp}
            />
            <button onClick={addTodo} disabled={!newTask.trim() || addingTodo} style={{ ...btnPrimary, opacity: !newTask.trim() ? 0.5 : 1 }}>
              <Plus size={13} /> {addingTodo ? "…" : "Add"}
            </button>
          </div>

          {/* List */}
          {todosLoading ? (
            <div style={{ display: "flex", gap: "4px", padding: "10px 0" }}>
              {[0, .15, .3].map((d, i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a78bfa", animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}
            </div>
          ) : todos.length === 0 ? (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", margin: 0 }}>No todos yet. Add one above!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {todos.map(todo => (
                <div key={todo.index} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: todo.completed ? "rgba(52,211,153,0.05)" : "rgba(167,139,250,0.07)", border: `1px solid ${todo.completed ? "rgba(52,211,153,0.18)" : "rgba(167,139,250,0.15)"}`, borderRadius: "10px" }}>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.index)}
                    style={{ width: "20px", height: "20px", borderRadius: "6px", border: `2px solid ${todo.completed ? "#34d399" : "rgba(167,139,250,0.5)"}`, background: todo.completed ? "rgba(52,211,153,0.25)" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}
                  >
                    {todo.completed ? "✓" : ""}
                  </button>

                  {/* Task text */}
                  <span style={{ flex: 1, fontSize: "13px", color: todo.completed ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.85)", textDecoration: todo.completed ? "line-through" : "none" }}>
                    {todo.task}
                  </span>

                  {/* Status badge */}
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: todo.completed ? "rgba(52,211,153,0.15)" : "rgba(251,191,36,0.12)", border: `1px solid ${todo.completed ? "rgba(52,211,153,0.3)" : "rgba(251,191,36,0.25)"}`, color: todo.completed ? "#34d399" : "#fbbf24", flexShrink: 0 }}>
                    {todo.completed ? "Done" : "Pending"}
                  </span>

                  {/* Delete */}
                  <button onClick={() => deleteTodo(todo.index)} style={delBtn}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ NOTES ══ */}
      {section === "notes" && (
        <div style={{ ...glass.card, padding: "16px" }}>
          <SectionHead
            icon={<FileText size={15} />}
            title="Notes"
            count={notes.length}
            color="#67e8f9"
            onRefresh={loadNotes}
          />

          <Flash msg={noteMsg} />

          {/* Add row */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder='Jot down a note…'
              rows={2}
              style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
            />
            <button onClick={addNote} disabled={!newNote.trim() || addingNote} style={{ ...btnPrimary, alignSelf: "flex-end", opacity: !newNote.trim() ? 0.5 : 1 }}>
              <Plus size={13} /> {addingNote ? "…" : "Save"}
            </button>
          </div>

          {/* List */}
          {notesLoading ? (
            <div style={{ display: "flex", gap: "4px", padding: "10px 0" }}>
              {[0, .15, .3].map((d, i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#67e8f9", animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}
            </div>
          ) : notes.length === 0 ? (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", margin: 0 }}>No notes yet. Write one above!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {notes.map(note => (
                <div key={note.index} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "11px 13px", background: "rgba(103,232,249,0.05)", border: "1px solid rgba(103,232,249,0.14)", borderRadius: "10px" }}>
                  <p style={{ flex: 1, fontSize: "13px", color: "rgba(255,255,255,0.82)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {note.content}
                  </p>
                  <button onClick={() => deleteNote(note.index)} style={delBtn}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ CHAT-SCHEDULED EVENTS ══ */}
      {section === "events" && (
        <div style={{ ...glass.card, padding: "16px" }}>
          <SectionHead
            icon={<Calendar size={15} />}
            title="Chat-Scheduled Events"
            count={events.length}
            color="#fbbf24"
            onRefresh={loadEvents}
          />

          {/* Info banner */}
          <div style={{ padding: "9px 13px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "10px", fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "14px", lineHeight: 1.6 }}>
            These are events created via chat commands like <span style={{ color: "#fbbf24" }}>"Schedule team meeting tomorrow at 3pm"</span>.
            For Google Calendar events, use the <span style={{ color: "#a78bfa" }}>📅 Calendar tab</span>.
          </div>

          <Flash msg={eventMsg} />

          {/* List */}
          {eventsLoading ? (
            <div style={{ display: "flex", gap: "4px", padding: "10px 0" }}>
              {[0, .15, .3].map((d, i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fbbf24", animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", margin: "0 0 6px" }}>No chat-scheduled events.</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", margin: 0 }}>Try: "Schedule standup tomorrow at 9am" in Chat.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {events.map(evt => (
                <div key={evt.index} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "11px 13px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 3px" }}>
                      📅 {evt.title}
                    </p>
                    {evt.datetime && (
                      <p style={{ fontSize: "11px", color: "#fbbf24", margin: 0 }}>
                        {(() => {
                          try { return new Date(evt.datetime).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }
                          catch { return evt.datetime }
                        })()}
                      </p>
                    )}
                  </div>
                  <button onClick={() => deleteEvent(evt.index)} style={delBtn}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        button:hover { filter: brightness(1.12); }
      `}</style>
    </div>
  )
}

export default TodosNotesTab
