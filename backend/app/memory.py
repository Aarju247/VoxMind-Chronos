import os
import json
import uuid
from datetime import datetime

from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# ── Pinecone client ────────────────────────────────────────────
_pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
_index_name = os.getenv("PINECONE_INDEX_NAME", "voxmind-memory")
_index = _pc.Index(_index_name)

# Embedding model hosted by Pinecone — matches your 1024-dim index
_EMBED_MODEL = "llama-text-embed-v2"

# ── Local JSON fallback (keeps /dashboard counts working) ──────
_MEMORY_FILE = "memory.json"


def _load_local() -> list:
    """Load the local JSON mirror of memories (used for /dashboard counts)."""
    if not os.path.exists(_MEMORY_FILE):
        with open(_MEMORY_FILE, "w") as f:
            json.dump([], f)
        return []
    with open(_MEMORY_FILE, "r") as f:
        return json.load(f)


def _save_local(memories: list):
    with open(_MEMORY_FILE, "w") as f:
        json.dump(memories, f, indent=4)


def _embed(text: str) -> list[float]:
    """
    Generate a 1024-dim embedding via Pinecone's hosted llama-text-embed-v2.
    No OpenAI / Groq call needed — runs fully inside Pinecone.
    """
    result = _pc.inference.embed(
        model=_EMBED_MODEL,
        inputs=[text],
        parameters={"input_type": "passage", "truncate": "END"}
    )
    return result[0].values  # list of 1024 floats


# ── Public API ─────────────────────────────────────────────────

def save_memory(fact: str) -> dict:
    """
    Embed `fact` and upsert it into Pinecone.
    Also mirrors to local JSON so /dashboard can count memories cheaply.

    Args:
        fact: plain-text string to remember  e.g. "User loves Python"

    Returns:
        dict with id, fact, timestamp
    """
    memory_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    # 1. Embed
    vector = _embed(fact)

    # 2. Upsert to Pinecone
    _index.upsert(
        vectors=[{
            "id": memory_id,
            "values": vector,
            "metadata": {
                "fact": fact,
                "timestamp": timestamp
            }
        }]
    )

    # 3. Mirror to local JSON (for cheap /dashboard count)
    local = _load_local()
    record = {"id": memory_id, "fact": fact, "timestamp": timestamp}
    local.append(record)
    _save_local(local)

    return record


def search_memories(query: str, top_k: int = 5) -> list[dict]:
    """
    Semantic search — returns the `top_k` most relevant memories.

    Args:
        query:  natural-language question / search string
        top_k:  number of results (default 5)

    Returns:
        list of dicts: [{id, fact, timestamp, score}, ...]
    """
    # Embed query with "query" input_type for retrieval
    result = _pc.inference.embed(
        model=_EMBED_MODEL,
        inputs=[query],
        parameters={"input_type": "query", "truncate": "END"}
    )
    query_vector = result[0].values

    # Query Pinecone
    response = _index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True
    )

    memories = []
    for match in response.matches:
        memories.append({
            "id": match.id,
            "fact": match.metadata.get("fact", ""),
            "timestamp": match.metadata.get("timestamp", ""),
            "score": round(match.score, 4)
        })

    return memories


def get_all_memories() -> list[dict]:
    """
    Returns all memories from local JSON mirror.
    Used by /dashboard for counts and by AI context injection.
    For true semantic retrieval, use search_memories() instead.
    """
    return _load_local()


def delete_memory(memory_id: str) -> bool:
    """
    Delete a memory from both Pinecone and the local JSON mirror.

    Args:
        memory_id: the UUID of the memory to delete

    Returns:
        True if found and deleted, False if not found
    """
    # Delete from Pinecone
    _index.delete(ids=[memory_id])

    # Delete from local mirror
    local = _load_local()
    updated = [m for m in local if m.get("id") != memory_id]

    if len(updated) == len(local):
        return False  # not found

    _save_local(updated)
    return True


def clear_all_memories() -> int:
    """
    ⚠ Deletes ALL memories from Pinecone and local JSON.
    Returns the count of deleted memories.
    """
    local = _load_local()
    count = len(local)

    if count > 0:
        ids = [m["id"] for m in local if "id" in m]
        if ids:
            _index.delete(ids=ids)

    _save_local([])
    return count