import os
import json
import uuid
import asyncio
from datetime import datetime
from typing import Optional

from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)
from dotenv import load_dotenv

load_dotenv()

_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")

# ── In-memory session store ────────────────────────────────────
# { session_id: { "transcript": [...], "start": datetime, "title": str } }
_sessions: dict = {}


def create_session(title: str = "Meeting") -> str:
    """Create a new meeting session. Returns session_id."""
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "title":      title,
        "start":      datetime.now().isoformat(),
        "transcript": [],   # list of {"speaker": N, "text": str, "time": str}
        "raw_text":   [],   # plain strings for LLM
        "active":     True,
    }
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    return _sessions.get(session_id)


def append_transcript(session_id: str, speaker: int, text: str, time: str):
    session = _sessions.get(session_id)
    if not session:
        return
    entry = {"speaker": speaker, "text": text.strip(), "time": time}
    session["transcript"].append(entry)
    session["raw_text"].append(f"Speaker {speaker}: {text.strip()}")


def end_session(session_id: str):
    session = _sessions.get(session_id)
    if session:
        session["active"]  = False
        session["end"]     = datetime.now().isoformat()


def get_full_transcript_text(session_id: str) -> str:
    session = _sessions.get(session_id)
    if not session:
        return ""
    return "\n".join(session["raw_text"])


def get_deepgram_client() -> DeepgramClient:
    if not _API_KEY:
        raise ValueError(
            "DEEPGRAM_API_KEY not set in .env. "
            "Get $200 free credit at https://console.deepgram.com/signup"
        )
    return DeepgramClient(
        _API_KEY,
        DeepgramClientOptions(options={"keepalive": "true"})
    )


def get_live_options() -> LiveOptions:
    """
    Deepgram Live Streaming options optimised for meeting capture.
    nova-2-meeting model is trained on multi-speaker conversations.
    """
    return LiveOptions(
        model             = "nova-2-meeting",
        language          = "en-US",
        punctuate         = True,       # add punctuation
        diarize           = True,       # label speakers (Speaker 0, Speaker 1…)
        smart_format      = True,       # format numbers, dates, etc.
        filler_words      = False,      # remove "um", "uh"
        interim_results   = True,       # send partial results for low latency
        utterance_end_ms  = "1000",     # finalize after 1s silence
        vad_events        = True,       # voice activity detection
        endpointing       = 300,        # ms of silence = end of utterance
        encoding          = "linear16", # raw PCM from browser AudioWorklet
        sample_rate       = 16000,      # 16kHz mono
        channels          = 1,
    )