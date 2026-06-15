// import { useState, useRef, useEffect } from "react"
// import { 
//   Mic, 
//   MicOff, 
//   Send, 
//   Brain, 
//   BarChart2, 
//   FileText, 
//   Plus, 
//   Trash2, 
//   Search, 
//   Upload, 
//   ChevronDown, 
//   ChevronUp, 
//   Calendar, 
//   Users, 
//   Sun, 
//   Moon, 
//   X,
//   CheckSquare
// } from "lucide-react"
// import API from "../services/api"

// import CalendarTab from "../CalendarTab"
// import ShadowMeetingTab from "../ShadowMeetingTab"
// import useTTS from "../useTTS"
// import TTSSettings from "../TTSSettings"

// import TodosNotesTab from "../TodosNotesTab"


// /* ─────────────────────────────────────────────────────────
//    DESIGN TOKENS & HIGH-CONTRAST PALETTES
// ───────────────────────────────────────────────────────── */
// const glass = {
//   card: (theme) => ({
//     background: theme === "dark" ? "rgba(255,255,255,0.05)" : "#ffffff",
//     backdropFilter: theme === "dark" ? "blur(16px)" : "none",
//     WebkitBackdropFilter: theme === "dark" ? "blur(16px)" : "none",
//     border: theme === "dark" ? "1px solid rgba(255,255,255,0.10)" : "1px solid #d1d5db",
//     borderRadius: "16px",
//     boxShadow: theme === "dark" ? "none" : "0 2px 4px rgba(0,0,0,0.05)",
//   }),
//   sidebar: (theme) => ({
//     background: theme === "dark" ? "rgba(10,10,30,0.75)" : "#f9fafb",
//     backdropFilter: theme === "dark" ? "blur(20px)" : "none",
//     WebkitBackdropFilter: theme === "dark" ? "blur(20px)" : "none",
//     borderRight: theme === "dark" ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e7eb",
//   }),
// }

// const BG_DARK = `
//   radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.18) 0%, transparent 60%),
//   radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.15) 0%, transparent 60%),
//   radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.08) 0%, transparent 70%),
//   #050510
// `

// // High-contrast clean background for light mode
// const BG_LIGHT = "#f3f4f6"

// /* ─────────────────────────────────────────────────────────
//    SUB-COMPONENTS
// ───────────────────────────────────────────────────────── */

// /** Relevance score pill */
// const ScoreBadge = ({ score }) => {
//   const pct   = Math.round(score * 100)
//   const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#d97706" : "#dc2626"
//   return (
//     <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: `${color}15`, border: `1px solid ${color}44`, color }}>
//       {pct}% match
//     </span>
//   )
// }

// /** Collapsible RAG chunk card */
// const ChunkCard = ({ chunk, index, theme }) => {
//   const [open, setOpen] = useState(false)
//   const isDark = theme === "dark"

//   return (
//     <div style={{ 
//       background: isDark ? "rgba(99,102,241,0.07)" : "#f9fafb", 
//       border: isDark ? "1px solid rgba(99,102,241,0.18)" : "1px solid #e5e7eb", 
//       borderRadius: "10px", 
//       overflow: "hidden" 
//     }}>
//       <div
//         onClick={() => setOpen(!open)}
//         style={{ padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: "8px" }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
//           <span style={{ fontSize: "11px", fontWeight: 700, color: isDark ? "#a78bfa" : "#4f46e5", flexShrink: 0 }}>#{index + 1}</span>
//           <span style={{ fontSize: "11px", color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280", flexShrink: 0 }}>Page {chunk.page}</span>
//           <ScoreBadge score={chunk.score} />
//           <span style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.6)" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
//             {chunk.text.slice(0, 60)}…
//           </span>
//         </div>
//         {open ? <ChevronUp size={13} color={isDark ? "rgba(255,255,255,0.4)" : "#6b7280"} /> : <ChevronDown size={13} color={isDark ? "rgba(255,255,255,0.4)" : "#6b7280"} />}
//       </div>
//       {open && (
//         <div style={{ 
//           padding: "12px", 
//           fontSize: "12px", 
//           lineHeight: "1.7", 
//           color: isDark ? "rgba(255,255,255,0.7)" : "#1f2937", 
//           borderTop: isDark ? "1px solid rgba(99,102,241,0.15)" : "1px solid #e5e7eb",
//           background: isDark ? "transparent" : "#ffffff"
//         }}>
//           <div style={{ whiteSpace: "pre-wrap" }}>{chunk.text}</div>
//         </div>
//       )}
//     </div>
//   )
// }

// /* ─────────────────────────────────────────────────────────
//    MAIN COMPONENT
// ───────────────────────────────────────────────────────── */
// const Home = () => {

//   /* ── state ── */
//   const [theme, setTheme]                 = useState("dark")
//   const [question, setQuestion]           = useState("")
//   const [loading, setLoading]             = useState(false)
//   const [isListening, setIsListening]     = useState(false)
//   const [continuousMode, setContinuousMode] = useState(false)
//   const [chatHistory, setChatHistory]     = useState([])
//   const [currentChatId, setCurrentChatId] = useState(null)
//   const [focusCompleted, setFocusCompleted] = useState(false)
//   const [showTTSSettings, setShowTTSSettings] = useState(false)
//   const [activeTab, setActiveTab]         = useState("chat")

//   /* PDF RAG state */
//   const [pdfFile, setPdfFile]             = useState(null)
//   const [pdfName, setPdfName]             = useState("")
//   const [pdfList, setPdfList]             = useState([])
//   const [pdfSummary, setPdfSummary]       = useState("")
//   const [pdfQuestion, setPdfQuestion]     = useState("")
//   const [pdfAnswer, setPdfAnswer]         = useState("")
//   const [pdfChunks, setPdfChunks]         = useState([])
//   const [pdfLoading, setPdfLoading]       = useState(false)
//   const [ingestStats, setIngestStats]     = useState(null)
//   const [ragStep, setRagStep]             = useState("")

//   /* Insights */
//   const [insights, setInsights]           = useState("")
//   const [loadingInsights, setLoadingInsights] = useState(false)

//   /* Memory */
//   const [memories, setMemories]           = useState([])
//   const [memoriesLoading, setMemoriesLoading] = useState(false)
//   const [newFact, setNewFact]             = useState("")
//   const [savingFact, setSavingFact]       = useState(false)
//   const [memSearchQuery, setMemSearchQuery] = useState("")
//   const [memSearchResults, setMemSearchResults] = useState([])
//   const [memSearching, setMemSearching]   = useState(false)
//   const [memoryMsg, setMemoryMsg]         = useState("")

//   /* Dashboard + focus */
//   const [dashboard, setDashboard] = useState({ todos: 0, events: 0, notes: 0, memories: 0, pdfs: 0 })
//   const [focus, setFocus]         = useState({ active: false })

//   const [messages, setMessages] = useState([
//     { role: "assistant", text: "Hello 👋 I am VoxMind Chronos — your AI Second Brain with Pinecone RAG-powered PDF understanding." }
//   ])

//   const messagesEndRef = useRef(null)
//   const recognitionRef = useRef(null)
//   const tts = useTTS()

//   /* ── Deepgram refs ── */
//   const wsRef            = useRef(null)
//   const mediaRecorderRef = useRef(null)
//   const streamRef        = useRef(null)
//   const keepAliveRef     = useRef(null)

//   const isDark = theme === "dark"

//   /* ── helpers ── */
//   const addSystemMsg = (text) => setMessages(p => [...p, { role: "assistant", text }])
//   const showMemMsg   = (msg)  => { setMemoryMsg(msg); setTimeout(() => setMemoryMsg(""), 3000) }

//   const refreshDashboard = async () => {
//     try {
//       const userId = localStorage.getItem("gcal_user_id") || ""
//       const qs     = userId ? `?user_id=${encodeURIComponent(userId)}` : ""
//       const d      = await fetch(`http://localhost:8000/dashboard${qs}`).then(r => r.json())
//       setDashboard(d)
//     } catch (e) { console.error(e) }
//   }

//   /* ── auto-scroll ── */
//   useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

//   /* ── init ── */
//   useEffect(() => {
//     setChatHistory(JSON.parse(localStorage.getItem("voxmind_chats")) || [])
//     if ("Notification" in window && Notification.permission !== "granted") Notification.requestPermission()
//   }, [])

//   /* ── dashboard ── */
//   // useEffect(() => {
//   //   const load = async () => {
//   //     try {
//   //       const [d, f] = await Promise.all([
//   //         fetch("http://localhost:8000/dashboard").then(r => r.json()),
//   //         fetch("http://localhost:8000/focus").then(r => r.json()),
//   //       ])
//   //       setDashboard(d); setFocus(f)
//   //     } catch (e) { console.error(e) }
//   //   }
//   //   load()
//   // }, [])

//   useEffect(() => {
//     const load = async () => {
//       try {
//         // Pass google user_id if available so /dashboard can count GCal events
//         const userId = localStorage.getItem("gcal_user_id") || ""
//         const qs     = userId ? `?user_id=${encodeURIComponent(userId)}` : ""
 
//         const [d, f] = await Promise.all([
//           fetch(`http://localhost:8000/dashboard${qs}`).then(r => r.json()),
//           fetch("http://localhost:8000/focus").then(r => r.json()),
//         ])
//         setDashboard(d)
//         setFocus(f)
//       } catch (e) { console.error(e) }
//     }
 
//     load()                                    // run immediately on mount
//     const interval = setInterval(load, 30000) // re-fetch every 30 seconds
//     return () => clearInterval(interval)      // cleanup on unmount
//   }, [])

//   /* ── chat history sync ── */
//   useEffect(() => {
//     if (messages.length <= 1) return
//     const chatId = currentChatId || Date.now()
//     const chat   = { id: chatId, title: messages[1]?.text?.slice(0, 30) || "New Chat", messages }
//     setChatHistory(prev => {
//       const updated = [...prev]
//       const idx = updated.findIndex(c => c.id === chatId)
//       if (idx >= 0) updated[idx] = chat; else updated.unshift(chat)
//       localStorage.setItem("voxmind_chats", JSON.stringify(updated))
//       return updated
//     })
//     if (!currentChatId) setCurrentChatId(chatId)
//   }, [messages, currentChatId])

//   /* ── speech recognition (wake word only) ── */
//   useEffect(() => {
//     const SR = window.SpeechRecognition || window.webkitSpeechRecognition
//     if (SR) { const r = new SR(); r.continuous = false; r.lang = "en-US"; r.interimResults = false; recognitionRef.current = r }
//   }, [])

//   /* ── reminder + focus poll ── */
//   useEffect(() => {
//     const interval = setInterval(async () => {
//       try {
//         const res = await API.get("/due-reminders")
//         res.data.due_reminders?.forEach(r => {
//           addSystemMsg(`🔔 Reminder: ${r.task}`)
//           speakResponse(`Reminder: ${r.task}`)
//           if ("Notification" in window && Notification.permission === "granted")
//             new Notification("VoxMind Reminder", { body: r.task })
//         })
//         const f = await fetch("http://localhost:8000/focus").then(r => r.json())
//         if (f.completed && !focusCompleted) {
//           setFocusCompleted(true)
//           addSystemMsg(`🎯 Focus completed: ${f.task}`)
//           speakResponse(`Focus session for ${f.task} completed. Great work!`)
//         }
//       } catch (e) { console.error(e) }
//     }, 5000)
//     return () => clearInterval(interval)
//   }, [focusCompleted])

//   /* ── TTS ── */
//   const speakResponse = (text) => {
//     tts.speak(text, {
//       onEnd: () => { if (continuousMode) startListening() }
//     })
//   }

//   /* ── wake word ── */
//   const startWakeWordDetection = () => {
//     if (!recognitionRef.current) return
//     recognitionRef.current.continuous = true
//     try { recognitionRef.current.start() } catch (e) {}
//     recognitionRef.current.onresult = (event) => {
//       const t = event.results[event.results.length - 1][0].transcript.toLowerCase()
//       if (t.includes("hey voxmind")) {
//         window.speechSynthesis.cancel()
//         speakResponse("Yes? I am listening.")
//         recognitionRef.current.stop()
//         setTimeout(() => startDeepgramListening(), 1500)
//       }
//     }
//   }

