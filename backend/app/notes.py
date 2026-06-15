import json
import os

NOTES_FILE = "notes.json"

def load_notes():
    if not os.path.exists(NOTES_FILE):
        return []
    with open(NOTES_FILE, "r") as f:
        return json.load(f)


def save_note(note):
    notes = load_notes()
    notes.append(note)
    with open(NOTES_FILE, "w") as f:
        json.dump(notes, f, indent=4)


def get_all_notes():
    return load_notes()


def delete_note(index: int) -> bool:
    """Delete a note by its list index. Returns True if deleted."""
    notes = load_notes()
    if index < 0 or index >= len(notes):
        return False
    notes.pop(index)
    with open(NOTES_FILE, "w") as f:
        json.dump(notes, f, indent=4)
    return True