# 🧠 VoxMind Chronos

An AI-powered personal productivity assistant that combines voice interaction, intelligent memory, meeting intelligence, task management, calendar integration, and document understanding into a single workspace.

VoxMind Chronos acts as a "Second Brain" that helps users organize information, manage schedules, capture insights, and interact naturally through voice.

## Project Logo
<img width="1254" height="1254" alt="WhatsApp Image 2026-06-13 at 14 24 55" src="https://github.com/user-attachments/assets/0afe4ebd-f11f-43c0-bd4e-d2acab3bf4e3" />

---

## 🚀 Features

### 🎙️ Voice AI Assistant

* Speech-to-Text using Deepgram
* Natural Text-to-Speech responses using ElevenLabs
* Conversational AI interaction
* Real-time voice communication

### 🧠 Smart Memory System

* Persistent memory storage
* Save and retrieve important information
* Context-aware recall
* Personal knowledge management

### 📄 PDF Intelligence (RAG)

* Upload PDF documents
* Extract and process content
* Ask questions about uploaded files
* AI-powered document search and retrieval

### 📅 Google Calendar Integration

* View upcoming events
* Sync schedules automatically
* Calendar-based productivity planning
* Event management support

### ✅ Task & Reminder Management

* Create and track tasks
* Set reminders
* Organize daily activities
* Productivity tracking

### 🎯 Focus Mode

* Dedicated focus sessions
* Time tracking
* Productivity monitoring
* Distraction-free workflow

### 🎤 Shadow Meeting Mode

* Capture meeting conversations
* Generate meeting summaries
* Extract key discussion points
* Maintain meeting records

### 📊 Productivity Dashboard

* Activity overview
* Tasks, notes, and events tracking
* Productivity insights
* Personalized workspace

---

## 🏗️ System Architecture

```text
Frontend (React + Vite)
        │
        ▼
Backend (FastAPI)
        │
 ┌──────┼──────────┐
 ▼      ▼          ▼
Memory  PDF RAG   Calendar
System  Engine     Sync
 │       │          │
 ▼       ▼          ▼
JSON    Vector DB  Google API

        ▼
 Voice Layer
 ┌──────────────┐
 │  Deepgram    │
 │ ElevenLabs   │
 └──────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* CSS

### Backend

* FastAPI
* Python

### AI & Integrations

* Deepgram (Speech-to-Text)
* ElevenLabs (Text-to-Speech)
* Pinecone (Vector Database)
* Google Calendar API
* PDF Processing & Retrieval-Augmented Generation (RAG)

### Storage

* JSON-based persistence
* Vector embeddings for document retrieval

---

## 📂 Project Structure

```text
voxmind-chronos/
├── backend/
│   ├── app/
│   │   ├── main.py              # Application initialization & WebSocket routing gateway
│   │   ├── pdf_service.py       # Extracting, chunking, and uploading vectors to Pinecone
│   │   ├── memory.py            # Long-term semantic data persistence logic
│   │   ├── google_calendar.py   # OAuth routines and synchronization layers
│   │   ├── focus.py             # Focused study session state loops
│   │   ├── reminders.py         # Polling engine for system-wide background notifications
│   │   ├── shadow_meeting.py    # Ghost/Shadow tracking calendar logic
│   │   ├── events.py / todo.py  # Standard productivity database management
│   │   ├── notes.py             # Digital markdown scratchpad handlers
│   │   └── tts_service.py       # ElevenLabs API streaming orchestration
│   ├── data/                    # Encrypted cache for Google token states
│   ├── tokens/                  # Secure identity files for verified users
│   ├── uploads/                 # Storage for uploaded PDFs (e.g., Hackathon papers, AI notes)
│   ├── requirements.txt         # Package dependencies for FastAPI environment
│   └── *.json                   # Active storage backends for lightweight schema models
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   └── Home.jsx         # Highly dynamic premium Glassmorphic Dashboard UI
    │   ├── CalendarTab.jsx      # Interactive Google Calendar planner interface
    │   ├── ShadowMeetingTab.jsx # Scheduling suite for shadow work tracking
    │   ├── TodosNotesTab.jsx    # Split-pane execution boards for tasks and ideas
    │   ├── TTSSettings.jsx      # Fine-grained audio voice control options panel
    │   ├── useTTS.js            # Unified React state hook for seamless web/cloud audio switching
    │   └── services/api.js      # Centrally configured Axios runtime interface
    ├── public/
    │   └── audio-processor.worklet.js # Background audio sampler thread for raw mic manipulation
    └── vite.config.js           # Single Page Application module builder configurations

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/your-username/voxmind-chronos.git
cd voxmind-chronos
```

### Backend Setup

```bash
cd backend

python -m venv venv

venv\Scripts\activate
# Windows

pip install -r requirements.txt
```

Start backend:

```bash
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend/src

npm install

npm run dev
```

---

## 🔑 Environment Variables

Create a `.env` file in the backend directory.

```env
GROQ_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

---

## 🧪 AI Concepts Used

* Retrieval-Augmented Generation (RAG)
* Vector Embeddings
* Semantic Search
* Conversational AI
* Speech Recognition
* Text-to-Speech Synthesis
* Contextual Memory Systems
* Meeting Intelligence
* Productivity Analytics
  
---

## 🔮 Future Enhancements

* Emotion Detection using Hume AI
* Smart Daily Briefings
* Automatic Meeting Action Items
* Productivity Heatmaps
* Advanced Memory Graph
* Multi-User Collaboration
* Mobile Application Support

---

## 👥 Contributors

Team: Novanest AI

* Aarju Patel
* Maitri Patoliya
* Aayushi Mangukiya

---

## 📄 License

This project is developed for educational, research, and hackathon purposes.
Copyright © 2026 VoxMind Chronos Team.