//   /* ── ask AI ── */
//   const askAI = async (customQuestion = null) => {
//     const q = customQuestion || question
//     if (!q.trim()) return
//     setMessages(p => [...p, { role: "user", text: q }])
//     setLoading(true)
//     try {
//       const res  = await API.get(`/ask?question=${encodeURIComponent(q)}`)
//       const text = res.data.response
//       setMessages(p => [...p, { role: "assistant", text }])
//       speakResponse(text)
//       // if (q.toLowerCase().includes("remember that")) {
//       //   setTimeout(() => loadMemories(), 1200)
//       //   setDashboard(p => ({ ...p, memories: p.memories + 1 }))
//       // }
//        if (q.toLowerCase().includes("remember that")) {
//         setTimeout(() => loadMemories(), 1200)
//         setDashboard(p => ({ ...p, memories: p.memories + 1 }))
//       }
 
//       // ── NEW: increment events count when chat schedules an event ──
//       if (
//         q.toLowerCase().includes("schedule") &&
//         q.toLowerCase().includes("tomorrow")
//       ) {
//         // The response will contain "Scheduled:" if it succeeded
//         if (text && text.toLowerCase().startsWith("scheduled:")) {
//           setDashboard(p => ({ ...p, events: p.events + 1 }))
//         }
//       }

//     } catch { addSystemMsg("❌ Something went wrong. Please try again.") }
//     setQuestion(""); setLoading(false)
//   }

//   const sendMessage = (text) => { setActiveTab("chat"); askAI(text) }

//   /* ── fallback browser voice ── */
//   const startListening = () => {
//     if (!recognitionRef.current) return
//     setIsListening(true)
//     try { recognitionRef.current.start() } catch (e) {}
//     recognitionRef.current.onresult = async (e) => {
//       const t = e.results[0][0].transcript
//       setQuestion(t); await askAI(t); setIsListening(false)
//     }
//     recognitionRef.current.onerror = () => { setIsListening(false) }
//     recognitionRef.current.onend   = () => setIsListening(false)
//   }

//   /* ── deepgram actions ── */
//   const stopDeepgramListening = () => {
//     if (keepAliveRef.current) {
//       clearInterval(keepAliveRef.current)
//       keepAliveRef.current = null
//     }
//     try {
//       if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//         mediaRecorderRef.current.stop()
//       }
//     } catch (e) {}
//     try {
//       if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
//         wsRef.current.close(1000, "User stopped")
//       }
//     } catch (e) {}
//     try {
//       streamRef.current?.getTracks().forEach(t => t.stop())
//     } catch (e) {}

//     streamRef.current        = null
//     mediaRecorderRef.current = null
//     wsRef.current            = null
//     setIsListening(false)
//   }

//   const startDeepgramListening = async () => {
//     if (isListening) { stopDeepgramListening(); return }
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
//       streamRef.current = stream

//       const ws = new WebSocket("ws://localhost:8000/ws/stt")
//       wsRef.current = ws

//       ws.onopen = () => {
//         setIsListening(true)
//         const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
//           ? "audio/webm;codecs=opus"
//           : MediaRecorder.isTypeSupported("audio/webm")
//           ? "audio/webm"
//           : ""

//         const recorderOptions = mimeType ? { mimeType } : {}
//         const mediaRecorder   = new MediaRecorder(stream, recorderOptions)
//         mediaRecorderRef.current = mediaRecorder

//         mediaRecorder.ondataavailable = (event) => {
//           if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
//             ws.send(event.data)
//           }
//         }
//         mediaRecorder.start(250)

//         keepAliveRef.current = setInterval(() => {
//           if (ws.readyState === WebSocket.OPEN) {
//             ws.send(JSON.stringify({ type: "keep_alive" }))
//           }
//         }, 10000)
//       }

//       ws.onmessage = (event) => {
//         let data
//         try { data = JSON.parse(event.data) } catch { return }

//         if (data.type === "ai_response") {
//           const transcript = data.transcript || ""
//           const response   = data.response   || ""
//           setQuestion(transcript)
//           setMessages(prev => [
//             ...prev,
//             { role: "user",      text: transcript },
//             { role: "assistant", text: response   },
//           ])
//           speakResponse(response)
//         }
//         if (data.type === "transcript") {
//           setQuestion(data.text || "")
//         }
//         if (data.type === "barge_in") {
//           window.speechSynthesis.cancel()
//           tts.stop?.()
//         }
//         if (data.type === "error") {
//           addSystemMsg(`❌ STT error: ${data.message || "Unknown error"}`)
//           stopDeepgramListening()
//         }
//       }

//       ws.onerror = () => {
//         addSystemMsg("❌ Voice connection failed.")
//         stopDeepgramListening()
//       }
//       ws.onclose = (evt) => {
//         if (evt.code !== 1000 && evt.code !== 1001) {
//           addSystemMsg(`⚠️ Voice connection closed (${evt.code}).`)
//         }
//         stopDeepgramListening()
//       }
//     } catch (err) {
//       addSystemMsg(`❌ Mic error: ${err.message || "Could not access microphone."}`)
//       setIsListening(false)
//     }
//   }

//   /* ── history item deletion helper ── */
//   const deleteHistoryItem = (e, idToDelete) => {
//     e.stopPropagation()
//     const updated = chatHistory.filter(chat => chat.id !== idToDelete)
//     setChatHistory(updated)
//     localStorage.setItem("voxmind_chats", JSON.stringify(updated))
//     if (currentChatId === idToDelete) {
//       setCurrentChatId(null)
//       setMessages([{ role: "assistant", text: "Hello 👋 I am VoxMind Chronos." }])
//     }
//   }

//   /* ─────────────────────────────────────────────────────
//      PDF RAG FUNCTIONS
//   ───────────────────────────────────────────────────── */
//   const uploadPdf = async () => {
//     if (!pdfFile) return
//     setPdfLoading(true)
//     setPdfAnswer(""); setPdfChunks([]); setPdfSummary(""); setIngestStats(null)
//     try {
//       setRagStep("📄 Extracting text from PDF…")
//       const fd = new FormData()
//       fd.append("file", pdfFile)

//       setRagStep("🔪 Splitting into chunks…")
//       const res  = await fetch("http://localhost:8000/upload-pdf", { method: "POST", body: fd })
//       const data = await res.json()

//       if (data.error) { addSystemMsg(`❌ ${data.error}`); return }

//       setRagStep("✅ Ingested into Pinecone!")
//       setIngestStats(data)
//       setPdfName(data.filename)
//       setPdfList(p => [...new Set([...p, data.filename])])
//       setDashboard(p => ({ ...p, pdfs: p.pdfs + 1 }))
//       addSystemMsg(`✅ PDF Ingested into Pinecone!\n\nFile: ${data.filename}`)
//     } catch (e) { addSystemMsg("❌ PDF upload failed.") }
//     finally { setPdfLoading(false); setTimeout(() => setRagStep(""), 2000) }
//   }

//   const generateSummary = async () => {
//     if (!pdfName) return
//     setPdfLoading(true); setRagStep("🧠 Summarizing full document…")
//     try {
//       const r = await fetch(`http://localhost:8000/pdf-summary?filename=${encodeURIComponent(pdfName)}`, { method: "POST" })
//       const d = await r.json()
//       setPdfSummary(d.summary || d.error)
//     } catch { setPdfSummary("Failed to generate summary.") }
//     finally { setPdfLoading(false); setRagStep("") }
//   }

//   const askPdfRag = async () => {
//     if (!pdfName || !pdfQuestion.trim()) return
//     setPdfLoading(true); setPdfAnswer(""); setPdfChunks([])
//     try {
//       setRagStep("🔍 Embedding your question…")
//       await new Promise(r => setTimeout(r, 400))
//       const res  = await fetch("http://localhost:8000/pdf-chat", {
//         method:  "POST",
//         headers: { "Content-Type": "application/json" },
//         body:    JSON.stringify({ filename: pdfName, question: pdfQuestion }),
//       })
//       const data = await res.json()
//       setPdfAnswer(data.answer || data.error)
//       setPdfChunks(data.chunks || [])
//       setRagStep("✅ Answer ready!")
//       setTimeout(() => setRagStep(""), 1500)
//     } catch { setPdfAnswer("Failed to get answer."); setRagStep("") }
//     finally { setPdfLoading(false) }
//   }

//   const deletePdf = async (filename) => {
//     try {
//       await fetch(`http://localhost:8000/pdf-delete?filename=${encodeURIComponent(filename)}`, { method: "DELETE" })
//       setPdfList(p => p.filter(f => f !== filename))
//       if (pdfName === filename) { setPdfName(""); setIngestStats(null); setPdfAnswer(""); setPdfChunks([]) }
//     } catch (e) { console.error(e) }
//   }

//   /* ─────────────────────────────────────────────────────
//      MEMORY FUNCTIONS
//   ───────────────────────────────────────────────────── */
//   const loadMemories = async () => {
//     setMemoriesLoading(true)
//     try {
//       const r    = await fetch("http://localhost:8000/memories")
//       const data = await r.json()
//       setMemories(data.memories || [])
//       setDashboard(p => ({ ...p, memories: (data.memories || []).length }))
//     } catch (e) { console.error(e) }
//     finally { setMemoriesLoading(false) }
//   }

//   const saveFact = async () => {
//     if (!newFact.trim()) return
//     setSavingFact(true)
//     try {
//       const r    = await fetch("http://localhost:8000/memories/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fact: newFact.trim() }) })
//       const data = await r.json()
//       if (data.memory) { setMemories(p => [data.memory, ...p]); setNewFact(""); showMemMsg("✅ Saved to Pinecone!"); setDashboard(p => ({ ...p, memories: p.memories + 1 })) }
//     } catch { showMemMsg("❌ Failed to save.") }
//     finally { setSavingFact(false) }
//   }

//   const deleteMemory = async (id) => {
//     try {
//       await fetch(`http://localhost:8000/memories/${id}`, { method: "DELETE" })
//       setMemories(p => p.filter(m => m.id !== id))
//       setDashboard(p => ({ ...p, memories: Math.max(0, p.memories - 1) }))
//     } catch { showMemMsg("❌ Delete failed.") }
//   }

//   const searchMemoriesSemantic = async () => {
//     if (!memSearchQuery.trim()) return
//     setMemSearching(true)
//     try {
//       const r    = await fetch("http://localhost:8000/memories/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: memSearchQuery, top_k: 5 }) })
//       const data = await r.json()
//       setMemSearchResults(data.results || [])
//     } catch { showMemMsg("❌ Search failed.") }
//     finally { setMemSearching(false) }
//   }

//   const getInsights = async () => {
//     setLoadingInsights(true)
//     try {
//       const r = await fetch("http://localhost:8000/ask?question=analyze my productivity")
//       setInsights((await r.json()).response)
//     } catch (e) { console.error(e) }
//     finally { setLoadingInsights(false) }
//   }

//   const quickActions = [
//     { label: "Daily Briefing",      query: "good morning",            color: "#4f46e5" },
//     { label: "Plan My Day",         query: "plan my day",             color: "#7c3aed" },
//     { label: "Productivity Report", query: "analyze my productivity", color: "#0891b2" },
//     { label: "Show Todos",          query: "show my todos",           color: "#059669" },
//     { label: "My Memories",         query: "what do you remember",    color: "#db2777" },
//   ]

//   const dashStats = [
//     { label: "Todos",    value: dashboard.todos,    icon: "✅", color: "#4f46e5" },
//     { label: "Events",   value: dashboard.events,   icon: "📅", color: "#7c3aed" },
//     { label: "Notes",    value: dashboard.notes,    icon: "📝", color: "#0891b2" },
//     { label: "Memories", value: dashboard.memories, icon: "🧠", color: "#9333ea" },
//     { label: "PDFs",     value: dashboard.pdfs,     icon: "📚", color: "#d97706" },
//     { label: "Focus",    value: focus?.active ? "ON" : "Idle", icon: "🎯", color: focus?.active ? "#059669" : "#4b5563" },
//   ]

//   const TABS = [
//     { id: "chat",      icon: <Brain size={13} />,    label: "Chat"      },
//     { id: "memories",  icon: <Brain size={13} />,    label: "Memory"    },
//     { id: "pdf",       icon: <FileText size={13} />, label: "PDF Brain" },
//     { id: "tasks", icon: <CheckSquare size={13}/>, label: "Tasks" },
//     { id: "insights",  icon: <BarChart2 size={13} />,label: "Insights"  },
//     { id: "calendar",  icon: <Calendar size={13} />, label: "Calendar"  },
//     { id: "meeting",   icon: <Users size={13} />,    label: "Meeting"   },
//   ]

//   const inputStyle = { 
//     flex: 1, 
//     padding: "10px 13px", 
//     background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff", 
//     border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1", 
//     borderRadius: "10px", 
//     color: isDark ? "#f0f0ff" : "#0f172a", 
//     fontSize: "13px", 
//     outline: "none" 
//   }

