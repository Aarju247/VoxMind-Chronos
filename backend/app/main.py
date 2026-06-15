from datetime import datetime, timedelta, timezone
import re
import os
import shutil
import json
import asyncio

from fastapi.responses import StreamingResponse
from app.tts_service import stream_tts, get_voices, get_settings, update_settings, is_enabled
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect

from dotenv import load_dotenv
from openai import OpenAI

from app.reminders   import save_reminder, get_all_reminders, check_due_reminders
from app.memory      import save_memory, get_all_memories, search_memories, delete_memory, clear_all_memories
from app.todo        import save_todo, get_all_todos, complete_todo
from app.events      import save_event, get_all_events
from app.notes       import save_note, get_all_notes
from app.focus       import save_focus_session, get_focus_session, end_focus_session

from app.todo   import save_todo, get_all_todos, complete_todo, delete_todo, toggle_todo
from app.notes  import save_note, get_all_notes, delete_note
from app.events import save_event, get_all_events, delete_local_event

from app.pdf_service import (
    ingest_pdf,
    retrieve_relevant_chunks,
    get_full_text_for_summary,
    delete_pdf_from_pinecone,
)

from app.google_calendar import (
    get_authorization_url,
    handle_callback,
    is_connected,
    revoke_access,
    get_upcoming_events,
    get_today_events,
    check_free_busy,
    create_event,
    update_event,
    delete_event,
    get_cached_user_info,
)

from deepgram import (
    DeepgramClient,
    LiveTranscriptionEvents,
    LiveOptions,
)


from app.shadow_meeting import (
    create_session, get_session, append_transcript,
    end_session, get_full_transcript_text,
    get_deepgram_client, get_live_options,
)
 
# Also add to imports at top:
from fastapi import Request as FastAPIRequest
from fastapi.responses import HTMLResponse, RedirectResponse


load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

conversation_history = [
    {
        "role": "system",
        "content": (
            "You are VoxMind Chronos, an advanced AI second-brain "
            "voice assistant. Be helpful, intelligent, conversational, "
            "and concise."
        )
    }
]

deepgram_client = DeepgramClient(
    os.getenv("DEEPGRAM_API_KEY")
)

voice_sessions = {}
tts_speaking = False

UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "VoxMind Backend Running — RAG enabled"}


# ─────────────────────────────────────────────────────────────
# MAIN AI ENDPOINT
# ─────────────────────────────────────────────────────────────

