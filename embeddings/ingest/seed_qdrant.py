#!/usr/bin/env python3
"""
Seed Qdrant with the last embedding payload produced by ingest_embeddings.py.
"""

import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333").rstrip("/")
COLLECTION = os.getenv("QDRANT_COLLECTION", "collab-architecture-canon")
VECTOR_SIZE = int(os.getenv("QDRANT_VECTOR_SIZE", "1536"))
DISTANCE = os.getenv("QDRANT_DISTANCE", "Cosine")
BATCH_SIZE = int(os.getenv("QDRANT_BATCH_SIZE", "64"))

PAYLOAD_PATH = Path(__file__).parent / "_last_payload.json"


def http_json(method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{QDRANT_URL}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = ""
        try:
            detail = err.read().decode("utf-8")
        except Exception:
            detail = ""
        raise RuntimeError(f"HTTP {err.code} for {method} {path}: {detail}") from err


UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")


def normalize_id(point_id: Any) -> Any:
    if isinstance(point_id, int):
        return point_id
    if isinstance(point_id, str) and UUID_RE.match(point_id):
        return point_id
    if isinstance(point_id, str):
        digest = hashlib.sha256(point_id.encode("utf-8")).hexdigest()
        return int(digest[:16], 16)
    return int(hash(point_id) & 0x7FFFFFFFFFFFFFFF)


def ensure_collection() -> None:
    try:
        info = http_json("GET", f"/collections/{COLLECTION}")
        size = None
        try:
            size = info["result"]["config"]["params"]["vectors"]["size"]
        except Exception:
            size = None
        if size is not None and int(size) != VECTOR_SIZE:
            raise RuntimeError(
                f"Existing collection size {size} does not match VECTOR_SIZE {VECTOR_SIZE}. "
                "Delete the collection or set QDRANT_VECTOR_SIZE accordingly."
            )
        return
    except RuntimeError as err:
        if "HTTP 404" not in str(err):
            raise

    create_body = {
        "vectors": {
            "size": VECTOR_SIZE,
            "distance": DISTANCE,
        }
    }
    http_json("PUT", f"/collections/{COLLECTION}", create_body)


def load_payload() -> List[Dict[str, Any]]:
    if not PAYLOAD_PATH.exists():
        raise FileNotFoundError(f"Payload not found: {PAYLOAD_PATH}")
    return json.loads(PAYLOAD_PATH.read_text(encoding="utf-8"))


def upsert_points(points: List[Dict[str, Any]]) -> None:
    body = {"points": points}
    http_json("PUT", f"/collections/{COLLECTION}/points?wait=true", body)


def main() -> int:
    try:
        ensure_collection()
    except Exception as exc:
        print(f"Failed to ensure collection: {exc}")
        return 1

    payload = load_payload()
    total = len(payload)
    if total == 0:
        print("No points to upsert.")
        return 0

    for start in range(0, total, BATCH_SIZE):
        batch = payload[start : start + BATCH_SIZE]
        points = []
        for entry in batch:
            points.append({
                "id": normalize_id(entry["id"]),
                "vector": entry["values"],
                "payload": entry["metadata"],
            })
        upsert_points(points)
        print(f"Upserted {min(start + BATCH_SIZE, total)} / {total}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
