import json
import os

EVENTS_FILE = "events.json"


def load_events():
    if not os.path.exists(EVENTS_FILE):
        return []
    with open(EVENTS_FILE, "r") as f:
        return json.load(f)


def save_event(event):
    events = load_events()
    events.append(event)
    with open(EVENTS_FILE, "w") as f:
        json.dump(events, f, indent=4)


def get_all_events():
    return load_events()


def delete_local_event(index: int) -> bool:
    """Delete a locally-scheduled event by index. Returns True if deleted."""
    events = load_events()
    if index < 0 or index >= len(events):
        return False
    events.pop(index)
    with open(EVENTS_FILE, "w") as f:
        json.dump(events, f, indent=4)
    return True