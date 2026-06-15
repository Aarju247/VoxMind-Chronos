import json
import os

TODO_FILE = "todos.json"

def load_todos():
    if not os.path.exists(TODO_FILE):
        return []
    with open(TODO_FILE, "r") as f:
        return json.load(f)


def save_todo(task):
    todos = load_todos()
    todos.append(task)
    with open(TODO_FILE, "w") as f:
        json.dump(todos, f, indent=4)


def get_all_todos():
    return load_todos()


def complete_todo(task_name):
    todos = load_todos()
    for todo in todos:
        if todo["task"].lower() == task_name.lower():
            todo["completed"] = True
    with open(TODO_FILE, "w") as f:
        json.dump(todos, f, indent=4)


def delete_todo(index: int) -> bool:
    """Delete a todo by its list index. Returns True if deleted."""
    todos = load_todos()
    if index < 0 or index >= len(todos):
        return False
    todos.pop(index)
    with open(TODO_FILE, "w") as f:
        json.dump(todos, f, indent=4)
    return True


def toggle_todo(index: int) -> bool:
    """Toggle completed state by index. Returns True if found."""
    todos = load_todos()
    if index < 0 or index >= len(todos):
        return False
    todos[index]["completed"] = not todos[index].get("completed", False)
    with open(TODO_FILE, "w") as f:
        json.dump(todos, f, indent=4)
    return True