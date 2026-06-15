import os
import json
import uuid
import requests as http_requests
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

# ── CRITICAL for localhost dev ─────────────────────────────────
# Allows OAuth over plain HTTP (localhost). Remove in production.
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:5173")

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

TOKENS_DIR = Path("tokens")
TOKENS_DIR.mkdir(exist_ok=True)

# ── File-based state store (survives hot-reload) ───────────────
# Using in-memory dict caused "invalid_state" after uvicorn reload
_STATES_FILE = TOKENS_DIR / "_oauth_states.json"


def _load_states() -> dict:
    if _STATES_FILE.exists():
        try:
            return json.loads(_STATES_FILE.read_text())
        except Exception:
            return {}
    return {}


def _save_states(states: dict):
    _STATES_FILE.write_text(json.dumps(states))


def _pop_state(state: str):
    """Returns stored value (str or dict) for state, removing it."""
    states = _load_states()
    val    = states.pop(state, None)
    _save_states(states)
    return val


def _add_state(state: str, value):
    """Store any JSON-serialisable value (str or dict) keyed by state."""
    states = _load_states()
    states[state] = value
    _save_states(states)


# ── OAuth ──────────────────────────────────────────────────────

def get_authorization_url(session_id: str) -> str:
    """
    Build the Google consent URL.
    We generate a PKCE code_verifier here, store it alongside the state,
    and send the matching code_challenge to Google.
    Then in handle_callback() we retrieve and send the verifier — Google is happy.
    """
    import hashlib, base64

    # Generate PKCE pair
    code_verifier  = base64.urlsafe_b64encode(os.urandom(40)).rstrip(b"=").decode()
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()

    state = str(uuid.uuid4())
    # Store both session_id AND code_verifier keyed by state
    _add_state(state, {"session_id": session_id, "code_verifier": code_verifier})

    flow = _make_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )
    return auth_url


def handle_callback(code: str, state: str) -> Optional[str]:
    """
    Exchange code for tokens using a direct POST to Google token endpoint.
    Retrieves the stored code_verifier for this state and sends it —
    this is what Google requires when a code_challenge was sent during login.
    """
    state_data = _pop_state(state)
    if not state_data:
        return None

    # state_data is {"session_id": ..., "code_verifier": ...}
    session_id    = state_data.get("session_id", state_data) if isinstance(state_data, dict) else state_data
    code_verifier = state_data.get("code_verifier") if isinstance(state_data, dict) else None

    # ── Direct token exchange with PKCE verifier ────────────────
    post_data = {
        "code":          code,
        "client_id":     CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri":  REDIRECT_URI,
        "grant_type":    "authorization_code",
    }
    # Only include code_verifier if we generated one
    if code_verifier:
        post_data["code_verifier"] = code_verifier

    token_resp = http_requests.post(
        "https://oauth2.googleapis.com/token",
        data=post_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )

    if not token_resp.ok:
        raise ValueError(f"Token exchange failed: {token_resp.text}")

    token_data = token_resp.json()
    if "error" in token_data:
        raise ValueError(
            f"Google error: {token_data['error']} — {token_data.get('error_description','')}"
        )

    # ── Build Credentials from token response ───────────────────
    expiry = None
    if "expires_in" in token_data:
        # Keep expiry naive UTC — google-auth._helpers.utcnow() returns naive,
        # so Credentials.expired does naive < naive (no TypeError).
        expiry = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])

    creds = Credentials(
        token         = token_data["access_token"],
        refresh_token = token_data.get("refresh_token"),
        token_uri     = "https://oauth2.googleapis.com/token",
        client_id     = CLIENT_ID,
        client_secret = CLIENT_SECRET,
        scopes        = SCOPES,
        expiry        = expiry,
    )

    # ── Get user profile ────────────────────────────────────────
    user_info = _get_user_info(creds)
    user_id   = user_info.get("email") or str(session_id)

    _save_tokens(user_id, creds)
    return user_id


def is_connected(user_id: str) -> bool:
    return _load_tokens(user_id) is not None


def revoke_access(user_id: str):
    creds = _load_tokens(user_id)
    if creds and creds.token:
        try:
            http_requests.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": creds.token},
                headers={"content-type": "application/x-www-form-urlencoded"},
            )
        except Exception:
            pass
    p = TOKENS_DIR / f"{_safe(user_id)}.json"
    if p.exists():
        p.unlink()


# ── Read ───────────────────────────────────────────────────────

def get_upcoming_events(user_id: str, max_results: int = 20, days: int = 14) -> list:
    svc = _svc(user_id)
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)
    # Google requires RFC3339 with Z suffix — replace +00:00 with Z
    time_min = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    time_max = end.strftime("%Y-%m-%dT%H:%M:%SZ")
    res = svc.events().list(
        calendarId="primary",
        timeMin=time_min,
        timeMax=time_max,
        maxResults=max_results,
        singleEvents=True,
        orderBy="startTime",
    ).execute()
    return [_fmt(e) for e in res.get("items", [])]


def get_today_events(user_id: str) -> list:
    svc      = _svc(user_id)
    today    = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    time_min = today.strftime("%Y-%m-%dT%H:%M:%SZ")
    time_max = tomorrow.strftime("%Y-%m-%dT%H:%M:%SZ")
    res      = svc.events().list(
        calendarId="primary",
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy="startTime",
    ).execute()
    return [_fmt(e) for e in res.get("items", [])]


def check_free_busy(user_id: str, date_str: str) -> dict:
    svc     = _svc(user_id)
    day     = datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
    end_day = day + timedelta(days=1)
    res     = svc.freebusy().query(body={
        "timeMin": day.isoformat(),
        "timeMax": end_day.isoformat(),
        "items":   [{"id": "primary"}],
    }).execute()
    busy = res.get("calendars", {}).get("primary", {}).get("busy", [])
    return {"date": date_str, "busy_slots": busy, "is_free": len(busy) == 0}


