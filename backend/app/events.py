# import json
# import os

# EVENTS_FILE = "events.json"


# def load_events():
#     if not os.path.exists(EVENTS_FILE):
#         return []
#     with open(EVENTS_FILE, "r") as f:
#         return json.load(f)


# def save_event(event):
#     events = load_events()
#     events.append(event)
#     with open(EVENTS_FILE, "w") as f:
#         json.dump(events, f, indent=4)


# def get_all_events():
#     return load_events()


# def delete_local_event(index: int) -> bool:
#     """Delete a locally-scheduled event by index. Returns True if deleted."""
#     events = load_events()
#     if index < 0 or index >= len(events):
#         return False
#     events.pop(index)
#     with open(EVENTS_FILE, "w") as f:
#         json.dump(events, f, indent=4)
#     return True

import json
import os

DATA_DIR = "user_data"
os.makedirs(DATA_DIR, exist_ok=True)


def _safe(user_id: str) -> str:
    return "".join(c if c.isalnum() or c in "-_." else "_" for c in user_id)


def _events_file(user_id: str) -> str:
    path = os.path.join(DATA_DIR, _safe(user_id))
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, "events.json")


def load_events(user_id: str = "default") -> list:
    f = _events_file(user_id)
    if not os.path.exists(f):
        return []
    with open(f, "r") as fp:
        return json.load(fp)


def _write(user_id: str, events: list):
    with open(_events_file(user_id), "w") as fp:
        json.dump(events, fp, indent=4)


def save_event(event: dict, user_id: str = "default"):
    events = load_events(user_id)
    events.append(event)
    _write(user_id, events)


def get_all_events(user_id: str = "default") -> list:
    return load_events(user_id)


def delete_local_event(index: int, user_id: str = "default") -> bool:
    events = load_events(user_id)
    if index < 0 or index >= len(events):
        return False
    events.pop(index)
    _write(user_id, events)
    return True