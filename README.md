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

### 📸 Screenshots
**Dashboard**
<img width="1918" height="863" alt="image" src="https://github.com/user-attachments/assets/873825e9-ebc4-4675-95d5-a8c6fbbffc12" />
<img width="1918" height="867" alt="image" src="https://github.com/user-attachments/assets/2a0e536f-ca8f-4837-a010-619ad8deeee8" />

**Voice Assistant**
<img width="1917" height="852" alt="image" src="https://github.com/user-attachments/assets/3ccf4d40-da6e-427c-a55e-9ca7f7b2705b" />

**Reminder**
<img width="1913" height="862" alt="image" src="https://github.com/user-attachments/assets/1a42d496-c1f1-40e5-a9ec-602933fc8ef9" />

**Memory**
<img width="1918" height="857" alt="image" src="https://github.com/user-attachments/assets/285fd797-976a-449b-a888-34f9d0cb90e0" />

**PDF Chat**
<img width="1915" height="865" alt="image" src="https://github.com/user-attachments/assets/dc78b9bf-6b76-45f0-a3ce-632a491fcd6e" />
<img width="1918" height="862" alt="image" src="https://github.com/user-attachments/assets/353aa868-1cf4-4c2f-a6a0-30e7a2cdc8ef" />
<img width="1918" height="863" alt="image" src="https://github.com/user-attachments/assets/e3963e9a-3f78-46b6-bc6d-b9f1e3a358b2" />

**Tasks**
<img width="1917" height="861" alt="image" src="https://github.com/user-attachments/assets/c25a354c-8a6c-4d81-944d-ad25a3968881" />
<img width="1913" height="857" alt="image" src="https://github.com/user-attachments/assets/189a019a-b151-4fb0-8f6b-ac5603b99397" />
<img width="1918" height="862" alt="image" src="https://github.com/user-attachments/assets/22061167-b114-459f-a070-24fa3fc08a72" />
<img width="1912" height="862" alt="image" src="https://github.com/user-attachments/assets/40fa4c30-6830-42f7-89b7-7be31fc209b2" />

**Insights**
<img width="1917" height="872" alt="image" src="https://github.com/user-attachments/assets/c58c4c46-0be4-4ddc-99e4-1523251f0549" />

**Calendar Integration**
<img width="1918" height="867" alt="image" src="https://github.com/user-attachments/assets/c17e7351-1ed3-4ddd-b8b9-93a791c2b4a6" />
<img width="1911" height="857" alt="image" src="https://github.com/user-attachments/assets/2346f837-1dba-422d-9184-5c6f104d9e43" />
<img width="1912" height="867" alt="image" src="https://github.com/user-attachments/assets/6f2d3238-e864-49d9-8071-ae3e24137f65" />
<img width="1918" height="867" alt="image" src="https://github.com/user-attachments/assets/3929a5a6-6c16-4b68-887c-84d61fae8b0c" />

**Shadow Meeting Mode**
<img width="1907" height="857" alt="image" src="https://github.com/user-attachments/assets/24c8ec80-78dd-4485-ac11-441fc615be31" />
<img width="1913" height="955" alt="image" src="https://github.com/user-attachments/assets/40514a27-e97c-4ece-88dc-b41ff391ea84" />
<img width="1918" height="862" alt="image" src="https://github.com/user-attachments/assets/9e0906ba-6355-4811-93ad-35cb13dac159" />
<img width="1918" height="863" alt="image" src="https://github.com/user-attachments/assets/c75849eb-91f0-432b-b22a-2a0531b6ab8e" />

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
