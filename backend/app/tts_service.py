import os
import json
from pathlib import Path
from typing import Iterator

from elevenlabs import ElevenLabs, VoiceSettings
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────
_API_KEY       = os.getenv("ELEVENLABS_API_KEY", "")
_DEFAULT_VOICE = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")  # George

# Settings file — persists user preferences across restarts
_SETTINGS_FILE = Path("tts_settings.json")

_DEFAULT_SETTINGS = {
    "voice_id":        _DEFAULT_VOICE,
    "model_id":        "eleven_turbo_v2_5",   # lowest latency model
    "stability":       0.5,
    "similarity_boost": 0.8,
    "style":           0.0,
    "speed":           1.0,
    "enabled":         True,
}


def _load_settings() -> dict:
    if _SETTINGS_FILE.exists():
        try:
            saved = json.loads(_SETTINGS_FILE.read_text())
            return {**_DEFAULT_SETTINGS, **saved}   # merge with defaults
        except Exception:
            pass
    return dict(_DEFAULT_SETTINGS)


def _save_settings(settings: dict):
    _SETTINGS_FILE.write_text(json.dumps(settings, indent=2))


def _get_client() -> ElevenLabs:
    if not _API_KEY:
        raise ValueError(
            "ELEVENLABS_API_KEY not set in .env. "
            "Get your key at https://elevenlabs.io"
        )
    return ElevenLabs(api_key=_API_KEY)


# ── Public API ─────────────────────────────────────────────────

def stream_tts(text: str, voice_id: str = None) -> Iterator[bytes]:
    """
    Stream audio bytes from ElevenLabs for `text`.

    Uses eleven_turbo_v2_5 model for lowest latency (~300ms to first chunk).
    Yields raw MP3 bytes — pass directly into a FastAPI StreamingResponse.

    Args:
        text:     text to speak (stripped, max ~2500 chars recommended)
        voice_id: override voice (uses settings default if None)

    Yields:
        bytes chunks of MP3 audio
    """
    settings  = _load_settings()
    client    = _get_client()

    # Clean text — remove markdown symbols that sound bad spoken
    clean = (
        text
        .replace("**", "").replace("*", "")
        .replace("##", "").replace("#", "")
        .replace("```", "").replace("`", "")
        .replace("→", "to").replace("•", "")
        .strip()
    )

    # Truncate if too long (ElevenLabs free tier: 10K chars/month)
    if len(clean) > 2500:
        clean = clean[:2497] + "..."

    audio_stream = client.text_to_speech.convert_as_stream(
        text     = clean,
        voice_id = voice_id or settings["voice_id"],
        model_id = settings["model_id"],
        voice_settings = VoiceSettings(
            stability        = settings["stability"],
            similarity_boost = settings["similarity_boost"],
            style            = settings["style"],
            speed            = settings["speed"],
        ),
        output_format = "mp3_44100_128",   # high quality MP3
    )

    for chunk in audio_stream:
        if chunk:
            yield chunk


def get_voices() -> list[dict]:
    """Return list of available voices for this API key."""
    try:
        client = _get_client()
        resp   = client.voices.get_all()
        return [
            {
                "voice_id":    v.voice_id,
                "name":        v.name,
                "category":    v.category,
                "description": v.description or "",
                "preview_url": v.preview_url or "",
            }
            for v in resp.voices
        ]
    except Exception as e:
        return [{"error": str(e)}]


def get_settings() -> dict:
    return _load_settings()


def update_settings(updates: dict) -> dict:
    settings = _load_settings()
    allowed  = {"voice_id", "model_id", "stability", "similarity_boost", "style", "speed", "enabled"}
    for key, val in updates.items():
        if key in allowed:
            settings[key] = val
    _save_settings(settings)
    return settings


def is_enabled() -> bool:
    return bool(_API_KEY) and _load_settings().get("enabled", True)