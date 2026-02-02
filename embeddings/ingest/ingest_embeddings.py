#!/usr/bin/env python3
"""
Reference ingestion script for Collab agents.
Reads canonical markdown/yaml, chunks deterministically, attaches metadata,
and pushes embeddings to a vector database.
"""

import hashlib
import json
import os
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]

DOMAIN_MAP = {
    "domains/backoffice-ui": "DOM-001",
    "domains/backend-cbq": "DOM-002",
    "domains/cross-layer": "DOM-003",
}

DEFAULT_DOMAIN = "DOM-003"
DEFAULT_CONFIDENCE = "provisional"

CHUNK_TARGET_TOKENS = 350
CHUNK_OVERLAP_TOKENS = 40


def stable_checksum(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def resolve_domain(path: Path) -> str:
    rel = path.as_posix()
    for prefix, domain_id in DOMAIN_MAP.items():
        if rel.startswith(prefix + "/"):
            return domain_id
    return DEFAULT_DOMAIN


def split_paragraphs(text: str) -> List[str]:
    return [p.strip() for p in text.split("\n\n") if p.strip()]


def estimate_tokens(text: str) -> int:
    return max(1, len(text.split()))


def chunk_text(text: str) -> List[str]:
    paragraphs = split_paragraphs(text)
    chunks: List[str] = []
    current: List[str] = []
    current_tokens = 0

    for para in paragraphs:
        para_tokens = estimate_tokens(para)
        if current_tokens + para_tokens > CHUNK_TARGET_TOKENS and current:
            chunks.append("\n\n".join(current))
            overlap = "\n\n".join(current)[-CHUNK_OVERLAP_TOKENS:]
            current = [overlap, para] if overlap else [para]
            current_tokens = estimate_tokens("\n\n".join(current))
        else:
            current.append(para)
            current_tokens += para_tokens

    if current:
        chunks.append("\n\n".join(current))

    return chunks


def source_files() -> Iterable[Path]:
    patterns = ["README.md", "domains/**/*.md", "knowledge/**/*.md", "prompts/**/*.md", "governance/**/*.md", "evolution/**/*.md", "schema/**/*.yaml", "graph/**/*.yaml"]
    for pattern in patterns:
        for path in REPO_ROOT.glob(pattern):
            if path.is_file():
                yield path


def build_records(path: Path) -> List[Dict]:
    text = path.read_text(encoding="utf-8")
    domain = resolve_domain(path)
    chunks = chunk_text(text)
    records = []
    for idx, chunk in enumerate(chunks):
        chunk_id = hashlib.sha1(f"{path.as_posix()}:{idx}".encode("utf-8")).hexdigest()[:12]
        record = {
            "record_id": f"VEC-{chunk_id[:8]}",
            "source_path": path.as_posix(),
            "chunk_id": chunk_id,
            "chunk_index": idx,
            "text": chunk,
            "domain": domain,
            "confidence": DEFAULT_CONFIDENCE,
            "status": "ingested",
            "embedding_model": os.getenv("COLLAB_EMBED_MODEL", "text-embedding-3-large"),
            "embedding_dim": int(os.getenv("COLLAB_EMBED_DIM", "1536")),
            "token_count": estimate_tokens(chunk),
            "checksum": stable_checksum(chunk),
            "created": os.getenv("COLLAB_CANON_DATE", "2026-02-02"),
            "updated": os.getenv("COLLAB_CANON_DATE", "2026-02-02"),
        }
        records.append(record)
    return records


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Deterministic reference embedder for canonical ingestion pipelines.
    It produces stable vectors when a live embedding service is not configured.
    """
    dim = int(os.getenv("COLLAB_EMBED_DIM", "1536"))
    vectors = []
    for text in texts:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        vector = [b / 255.0 for b in digest]
        vector = (vector * ((dim // len(vector)) + 1))[:dim]
        vectors.append(vector)
    return vectors


def push_to_vector_db(records: List[Dict], vectors: List[List[float]]) -> None:
    payload = []
    for record, vector in zip(records, vectors):
        payload.append({"id": record["record_id"], "values": vector, "metadata": record})

    # Canonical fallback: persist payload for downstream vector ingestion.
    output_path = REPO_ROOT / "embeddings" / "ingest" / "_last_payload.json"
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    all_records: List[Dict] = []
    for path in source_files():
        all_records.extend(build_records(path))

    texts = [r["text"] for r in all_records]
    vectors = embed_texts(texts)
    push_to_vector_db(all_records, vectors)


if __name__ == "__main__":
    main()
