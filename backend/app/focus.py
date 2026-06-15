import json
import os
from datetime import datetime
FOCUS_FILE = "focus.json"
 
def load_focus():
    if not os.path.exists(FOCUS_FILE):
        return {}
    with open(FOCUS_FILE, "r") as f:
        return json.load(f)
 
def save_focus_session(task, start_time, end_time):
    with open(FOCUS_FILE, "w") as f:
        json.dump({"active": True, "task": task, "start_time": start_time, "end_time": end_time}, f, indent=4)
 
def get_focus_session():
    return load_focus()
 
def end_focus_session():
    focus_data = load_focus()
    if focus_data:
        focus_data["active"] = False
        with open(FOCUS_FILE, "w") as f:
            json.dump(focus_data, f, indent=4)
    return focus_data