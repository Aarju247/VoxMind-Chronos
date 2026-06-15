from datetime import datetime
import json
import os

REMINDER_FILE = "reminders.json"


def load_reminders():
    if not os.path.exists(REMINDER_FILE):
        with open(REMINDER_FILE, "w") as f:
            json.dump([], f)
    with open(REMINDER_FILE, "r") as f:
        return json.load(f)


def save_reminder(reminder):
    reminders = load_reminders()
    reminders.append(reminder)
    with open(REMINDER_FILE, "w") as f:
        json.dump(reminders, f, indent=4)


def get_all_reminders():
    return load_reminders()


def check_due_reminders():
    reminders = load_reminders()
    due_reminders = []
    updated = False

    for reminder in reminders:
        if reminder.get("triggered"):
            continue
        trigger_time = datetime.fromisoformat(reminder["trigger_at"])
        if datetime.now() >= trigger_time:
            reminder["triggered"] = True
            due_reminders.append(reminder)
            updated = True

    if updated:
        with open(REMINDER_FILE, "w") as f:
            json.dump(reminders, f, indent=4)

    return due_reminders