@app.get("/ask")
async def ask_ai(question: str):
    try:
        lower_question = question.lower()

        # ── MEMORY SAVE ──────────────────────────────────────────
        if "remember that" in lower_question:
            fact = re.sub(r"remember that\s*", "", question, flags=re.IGNORECASE).strip()
            save_memory(fact)
            return {"question": question, "response": f"Got it! I'll remember: {fact}"}

        # ── MEMORY RECALL ────────────────────────────────────────
        if "show my memories" in lower_question or "what do you remember" in lower_question:
            memories = get_all_memories()
            if not memories:
                return {"response": "I don't have any memories stored yet. Tell me something with 'remember that'!"}
            memory_text = "\n".join([f"• {m['fact']}" for m in memories])
            return {"response": f"Here is everything I remember:\n\n{memory_text}"}

        # ── MEMORY SEARCH ────────────────────────────────────────
        if "search my memories" in lower_question or "recall" in lower_question:
            query = lower_question.replace("search my memories about", "").replace("search my memories", "").replace("recall", "").strip()
            results = search_memories(query, top_k=5)
            if not results:
                return {"response": f"No memories found related to '{query}'."}
            result_text = "\n".join([f"• {r['fact']} (relevance: {r['score']})" for r in results])
            return {"response": f"Most relevant memories for '{query}':\n\n{result_text}"}

        # ── TODO ADD ─────────────────────────────────────────────
        if "add" in lower_question and "todo" in lower_question:
            task = lower_question.replace("add", "").replace("to my todo list", "").replace("todo", "").strip()
            save_todo({"task": task, "completed": False})
            return {"response": f"Added '{task}' to your todo list."}

        # ── TODO SHOW ────────────────────────────────────────────
        if "show my todo list" in lower_question or "show my todos" in lower_question:
            todos = get_all_todos()
            if not todos:
                return {"response": "Your todo list is empty."}
            todo_text = "\n".join([f"{'✅' if t['completed'] else '⬜'} {t['task']}" for t in todos])
            return {"response": f"Here are your tasks:\n\n{todo_text}"}

        # ── TODO COMPLETE ────────────────────────────────────────
        if "mark" in lower_question and "completed" in lower_question:
            task_name = lower_question.replace("mark", "").replace("as completed", "").strip()
            complete_todo(task_name)
            return {"response": f"Marked '{task_name}' as completed."}

        # ── REMINDER SAVE ────────────────────────────────────────
        if "remind me" in lower_question:
            match = re.search(r"remind me to (.+?) in (\d+) minutes?", lower_question)
            if match:
                task = match.group(1)
                minutes = match.group(2)
                trigger_time = datetime.now() + timedelta(minutes=int(minutes))
                save_reminder({"task": task, "time": f"{minutes} minutes", "trigger_at": trigger_time.isoformat(), "triggered": False})
                return {"question": question, "response": f"Reminder set: '{task}' in {minutes} minutes."}
            return {"response": "Try: 'Remind me to <task> in <N> minutes'"}

        # ── EVENT SCHEDULE ───────────────────────────────────────
        if "schedule" in lower_question and "tomorrow" in lower_question:
            match = re.search(r"schedule (.+?) tomorrow at (\d+)\s*(am|pm)", lower_question)
            if match:
                title    = match.group(1)
                hour     = int(match.group(2))
                meridian = match.group(3)
                if meridian == "pm" and hour != 12: hour += 12
                if meridian == "am" and hour == 12: hour  = 0
                event_time = (datetime.now() + timedelta(days=1)).replace(hour=hour, minute=0, second=0, microsecond=0)
                save_event({"title": title, "datetime": event_time.isoformat()})
                return {"response": f"Scheduled: {title} tomorrow at {match.group(2)} {meridian}"}
            return {"response": "Try: 'Schedule <title> tomorrow at <H> am/pm'"}

        # ── SHOW EVENTS ──────────────────────────────────────────
        if "show events" in lower_question or "show all events" in lower_question:
            events = get_all_events()
            if not events:
                return {"response": "No events scheduled."}
            return {"response": "\n".join([f"📅 {e['title']} — {e['datetime']}" for e in events])}

        # ── TODAY AGENDA ─────────────────────────────────────────
        if "schedule today" in lower_question or "agenda today" in lower_question:
            today = datetime.now().date()
            today_events = [e for e in get_all_events() if datetime.fromisoformat(e["datetime"]).date() == today]
            if not today_events:
                return {"response": "No events today."}
            return {"response": "Today's agenda:\n\n" + "\n".join([f"📅 {e['title']}" for e in today_events])}

        # ── SAVE NOTE ────────────────────────────────────────────
        if "save note" in lower_question:
            note_text = question.replace("Save note:", "").replace("save note", "").strip()
            save_note({"content": note_text})
            return {"response": "Note saved."}

        # ── SEARCH NOTES ─────────────────────────────────────────
        if "search notes" in lower_question:
            term = lower_question.replace("search notes about", "").replace("search notes", "").strip()
            matches = [n["content"] for n in get_all_notes() if term in n["content"].lower()]
            if not matches:
                return {"response": f"No notes found about '{term}'."}
            return {"response": "\n".join([f"• {n}" for n in matches])}

        # ── DAILY BRIEFING ───────────────────────────────────────
        if "good morning" in lower_question or "daily briefing" in lower_question:
            todos     = get_all_todos()
            events    = get_all_events()
            reminders = get_all_reminders()
            pending   = [t for t in todos if not t["completed"]]
            briefing  = f"Good morning 👋\n\n📅 Events: {len(events)}\n✅ Pending: {len(pending)}\n⏰ Reminders: {len(reminders)}\n\nPriorities:\n"
            for todo in (pending[:5] if pending else []):
                briefing += f"\n• {todo['task']}"
            if not pending:
                briefing += "\n• All caught up! 🎉"
            return {"response": briefing}

        # ── PLAN MY DAY ──────────────────────────────────────────
        if "plan my day" in lower_question or "create my schedule" in lower_question:
            todos    = get_all_todos()
            events   = get_all_events()
            pending  = [t["task"] for t in todos if not t["completed"]]
            e_text   = "\n".join([f"- {e['title']} at {e['datetime']}" for e in events]) or "None"
            t_text   = "\n".join([f"- {t}" for t in pending]) or "None"
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an expert productivity planner."},
                    {"role": "user",   "content": f"Create a productive daily plan.\n\nEvents:\n{e_text}\n\nPending tasks:\n{t_text}\n\nGenerate a realistic schedule with time blocks."}
                ]
            )
            return {"response": completion.choices[0].message.content}

        # ── PRODUCTIVITY INSIGHTS ────────────────────────────────
        if "analyze my productivity" in lower_question or "productivity report" in lower_question:
            todos     = get_all_todos()
            events    = get_all_events()
            notes     = get_all_notes()
            memories  = get_all_memories()
            completed = len([t for t in todos if t["completed"]])
            pending   = len([t for t in todos if not t["completed"]])
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a productivity coach."},
                    {"role": "user",   "content": f"Analyze productivity.\n\nCompleted: {completed}\nPending: {pending}\nEvents: {len(events)}\nNotes: {len(notes)}\nMemories: {len(memories)}\n\nGive observations, suggestions, and a focus recommendation."}
                ]
            )
            return {"response": completion.choices[0].message.content}

        # ── FOCUS ON ─────────────────────────────────────────────
        if "focus on" in lower_question:
            task       = question.lower().replace("focus on", "").strip()
            minutes    = 45
            start_time = datetime.now()
            end_time   = start_time + timedelta(minutes=minutes)
            save_focus_session(task, start_time.isoformat(), end_time.isoformat())
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a productivity coach."},
                    {"role": "user",   "content": f"User wants to focus on: {task}\n\nCreate:\n1. Main Goal\n2. Three Mini Goals\n3. Success Criteria\n\nKeep it short."}
                ]
            )
            return {"response": f"🎯 Focus Session Started\n\nTask: {task}\nDuration: {minutes} min\n\n{completion.choices[0].message.content}"}

        # ── START FOCUS MODE ─────────────────────────────────────
        if "start focus mode" in lower_question:
            minutes    = 25
            m          = re.search(r'(\d+)', lower_question)
            if m: minutes = int(m.group(1))
            start_time = datetime.now()
            end_time   = start_time + timedelta(minutes=minutes)
            save_focus_session("General Work", start_time.isoformat(), end_time.isoformat())
            return {"response": f"🎯 Focus Mode Started\n\nTask: General Work\nDuration: {minutes} minutes\nEnds: {end_time.strftime('%I:%M %p')}"}
        
        # ── GOOGLE CALENDAR: SHOW UPCOMING ───────────────────────────
        if "google calendar" in lower_question or "upcoming events" in lower_question or ("show" in lower_question and "calendar" in lower_question):
            # user_id = question_params.get("user_id")  # passed as query param
            return {"response": "Please use the Calendar tab for Google Calendar actions."}
            if not user_id or not is_connected(user_id):
                return {"response": "Your Google Calendar is not connected yet. Go to the Calendar tab and click 'Connect Google Calendar'."}
            
            events = get_upcoming_events(user_id, max_results=10, days=7)
            if not events:
                return {"response": "No upcoming events in the next 7 days."}
            
            lines = [f"📅 {e['start_human']} — {e['title']}" for e in events]
            return {"response": "Upcoming events:\n\n" + "\n".join(lines)}

        # ── GOOGLE CALENDAR: TODAY ────────────────────────────────────
        # Triggers: "what's on my calendar today", "today's meetings"
        if ("today" in lower_question and "calendar" in lower_question) or "today's meetings" in lower_question:
            user_id = question_params.get("user_id")
            if not user_id or not is_connected(user_id):
                return {"response": "Connect Google Calendar first in the Calendar tab."}
            
            events = get_today_events(user_id)
            if not events:
                return {"response": "No events on your Google Calendar today."}
            
            lines = [f"📅 {e['start_human']} — {e['title']}" for e in events]
            return {"response": "Today's calendar:\n\n" + "\n".join(lines)}

        # ── GOOGLE CALENDAR: CREATE EVENT ────────────────────────────
        # Triggers: "add to my google calendar", "create calendar event"
        # The LLM parses the details and creates the event
        #
        # NOTE: The full NLP-to-event creation is handled in /calendar/events
        # via the frontend. The /ask endpoint supports natural language shortcuts:
        if "add to my calendar" in lower_question or "schedule on my calendar" in lower_question:
            return {"response": "To create a calendar event, use the Calendar tab → '+ New Event', or say 'Schedule <title> tomorrow at <time>' to use the quick scheduler."}


        # ── GENERIC AI CHAT  with semantic memory context ────────
        conversation_history.append({"role": "user", "content": question})
        relevant_memories = search_memories(question, top_k=5)
        memory_context    = "\n".join([f"- {m['fact']}" for m in relevant_memories])
        enhanced_history  = [
            {"role": "system", "content": f"You are VoxMind Chronos, an AI second brain.\n\nRelevant user memories:\n{memory_context or 'None yet'}"}
        ]
        enhanced_history.extend(conversation_history)
        completion = client.chat.completions.create(model="llama-3.3-70b-versatile", messages=enhanced_history)
        response   = completion.choices[0].message.content
        conversation_history.append({"role": "assistant", "content": response})
        return {"question": question, "response": response}

    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────