//   const btnPrimary = { 
//     padding: "10px 18px", 
//     background: "linear-gradient(135deg,#4f46e5,#7c3aed)", 
//     border: "none", 
//     borderRadius: "10px", 
//     cursor: "pointer", 
//     fontSize: "13px", 
//     fontWeight: 600, 
//     color: "#fff" 
//   }

//   return (
//     <div style={{ height: "100vh", background: isDark ? BG_DARK : BG_LIGHT, color: isDark ? "#f0f0ff" : "#1e293b", fontFamily: "'Inter', sans-serif", display: "flex", overflow: "hidden" }}>

//       {/* ── SIDEBAR ── */}
//       <aside style={{ ...glass.sidebar(theme), width: "245px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", padding: "16px 12px", height: "100%", overflowY: "auto" }}>
//         <div style={{ textAlign: "center", padding: "4px 0 12px", flexShrink: 0 }}>
//           <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "42px", height: "42px", borderRadius: "12px", background: isDark ? "rgba(167,139,250,0.15)" : "#e0e7ff", margin: "0 auto 6px" }}>
//             <Brain size={24} color={isDark ? "#a78bfa" : "#4f46e5"} />
//           </div>
//           <div style={{ mountaineer: "bold", fontWeight: 700, fontSize: "14px", color: isDark ? "#c4b5fd" : "#4f46e5" }}>VoxMind Chronos</div>
//           <div style={{ fontSize: "10px", color: isDark ? "rgba(255,255,255,0.3)" : "#6b7280", marginTop: "1px" }}>Pinecone RAG · LLaMA · Groq</div>
//         </div>

//         <button onClick={() => { setMessages([{ role: "assistant", text: "Hello 👋 I am VoxMind Chronos." }]); setCurrentChatId(null); setActiveTab("chat") }}
//           style={{ ...glass.card(theme), padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", fontWeight: 600, color: isDark ? "#a78bfa" : "#4f46e5", border: isDark ? "1px solid rgba(167,139,250,0.3)" : "1px solid #4f46e5", width: "100%", flexShrink: 0, background: isDark ? "transparent" : "#fff" }}>
//           <Plus size={12} /> New Chat
//         </button>

//         <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
//           {TABS.map(tab => (
//             <button key={tab.id} onClick={() => setActiveTab(tab.id)}
//               style={{ padding: "8px 12px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 500, background: activeTab === tab.id ? (isDark ? "rgba(167,139,250,0.18)" : "#e0e7ff") : "transparent", border: activeTab === tab.id ? (isDark ? "1px solid rgba(167,139,250,0.3)" : "1px solid #cbd5e1") : "1px solid transparent", color: activeTab === tab.id ? (isDark ? "#c4b5fd" : "#4f46e5") : (isDark ? "rgba(255,255,255,0.5)" : "#475569"), transition: "all 0.2s", width: "100%" }}>
//               {tab.icon} {tab.label}
//             </button>
//           ))}
//         </div>

//         <div style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0", margin: "4px 0", flexShrink: 0 }} />
//         <div style={{ fontSize: "9px", color: isDark ? "rgba(255,255,255,0.3)" : "#64748b", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 4px", flexShrink: 0 }}>History</div>
        
//         {/* Dynamic Inner History Area */}
//         <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
//           {chatHistory.length === 0 && <div style={{ fontSize: "11px", color: isDark ? "rgba(255,255,255,0.2)" : "#94a3b8", padding: "6px 4px" }}>No chats yet.</div>}
//           {chatHistory.map(chat => (
//             <div 
//               key={chat.id} 
//               onClick={() => { setMessages(chat.messages); setCurrentChatId(chat.id); setActiveTab("chat") }}
//               className="history-item-row"
//               style={{ 
//                 ...glass.card(theme), 
//                 padding: "6px 10px", 
//                 cursor: "pointer", 
//                 display: "flex", 
//                 alignItems: "center", 
//                 justifyContent: "space-between", 
//                 borderRadius: "8px",
//                 border: currentChatId === chat.id ? "1px solid #4f46e5" : (isDark ? "1px solid transparent" : "1px solid #e2e8f0"),
//                 position: "relative",
//                 background: currentChatId === chat.id ? (isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9") : (isDark ? "transparent" : "#ffffff")
//               }}
//             >
//               <span style={{ fontSize: "11px", color: isDark ? "rgba(255,255,255,0.7)" : "#334155", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginRight: "18px" }}>
//                 {chat.title}
//               </span>
//               <button 
//                 onClick={(e) => deleteHistoryItem(e, chat.id)}
//                 className="history-cross-btn"
//                 style={{
//                   background: "transparent",
//                   border: "none",
//                   padding: "2px",
//                   cursor: "pointer",
//                   color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   borderRadius: "4px"
//                 }}
//               >
//                 <X size={11} />
//               </button>
//             </div>
//           ))}
//         </div>
//       </aside>

//       {/* ── MAIN WORKSPACE ── */}
//       <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

//         {/* Header */}
//         <header style={{ ...glass.card(theme), margin: "10px 10px 0", padding: "11px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "16px 16px 0 0", flexShrink: 0 }}>
//           <div>
//             <h1 style={{ fontSize: "18px", fontWeight: 700, color: isDark ? "#c4b5fd" : "#4f46e5", margin: 0 }}>VoxMind Chronos</h1>
//             <p style={{ fontSize: "11px", color: isDark ? "rgba(255,255,255,0.4)" : "#64748b", margin: "1px 0 0" }}>Pinecone RAG · Semantic Memory</p>
//           </div>
//           <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
//             {focus?.active && <span style={{ background: isDark ? "rgba(16,185,129,0.2)" : "#d1fae5", border: "1px solid #10b981", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", color: "#065f46" }}>🎯 {focus.task}</span>}
            
//             {/* Theme Toggle Button */}
//             <button 
//               onClick={() => setTheme(isDark ? "light" : "dark")}
//               style={{
//                 background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
//                 border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1",
//                 borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContext: "center", justifyContent:"center", cursor: "pointer",
//                 color: isDark ? "#fbbf24" : "#475569",
//               }}
//               title={isDark ? "Light Mode" : "Dark Mode"}
//             >
//               {isDark ? <Sun size={14} /> : <Moon size={14} />}
//             </button>

//             <button
//               onClick={() => setShowTTSSettings(true)}
//               style={{
//                 background: tts.ttsReady ? (isDark ? "rgba(52,211,153,0.15)" : "#d1fae5") : (isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"),
//                 border: `1px solid ${tts.ttsReady ? "#10b981" : (isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1")}`,
//                 borderRadius: "20px", padding: "4px 12px", cursor: "pointer", fontSize: "11px",
//                 color: tts.ttsReady ? (isDark ? "#6ee7b7" : "#065f46") : (isDark ? "rgba(255,255,255,0.4)" : "#64748b"),
//                 fontWeight: 600,
//               }}
//             >
//               {tts.speaking ? "🔊 Speaking…" : tts.ttsReady ? "🎙 ElevenLabs" : "🔈 Browser TTS"}
//             </button>

//             <button onClick={() => setContinuousMode(!continuousMode)}
//               style={{ background: continuousMode ? (isDark ? "rgba(99,102,241,0.3)" : "#e0e7ff") : (isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"), border: `1px solid ${continuousMode ? "#4f46e5" : (isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1")}`, borderRadius: "20px", padding: "4px 12px", cursor: "pointer", fontSize: "11px", color: continuousMode ? (isDark ? "#c4b5fd" : "#4f46e5") : (isDark ? "rgba(255,255,255,0.4)" : "#64748b"), fontWeight: 600 }}>
//               {continuousMode ? "🔊 ON" : "🔇 OFF"}
//             </button>
//           </div>
//         </header>

//         {/* Stats Dashboard Row */}
//         <div style={{ margin: "0 10px", padding: "7px 12px", background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", borderLeft: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #cbd5e1", borderRight: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #cbd5e1", display: "flex", gap: "6px", flexShrink: 0 }}>
//           {dashStats.map(s => (
//             <div key={s.label} style={{ flex: 1, ...glass.card(theme), padding: "7px 8px", borderRadius: "10px", textAlign: "center" }}>
//               <div style={{ fontSize: "13px", marginBottom: "2px" }}>{s.icon}</div>
//               <div style={{ fontSize: "15px", fontWeight: 700, color: s.color }}>{s.value}</div>
//               <div style={{ fontSize: "9px", color: isDark ? "rgba(255,255,255,0.4)" : "#64748b" }}>{s.label}</div>
//             </div>
//           ))}
//         </div>

//         {/* Tab Canvas Content area */}
//         <div style={{ flex: 1, display: "flex", flexDirection: "column", margin: "0 10px", background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff", borderLeft: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #cbd5e1", borderRight: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #cbd5e1", position: "relative", overflow: "hidden" }}>

//           {/* ── CHAT CONTROLLER SELECTION ── */}
//           {activeTab === "chat" && (
//             <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
//               {messages.length <= 1 && (
//                 <div style={{ padding: "18px 18px 0", textAlign: "center", flexShrink: 0 }}>
//                   <div style={{ fontSize: "32px", marginBottom: "5px" }}>🧠</div>
//                   <h2 style={{ fontSize: "20px", fontWeight: 700, color: isDark ? "#fff" : "#0f172a", margin: "0 0 4px" }}>Your AI Second Brain</h2>
//                   <p style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.4)" : "#64748b", margin: "0 0 14px" }}>Pinecone RAG · Semantic memory · PDF understanding</p>
//                   <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px", marginBottom: "14px" }}>
//                     {quickActions.map(a => (
//                       <button key={a.label} onClick={() => sendMessage(a.query)}
//                         style={{ padding: "6px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: isDark ? `${a.color}22` : "#f1f5f9", border: `1px solid ${a.color}55`, color: isDark ? "rgba(255,255,255,0.8)" : "#334155" }}>
//                         {a.label}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Chat Content Stream */}
//               <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
//                 {messages.map((msg, i) => (
//                   <div key={i} style={{ 
//                     maxWidth: "72%", 
//                     alignSelf: msg.role === "user" ? "flex-end" : "flex-start", 
//                     padding: "10px 14px", 
//                     borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", 
//                     background: msg.role === "user" ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : (isDark ? "rgba(255,255,255,0.06)" : "#f8fafc"), 
//                     border: msg.role === "user" ? "1px solid #4f46e5" : (isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0"), 
//                     color: msg.role === "user" ? "#ffffff" : (isDark ? "#f0f0ff" : "#1e293b"),
//                     fontSize: "13px", 
//                     lineHeight: "1.6", 
//                     whiteSpace: "pre-wrap" 
//                   }}>
//                     {msg.text}
//                   </div>
//                 ))}
//                 {loading && (
//                   <div style={{ alignSelf: "flex-start", padding: "10px 14px", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: "18px 18px 18px 4px", display: "flex", gap: "4px" }}>
//                     {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4f46e5", animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}
//                   </div>
//                 )}
//                 <div ref={messagesEndRef} />
//               </div>

//               {/* Input Action Tray Block */}
//               <div style={{ padding: "9px 14px 12px", display: "flex", gap: "7px", background: isDark ? "rgba(0,0,0,0.2)" : "#f1f5f9", borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0", flexShrink: 0 }}>
//                 <input type="text" placeholder={isListening ? "🎙 Listening..." : "Ask anything…"} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askAI()}
//                   style={{ ...inputStyle }} />
                
//                 <button
//                   onClick={isListening ? stopDeepgramListening : startDeepgramListening}
//                   style={{
//                     padding: "10px 14px",
//                     borderRadius: "10px",
//                     cursor: "pointer",
//                     background: isListening ? "#fee2e2" : (isDark ? "rgba(255,255,255,0.06)" : "#ffffff"),
//                     border: `1px solid ${isListening ? "#ef4444" : (isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1")}`,
//                     color: isListening ? "#b91c1c" : (isDark ? "rgba(255,255,255,0.6)" : "#475569"),
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "6px",
//                     fontSize: "13px"
//                   }}
//                 >
//                   {isListening ? <MicOff size={14} /> : <Mic size={14} />}
//                   {isListening ? "Stop" : "Voice"}
//                 </button>

//                 <button onClick={startWakeWordDetection} style={{ padding: "10px 11px", borderRadius: "10px", cursor: "pointer", background: isDark ? "rgba(99,102,241,0.15)" : "#e0e7ff", border: isDark ? "1px solid rgba(99,102,241,0.3)" : "1px solid #cbd5e1", color: "#4f46e5", fontSize: "11px", fontWeight: 600 }}>Wake</button>
//                 <button onClick={() => askAI()} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: "5px" }}>
//                   <Send size={13} /> Send
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* ── PDF RAG TAB ── */}
//           {activeTab === "pdf" && (
//             <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
//               <h2 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 2px" }}>📚 PDF Brain</h2>
//               <p style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.4)" : "#64748b", margin: "0 0 14px" }}>Upload → chunk → embed → semantic Q&A</p>

