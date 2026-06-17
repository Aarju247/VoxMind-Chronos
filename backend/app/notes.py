# import json
# import os

# NOTES_FILE = "notes.json"

# def load_notes():
#     if not os.path.exists(NOTES_FILE):
#         return []
#     with open(NOTES_FILE, "r") as f:
#         return json.load(f)


# def save_note(note):
#     notes = load_notes()
#     notes.append(note)
#     with open(NOTES_FILE, "w") as f:
#         json.dump(notes, f, indent=4)


# def get_all_notes():
#     return load_notes()


# def delete_note(index: int) -> bool:
#     """Delete a note by its list index. Returns True if deleted."""
#     notes = load_notes()
#     if index < 0 or index >= len(notes):
#         return False
#     notes.pop(index)
#     with open(NOTES_FILE, "w") as f:
#         json.dump(notes, f, indent=4)
#     return True

import json
import os

DATA_DIR = "user_data"
os.makedirs(DATA_DIR, exist_ok=True)


def _safe(user_id: str) -> str:
    return "".join(c if c.isalnum() or c in "-_." else "_" for c in user_id)


def _notes_file(user_id: str) -> str:
    path = os.path.join(DATA_DIR, _safe(user_id))
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, "notes.json")


def load_notes(user_id: str = "default") -> list:
    f = _notes_file(user_id)
    if not os.path.exists(f):
        return []
    with open(f, "r") as fp:
        return json.load(fp)


def _write(user_id: str, notes: list):
    with open(_notes_file(user_id), "w") as fp:
        json.dump(notes, fp, indent=4)


def save_note(note: dict, user_id: str = "default"):
    notes = load_notes(user_id)
    notes.append(note)
    _write(user_id, notes)


def get_all_notes(user_id: str = "default") -> list:
    return load_notes(user_id)


def delete_note(index: int, user_id: str = "default") -> bool:
    notes = load_notes(user_id)
    if index < 0 or index >= len(notes):
        return False
    notes.pop(index)
    _write(user_id, notes)
    return True