# REMINDERS
# ─────────────────────────────────────────────────────────────

@app.post("/add-reminder")
async def add_reminder(data: dict):
    try:
        save_reminder({"task": data.get("task"), "time": data.get("time")})
        return {"message": "Reminder saved"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/reminders")
async def get_reminders():
    return {"reminders": get_all_reminders()}

@app.get("/due-reminders")
async def due_reminders():
    return {"due_reminders": check_due_reminders()}


# -----------------------------------------
# TODO
# ----------------------------------------
@app.get("/todos")
async def list_todos():
    """Return all todos with their index (used by frontend for delete/toggle)."""
    todos = get_all_todos()
    return {
        "todos": [{"index": i, **t} for i, t in enumerate(todos)],
        "count": len(todos),
        "pending": len([t for t in todos if not t.get("completed")]),
        "completed": len([t for t in todos if t.get("completed")]),
    }
 
 
@app.post("/todos")
async def add_todo(data: dict):
    """Add a new todo.  Body: { "task": "..." }"""
    task = data.get("task", "").strip()
    if not task:
        return {"error": "task cannot be empty"}
    save_todo({"task": task, "completed": False})
    return {"message": f"Todo added: {task}", "todos": get_all_todos()}
 
 
@app.patch("/todos/{index}/complete")
async def api_complete_todo(index: int):
    """Toggle a todo's completed state by index."""
    from app.todo import toggle_todo
    ok = toggle_todo(index)
    if not ok:
        return {"error": f"No todo at index {index}"}
    todos = get_all_todos()
    return {"message": "Toggled", "todo": {**todos[index], "index": index}}
 
 
@app.delete("/todos/{index}")
async def api_delete_todo(index: int):
    """Delete a todo by index."""
    from app.todo import delete_todo
    ok = delete_todo(index)
    if not ok:
        return {"error": f"No todo at index {index}"}
    return {"message": "Deleted", "todos": get_all_todos()}


# -----------------------------------------------
# notes
# ------------------------------------------------

@app.get("/notes")
async def list_notes():
    """Return all notes with their index."""
    notes = get_all_notes()
    return {
        "notes": [{"index": i, **n} for i, n in enumerate(notes)],
        "count": len(notes),
    }
 
 
@app.post("/notes")
async def add_note(data: dict):
    """Add a new note.  Body: { "content": "..." }"""
    content = data.get("content", "").strip()
    if not content:
        return {"error": "content cannot be empty"}
    save_note({"content": content})
    return {"message": "Note saved", "notes": get_all_notes()}
 
 
@app.delete("/notes/{index}")
async def api_delete_note(index: int):
    """Delete a note by index."""
    from app.notes import delete_note
    ok = delete_note(index)
    if not ok:
        return {"error": f"No note at index {index}"}
    return {"message": "Deleted", "notes": get_all_notes()}
 
# ------------------------------------
# events
# ---------------------------------------

@app.get("/local-events")
async def list_local_events():
    """Return all chat-scheduled events (events.json) with their index."""
    events = get_all_events()
    return {
        "events": [{"index": i, **e} for i, e in enumerate(events)],
        "count": len(events),
    }
 
 
@app.delete("/local-events/{index}")
async def api_delete_local_event(index: int):
    """Delete a chat-scheduled event by index."""
    from app.events import delete_local_event
    ok = delete_local_event(index)
    if not ok:
        return {"error": f"No event at index {index}"}
    return {"message": "Deleted", "events": get_all_events()}

# ─────────────────────────────────────────────────────────────
# FOCUS
# ─────────────────────────────────────────────────────────────

@app.get("/focus")
def get_focus():
    try:
        session = get_focus_session()
        if not session:
            return {}
        if session.get("active"):
            end_time_str = session.get("end_time", "")
            if end_time_str:
                end_time = datetime.fromisoformat(end_time_str)
                if end_time.tzinfo is not None:
                    end_time = end_time.replace(tzinfo=None)
                if datetime.now() >= end_time:
                    end_focus_session()
                    return {"completed": True, "task": session.get("task", "")}
        return session
    except Exception as e:
        print(f"[focus] error: {e}")
        return {}


# ─────────────────────────────────────────────────────────────
# MEMORY ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.get("/memories")
async def list_memories():
    return {"memories": get_all_memories()}

@app.post("/memories/save")
async def api_save_memory(data: dict):
    fact = data.get("fact", "").strip()
    if not fact:
        return {"error": "fact cannot be empty"}
    record = save_memory(fact)
    return {"message": "Memory saved", "memory": record}

@app.post("/memories/search")
async def api_search_memories(data: dict):
    query  = data.get("query", "").strip()
    top_k  = int(data.get("top_k", 5))
    if not query:
        return {"error": "query cannot be empty"}
    return {"results": search_memories(query, top_k=top_k)}

@app.delete("/memories/{memory_id}")
async def api_delete_memory(memory_id: str):
    deleted = delete_memory(memory_id)
    return {"message": f"Deleted {memory_id}"} if deleted else {"error": "Not found"}

@app.delete("/memories")
async def api_clear_memories():
    count = clear_all_memories()
    return {"message": f"Cleared {count} memories"}

@app.post("/memory-search")
async def memory_search_compat(data: dict):
    query   = data.get("question", data.get("query", "")).strip()
    results = search_memories(query, top_k=5)
    mem_text = "\n".join([m["fact"] for m in results])
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "Answer using only the provided memories."},
            {"role": "user",   "content": f"Question:\n{query}\n\nMemories:\n{mem_text}"}
        ]
    )
    return {"answer": completion.choices[0].message.content}