//               <div style={{ ...glass.card(theme), padding: "12px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", background: isDark ? "transparent" : "#f8fafc" }}>
//                 {["📄 Extract", "🔪 Chunk", "🔢 Embed", "🗄️ Pinecone", "❓ Question", "🔍 Retrieve", "🤖 LLM", "✅ Answer"].map((step, i, arr) => (
//                   <span key={step} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                     <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: isDark ? "rgba(167,139,250,0.12)" : "#fff", border: "1px solid #cbd5e1", color: "#4f46e5", fontWeight: 500 }}>{step}</span>
//                     {i < arr.length - 1 && <span style={{ color: "#94a3b8", fontSize: "11px" }}>→</span>}
//                   </span>
//                 ))}
//               </div>

//               {ragStep && (
//                 <div style={{ padding: "8px 14px", background: "#e0e7ff", border: "1px solid #4f46e5", borderRadius: "10px", fontSize: "13px", color: "#4f46e5", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
//                   <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4f46e5", animation: "pulse 1s infinite" }} />
//                   {ragStep}
//                 </div>
//               )}

//               <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
//                 <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5", marginBottom: "10px" }}>1. Upload & Ingest PDF</h3>
//                 <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
//                   <label style={{ padding: "8px 13px", background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff", border: "1px dashed #cbd5e1", borderRadius: "10px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", color: isDark ? "#fff" : "#334155" }}>
//                     <Upload size={13} /> {pdfFile ? pdfFile.name : "Choose PDF"}
//                     <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setPdfFile(e.target.files[0])} />
//                   </label>
//                   <button onClick={uploadPdf} disabled={!pdfFile || pdfLoading} style={{ ...btnPrimary, opacity: !pdfFile ? 0.5 : 1 }}>
//                     {pdfLoading ? "Ingesting…" : "Upload & Ingest"}
//                   </button>
//                 </div>

//                 {ingestStats && (
//                   <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
//                     {[
//                       { label: "Pages",    value: ingestStats.pages,                     color: "#4f46e5" },
//                       { label: "Chunks",   value: ingestStats.chunks,                    color: "#7c3aed" },
//                       { label: "Chars",    value: ingestStats.characters?.toLocaleString(), color: "#0891b2" },
//                       { label: "Namespace", value: ingestStats.namespace,                color: "#059669" },
//                     ].map(s => (
//                       <div key={s.label} style={{ padding: "6px 12px", background: isDark ? "rgba(255,255,255,0.04)" : "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", textAlign: "center" }}>
//                         <div style={{ fontSize: "14px", fontWeight: 700, color: s.color }}>{s.value}</div>
//                         <div style={{ fontSize: "9px", color: "#64748b" }}>{s.label}</div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {pdfList.length > 0 && (
//                 <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
//                   <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5", marginBottom: "8px" }}>2. Select Active PDF</h3>
//                   <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
//                     {pdfList.map(fname => (
//                       <div key={fname} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: pdfName === fname ? (isDark ? "rgba(99,102,241,0.2)" : "#e0e7ff") : (isDark ? "rgba(255,255,255,0.04)" : "#fff"), border: `1px solid ${pdfName === fname ? "#4f46e5" : "#cbd5e1"}`, borderRadius: "8px", cursor: "pointer" }} onClick={() => setPdfName(fname)}>
//                         <span style={{ fontSize: "12px", color: pdfName === fname ? "#4f46e5" : (isDark ? "rgba(255,255,255,0.6)" : "#334155") }}>
//                           {pdfName === fname ? "✅ " : "📄 "}{fname}
//                         </span>
//                         <button onClick={(e) => { e.stopPropagation(); deletePdf(fname) }} style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "6px", padding: "3px 5px", cursor: "pointer", color: "#b91c1c" }}>
//                           <Trash2 size={11} />
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
//                   <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5", margin: 0 }}>3. Summarize</h3>
//                   <button onClick={generateSummary} disabled={!pdfName || pdfLoading} style={{ padding: "6px 13px", background: "#e0f2fe", border: "1px solid #0284c7", borderRadius: "8px", cursor: "pointer", fontSize: "11px", color: "#0369a1", opacity: !pdfName ? 0.5 : 1 }}>
//                     {pdfLoading ? "…" : "Generate"}
//                   </button>
//                 </div>
//                 {pdfSummary
//                   ? <div style={{ fontSize: "12px", lineHeight: "1.7", color: isDark ? "rgba(255,255,255,0.75)" : "#334155", whiteSpace: "pre-wrap", maxHeight: "160px", overflowY: "auto", padding: "10px", background: isDark ? "rgba(0,0,0,0.2)" : "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>{pdfSummary}</div>
//                   : <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>Select a PDF and click Generate.</p>}
//               </div>

//               <div style={{ ...glass.card(theme), padding: "14px" }}>
//                 <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5", marginBottom: "10px" }}>4. Ask the PDF</h3>
//                 <div style={{ display: "flex", gap: "7px", marginBottom: "10px" }}>
//                   <input value={pdfQuestion} onChange={e => setPdfQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askPdfRag()} placeholder="Ask anything about this PDF…" style={{ ...inputStyle }} />
//                   <button onClick={askPdfRag} disabled={!pdfName || !pdfQuestion.trim() || pdfLoading} style={{ ...btnPrimary, opacity: !pdfName || !pdfQuestion.trim() ? 0.5 : 1, display: "flex", alignItems: "center", gap: "5px" }}>
//                     <Search size={13} /> Ask
//                   </button>
//                 </div>

//                 {pdfAnswer && (
//                   <div style={{ marginBottom: "12px" }}>
//                     <div style={{ fontSize: "11px", fontWeight: 600, color: "#059669", marginBottom: "6px" }}>🤖 Answer</div>
//                     <div style={{ fontSize: "13px", lineHeight: "1.7", color: isDark ? "rgba(255,255,255,0.85)" : "#1e293b", padding: "12px", background: "#d1fae5", border: "1px solid #10b981", borderRadius: "10px" }}>
//                       {pdfAnswer}
//                     </div>
//                   </div>
//                 )}

//                 {pdfChunks.length > 0 && (
//                   <div>
//                     <div style={{ fontSize: "11px", fontWeight: 600, color: "#4f46e5", marginBottom: "7px" }}>🔍 Retrieved Chunks ({pdfChunks.length})</div>
//                     <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
//                       {pdfChunks.map((chunk, i) => <ChunkCard key={i} chunk={chunk} index={i} theme={theme} />)}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* ── MEMORY TAB ── */}
//           {activeTab === "memories" && (
//             <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
//                 <div>
//                   <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>🧠 Pinecone Memory</h2>
//                   <p style={{ fontSize: "11px", color: "#64748b", margin: "3px 0 0" }}>llama-text-embed-v2 · 1024 dims</p>
//                 </div>
//                 <button onClick={loadMemories} style={{ padding: "6px 12px", background: "#e0e7ff", border: "1px solid #4f46e5", borderRadius: "8px", cursor: "pointer", fontSize: "12px", color: "#4f46e5" }}>↻ Refresh</button>
//               </div>
//               {memoryMsg && <div style={{ padding: "7px 12px", background: "#d1fae5", border: "1px solid #10b981", borderRadius: "8px", fontSize: "12px", color: "#065f46", marginBottom: "12px" }}>{memoryMsg}</div>}

//               <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
//                 <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5", marginBottom: "8px" }}>Save memory</h3>
//                 <div style={{ display: "flex", gap: "7px" }}>
//                   <input value={newFact} onChange={e => setNewFact(e.target.value)} onKeyDown={e => e.key === "Enter" && saveFact()} placeholder='e.g. "I am learning React and FastAPI"' style={{ ...inputStyle }} />
//                   <button onClick={saveFact} disabled={!newFact.trim() || savingFact} style={{ ...btnPrimary, opacity: !newFact.trim() ? 0.5 : 1 }}>{savingFact ? "…" : "Save"}</button>
//                 </div>
//               </div>

//               <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
//                 <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#0891b2", marginBottom: "8px" }}>Semantic search</h3>
//                 <div style={{ display: "flex", gap: "7px", marginBottom: "8px" }}>
//                   <input value={memSearchQuery} onChange={e => setMemSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchMemoriesSemantic()} placeholder="What programming languages do I know?" style={{ ...inputStyle }} />
//                   <button onClick={searchMemoriesSemantic} disabled={!memSearchQuery.trim() || memSearching} style={{ padding: "10px 14px", background: "#e0f2fe", border: "1px solid #0284c7", borderRadius: "10px", cursor: "pointer", fontSize: "12px", color: "#0369a1", display: "flex", alignItems: "center", gap: "5px", opacity: !memSearchQuery.trim() ? 0.5 : 1 }}>
//                     <Search size={13} /> {memSearching ? "…" : "Search"}
//                   </button>
//                 </div>
//                 {memSearchResults.map((r, i) => (
//                   <div key={i} style={{ padding: "8px 10px", background: "#ecfeff", border: "1px solid #22d3ee", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
//                     <span style={{ fontSize: "12px", color: "#0e7490" }}>{r.fact}</span>
//                     <span style={{ fontSize: "11px", fontWeight: "bold", color: "#0891b2", flexShrink: 0, marginLeft: "8px" }}>{Math.round(r.score * 100)}%</span>
//                   </div>
//                 ))}
//               </div>

//               <div style={{ ...glass.card(theme), padding: "14px" }}>
//                 <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5", marginBottom: "10px" }}>All memories ({memories.length})</h3>
//                 {memoriesLoading
//                   ? <div style={{ display: "flex", gap: "4px" }}>{[0,.15,.3].map((d,i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4f46e5", animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}</div>
//                   : memories.length === 0
//                   ? <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>No memories yet.</p>
//                   : memories.map(m => (
//                     <div key={m.id} style={{ padding: "9px 10px", background: isDark ? "rgba(167,139,250,0.07)" : "#f8fafc", border: isDark ? "1px solid rgba(167,139,250,0.15)" : "1px solid #e2e8f0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "5px" }}>
//                       <div style={{ flex: 1 }}>
//                         <p style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.85)" : "#334155", margin: "0 0 2px" }}>{m.fact}</p>
//                         {m.timestamp && <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>{new Date(m.timestamp).toLocaleString()}</p>}
//                       </div>
//                       <button onClick={() => deleteMemory(m.id)} style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#b91c1c", flexShrink: 0 }}><Trash2 size={11} /></button>
//                     </div>
//                   ))
//                 }
//               </div>
//             </div>
//           )}

//           {/* ── CALENDAR TAB ── */}
//           {activeTab === "calendar" && (
//             <div style={{ flex: 1, overflowY: "auto" }}>
//               {/* <CalendarTab /> */}
//               <CalendarTab onEventChange={refreshDashboard} />
//             </div>
//           )}

//           {/* ── MEETING TAB ── */}
//           {activeTab === "meeting" && (
//             <div style={{ flex: 1, overflowY: "auto" }}>
//               <ShadowMeetingTab />
//             </div>
//           )}

//           {activeTab === "tasks" && (
//            <div style={{ flex: 1, overflowY: "auto" }}>
//             <TodosNotesTab />
//             </div>
//           )}

