import os
import uuid
import re
from typing import List, Dict

from pypdf import PdfReader
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# ── Pinecone client (shared with memory.py) ───────────────────
_pc         = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
_index_name = os.getenv("PINECONE_INDEX_NAME", "voxmind-memory")
_index      = _pc.Index(_index_name)

_EMBED_MODEL  = "llama-text-embed-v2"
_CHUNK_SIZE   = 500    # characters per chunk  (~125 tokens)
_CHUNK_OVERLAP = 100   # overlap between consecutive chunks


# ─────────────────────────────────────────────────────────────
# 1.  EXTRACT
# ─────────────────────────────────────────────────────────────

def extract_pdf_text(pdf_path: str) -> str:
    """
    Extract all text from a PDF.
    Returns a single string with page breaks marked.
    """
    reader = PdfReader(pdf_path)
    pages  = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            pages.append(f"[PAGE {i + 1}]\n{text.strip()}")
    return "\n\n".join(pages)


def extract_pdf_pages(pdf_path: str) -> List[Dict]:
    """
    Extract text page-by-page.
    Returns [{"page": 1, "text": "..."}, ...]
    """
    reader = PdfReader(pdf_path)
    pages  = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            pages.append({"page": i + 1, "text": text.strip()})
    return pages


# ─────────────────────────────────────────────────────────────
# 2.  CHUNK
# ─────────────────────────────────────────────────────────────

def chunk_text(
    text:    str,
    size:    int = _CHUNK_SIZE,
    overlap: int = _CHUNK_OVERLAP,
    source:  str = "",
    page:    int = 0,
) -> List[Dict]:
    """
    Split `text` into overlapping character-level chunks.

    Returns list of dicts:
        {
            "chunk_id":  "<uuid>",
            "text":      "<chunk text>",
            "source":    "<filename>",
            "page":      <page number>,
            "chunk_idx": <position in document>
        }
    """
    # Normalise whitespace
    text  = re.sub(r'\s+', ' ', text).strip()
    chunks = []
    start  = 0
    idx    = 0

    while start < len(text):
        end  = min(start + size, len(text))
        chunk_text_val = text[start:end].strip()

        if chunk_text_val:
            chunks.append({
                "chunk_id":  str(uuid.uuid4()),
                "text":      chunk_text_val,
                "source":    source,
                "page":      page,
                "chunk_idx": idx,
            })

        start += size - overlap
        idx   += 1

    return chunks


def chunk_pages(pages: List[Dict], source: str = "") -> List[Dict]:
    """
    Chunk a list of page dicts (from extract_pdf_pages).
    Each page is chunked independently so page numbers stay accurate.
    """
    all_chunks = []
    for p in pages:
        page_chunks = chunk_text(
            text   = p["text"],
            source = source,
            page   = p["page"],
        )
        all_chunks.extend(page_chunks)
    return all_chunks


# ─────────────────────────────────────────────────────────────
# 3.  EMBED  (Pinecone hosted inference)
# ─────────────────────────────────────────────────────────────

def _embed_batch(texts: List[str], input_type: str = "passage") -> List[List[float]]:
    """
    Embed a batch of texts using Pinecone's hosted llama-text-embed-v2.
    Pinecone inference API accepts up to 96 texts per call.
    We batch in groups of 64 to stay safe.
    """
    BATCH = 64
    all_vectors: List[List[float]] = []

    for i in range(0, len(texts), BATCH):
        batch  = texts[i : i + BATCH]
        result = _pc.inference.embed(
            model      = _EMBED_MODEL,
            inputs     = batch,
            parameters = {"input_type": input_type, "truncate": "END"},
        )
        all_vectors.extend([item.values for item in result])

    return all_vectors


# ─────────────────────────────────────────────────────────────
# 4.  STORE  (upsert into Pinecone namespace)
# ─────────────────────────────────────────────────────────────