# ─────────────────────────────────────────────────────────────
# PDF  —  FULL RAG PIPELINE
# ─────────────────────────────────────────────────────────────

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    UPLOAD + INGEST
    ───────────────
    1. Save file to disk
    2. Extract text page by page
    3. Split into overlapping chunks (~500 chars)
    4. Embed all chunks via Pinecone llama-text-embed-v2
    5. Upsert into Pinecone (namespace = filename)

    Returns ingestion stats.
    """
    try:
        file_path = os.path.join(UPLOADS_DIR, file.filename)
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        # Full RAG ingestion
        stats = ingest_pdf(file_path, file.filename)

        return {
            "filename":   stats["filename"],
            "pages":      stats["pages"],
            "chunks":     stats["chunks"],
            "characters": stats["characters"],
            "namespace":  stats["namespace"],
            "preview":    stats["preview"],
            "message":    f"✅ Ingested {stats['chunks']} chunks from {stats['pages']} pages into Pinecone.",
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/pdf-summary")
async def pdf_summary(filename: str):
    """
    Summarise the full PDF text.
    Uses direct text extraction (not RAG) — better for overall summaries.
    """
    try:
        file_path = os.path.join(UPLOADS_DIR, filename)
        text      = get_full_text_for_summary(file_path, max_chars=15000)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an expert document summarizer. Give a clear, structured summary with key points."},
                {"role": "user",   "content": f"Summarize this document:\n\n{text}"}
            ]
        )
        return {"summary": completion.choices[0].message.content}
    except Exception as e:
        return {"error": str(e)}


@app.post("/pdf-chat")
async def pdf_chat(data: dict):
    """
    RAG QUESTION ANSWERING
    ──────────────────────
    1. Embed the user's question
    2. Search Pinecone for top 5 most relevant chunks (in this PDF's namespace)
    3. Build a context-rich prompt: chunks + question
    4. LLM generates answer grounded in the retrieved context

    Body: { "filename": "...", "question": "..." }
    """
    try:
        filename  = data["filename"]
        question  = data["question"]

        # Step 1 + 2: retrieve relevant chunks from Pinecone
        from app.pdf_service import _make_namespace
        namespace = _make_namespace(filename)
        chunks    = retrieve_relevant_chunks(question, namespace=namespace, top_k=5)

        if not chunks:
            return {
                "answer": "I couldn't find relevant content in this PDF. Try rephrasing your question.",
                "chunks": [],
            }

        # Step 3: build context string
        context_parts = []
        for i, chunk in enumerate(chunks):
            context_parts.append(
                f"[Chunk {i+1} | Page {chunk['page']} | Relevance {round(chunk['score']*100)}%]\n{chunk['text']}"
            )
        context = "\n\n---\n\n".join(context_parts)

        # Step 4: LLM answer
        prompt = (
            f"You are answering a question about a document.\n\n"
            f"CONTEXT (most relevant excerpts from the document):\n\n"
            f"{context}\n\n"
            f"QUESTION: {question}\n\n"
            f"Answer using ONLY the context above. "
            f"If the context doesn't contain the answer, say so clearly. "
            f"Cite page numbers when possible."
        )
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a precise document Q&A assistant. Answer only from the provided context."},
                {"role": "user",   "content": prompt}
            ]
        )

        return {
            "answer": completion.choices[0].message.content,
            "chunks": chunks,           # send chunks to frontend for display
            "context_used": len(chunks),
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/pdf-chunks")
async def get_pdf_chunks(data: dict):
    """
    Debug / transparency endpoint.
    Returns the raw top-k chunks for a query without calling the LLM.
    Body: { "filename": "...", "query": "...", "top_k": 5 }
    """
    try:
        from app.pdf_service import _make_namespace
        namespace = _make_namespace(data["filename"])
        chunks    = retrieve_relevant_chunks(data["query"], namespace=namespace, top_k=data.get("top_k", 5))
        return {"chunks": chunks, "count": len(chunks)}
    except Exception as e:
        return {"error": str(e)}


@app.delete("/pdf-delete")
async def delete_pdf(filename: str):
    """
    Delete all Pinecone vectors for a PDF.
    Body: ?filename=myfile.pdf
    """
    try:
        deleted = delete_pdf_from_pinecone(filename)
        return {"message": f"Deleted vectors for {filename}"} if deleted else {"error": "Delete failed"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/pdf-list")
async def list_pdfs():
    """List all uploaded PDFs."""
    try:
        files = [f for f in os.listdir(UPLOADS_DIR) if f.endswith(".pdf")]
        return {"files": files, "count": len(files)}
    except Exception as e:
        return {"error": str(e)}


@app.get("/dashboard")
async def dashboard(user_id: str = None):
    """
    Return counts for the stats bar.

    Query param:
      user_id  (optional) — if provided, also counts Google Calendar
               events for the next 14 days and adds them to the total.

    Example:
      GET /dashboard                     → chat events only
      GET /dashboard?user_id=me@gmail.com → chat + Google Calendar
    """
    pdf_count = (
        len([f for f in os.listdir(UPLOADS_DIR) if f.endswith(".pdf")])
        if os.path.exists(UPLOADS_DIR) else 0
    )

    # ── Local chat-scheduled events (events.json) ──────────────
    local_event_count = len(get_all_events())

    # ── Google Calendar events (next 14 days) ──────────────────
    gcal_count = 0
    if user_id:
        try:
            if is_connected(user_id):
                gcal_events = get_upcoming_events(user_id, max_results=50, days=14)
                gcal_count  = len(gcal_events)
        except Exception as e:
            print(f"[dashboard] GCal fetch error: {e}")

    return {
        "todos":    len(get_all_todos()),
        "events":   local_event_count + gcal_count,   # combined total
        "local_events": local_event_count,             # breakdown
        "gcal_events":  gcal_count,                    # breakdown
        "notes":    len(get_all_notes()),
        "memories": len(get_all_memories()),
        "pdfs":     pdf_count,
    }

 
# ─────────────────────────────────────────────────────────────
# GOOGLE CALENDAR — AUTH
# ─────────────────────────────────────────────────────────────

@app.get("/auth/google/login")
async def google_login(session_id: str):
    """
    Returns the Google OAuth consent screen URL.
    Frontend opens this in a popup window.
    """
    try:
        auth_url = get_authorization_url(session_id)
        return {"auth_url": auth_url}
    except Exception as e:
        return {"error": str(e)}
 
 
@app.get("/auth/google/callback")
async def google_callback(request: FastAPIRequest):
    """
    Google redirects here after the user approves.
    Wraps everything in try/except so any error shows a readable
    page instead of a 500 Internal Server Error.
    """
    code  = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")
 
    # ── Google returned an error (user denied, etc.) ──────────
    if error:
        return HTMLResponse(_error_page(f"Google returned: {error}"))
 
    # ── Missing code or state ─────────────────────────────────
    if not code or not state:
        return HTMLResponse(_error_page("Missing code or state parameter."))
 
    # ── Exchange code for tokens ──────────────────────────────
    try:
        user_id = handle_callback(code, state)
    except Exception as exc:
        # Show the real error in the popup so you can debug it
        return HTMLResponse(_error_page(str(exc)))
 
    # ── State not found (stale / hot-reload race) ─────────────
    if not user_id:
        return HTMLResponse(_error_page(
            "State mismatch — please try connecting again. "
            "(This happens if the backend restarted mid-flow.)"
        ))
 
    # ── SUCCESS — close popup and notify opener ───────────────
    return HTMLResponse(f"""
    <html>
    <head><title>Connected!</title></head>
    <body style="
        font-family: sans-serif;
        background: #050510;
        color: #f0f0ff;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
    ">
      <div style="text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">✅</div>
        <h2 style="color:#34d399;margin:0 0 8px;">Google Calendar Connected!</h2>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;">
          Signed in as <strong style="color:#a78bfa">{user_id}</strong>
        </p>
        <p style="color:rgba(255,255,255,0.3);font-size:12px;">This window will close automatically…</p>
      </div>
      <script>
        // Send user_id back to the opener (CalendarTab.jsx listener)
        if (window.opener) {{
          window.opener.postMessage(
            {{ type: 'GOOGLE_AUTH_SUCCESS', user_id: '{user_id}' }},
            '*'
          );
        }}
        // Auto-close after 2 seconds
        setTimeout(() => window.close(), 2000);
      </script>
    </body>
    </html>
    """)
 
 
def _error_page(message: str) -> str:
    """Returns an HTML error page that also posts the error to the opener."""
    safe_msg = message.replace("'", "\\'").replace("\n", " ")
    return f"""
    <html>
    <head><title>Auth Error</title></head>
    <body style="
        font-family: sans-serif;
        background: #050510;
        color: #f0f0ff;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
    ">
      <div style="text-align:center;max-width:420px;padding:20px;">
        <div style="font-size:48px;margin-bottom:12px;">❌</div>
        <h2 style="color:#f87171;margin:0 0 12px;">Connection Failed</h2>
        <p style="
            background:rgba(248,113,113,0.1);
            border:1px solid rgba(248,113,113,0.3);
            border-radius:10px;
            padding:12px 16px;
            font-size:13px;
            color:rgba(255,255,255,0.7);
            line-height:1.6;
            word-break:break-word;
        ">{message}</p>
        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:12px;">
          Check your terminal for the full traceback.
        </p>
      </div>
      <script>
        if (window.opener) {{
          window.opener.postMessage(
            {{ type: 'GOOGLE_AUTH_ERROR', error: '{safe_msg}' }},
            '*'
          );
        }}
        setTimeout(() => window.close(), 6000);
      </script>
    </body>
    </html>
    """
 
 
@app.get("/auth/google/status")
async def google_status(user_id: str):
    """Check if a user has connected Google Calendar."""
    connected = is_connected(user_id)
    info      = get_cached_user_info(user_id) if connected else {}
    return {
        "connected": connected,
        "email":     info.get("email", ""),
        "name":      info.get("name", ""),
        "picture":   info.get("picture", ""),
    }
 
 
@app.delete("/auth/google/disconnect")
async def google_disconnect(user_id: str):
    """Revoke Google token and remove local credentials."""
    try:
        revoke_access(user_id)
        return {"message": "Google Calendar disconnected"}
    except Exception as e:
        return {"error": str(e)}
 
 
# ─────────────────────────────────────────────────────────────
# GOOGLE CALENDAR — EVENTS
# ─────────────────────────────────────────────────────────────
 
@app.get("/calendar/events")
async def calendar_events(user_id: str, days: int = 14, max: int = 20):
    """Upcoming events for the next N days."""
    try:
        events = get_upcoming_events(user_id, max_results=max, days=days)
        return {"events": events, "count": len(events)}
    except Exception as e:
        return {"error": str(e)}
 
 
@app.post("/calendar/events")
async def calendar_create(data: dict):
    """
    Create a Google Calendar event.
    Body: {
      user_id, title, start_iso, end_iso,
      description?, location?, attendees?, timezone?
    }
    """
    try:
        event = create_event(
            user_id     = data["user_id"],
            title       = data["title"],
            start_iso   = data["start_iso"],
            end_iso     = data["end_iso"],
            description = data.get("description", ""),
            location    = data.get("location", ""),
            attendees   = data.get("attendees", []),
            timezone_str= data.get("timezone", "UTC"),
        )
        return {"event": event, "message": f"Event created: {event['title']}"}
    except Exception as e:
        return {"error": str(e)}
 
 
@app.patch("/calendar/events/{event_id}")
async def calendar_update(event_id: str, data: dict):
    """
    Patch an existing event.
    Body: { user_id, title?, start_iso?, end_iso?, description?, location? }
    """
    try:
        user_id = data.pop("user_id")
        event   = update_event(user_id, event_id, data)
        return {"event": event, "message": "Event updated"}
    except Exception as e:
        return {"error": str(e)}
 
@app.delete("/calendar/events/{event_id}")
async def calendar_delete(event_id: str, user_id: str):
    """Delete a Google Calendar event."""
    try:
        ok = delete_event(user_id, event_id)
        return {"message": "Event deleted"} if ok else {"error": "Delete failed"}
    except Exception as e:
        return {"error": str(e)}
 
 
@app.get("/calendar/today")
async def calendar_today(user_id: str):
    """Events for today only."""
    try:
        events = get_today_events(user_id)
        return {"events": events, "count": len(events)}
    except Exception as e:
        return {"error": str(e)}
 
 
@app.post("/calendar/free-busy")
async def calendar_free_busy(data: dict):
    """
    Check free/busy for a date.
    Body: { user_id, date: 'YYYY-MM-DD' }
    """
    try:
        result = check_free_busy(data["user_id"], data["date"])
        return result
    except Exception as e:
        return {"error": str(e)}
 
 
@app.post("/calendar/quick-create")
async def calendar_quick_create(data: dict):
    """
    Natural language event creation via LLM.
    Body: { user_id, text: 'Team standup tomorrow at 9am for 30 minutes' }
    The LLM parses the text and creates the event.
    """
    try:
        user_id = data["user_id"]
        text    = data["text"]
 
        # Let LLM parse the natural language into structured fields
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        prompt  = f"""Parse this calendar event request into JSON.
Current time: {now_str}
 
Request: "{text}"
 
Return ONLY valid JSON with these fields (no markdown, no explanation):
{{
  "title": "event title",
  "start_iso": "YYYY-MM-DDTHH:MM:00",
  "end_iso":   "YYYY-MM-DDTHH:MM:00",
  "description": "",
  "location": "",
  "timezone": "UTC"
}}
If duration not specified, assume 1 hour."""
 
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a calendar parser. Return only valid JSON."},
                {"role": "user",   "content": prompt}
            ]
        )
        raw = completion.choices[0].message.content.strip()
        # Strip markdown fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(raw)
 
        event = create_event(
            user_id     = user_id,
            title       = parsed["title"],
            start_iso   = parsed["start_iso"],
            end_iso     = parsed["end_iso"],
            description = parsed.get("description", ""),
            location    = parsed.get("location", ""),
            timezone_str= parsed.get("timezone", "UTC"),
        )
        return {
            "event":   event,
            "message": f"✅ Created: {event['title']} on {event['start_human']}"
        }
    except Exception as e:
        return {"error": str(e)}
    

@app.websocket("/ws/stt")
async def websocket_stt(websocket: WebSocket):
    await websocket.accept()

    # Use asynclive (async-native) instead of websocket.v("1")
    # so callbacks can await websocket.send_json directly
    dg_connection = deepgram_client.listen.asynclive.v("1")

    # ── Transcript callback ──────────────────────────────────
    # Defined at the correct scope so it closes over `websocket`
    async def on_message(self, result, **kwargs):
        try:
            alt        = result.channel.alternatives[0]
            transcript = alt.transcript

            if not transcript or not result.is_final:
                # Send interim so the input box updates live
                if transcript and not result.is_final:
                    await websocket.send_json({
                        "type": "transcript",
                        "text": transcript,
                    })
                return

            print(f"[STT] Final transcript: {transcript}")

            # Barge-in: tell frontend to stop TTS if it's playing
            global tts_speaking
            if tts_speaking:
                await websocket.send_json({"type": "barge_in"})
                tts_speaking = False

            # Ask the LLM
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are VoxMind Chronos, an AI second brain. "
                            "Be helpful, concise, and conversational."
                        ),
                    },
                    {"role": "user", "content": transcript},
                ],
            )
            answer = completion.choices[0].message.content

            await websocket.send_json({
                "type":       "ai_response",
                "transcript": transcript,
                "response":   answer,
            })

        except Exception as e:
            print(f"[STT] on_message error: {e}")
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
            except Exception:
                pass

    async def on_error(self, error, **kwargs):
        print(f"[STT] Deepgram error: {error}")
        try:
            await websocket.send_json({"type": "error", "message": str(error)})
        except Exception:
            pass

    # Register callbacks BEFORE starting the connection
    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
    dg_connection.on(LiveTranscriptionEvents.Error,      on_error)

    options = LiveOptions(
        model="nova-2",          # nova-2 is stable; nova-3 may not be on your plan
        language="en-US",
        smart_format=True,
        interim_results=True,
        punctuate=True,
        endpointing=300,         # ms of silence before finalising — good for voice chat
    )

    started = await dg_connection.start(options)
    if not started:
        await websocket.send_json({
            "type":    "error",
            "message": "Failed to connect to Deepgram. Check your DEEPGRAM_API_KEY.",
        })
        await websocket.close()
        return

    print("[STT] Deepgram connection started")

    # ── Audio receive loop ───────────────────────────────────
    try:
        while True:
            msg = await websocket.receive()

            # Control message (e.g. keep_alive ping from frontend)
            if "text" in msg:
                try:
                    data = json.loads(msg["text"])
                    if data.get("type") == "keep_alive":
                        pass   # just ignore, connection stays open
                except Exception:
                    pass

            # Audio bytes → forward to Deepgram
            elif "bytes" in msg:
                audio_bytes = msg["bytes"]
                if audio_bytes:
                    await dg_connection.send(audio_bytes)

    except WebSocketDisconnect:
        print("[STT] Client disconnected")
    except Exception as e:
        print(f"[STT] Receive loop error: {e}")

    finally:
        try:
            await dg_connection.finish()
        except Exception:
            pass
        print("[STT] Deepgram connection closed")

# Barge-In Endpoint

@app.post("/voice/tts-start")
async def tts_start():

    global tts_speaking

    tts_speaking = True

    return {"status": "ok"}

@app.post("/voice/tts-stop")
async def tts_stop():

    global tts_speaking

    tts_speaking = False

    return {"status": "ok"}

# eleven lab

@app.post("/tts/speak")
async def tts_speak(data: dict):
    """
    Stream ElevenLabs TTS audio for the given text.
 
    Body: { "text": "Hello world", "voice_id": "optional_override" }
 
    Returns a StreamingResponse with audio/mpeg content.
    Frontend plays it via an Audio element or Web Audio API.
    """
    try:
        text     = data.get("text", "").strip()
        voice_id = data.get("voice_id")
 
        if not text:
            return {"error": "text is required"}
 
        if not is_enabled():
            return {"error": "ElevenLabs not configured. Add ELEVENLABS_API_KEY to .env"}
 
        return StreamingResponse(
            stream_tts(text, voice_id=voice_id),
            media_type="audio/mpeg",
            headers={
                "Cache-Control":              "no-cache",
                "X-Content-Type-Options":     "nosniff",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except Exception as e:
        return {"error": str(e)}
 
 
@app.get("/tts/voices")
async def tts_voices():
    """List all available ElevenLabs voices for this API key."""
    try:
        return {"voices": get_voices()}
    except Exception as e:
        return {"error": str(e)}
 
 
@app.get("/tts/settings")
async def tts_get_settings():
    """Return current TTS settings (voice, speed, stability etc.)"""
    return get_settings()
 
 
@app.post("/tts/settings")
async def tts_update_settings(data: dict):
    """
    Update TTS settings.
    Body: any subset of { voice_id, stability, similarity_boost, style, speed, enabled }
    """
    try:
        updated = update_settings(data)
        return {"message": "Settings updated", "settings": updated}
    except Exception as e:
        return {"error": str(e)}
 
 
@app.get("/tts/status")
async def tts_status():
    """Check if ElevenLabs is configured and enabled."""
    import os
    has_key = bool(os.getenv("ELEVENLABS_API_KEY"))
    return {
        "configured": has_key,
        "enabled":    is_enabled(),
        "message":    "ElevenLabs ready" if has_key else "Add ELEVENLABS_API_KEY to .env",
    }

# meeting  
@app.post("/meeting/start")
async def meeting_start(data: dict):
    """
    Start a new shadow meeting session.
    Body: { "title": "Weekly Standup" }
    Returns: { "session_id": "uuid" }
    """
    title      = data.get("title", "Meeting")
    session_id = create_session(title)
    return {"session_id": session_id, "message": f"Session started: {title}"}
 
 
@app.websocket("/ws/meeting/{session_id}")
async def meeting_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for Shadow Meeting Mode.
 
    PROTOCOL:
      Client → Server:  raw PCM audio bytes  (linear16, 16kHz, mono)
                        OR JSON string: {"type":"stop"}
      Server → Client:  JSON strings:
                        {"type":"transcript","speaker":0,"text":"...","is_final":true,"time":"..."}
                        {"type":"interim",   "text":"..."}
                        {"type":"error",     "message":"..."}
                        {"type":"stopped"}
 
    The browser AudioWorklet records mic+system audio, resamples to
    16kHz mono PCM Int16, and sends raw bytes here every ~100ms.
    """
    await websocket.accept()
 
    session = get_session(session_id)
    if not session:
        await websocket.send_text(json.dumps({
            "type": "error", "message": f"Session {session_id} not found"
        }))
        await websocket.close()
        return
 
    dg_client = get_deepgram_client()
    dg_conn   = None
 
    try:
        # ── Open Deepgram live connection ──────────────────────
        dg_conn = dg_client.listen.asynclive.v("1")
 
        async def on_message(self, result, **kwargs):
            """Called by Deepgram for each transcript result."""
            try:
                channel   = result.channel
                alt       = channel.alternatives[0]
                text      = alt.transcript.strip()
                is_final  = result.is_final
 
                if not text:
                    return
 
                # Extract speaker from diarization words
                speaker = 0
                if hasattr(alt, "words") and alt.words:
                    speaker = getattr(alt.words[0], "speaker", 0) or 0
 
                time_str  = datetime.now().strftime("%H:%M:%S")
 
                if is_final:
                    append_transcript(session_id, speaker, text, time_str)
                    await websocket.send_text(json.dumps({
                        "type":     "transcript",
                        "speaker":  speaker,
                        "text":     text,
                        "is_final": True,
                        "time":     time_str,
                    }))
                else:
                    # Send interim for real-time display
                    await websocket.send_text(json.dumps({
                        "type": "interim",
                        "text": text,
                    }))
            except Exception as e:
                print(f"[Shadow] transcript handler error: {e}")
 
        async def on_error(self, error, **kwargs):
            print(f"[Shadow] Deepgram error: {error}")
            try:
                await websocket.send_text(json.dumps({
                    "type": "error", "message": str(error)
                }))
            except Exception:
                pass
 
        dg_conn.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_conn.on(LiveTranscriptionEvents.Error,      on_error)
 
        options = get_live_options()
        started = await dg_conn.start(options)
 
        if not started:
            await websocket.send_text(json.dumps({
                "type": "error", "message": "Failed to connect to Deepgram"
            }))
            return
 
        # ── Audio receive loop ─────────────────────────────────
        while True:
            try:
                msg = await websocket.receive()
 
                # Text message = control command
                if "text" in msg:
                    data = json.loads(msg["text"])
                    if data.get("type") == "stop":
                        break
 
                # Binary message = audio chunk
                elif "bytes" in msg:
                    audio_bytes = msg["bytes"]
                    if audio_bytes:
                        await dg_conn.send(audio_bytes)
 
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"[Shadow] receive error: {e}")
                break
 
    except Exception as e:
        print(f"[Shadow] WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error", "message": str(e)
            }))
        except Exception:
            pass
 
    finally:
        # ── Clean up Deepgram connection ───────────────────────
        if dg_conn:
            try:
                await dg_conn.finish()
            except Exception:
                pass
        end_session(session_id)
        try:
            await websocket.send_text(json.dumps({"type": "stopped"}))
        except Exception:
            pass
 
 
