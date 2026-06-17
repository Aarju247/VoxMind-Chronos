# import json
# import os

# TODO_FILE = "todos.json"

# def load_todos():
#     if not os.path.exists(TODO_FILE):
#         return []
#     with open(TODO_FILE, "r") as f:
#         return json.load(f)


# def save_todo(task):
#     todos = load_todos()
#     todos.append(task)
#     with open(TODO_FILE, "w") as f:
#         json.dump(todos, f, indent=4)


# def get_all_todos():
#     return load_todos()


# def complete_todo(task_name):
#     todos = load_todos()
#     for todo in todos:
#         if todo["task"].lower() == task_name.lower():
#             todo["completed"] = True
#     with open(TODO_FILE, "w") as f:
#         json.dump(todos, f, indent=4)


# def delete_todo(index: int) -> bool:
#     """Delete a todo by its list index. Returns True if deleted."""
#     todos = load_todos()
#     if index < 0 or index >= len(todos):
#         return False
#     todos.pop(index)
#     with open(TODO_FILE, "w") as f:
#         json.dump(todos, f, indent=4)
#     return True


# def toggle_todo(index: int) -> bool:
#     """Toggle completed state by index. Returns True if found."""
#     todos = load_todos()
#     if index < 0 or index >= len(todos):
#         return False
#     todos[index]["completed"] = not todos[index].get("completed", False)
#     with open(TODO_FILE, "w") as f:
#         json.dump(todos, f, indent=4)
#     return True

import json
import os

DATA_DIR = "user_data"
os.makedirs(DATA_DIR, exist_ok=True)


def _safe(user_id: str) -> str:
    return "".join(c if c.isalnum() or c in "-_." else "_" for c in user_id)


def _todo_file(user_id: str) -> str:
    path = os.path.join(DATA_DIR, _safe(user_id))
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, "todos.json")


def load_todos(user_id: str = "default") -> list:
    f = _todo_file(user_id)
    if not os.path.exists(f):
        return []
    with open(f, "r") as fp:
        return json.load(fp)


def _write(user_id: str, todos: list):
    with open(_todo_file(user_id), "w") as fp:
        json.dump(todos, fp, indent=4)


def save_todo(task: dict, user_id: str = "default"):
    todos = load_todos(user_id)
    todos.append(task)
    _write(user_id, todos)


def get_all_todos(user_id: str = "default") -> list:
    return load_todos(user_id)


def complete_todo(task_name: str, user_id: str = "default"):
    todos = load_todos(user_id)
    for todo in todos:
        if todo["task"].lower() == task_name.lower():
            todo["completed"] = True
    _write(user_id, todos)


def delete_todo(index: int, user_id: str = "default") -> bool:
    todos = load_todos(user_id)
    if index < 0 or index >= len(todos):
        return False
    todos.pop(index)
    _write(user_id, todos)
    return True


def toggle_todo(index: int, user_id: str = "default") -> bool:
    todos = load_todos(user_id)
    if index < 0 or index >= len(todos):
        return False
    todos[index]["completed"] = not todos[index].get("completed", False)
    _write(user_id, todos)
    return True