//           {/* ── INSIGHTS TAB ── */}
//           {activeTab === "insights" && (
//             <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
//                 <div>
//                   <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>📈 Productivity Insights</h2>
//                   <p style={{ fontSize: "11px", color: "#64748b", margin: "3px 0 0" }}>AI analysis of timeline maps</p>
//                 </div>
//                 <button onClick={getInsights} style={{ ...btnPrimary }}>{loadingInsights ? "Analyzing…" : "Analyze Now"}</button>
//               </div>
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
//                 {dashStats.slice(0, 4).map(s => (
//                   <div key={s.label} style={{ ...glass.card(theme), padding: "14px 16px" }}>
//                     <div style={{ fontSize: "18px", marginBottom: "3px" }}>{s.icon}</div>
//                     <div style={{ fontSize: "26px", fontWeight: 700, color: s.color }}>{s.value}</div>
//                     <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{s.label}</div>
//                   </div>
//                 ))}
//               </div>
//               <div style={{ ...glass.card(theme), padding: "14px" }}>
//                 <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5", marginBottom: "8px" }}>🧠 AI Analysis</h3>
//                 {loadingInsights
//                   ? <div style={{ display: "flex", gap: "4px", alignItems: "center", color: "#64748b", fontSize: "12px" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4f46e5", animation: "bounce 1s infinite" }} /> Analyzing…</div>
//                   : <div style={{ fontSize: "13px", lineHeight: "1.8", color: isDark ? "rgba(255,255,255,0.75)" : "#334155", whiteSpace: "pre-wrap" }}>{insights || "Click 'Analyze Now' to generate insights."}</div>}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <footer style={{ margin: "0 10px 10px", ...glass.card(theme), padding: "6px 16px", borderRadius: "0 0 16px 16px", display: "flex", justifyContent: "space-between", flexShrink: 0, background: isDark ? "transparent" : "#f8fafc" }}>
//           <span style={{ fontSize: "10px", color: isDark ? "rgba(255,255,255,0.2)" : "#94a3b8" }}>VoxMind Chronos · Pinecone RAG</span>
//           <span style={{ fontSize: "10px", color: isDark ? "rgba(255,255,255,0.2)" : "#94a3b8" }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
//         </footer>
//       </main>

//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght=400;500;600;700&display=swap');
//         * { box-sizing: border-box; }
        
//         ::-webkit-scrollbar { width: 4px; height: 4px; }
//         ::-webkit-scrollbar-track { background: transparent; }
//         ::-webkit-scrollbar-thumb { background: rgba(79,70,229,0.2); border-radius: 4px; }
//         ::-webkit-scrollbar-thumb:hover { background: rgba(79,70,229,0.4); }

//         @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
//         @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
//         button:hover { filter: brightness(0.95); }
//         input::placeholder { color: ${isDark ? "rgba(255,255,255,0.3)" : "#94a3b8"}; }

//         .history-item-row {
//           position: relative;
//         }
//         .history-item-row .history-cross-btn {
//           opacity: 0;
//           position: absolute;
//           right: 6px;
//           background: ${isDark ? "rgba(10,10,25,0.85)" : "#ffffff"} !important;
//           border: ${isDark ? "none" : "1px solid #cbd5e1"} !important;
//           backdrop-filter: blur(4px);
//           transition: opacity 0.15s;
//         }
//         .history-item-row:hover .history-cross-btn {
//           opacity: 1;
//         }
//         .history-cross-btn:hover {
//           color: #dc2626 !important;
//           background-color: #fee2e2 !important;
//         }
//       `}</style>
      
//       {showTTSSettings && (
//         <TTSSettings tts={tts} onClose={() => setShowTTSSettings(false)} />
//       )}
//     </div>
//   )
// }

// export default Home

import { useState, useRef, useEffect } from "react"
import { 
  Mic, 
  MicOff, 
  Send, 
  Brain, 
  BarChart2, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Users, 
  Sun, 
  Moon, 
  X,
  CheckSquare,
  Target,
  BookOpen,
  Scissors,
  Database,
  CircleHelp,
  Bot,
  CheckCircle,
  TrendingUp
} from "lucide-react"
import API from "../services/api"

import CalendarTab from "../CalendarTab"
import ShadowMeetingTab from "../ShadowMeetingTab"
import useTTS from "../useTTS"
import TTSSettings from "../TTSSettings"

import TodosNotesTab from "../TodosNotesTab"

/* ─────────────────────────────────────────────────────────
   DESIGN TOKENS & HIGH-CONTRAST PALETTES (SHINY UPGRADE)
───────────────────────────────────────────────────────── */
const LIGHT = {
  bg: "radial-gradient(circle at 50% 0%, #FFFFFF 0%, #F1F5F9 70%, #E2E8F0 100%)",
  surface: "rgba(255, 255, 255, 0.85)",
  surface2: "#F8FAFC",
  border: "rgba(203, 213, 225, 0.7)",
  text: "#0F172A",
  textSecondary: "#475569",
  primary: "#4F46E5",
  secondary: "#7C3AED",
  accent: "#0891B2",
}

const DARK = {
  bg: "radial-gradient(circle at 50% 0%, #1E1B4B 0%, #0F172A 60%, #020617 100%)",
  surface: "rgba(30, 41, 59, 0.7)",
  surface2: "rgba(15, 23, 42, 0.6)",
  border: "rgba(71, 85, 105, 0.5)",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  primary: "#8B5CF6",
  secondary: "#A855F7",
  accent: "#22D3EE",
}

const glass = {
  card: (theme) => {
    const tokens = theme === "dark" ? DARK : LIGHT;
    return {
      background: tokens.surface,
      border: `1px solid ${tokens.border}`,
      borderRadius: "16px",
      backdropFilter: "blur(16px) saturate(120%)",
      boxShadow: theme === "dark" 
        ? "0 4px 30px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.05), 0 0 25px rgba(139, 92, 246, 0.05)" 
        : "0 8px 32px rgba(31, 38, 135, 0.06), inset 0 1px 1px rgba(255,255,255,0.8)",
    };
  },
  sidebar: (theme) => {
    const tokens = theme === "dark" ? DARK : LIGHT;
    return {
      background: theme === "dark" ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.4)",
      borderRight: `1px solid ${tokens.border}`,
      backdropFilter: "blur(20px)",
    };
  },
}

/* ─────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────── */

/** Relevance score pill */
const ScoreBadge = ({ score }) => {
  const pct   = Math.round(score * 100)
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#d97706" : "#dc2626"
  return (
    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: `${color}15`, border: `1px solid ${color}44`, color }}>
      {pct}% match
    </span>
  )
}