def store_chunks_in_pinecone(chunks: List[Dict], namespace: str) -> int:
    """
    Embed all chunks and upsert into Pinecone under `namespace`.
    Each PDF gets its own namespace = sanitised filename.

    Returns number of vectors upserted.
    """
    if not chunks:
        return 0

    texts   = [c["text"] for c in chunks]
    vectors = _embed_batch(texts, input_type="passage")

    # Build Pinecone records
    records = []
    for chunk, vector in zip(chunks, vectors):
        records.append({
            "id":     chunk["chunk_id"],
            "values": vector,
            "metadata": {
                "text":      chunk["text"],
                "source":    chunk["source"],
                "page":      chunk["page"],
                "chunk_idx": chunk["chunk_idx"],
            },
        })

    # Upsert in batches of 100 (Pinecone limit)
    BATCH = 100
    for i in range(0, len(records), BATCH):
        _index.upsert(
            vectors   = records[i : i + BATCH],
            namespace = namespace,
        )

    return len(records)


# ─────────────────────────────────────────────────────────────
# 5.  RETRIEVE  (semantic search)
# ─────────────────────────────────────────────────────────────

def retrieve_relevant_chunks(
    question:  str,
    namespace: str,
    top_k:     int = 5,
) -> List[Dict]:
    """
    Embed the question and return the top_k most relevant chunks
    from the given PDF namespace.

    Returns list of dicts:
        {
            "text":   "<chunk text>",
            "page":   <page number>,
            "score":  <cosine similarity 0-1>,
            "source": "<filename>"
        }
    """
    # Embed the query
    result = _pc.inference.embed(
        model      = _EMBED_MODEL,
        inputs     = [question],
        parameters = {"input_type": "query", "truncate": "END"},
    )
    query_vector = result[0].values

    # Query Pinecone
    response = _index.query(
        vector          = query_vector,
        top_k           = top_k,
        namespace       = namespace,
        include_metadata = True,
    )

    chunks = []
    for match in response.matches:
        chunks.append({
            "text":   match.metadata.get("text",   ""),
            "page":   match.metadata.get("page",   0),
            "score":  round(match.score, 4),
            "source": match.metadata.get("source", ""),
        })

    return chunks


# ─────────────────────────────────────────────────────────────
# 6.  FULL PIPELINE HELPERS
# ─────────────────────────────────────────────────────────────

def ingest_pdf(pdf_path: str, filename: str) -> Dict:
    """
    Full ingestion pipeline:
        PDF → extract pages → chunk → embed → store in Pinecone

    Args:
        pdf_path: absolute path to the saved PDF file
        filename: original filename (used as Pinecone namespace)

    Returns:
        {
            "filename":   filename,
            "pages":      <page count>,
            "chunks":     <chunk count>,
            "namespace":  <pinecone namespace>,
            "characters": <total chars extracted>
        }
    """
    namespace = _make_namespace(filename)

    # Extract
    pages = extract_pdf_pages(pdf_path)
    if not pages:
        raise ValueError("Could not extract any text from this PDF.")

    total_chars = sum(len(p["text"]) for p in pages)

    # Chunk
    chunks = chunk_pages(pages, source=filename)

    # Embed + Store
    num_stored = store_chunks_in_pinecone(chunks, namespace=namespace)

    return {
        "filename":   filename,
        "pages":      len(pages),
        "chunks":     num_stored,
        "namespace":  namespace,
        "characters": total_chars,
        "preview":    pages[0]["text"][:500] if pages else "",
    }


def get_full_text_for_summary(pdf_path: str, max_chars: int = 15000) -> str:
    """
    Returns up to `max_chars` of extracted text for summarisation.
    Used by the /pdf-summary endpoint.
    """
    return extract_pdf_text(pdf_path)[:max_chars]


def delete_pdf_from_pinecone(filename: str) -> bool:
    """
    Delete all vectors for a PDF from its Pinecone namespace.
    """
    namespace = _make_namespace(filename)
    try:
        _index.delete(delete_all=True, namespace=namespace)
        return True
    except Exception:
        return False


def _make_namespace(filename: str) -> str:
    """
    Convert filename to a safe Pinecone namespace.
    e.g.  'My Report (2024).pdf'  →  'pdf_my_report_2024'
    """
    name = os.path.splitext(filename)[0]          # remove extension
    name = re.sub(r'[^a-zA-Z0-9]+', '_', name)   # replace special chars
    name = name.lower().strip('_')
    return f"pdf_{name}"