@app.post("/meeting/summarize")
async def meeting_summarize(data: dict):
    """
    Generate AI summary of the meeting transcript.
    Called when user clicks 'End Meeting'.
 
    Body: { "session_id": "uuid", "title": "optional title" }
 
    Returns:
    {
      "summary":        "...",
      "action_items":   ["...", "..."],
      "decisions":      ["...", "..."],
      "conflicts":      ["...", "..."],
      "speakers":       2,
      "duration":       "34 minutes",
      "transcript":     [...],
    }
    """
    session_id = data.get("session_id")
    session    = get_session(session_id)
 
    if not session:
        return {"error": "Session not found"}
 
    transcript_text = get_full_transcript_text(session_id)
 
    if not transcript_text.strip():
        return {"error": "No transcript available — nothing was captured."}
 
    # ── Calculate duration ─────────────────────────────────────
    try:
        start   = datetime.fromisoformat(session["start"])
        end_dt  = datetime.fromisoformat(session.get("end", datetime.now().isoformat()))
        mins    = int((end_dt - start).total_seconds() / 60)
        duration = f"{mins} minute{'s' if mins != 1 else ''}"
    except Exception:
        duration = "unknown"
 
    # ── Count unique speakers ──────────────────────────────────
    speakers = len(set(e["speaker"] for e in session["transcript"]))
 
    # ── LLM analysis ──────────────────────────────────────────
    prompt = f"""You are analyzing a meeting transcript. Extract structured information.
 
MEETING: {session.get('title', 'Meeting')}
DURATION: {duration}
SPEAKERS: {speakers}
 
TRANSCRIPT:
{transcript_text[:12000]}
 
Return a JSON object with EXACTLY these keys (no markdown, no explanation):
{{
  "summary": "2-3 paragraph executive summary of what was discussed",
  "action_items": ["action item 1", "action item 2"],
  "decisions": ["decision made 1", "decision made 2"],
  "conflicts": ["unresolved issue or disagreement 1"],
  "key_topics": ["topic 1", "topic 2", "topic 3"],
  "sentiment": "positive|neutral|tense"
}}
 
If a section has nothing, use an empty array [].
Be specific and direct. Use bullet-friendly short phrases for lists."""
 
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a precise meeting analyst. Return only valid JSON."},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.3,
        )
        raw  = completion.choices[0].message.content.strip()
        raw  = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
    except json.JSONDecodeError:
        # If LLM didn't return clean JSON, return raw text as summary
        data = {
            "summary":      completion.choices[0].message.content,
            "action_items": [],
            "decisions":    [],
            "conflicts":    [],
            "key_topics":   [],
            "sentiment":    "neutral",
        }
    except Exception as e:
        return {"error": f"LLM analysis failed: {str(e)}"}
 
    return {
        **data,
        "session_id":  session_id,
        "title":       session.get("title", "Meeting"),
        "duration":    duration,
        "speakers":    speakers,
        "transcript":  session["transcript"],
        "word_count":  len(transcript_text.split()),
    }
 
 
@app.get("/meeting/sessions")
async def meeting_sessions():
    """List all meeting sessions (active and ended)."""
    from app.shadow_meeting import _sessions
    result = []
    for sid, s in _sessions.items():
        result.append({
            "session_id": sid,
            "title":      s.get("title", "Meeting"),
            "start":      s.get("start"),
            "active":     s.get("active", False),
            "lines":      len(s.get("transcript", [])),
        })
    return {"sessions": result}
 
 
@app.get("/meeting/transcript/{session_id}")
async def meeting_transcript(session_id: str):
    """Get full transcript for a session."""
    session = get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    return {
        "transcript": session["transcript"],
        "title":      session.get("title", "Meeting"),
        "start":      session.get("start"),
    }