# ── Write ──────────────────────────────────────────────────────

def create_event(
    user_id: str, title: str, start_iso: str, end_iso: str,
    description: str = "", location: str = "",
    attendees: list = None, timezone_str: str = "UTC",
) -> dict:
    svc  = _svc(user_id)
    body = {
        "summary":     title,
        "description": description,
        "location":    location,
        "start":       {"dateTime": start_iso, "timeZone": timezone_str},
        "end":         {"dateTime": end_iso,   "timeZone": timezone_str},
    }
    if attendees:
        body["attendees"] = [{"email": e} for e in attendees]
    return _fmt(svc.events().insert(
        calendarId="primary", body=body, sendNotifications=True
    ).execute())


def update_event(user_id: str, event_id: str, updates: dict) -> dict:
    svc   = _svc(user_id)
    patch = {}
    if "title"       in updates: patch["summary"]     = updates["title"]
    if "description" in updates: patch["description"] = updates["description"]
    if "location"    in updates: patch["location"]    = updates["location"]
    if "start_iso"   in updates: patch["start"]       = {"dateTime": updates["start_iso"]}
    if "end_iso"     in updates: patch["end"]         = {"dateTime": updates["end_iso"]}
    return _fmt(svc.events().patch(
        calendarId="primary", eventId=event_id, body=patch
    ).execute())


def delete_event(user_id: str, event_id: str) -> bool:
    try:
        _svc(user_id).events().delete(calendarId="primary", eventId=event_id).execute()
        return True
    except HttpError:
        return False


# ── Private ─────────────────────────────────────────────────────

def _make_flow() -> Flow:
    if not CLIENT_ID or not CLIENT_SECRET:
        raise ValueError(
            "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing from .env"
        )
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id":     CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri":      "https://accounts.google.com/o/oauth2/auth",
                "token_uri":     "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    # Disable PKCE — we use client_secret (server-side web app flow)
    # Without this, some versions of the library auto-generate a
    # code_challenge, which then causes "Missing code verifier" on token exchange
    flow.code_verifier = None
    return flow


def _svc(user_id: str):
    creds = _load_tokens(user_id)
    if not creds:
        raise ValueError(f"No Google credentials for {user_id}. Please connect first.")
    # Ensure expiry is always naive UTC so google-auth's internal
    # comparison (utcnow() < expiry) never hits a naive/aware TypeError.
    if creds.expiry is not None and creds.expiry.tzinfo is not None:
        creds.expiry = creds.expiry.replace(tzinfo=None)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        _save_tokens(user_id, creds)
    return build("calendar", "v3", credentials=creds)


def _save_tokens(user_id: str, creds: Credentials):
    (TOKENS_DIR / f"{_safe(user_id)}.json").write_text(json.dumps({
        "token":         creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri":     creds.token_uri or "https://oauth2.googleapis.com/token",
        "client_id":     creds.client_id  or CLIENT_ID,
        "client_secret": creds.client_secret or CLIENT_SECRET,
        "scopes":        list(creds.scopes or SCOPES),
        "expiry":        (
            creds.expiry.replace(tzinfo=None).isoformat()  # always naive UTC for google-auth compat
            if creds.expiry else None
        ),
    }, indent=2))


def _load_tokens(user_id: str) -> Optional[Credentials]:
    p = TOKENS_DIR / f"{_safe(user_id)}.json"
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    return Credentials(
        token         = d.get("token"),
        refresh_token = d.get("refresh_token"),
        token_uri     = d.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id     = d.get("client_id", CLIENT_ID),
        client_secret = d.get("client_secret", CLIENT_SECRET),
        scopes        = d.get("scopes", SCOPES),
        expiry        = (
            datetime.fromisoformat(d["expiry"]).replace(tzinfo=None)  # naive UTC — google-auth._helpers.utcnow() is naive
            if d.get("expiry") else None
        ),
    )


def _get_user_info(creds: Credentials) -> dict:
    """
    Fetch Google profile via the userinfo REST endpoint.
    Uses requests directly — avoids deprecated oauth2 v2 googleapiclient build().
    """
    resp = http_requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {creds.token}"},
        timeout=10,
    )
    resp.raise_for_status()
    info = resp.json()

    # Cache to disk
    if info.get("email"):
        (TOKENS_DIR / f"{_safe(info['email'])}_info.json").write_text(
            json.dumps(info, indent=2)
        )
    return info


def _fmt(e: dict) -> dict:
    s   = e.get("start", {})
    en  = e.get("end",   {})
    start = s.get("dateTime")  or s.get("date",  "")
    end   = en.get("dateTime") or en.get("date", "")
    try:
        # Normalize to UTC-aware datetime regardless of format
        dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        human = dt.strftime("%a %b %d · %I:%M %p")
    except Exception:
        human = start
    return {
        "id":          e.get("id", ""),
        "title":       e.get("summary", "(No title)"),
        "start":       start,
        "end":         end,
        "start_human": human,
        "description": e.get("description", ""),
        "location":    e.get("location",    ""),
        "link":        e.get("htmlLink",    ""),
        "attendees":   [a.get("email") for a in e.get("attendees", [])],
        "status":      e.get("status", "confirmed"),
        "all_day":     "date" in s and "dateTime" not in s,
    }


def _safe(s: str) -> str:
    return "".join(c if c.isalnum() or c in "-_." else "_" for c in s)


def get_cached_user_info(user_id: str) -> dict:
    p = TOKENS_DIR / f"{_safe(user_id)}_info.json"
    return json.loads(p.read_text()) if p.exists() else {}