/** Collapsible RAG chunk card */
const ChunkCard = ({ chunk, index, theme }) => {
  const [open, setOpen] = useState(false)
  const isDark = theme === "dark"
  const tokens = isDark ? DARK : LIGHT

  return (
    <div style={{ 
      background: isDark ? "rgba(99,102,241,0.07)" : tokens.surface2, 
      border: `1px solid ${tokens.border}`, 
      borderRadius: "10px", 
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: "8px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: tokens.primary, flexShrink: 0 }}>#{index + 1}</span>
          <span style={{ fontSize: "11px", color: tokens.textSecondary, flexShrink: 0 }}>Page {chunk.page}</span>
          <ScoreBadge score={chunk.score} />
          <span style={{ fontSize: "12px", color: tokens.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {chunk.text.slice(0, 60)}…
          </span>
        </div>
        {open ? <ChevronUp size={13} color={tokens.textSecondary} /> : <ChevronDown size={13} color={tokens.textSecondary} />}
      </div>
      {open && (
        <div style={{ 
          padding: "12px", 
          fontSize: "12px", 
          lineHeight: "1.7", 
          color: tokens.text, 
          borderTop: `1px solid ${tokens.border}`,
          background: tokens.surface
        }}>
          <div style={{ whiteSpace: "pre-wrap" }}>{chunk.text}</div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
const Home = () => {

  /* ── state ── */
  const [theme, setTheme]                 = useState("dark")
  const [question, setQuestion]           = useState("")
  const [loading, setLoading]             = useState(false)
  const [isListening, setIsListening]     = useState(false)
  const [continuousMode, setContinuousMode] = useState(false)
  const [chatHistory, setChatHistory]     = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [focusCompleted, setFocusCompleted] = useState(false)
  const [showTTSSettings, setShowTTSSettings] = useState(false)
  const [activeTab, setActiveTab]         = useState("chat")

  /* PDF RAG state */
  const [pdfFile, setPdfFile]             = useState(null)
  const [pdfName, setPdfName]             = useState("")
  const [pdfList, setPdfList]             = useState([])
  const [pdfSummary, setPdfSummary]       = useState("")
  const [pdfQuestion, setPdfQuestion]     = useState("")
  const [pdfAnswer, setPdfAnswer]         = useState("")
  const [pdfChunks, setPdfChunks]         = useState([])
  const [pdfLoading, setPdfLoading]       = useState(false)
  const [ingestStats, setIngestStats]     = useState(null)
  const [ragStep, setRagStep]             = useState("")

  /* Insights */
  const [insights, setInsights]           = useState("")
  const [loadingInsights, setLoadingInsights] = useState(false)

  /* Memory */
  const [memories, setMemories]           = useState([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [newFact, setNewFact]             = useState("")
  const [savingFact, setSavingFact]       = useState(false)
  const [memSearchQuery, setMemSearchQuery] = useState("")
  const [memSearchResults, setMemSearchResults] = useState([])
  const [memSearching, setMemSearching]   = useState(false)
  const [memoryMsg, setMemoryMsg]         = useState("")

  /* Dashboard + focus */
  const [dashboard, setDashboard] = useState({ todos: 0, events: 0, notes: 0, memories: 0, pdfs: 0 })
  const [focus, setFocus]         = useState({ active: false })

  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello 👋 I am VoxMind Chronos — your AI Second Brain with Pinecone RAG-powered PDF understanding." }
  ])

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const tts = useTTS()

  /* ── Deepgram refs ── */
  const wsRef            = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const keepAliveRef     = useRef(null)

  const isDark = theme === "dark"
  const tokens = isDark ? DARK : LIGHT

  /* ── helpers ── */
  const addSystemMsg = (text) => setMessages(p => [...p, { role: "assistant", text }])
  const showMemMsg   = (msg)  => { setMemoryMsg(msg); setTimeout(() => setMemoryMsg(""), 3000) }

  const refreshDashboard = async () => {
    try {
      const userId = localStorage.getItem("gcal_user_id") || ""
      const qs     = userId ? `?user_id=${encodeURIComponent(userId)}` : ""
      const d      = await fetch(`http://localhost:8000/dashboard${qs}`).then(r => r.json())
      setDashboard(d)
    } catch (e) { console.error(e) }
  }

  /* ── auto-scroll ── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  /* ── init ── */
  useEffect(() => {
    setChatHistory(JSON.parse(localStorage.getItem("voxmind_chats")) || [])
    if ("Notification" in window && Notification.permission !== "granted") Notification.requestPermission()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const userId = localStorage.getItem("gcal_user_id") || ""
        const qs     = userId ? `?user_id=${encodeURIComponent(userId)}` : ""
 
        const [d, f] = await Promise.all([
          fetch(`http://localhost:8000/dashboard${qs}`).then(r => r.json()),
          fetch("http://localhost:8000/focus").then(r => r.json()),
        ])
        setDashboard(d)
        setFocus(f)
      } catch (e) { console.error(e) }
    }
 
    load()                                    
    const interval = setInterval(load, 30000) 
    return () => clearInterval(interval)      
  }, [])

  /* ── chat history sync ── */
  useEffect(() => {
    if (messages.length <= 1) return
    const chatId = currentChatId || Date.now()
    const chat   = { id: chatId, title: messages[1]?.text?.slice(0, 30) || "New Chat", messages }
    setChatHistory(prev => {
      const updated = [...prev]
      const idx = updated.findIndex(c => c.id === chatId)
      if (idx >= 0) updated[idx] = chat; else updated.unshift(chat)
      localStorage.setItem("voxmind_chats", JSON.stringify(updated))
      return updated
    })
    if (!currentChatId) setCurrentChatId(chatId)
  }, [messages, currentChatId])

  /* ── speech recognition (wake word only) ── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) { const r = new SR(); r.continuous = false; r.lang = "en-US"; r.interimResults = false; recognitionRef.current = r }
  }, [])

  /* ── reminder + focus poll ── */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await API.get("/due-reminders")
        res.data.due_reminders?.forEach(r => {
          addSystemMsg(`🔔 Reminder: ${r.task}`)
          speakResponse(`Reminder: ${r.task}`)
          if ("Notification" in window && Notification.permission === "granted")
            new Notification("VoxMind Reminder", { body: r.task })
        })
        const f = await fetch("http://localhost:8000/focus").then(r => r.json())
        if (f.completed && !focusCompleted) {
          setFocusCompleted(true)
          addSystemMsg(`🎯 Focus completed: ${f.task}`)
          speakResponse(`Focus session for ${f.task} completed. Great work!`)
        }
      } catch (e) { console.error(e) }
    }, 5000)
    return () => clearInterval(interval)
  }, [focusCompleted])

  /* ── TTS ── */
  const speakResponse = (text) => {
    tts.speak(text, {
      onEnd: () => { if (continuousMode) startListening() }
    })
  }

  /* ── wake word ── */
  const startWakeWordDetection = () => {
    if (!recognitionRef.current) return
    recognitionRef.current.continuous = true
    try { recognitionRef.current.start() } catch (e) {}
    recognitionRef.current.onresult = (event) => {
      const t = event.results[event.results.length - 1][0].transcript.toLowerCase()
      if (t.includes("hey voxmind")) {
        window.speechSynthesis.cancel()
        speakResponse("Yes? I am listening.")
        recognitionRef.current.stop()
        setTimeout(() => startDeepgramListening(), 1500)
      }
    }
  }

  /* ── ask AI ── */
  const askAI = async (customQuestion = null) => {
    const q = customQuestion || question
    if (!q.trim()) return
    setMessages(p => [...p, { role: "user", text: q }])
    setLoading(true)
    try {
      const res  = await API.get(`/ask?question=${encodeURIComponent(q)}`)
      const text = res.data.response
      setMessages(p => [...p, { role: "assistant", text }])
      speakResponse(text)
       if (q.toLowerCase().includes("remember that")) {
        setTimeout(() => loadMemories(), 1200)
        setDashboard(p => ({ ...p, memories: p.memories + 1 }))
      }
 
      if (
        q.toLowerCase().includes("schedule") &&
        q.toLowerCase().includes("tomorrow")
      ) {
        if (text && text.toLowerCase().startsWith("scheduled:")) {
          setDashboard(p => ({ ...p, events: p.events + 1 }))
        }
      }

    } catch { addSystemMsg("❌ Something went wrong. Please try again.") }
    setQuestion(""); setLoading(false)
  }

  const sendMessage = (text) => { setActiveTab("chat"); askAI(text) }

  /* ── fallback browser voice ── */
  const startListening = () => {
    if (!recognitionRef.current) return
    setIsListening(true)
    try { recognitionRef.current.start() } catch (e) {}
    recognitionRef.current.onresult = async (e) => {
      const t = e.results[0][0].transcript
      setQuestion(t); await askAI(t); setIsListening(false)
    }
    recognitionRef.current.onerror = () => { setIsListening(false) }
    recognitionRef.current.onend   = () => setIsListening(false)
  }

  /* ── deepgram actions ── */
  const stopDeepgramListening = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    } catch (e) {}
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "User stopped")
      }
    } catch (e) {}
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
    } catch (e) {}

    streamRef.current        = null
    mediaRecorderRef.current = null
    wsRef.current            = null
    setIsListening(false)
  }

  const startDeepgramListening = async () => {
    if (isListening) { stopDeepgramListening(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ws = new WebSocket("ws://localhost:8000/ws/stt")
      wsRef.current = ws

      ws.onopen = () => {
        setIsListening(true)
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : ""

        const recorderOptions = mimeType ? { mimeType } : {}
        const mediaRecorder   = new MediaRecorder(stream, recorderOptions)
        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data)
          }
        }
        mediaRecorder.start(250)

        keepAliveRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "keep_alive" }))
          }
        }, 10000)
      }

      ws.onmessage = (event) => {
        let data
        try { data = JSON.parse(event.data) } catch { return }

        if (data.type === "ai_response") {
          const transcript = data.transcript || ""
          const response   = data.response   || ""
          setQuestion(transcript)
          setMessages(prev => [
            ...prev,
            { role: "user",      text: transcript },
            { role: "assistant", text: response   },
          ])
          speakResponse(response)
        }
        if (data.type === "transcript") {
          setQuestion(data.text || "")
        }
        if (data.type === "barge_in") {
          window.speechSynthesis.cancel()
          tts.stop?.()
        }
        if (data.type === "error") {
          addSystemMsg(`❌ STT error: ${data.message || "Unknown error"}`)
          stopDeepgramListening()
        }
      }

      ws.onerror = () => {
        addSystemMsg("❌ Voice connection failed.")
        stopDeepgramListening()
      }
      ws.onclose = (evt) => {
        if (evt.code !== 1000 && evt.code !== 1001) {
          addSystemMsg(`⚠️ Voice connection closed (${evt.code}).`)
        }
        stopDeepgramListening()
      }
    } catch (err) {
      addSystemMsg(`❌ Mic error: ${err.message || "Could not access microphone."}`)
      setIsListening(false)
    }
  }

  /* ── history item deletion helper ── */
  const deleteHistoryItem = (e, idToDelete) => {
    e.stopPropagation()
    const updated = chatHistory.filter(chat => chat.id !== idToDelete)
    setChatHistory(updated)
    localStorage.setItem("voxmind_chats", JSON.stringify(updated))
    if (currentChatId === idToDelete) {
      setCurrentChatId(null)
      setMessages([{ role: "assistant", text: "Hello 👋 I am VoxMind Chronos." }])
    }
  }

  /* ─────────────────────────────────────────────────────
     PDF RAG FUNCTIONS
  ───────────────────────────────────────────────────── */
  const uploadPdf = async () => {
    if (!pdfFile) return
    setPdfLoading(true)
    setPdfAnswer(""); setPdfChunks([]); setPdfSummary(""); setIngestStats(null)
    try {
      setRagStep("📄 Extracting text from PDF…")
      const fd = new FormData()
      fd.append("file", pdfFile)

      setRagStep("🔪 Splitting into chunks…")
      const res  = await fetch("http://localhost:8000/upload-pdf", { method: "POST", body: fd })
      const data = await res.json()

      if (data.error) { addSystemMsg(`❌ ${data.error}`); return }

      setRagStep("✅ Ingested into Pinecone!")
      setIngestStats(data)
      setPdfName(data.filename)
      setPdfList(p => [...new Set([...p, data.filename])])
      setDashboard(p => ({ ...p, pdfs: p.pdfs + 1 }))
      addSystemMsg(`✅ PDF Ingested into Pinecone!\n\nFile: ${data.filename}`)
    } catch (e) { addSystemMsg("❌ PDF upload failed.") }
    finally { setPdfLoading(false); setTimeout(() => setRagStep(""), 2000) }
  }

  const generateSummary = async () => {
    if (!pdfName) return
    setPdfLoading(true); setRagStep("🧠 Summarizing full document…")
    try {
      const r = await fetch(`http://localhost:8000/pdf-summary?filename=${encodeURIComponent(pdfName)}`, { method: "POST" })
      const d = await r.json()
      setPdfSummary(d.summary || d.error)
    } catch { setPdfSummary("Failed to generate summary.") }
    finally { setPdfLoading(false); setRagStep("") }
  }

  const askPdfRag = async () => {
    if (!pdfName || !pdfQuestion.trim()) return
    setPdfLoading(true); setPdfAnswer(""); setPdfChunks([])
    try {
      setRagStep("🔍 Embedding your question…")
      await new Promise(r => setTimeout(r, 400))
      const res  = await fetch("http://localhost:8000/pdf-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ filename: pdfName, question: pdfQuestion }),
      })
      const data = await res.json()
      setPdfAnswer(data.answer || data.error)
      setPdfChunks(data.chunks || [])
      setRagStep("✅ Answer ready!")
      setTimeout(() => setRagStep(""), 1500)
    } catch { setPdfAnswer("Failed to get answer."); setRagStep("") }
    finally { setPdfLoading(false) }
  }

  const deletePdf = async (filename) => {
    try {
      await fetch(`http://localhost:8000/pdf-delete?filename=${encodeURIComponent(filename)}`, { method: "DELETE" })
      setPdfList(p => p.filter(f => f !== filename))
      if (pdfName === filename) { setPdfName(""); setIngestStats(null); setPdfAnswer(""); setPdfChunks([]) }
    } catch (e) { console.error(e) }
  }

  /* ─────────────────────────────────────────────────────
     MEMORY FUNCTIONS
  ───────────────────────────────────────────────────── */
  const loadMemories = async () => {
    setMemoriesLoading(true)
    try {
      const r    = await fetch("http://localhost:8000/memories")
      const data = await r.json()
      setMemories(data.memories || [])
      setDashboard(p => ({ ...p, memories: (data.memories || []).length }))
    } catch (e) { console.error(e) }
    finally { setMemoriesLoading(false) }
  }

  const saveFact = async () => {
    if (!newFact.trim()) return
    setSavingFact(true)
    try {
      const r    = await fetch("http://localhost:8000/memories/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fact: newFact.trim() }) })
      const data = await r.json()
      if (data.memory) { setMemories(p => [data.memory, ...p]); setNewFact(""); showMemMsg("✅ Saved to Pinecone!"); setDashboard(p => ({ ...p, memories: p.memories + 1 })) }
    } catch { showMemMsg("❌ Failed to save.") }
    finally { setSavingFact(false) }
  }

  const deleteMemory = async (id) => {
    try {
      await fetch(`http://localhost:8000/memories/${id}`, { method: "DELETE" })
      setMemories(p => p.filter(m => m.id !== id))
      setDashboard(p => ({ ...p, memories: Math.max(0, p.memories - 1) }))
    } catch { showMemMsg("❌ Delete failed.") }
  }

  const searchMemoriesSemantic = async () => {
    if (!memSearchQuery.trim()) return
    setMemSearching(true)
    try {
      const r    = await fetch("http://localhost:8000/memories/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: memSearchQuery, top_k: 5 }) })
      const data = await r.json()
      setMemSearchResults(data.results || [])
    } catch { showMemMsg("❌ Search failed.") }
    finally { setMemSearching(false) }
  }

  const getInsights = async () => {
    setLoadingInsights(true)
    try {
      const r = await fetch("http://localhost:8000/ask?question=analyze my productivity")
      setInsights((await r.json()).response)
    } catch (e) { console.error(e) }
    finally { setLoadingInsights(false) }
  }

  const quickActions = [
    { label: "Daily Briefing",      query: "good morning",            color: LIGHT.primary },
    { label: "Plan My Day",         query: "plan my day",             color: LIGHT.secondary },
    { label: "Productivity Report", query: "analyze my productivity", color: LIGHT.accent },
    { label: "Show Todos",          query: "show my todos",           color: "#059669" },
    { label: "My Memories",         query: "what do you remember",    color: "#db2777" },
  ]

  const dashStats = [
    { label: "Todos",    value: dashboard.todos,    icon: <CheckSquare size={18} />, color: tokens.primary },
    { label: "Events",   value: dashboard.events,   icon: <Calendar size={18} />,    color: tokens.secondary },
    { label: "Notes",    value: dashboard.notes,    icon: <FileText size={18} />,    color: tokens.accent },
    { label: "Memories", value: dashboard.memories, icon: <Brain size={18} />,       color: tokens.primary },
    { label: "PDFs",     value: dashboard.pdfs,     icon: <BookOpen size={18} />,    color: tokens.secondary },
    { label: "Focus",    value: focus?.active ? "ON" : "Idle", icon: <Target size={18} />, color: focus?.active ? "#059669" : tokens.textSecondary },
  ]

  const TABS = [
    { id: "chat",      icon: <Brain size={13} />,    label: "Chat"      },
    { id: "memories",  icon: <Brain size={13} />,    label: "Memory"    },
    { id: "pdf",       icon: <FileText size={13} />, label: "PDF Brain" },
    { id: "tasks",     icon: <CheckSquare size={13}/>, label: "Tasks"   },
    { id: "insights",  icon: <BarChart2 size={13} />,label: "Insights"  },
    { id: "calendar",  icon: <Calendar size={13} />, label: "Calendar"  },
    { id: "meeting",   icon: <Users size={13} />,    label: "Meeting"   },
  ]

  const inputStyle = { 
    flex: 1, 
    padding: "10px 13px", 
    background: isDark ? "rgba(30, 41, 59, 0.5)" : "#FFFFFF", 
    border: `1px solid ${tokens.border}`, 
    borderRadius: "10px", 
    color: tokens.text, 
    fontSize: "13px", 
    outline: "none",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)"
  }

  const btnPrimary = { 
    padding: "10px 18px", 
    background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.secondary})`, 
    border: "none", 
    borderRadius: "10px", 
    cursor: "pointer", 
    fontSize: "13px", 
    fontWeight: 600, 
    color: "#fff",
    boxShadow: isDark ? "0 4px 12px rgba(139, 92, 246, 0.3)" : "0 4px 12px rgba(79, 70, 229, 0.2)"
  }

  return (
    <div style={{ height: "100vh", background: tokens.bg, color: tokens.text, fontFamily: "'Inter', sans-serif", display: "flex", overflow: "hidden", position: "relative" }}>
      
      {/* Dynamic Ambient Background Glow Elements */}
      <div style={{ position: "absolute", width: "400px", height: "400px", top: "-10%', left: '25%'", background: isDark ? "rgba(139, 92, 246, 0.12)" : "rgba(99, 102, 241, 0.08)", filter: "blur(100px)", pointerEvents: "none", borderRadius: "50%" }} />
      <div style={{ position: "absolute", width: "350px", height: "350px", bottom: "10%", right: "10%", background: isDark ? "rgba(34, 211, 238, 0.08)" : "rgba(6, 182, 212, 0.05)", filter: "blur(80px)", pointerEvents: "none", borderRadius: "50%" }} />

      {/* ── SIDEBAR ── */}
      <aside style={{ ...glass.sidebar(theme), width: "245px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", padding: "16px 12px", height: "100%", overflowY: "auto", zIndex: 10 }}>
        <div style={{ textAlign: "center", padding: "4px 0 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "42px", height: "42px", borderRadius: "12px", background: isDark ? "rgba(167,139,250,0.15)" : "#e0e7ff", margin: "0 auto 6px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Brain size={24} color={tokens.primary} />
          </div>
          <div style={{ fontWeight: 700, fontSize: "14px", color: tokens.primary, textShadow: isDark ? "0 0 10px rgba(167,139,250,0.3)" : "none" }}>VoxMind Chronos</div>
          <div style={{ fontSize: "10px", color: tokens.textSecondary, marginTop: "1px" }}>Pinecone RAG · LLaMA · Groq</div>
        </div>

        <button onClick={() => { setMessages([{ role: "assistant", text: "Hello 👋 I am VoxMind Chronos." }]); setCurrentChatId(null); setActiveTab("chat") }}
          style={{ ...glass.card(theme), padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", fontWeight: 600, color: tokens.primary, border: `1px solid ${tokens.primary}`, width: "100%", flexShrink: 0 }}>
          <Plus size={12} /> New Chat
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: "8px 12px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 500, background: activeTab === tab.id ? (isDark ? "rgba(167,139,250,0.18)" : "#e0e7ff") : "transparent", border: activeTab === tab.id ? `1px solid ${tokens.border}` : "1px solid transparent", color: activeTab === tab.id ? tokens.primary : tokens.textSecondary, transition: "all 0.2s", width: "100%", boxShadow: activeTab === tab.id ? "0 2px 8px rgba(0,0,0,0.02)" : "none" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${tokens.border}`, margin: "4px 0", flexShrink: 0 }} />
        <div style={{ fontSize: "9px", color: tokens.textSecondary, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 4px", flexShrink: 0 }}>History</div>
        
        {/* Dynamic Inner History Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {chatHistory.length === 0 && <div style={{ fontSize: "11px", color: tokens.textSecondary, padding: "6px 4px" }}>No chats yet.</div>}
          {chatHistory.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => { setMessages(chat.messages); setCurrentChatId(chat.id); setActiveTab("chat") }}
              className="history-item-row"
              style={{ 
                ...glass.card(theme), 
                padding: "6px 10px", 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                borderRadius: "8px",
                border: currentChatId === chat.id ? `1px solid ${tokens.primary}` : `1px solid ${tokens.border}`,
                position: "relative",
                background: currentChatId === chat.id ? (isDark ? "rgba(139, 92, 246, 0.15)" : "#e0e7ff") : tokens.surface
              }}
            >
              <span style={{ fontSize: "11px", color: tokens.text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginRight: "18px" }}>
                {chat.title}
              </span>
              <button 
                onClick={(e) => deleteHistoryItem(e, chat.id)}
                className="history-cross-btn"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  color: tokens.textSecondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px"
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN WORKSPACE ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", zIndex: 10, padding: "10px" }}>

        {/* Header Container Matrix */}
        <header style={{ ...glass.card(theme), padding: "14px 20px", display: "flex", alignItems: "center", justifyBetween: "space-between", borderRadius: "16px 16px 0 0", flexShrink: 0, borderBottom: "none" }}>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: tokens.primary, margin: 0, textShadow: isDark ? "0 0 12px rgba(139,92,246,0.2)" : "none" }}>VoxMind Chronos</h1>
            <p style={{ fontSize: "11px", color: tokens.textSecondary, margin: "1px 0 0" }}>Pinecone RAG · Semantic Memory</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
            {focus?.active && <span style={{ background: isDark ? "rgba(16,185,129,0.2)" : "#d1fae5", border: "1px solid #10b981", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", color: isDark ? "#4ade80" : "#065f46", boxShadow: "0 0 10px rgba(16,185,129,0.1)" }}>🎯 {focus.task}</span>}
            
            {/* Shiny Dynamic Color Wave Toggle Button */}
            <button 
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="shiny-theme-btn"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: isDark
                  ? "linear-gradient(135deg, #6366F1, #A855F7)"
                  : "linear-gradient(135deg, #F59E0B, #E11D48)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#FFFFFF",
                boxShadow: isDark ? "0 0 15px rgba(168,85,247,0.4)" : "0 4px 12px rgba(245,158,11,0.3)"
              }}
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              onClick={() => setShowTTSSettings(true)}
              style={{
                background: tts.ttsReady ? (isDark ? "rgba(52,211,153,0.15)" : "#d1fae5") : tokens.surface2,
                border: `1px solid ${tts.ttsReady ? "#10b981" : tokens.border}`,
                borderRadius: "20px", padding: "5px 12px", cursor: "pointer", fontSize: "11px",
                color: tts.ttsReady ? (isDark ? "#6ee7b7" : "#065f46") : tokens.textSecondary,
                fontWeight: 600,
                boxShadow: tts.speaking ? "0 0 12px rgba(16,185,129,0.3)" : "none"
              }}
            >
              {tts.speaking ? "🔊 Speaking…" : tts.ttsReady ? "🎙 ElevenLabs" : "🔈 Browser TTS"}
            </button>

            <button onClick={() => setContinuousMode(!continuousMode)}
              style={{ background: continuousMode ? (isDark ? "rgba(99,102,241,0.25)" : "#e0e7ff") : tokens.surface2, border: `1px solid ${continuousMode ? tokens.primary : tokens.border}`, borderRadius: "20px", padding: "5px 12px", cursor: "pointer", fontSize: "11px", color: continuousMode ? tokens.primary : tokens.textSecondary, fontWeight: 600 }}>
              {continuousMode ? "🔊 ON" : "🔇 OFF"}
            </button>
          </div>
        </header>

        {/* Stats Dashboard Layout Grid */}
        <div style={{ padding: "6px 12px 10px", background: tokens.surface, borderLeft: `1px solid ${tokens.border}`, borderRight: `1px solid ${tokens.border}`, display: "flex", gap: "6px", flexShrink: 0, backdropFilter: "blur(16px)" }}>
          {dashStats.map(s => (
            <div key={s.label} style={{ flex: 1, background: isDark ? "rgba(30, 41, 59, 0.4)" : "#FFFFFF", border: `1px solid ${tokens.border}`, padding: "8px", borderRadius: "10px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
              <div style={{ color: s.color, marginBottom: "2px", display: "flex", alignItems: "center" }}>{s.icon}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "9px", color: tokens.textSecondary }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Canvas Content block */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: tokens.surface, borderLeft: `1px solid ${tokens.border}`, borderRight: `1px solid ${tokens.border}`, position: "relative", overflow: "hidden", backdropFilter: "blur(16px)" }}>

          {/* ── CHAT CONTROLLER SELECTION ── */}
          {activeTab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
              {messages.length <= 1 && (
                <div style={{ padding: "24px 18px 0", textAlign: "center", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                    <div className="shiny-icon-glow" style={{ position: "relative" }}>
                      <Brain size={56} color={isDark ? "#A855F7" : "#4F46E5"} />
                    </div>
                  </div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: tokens.text, margin: "0 0 4px" }}>Your AI Second Brain</h2>
                  <p style={{ fontSize: "12px", color: tokens.textSecondary, margin: "0 0 16px" }}>Pinecone RAG · Semantic memory · PDF understanding</p>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px", marginBottom: "14px" }}>
                    {quickActions.map(a => (
                      <button key={a.label} onClick={() => sendMessage(a.query)}
                        className="shiny-action-pill"
                        style={{ padding: "6px 14px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF", border: `1px solid ${tokens.border}`, color: tokens.text }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Content Stream */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ 
                    maxWidth: "72%", 
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start", 
                    padding: "10px 14px", 
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", 
                    background: msg.role === "user" ? `linear-gradient(135deg, ${tokens.primary}, ${tokens.secondary})` : (isDark ? "rgba(30,41,59,0.5)" : "#F1F5F9"), 
                    border: msg.role === "user" ? "none" : `1px solid ${tokens.border}`, 
                    color: msg.role === "user" ? "#ffffff" : tokens.text,
                    fontSize: "13px", 
                    lineHeight: "1.6", 
                    whiteSpace: "pre-wrap",
                    boxShadow: msg.role === "user" ? "0 4px 12px rgba(79,70,229,0.15)" : "0 2px 6px rgba(0,0,0,0.02)"
                  }}>
                    {msg.text}
                  </div>
                ))}
                {loading && (
                  <div style={{ alignSelf: "flex-start", padding: "10px 14px", background: tokens.surface2, borderRadius: "18px 18px 18px 4px", display: "flex", gap: "4px" }}>
                    {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: tokens.primary, animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Action Tray Block */}
              <div style={{ padding: "10px 14px 14px", display: "flex", gap: "7px", background: isDark ? "rgba(15,23,42,0.4)" : "#F8FAFC", borderTop: `1px solid ${tokens.border}`, flexShrink: 0 }}>
                <input type="text" placeholder={isListening ? "🎙 Listening..." : "Ask anything…"} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askAI()}
                  style={{ ...inputStyle }} />
                
                <button
                  onClick={isListening ? stopDeepgramListening : startDeepgramListening}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    background: isListening ? "#fee2e2" : (isDark ? "rgba(30,41,59,0.6)" : "#FFFFFF"),
                    border: `1px solid ${isListening ? "#ef4444" : tokens.border}`,
                    color: isListening ? "#b91c1c" : tokens.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px"
                  }}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  {isListening ? "Stop" : "Voice"}
                </button>

                <button onClick={startWakeWordDetection} style={{ padding: "10px 11px", borderRadius: "10px", cursor: "pointer", background: isDark ? "rgba(255,255,255,0.05)" : "#E2E8F0", border: `1px solid ${tokens.border}`, color: tokens.primary, fontSize: "11px", fontWeight: 600 }}>Wake</button>
                <button onClick={() => askAI()} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: "5px" }}>
                  <Send size={13} /> Send
                </button>
              </div>
            </div>
          )}

          {/* ── PDF RAG TAB ── */}
          {activeTab === "pdf" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 2px" }}>📚 PDF Brain</h2>
              <p style={{ fontSize: "12px", color: tokens.textSecondary, margin: "0 0 14px" }}>Upload → chunk → embed → semantic Q&A</p>

              {/* Dynamic PDF Workflow System Blocks */}
              <div style={{ background: isDark ? "rgba(30,41,59,0.3)" : "#F1F5F9", border: `1px solid ${tokens.border}`, padding: "12px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", borderRadius: "12px" }}>
                {[
                  { label: "Extract", icon: <FileText size={14} /> },
                  { label: "Chunk", icon: <Scissors size={14} /> },
                  { label: "Embed", icon: <Database size={14} /> },
                  { label: "Pinecone", icon: <Database size={14} /> },
                  { label: "Question", icon: <CircleHelp size={14} /> },
                  { label: "Retrieve", icon: <Search size={14} /> },
                  { label: "LLM", icon: <Bot size={14} /> },
                  { label: "Answer", icon: <CheckCircle size={14} /> }
                ].map((step, i, arr) => (
                  <span key={step.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: isDark ? "rgba(15,23,42,0.4)" : "#FFFFFF", border: `1px solid ${tokens.border}`, color: tokens.primary, fontWeight: 500 }}>
                      {step.icon} {step.label}
                    </span>
                    {i < arr.length - 1 && <span style={{ color: tokens.textSecondary, fontSize: "11px" }}>→</span>}
                  </span>
                ))}
              </div>

              {ragStep && (
                <div style={{ padding: "8px 14px", background: isDark ? "rgba(139,92,246,0.1)" : "#EEF2FF", border: `1px solid ${tokens.primary}`, borderRadius: "10px", fontSize: "13px", color: tokens.primary, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: tokens.primary, animation: "pulse 1s infinite" }} />
                  {ragStep}
                </div>
              )}

              <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 600, color: tokens.primary, marginBottom: "10px" }}>1. Upload & Ingest PDF</h3>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ padding: "8px 13px", background: isDark ? "rgba(0,0,0,0.1)" : "#FFFFFF", border: `1px dashed ${tokens.border}`, borderRadius: "10px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", color: tokens.text }}>
                    <Upload size={13} /> {pdfFile ? pdfFile.name : "Choose PDF"}
                    <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setPdfFile(e.target.files[0])} />
                  </label>
                  <button onClick={uploadPdf} disabled={!pdfFile || pdfLoading} style={{ ...btnPrimary, opacity: !pdfFile ? 0.5 : 1 }}>
                    {pdfLoading ? "Ingesting…" : "Upload & Ingest"}
                  </button>
                </div>

                {ingestStats && (
                  <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {[
                      { label: "Pages",    value: ingestStats.pages,                     color: tokens.primary },
                      { label: "Chunks",   value: ingestStats.chunks,                    color: tokens.secondary },
                      { label: "Chars",    value: ingestStats.characters?.toLocaleString(), color: tokens.accent },
                      { label: "Namespace", value: ingestStats.namespace,                color: "#059669" },
                    ].map(s => (
                      <div key={s.label} style={{ padding: "6px 12px", background: isDark ? "rgba(0,0,0,0.1)" : "#FFFFFF", border: `1px solid ${tokens.border}`, borderRadius: "8px", textAlign: "center" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: "9px", color: tokens.textSecondary }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pdfList.length > 0 && (
                <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
                  <h3 style={{ fontSize: "12px", fontWeight: 600, color: tokens.primary, marginBottom: "8px" }}>2. Select Active PDF</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {pdfList.map(fname => (
                      <div key={fname} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: pdfName === fname ? (isDark ? "rgba(139,92,246,0.1)" : "#EEF2FF") : "transparent", border: `1px solid ${pdfName === fname ? tokens.primary : tokens.border}`, borderRadius: "8px", cursor: "pointer" }} onClick={() => setPdfName(fname)}>
                        <span style={{ fontSize: "12px", color: pdfName === fname ? tokens.primary : tokens.text }}>
                          {pdfName === fname ? "✅ " : "📄 "}{fname}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); deletePdf(fname) }} style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "6px", padding: "3px 5px", cursor: "pointer", color: "#b91c1c" }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "12px", fontWeight: 600, color: tokens.primary, margin: 0 }}>3. Summary</h3>
                  <button onClick={generateSummary} disabled={!pdfName || pdfLoading} style={{ padding: "6px 13px", background: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF", border: `1px solid ${tokens.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "11px", color: tokens.primary, opacity: !pdfName ? 0.5 : 1 }}>
                    {pdfLoading ? "…" : "Generate"}
                  </button>
                </div>
                {pdfSummary
                  ? <div style={{ fontSize: "12px", lineHeight: "1.7", color: tokens.text, whiteSpace: "pre-wrap", maxHeight: "160px", overflowY: "auto", padding: "10px", background: isDark ? "rgba(0,0,0,0.15)" : "#F8FAFC", borderRadius: "8px", border: `1px solid ${tokens.border}` }}>{pdfSummary}</div>
                  : <p style={{ fontSize: "11px", color: tokens.textSecondary, margin: 0 }}>Select a PDF and click Generate.</p>}
              </div>

              <div style={{ ...glass.card(theme), padding: "14px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 600, color: tokens.primary, marginBottom: "10px" }}>4. Ask the PDF</h3>
                <div style={{ display: "flex", gap: "7px", marginBottom: "10px" }}>
                  <input value={pdfQuestion} onChange={e => setPdfQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askPdfRag()} placeholder="Ask anything about this PDF…" style={{ ...inputStyle }} />
                  <button onClick={askPdfRag} disabled={!pdfName || !pdfQuestion.trim() || pdfLoading} style={{ ...btnPrimary, opacity: !pdfName || !pdfQuestion.trim() ? 0.5 : 1, display: "flex", alignItems: "center", gap: "5px" }}>
                    <Search size={13} /> Ask
                  </button>
                </div>

                {pdfAnswer && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#10b981", marginBottom: "6px" }}>🤖 Answer</div>
                    <div style={{ fontSize: "13px", lineHeight: "1.7", color: tokens.text, padding: "12px", background: isDark ? "rgba(16,185,129,0.12)" : "#E6F4EA", border: "1px solid #10b981", borderRadius: "10px" }}>
                      {pdfAnswer}
                    </div>
                  </div>
                )}

                {pdfChunks.length > 0 && (
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: tokens.primary, marginBottom: "7px" }}>🔍 Retrieved Chunks ({pdfChunks.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {pdfChunks.map((chunk, i) => <ChunkCard key={i} chunk={chunk} index={i} theme={theme} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MEMORY TAB ── */}
          {activeTab === "memories" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                  <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>🧠 Pinecone Memory</h2>
                  <p style={{ fontSize: "11px", color: tokens.textSecondary, margin: "3px 0 0" }}>llama-text-embed-v2 · 1024 dims</p>
                </div>
                <button onClick={loadMemories} style={{ padding: "6px 12px", background: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF", border: `1px solid ${tokens.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "12px", color: tokens.primary }}>↻ Refresh</button>
              </div>
              {memoryMsg && <div style={{ padding: "7px 12px", background: "#d1fae5", border: "1px solid #10b981", borderRadius: "8px", fontSize: "12px", color: "#065f46", marginBottom: "12px" }}>{memoryMsg}</div>}

              <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 600, color: tokens.primary, marginBottom: "8px" }}>Save memory</h3>
                <div style={{ display: "flex", gap: "7px" }}>
                  <input value={newFact} onChange={e => setNewFact(e.target.value)} onKeyDown={e => e.key === "Enter" && saveFact()} placeholder='e.g. "I am learning React and FastAPI"' style={{ ...inputStyle }} />
                  <button onClick={saveFact} disabled={!newFact.trim() || savingFact} style={{ ...btnPrimary, opacity: !newFact.trim() ? 0.5 : 1 }}>{savingFact ? "…" : "Save"}</button>
                </div>
              </div>

              <div style={{ ...glass.card(theme), padding: "14px", marginBottom: "10px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 600, color: tokens.accent, marginBottom: "8px" }}>Semantic search</h3>
                <div style={{ display: "flex", gap: "7px", marginBottom: "8px" }}>
                  <input value={memSearchQuery} onChange={e => setMemSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchMemoriesSemantic()} placeholder="What programming languages do I know?" style={{ ...inputStyle }} />
                  <button onClick={searchMemoriesSemantic} disabled={!memSearchQuery.trim() || memSearching} style={{ padding: "10px 14px", background: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF", border: `1px solid ${tokens.border}`, borderRadius: "10px", cursor: "pointer", fontSize: "12px", color: tokens.accent, display: "flex", alignItems: "center", gap: "5px", opacity: !memSearchQuery.trim() ? 0.5 : 1 }}>
                    <Search size={13} /> {memSearching ? "…" : "Search"}
                  </button>
                </div>
                {memSearchResults.map((r, i) => (
                  <div key={i} style={{ padding: "8px 10px", background: isDark ? "rgba(34,211,238,0.12)" : "#E0F7FA", border: `1px solid ${tokens.accent}`, borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: tokens.text }}>{r.fact}</span>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: tokens.accent, flexShrink: 0, marginLeft: "8px" }}>{Math.round(r.score * 100)}%</span>
                  </div>
                ))}
              </div>

              <div style={{ ...glass.card(theme), padding: "14px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 600, color: tokens.primary, marginBottom: "10px" }}>All memories ({memories.length})</h3>
                {memoriesLoading
                  ? <div style={{ display: "flex", gap: "4px" }}>{[0,.15,.3].map((d,i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: tokens.primary, animation: "bounce 1s infinite", animationDelay: `${d}s` }} />)}</div>
                  : memories.length === 0
                  ? <p style={{ fontSize: "12px", color: tokens.textSecondary, margin: 0 }}>No memories yet.</p>
                  : memories.map(m => (
                    <div key={m.id} style={{ padding: "9px 10px", background: isDark ? "rgba(0,0,0,0.1)" : "#F8FAFC", border: `1px solid ${tokens.border}`, borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "5px" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "12px", color: tokens.text, margin: "0 0 2px" }}>{m.fact}</p>
                        {m.timestamp && <p style={{ fontSize: "10px", color: tokens.textSecondary, margin: 0 }}>{new Date(m.timestamp).toLocaleString()}</p>}
                      </div>
                      <button onClick={() => deleteMemory(m.id)} style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#b91c1c", flexShrink: 0 }}><Trash2 size={11} /></button>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ── CALENDAR TAB ── */}
          {activeTab === "calendar" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <CalendarTab onEventChange={refreshDashboard} />
            </div>
          )}

          {/* ── MEETING TAB ── */}
          {activeTab === "meeting" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <ShadowMeetingTab />
            </div>
          )}

          {activeTab === "tasks" && (
           <div style={{ flex: 1, overflowY: "auto" }}>
            <TodosNotesTab />
            </div>
          )}

          {/* ── INSIGHTS TAB ── */}
          {activeTab === "insights" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={22} color={tokens.primary} />
                  <div>
                    <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>Productivity Insights</h2>
                    <p style={{ fontSize: "11px", color: tokens.textSecondary, margin: "3px 0 0" }}>AI analysis of timeline maps</p>
                  </div>
                </div>
                <button onClick={getInsights} style={{ ...btnPrimary }}>{loadingInsights ? "Analyzing…" : "Analyze Now"}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                {dashStats.slice(0, 4).map(s => (
                  <div key={s.label} style={{ ...glass.card(theme), padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ color: s.color, marginBottom: "3px" }}>{s.icon}</div>
                    <div style={{ fontSize: "26px", fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: "11px", color: tokens.textSecondary, marginTop: "2px" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...glass.card(theme), padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Brain size={16} color={tokens.primary} />
                  <h3 style={{ fontSize: "12px", fontWeight: 600, color: tokens.primary, margin: 0 }}>AI Analysis</h3>
                </div>
                {loadingInsights
                  ? <div style={{ display: "flex", gap: "4px", alignItems: "center", color: tokens.textSecondary, fontSize: "12px" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", background: tokens.primary, animation: "bounce 1s infinite" }} /> Analyzing…</div>
                  : <div style={{ fontSize: "13px", lineHeight: "1.8", color: tokens.text, whiteSpace: "pre-wrap" }}>{insights || "Click 'Analyze Now' to generate insights."}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Container Matrix */}
        <footer style={{ ...glass.card(theme), padding: "8px 16px", borderRadius: "0 0 16px 16px", display: "flex", justifyContent: "space-between", flexShrink: 0, borderTop: "none" }}>
          <span style={{ fontSize: "10px", color: tokens.textSecondary }}>VoxMind Chronos · Pinecone RAG</span>
          <span style={{ fontSize: "10px", color: tokens.textSecondary }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </footer>
      </main>

      {/* Styled Overrides for Glassmorphic Dropdowns & Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght=400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        
        select, .dropdown-menu, .settings-popup {
          background: ${isDark ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)"} !important;
          border: 1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} !important;
          backdrop-filter: blur(12px) !important;
          color: ${isDark ? "#F8FAFC" : "#0F172A"} !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25) !important;
        }

        /* Ambient Shiny Custom Animations */
        .shiny-theme-btn {
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
        }
        .shiny-theme-btn:hover {
          transform: rotate(15deg) scale(1.05);
        }

        .shiny-action-pill {
          transition: all 0.2s ease;
        }
        .shiny-action-pill:hover {
          background: ${isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9"} !important;
          border-color: ${tokens.primary} !important;
          transform: translateY(-1px);
        }

        .shiny-icon-glow::after {
          content: '';
          position: absolute;
          inset: -10px;
          background: ${isDark ? "rgba(168,85,247,0.2)" : "rgba(79,70,229,0.15)"};
          filter: blur(12px);
          border-radius: 50%;
          z-index: -1;
        }

        /* Layout Framework Scrollbar Matrix */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${tokens.primary}44; }

        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        button:hover { filter: brightness(1.05); }
        input::placeholder { color: ${tokens.textSecondary}; }

        .history-item-row {
          position: relative;
          transition: all 0.2s ease;
        }
        .history-item-row:hover {
          border-color: ${tokens.primary}88 !important;
        }
        .history-item-row .history-cross-btn {
          opacity: 0;
          position: absolute;
          right: 6px;
          background: ${isDark ? "rgba(30,41,59,0.9)" : "#FFFFFF"} !important;
          border: 1px solid ${tokens.border} !important;
          backdrop-filter: blur(4px);
          transition: opacity 0.15s;
        }
        .history-item-row:hover .history-cross-btn {
          opacity: 1;
        }
        .history-cross-btn:hover {
          color: #dc2626 !important;
          background-color: #fee2e2 !important;
        }
      `}</style>
      
      {showTTSSettings && (
        <TTSSettings tts={tts} onClose={() => setShowTTSSettings(false)} />
      )}
    </div>
  )
}

export default Home