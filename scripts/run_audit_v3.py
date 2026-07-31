#!/usr/bin/env python3
"""Fast, lossless Portugal webcam audit entrypoint.

Features layered on the comprehensive crawler:
- persistent search cache with separate positive/empty TTLs;
- atomic cache writes and corruption recovery;
- one logical search per query with existing resilient fallbacks;
- permanent inventory for Portuguese webcam candidates whose exact location is not yet known;
- no loss of low-confidence discoveries: they remain reviewable instead of being discarded.
"""
from __future__ import annotations

import hashlib
import json
import os
import tempfile
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import webcam_audit
import run_audit_clean  # noqa: F401 - installs comprehensive efficient crawler profile

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit"
CACHE_DIR = AUDIT / "cache"
SEARCH_CACHE = CACHE_DIR / "search-cache.json"
UNASSIGNED = AUDIT / "unassigned-portugal-cameras.json"
CACHE_SCHEMA = 2
POSITIVE_TTL_DAYS = int(os.getenv("AUDIT_POSITIVE_CACHE_DAYS", "14"))
EMPTY_TTL_HOURS = int(os.getenv("AUDIT_EMPTY_CACHE_HOURS", "48"))
MAX_CACHE_ENTRIES = int(os.getenv("AUDIT_MAX_CACHE_ENTRIES", "25000"))

PORTUGAL_PROVIDER_DOMAINS = {
    "beachcam.meo.pt", "back-office.beachcam.pt", "spotazores.com",
    "www.spotazores.com", "netmadeira.com", "www.netmadeira.com",
    "madeiracams.com", "www.madeiracams.com", "portugalwebcams.pt",
    "www.portugalwebcams.pt",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_time(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def read_json(path: Path, default: Any) -> Any:
    try:
        if not path.exists():
            return default
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(payload)
        temp_name = handle.name
    Path(temp_name).replace(path)


def cache_key(engine: str, query: str, max_results: int) -> str:
    # Include the schema version so relevance/parser changes cannot reuse poisoned results.
    raw = f"{CACHE_SCHEMA}\n{engine}\n{max_results}\n{query.strip()}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


_cache_doc = read_json(SEARCH_CACHE, {"schema_version": CACHE_SCHEMA, "entries": {}})
if not isinstance(_cache_doc, dict) or int(_cache_doc.get("schema_version", 0) or 0) != CACHE_SCHEMA:
    _cache_doc = {"schema_version": CACHE_SCHEMA, "entries": {}}
_cache_entries = _cache_doc.setdefault("entries", {})
if not isinstance(_cache_entries, dict):
    _cache_entries = {}
    _cache_doc["entries"] = _cache_entries
_cache_dirty = False
_original_search = webcam_audit.AuditCrawler.search


def cached_search(self, query: str, engine: str) -> list[str]:
    global _cache_dirty
    key = cache_key(engine, query, self.max_results)
    cached = _cache_entries.get(key)
    now = utc_now()
    if isinstance(cached, dict):
        expires = parse_time(str(cached.get("expires_at", "")))
        results = cached.get("results", [])
        if expires and expires > now and isinstance(results, list):
            return [url for url in results if isinstance(url, str)][: self.max_results]

    results = _original_search(self, query, engine)
    results = list(dict.fromkeys(url for url in results if isinstance(url, str)))[: self.max_results]
    ttl = timedelta(days=POSITIVE_TTL_DAYS) if results else timedelta(hours=EMPTY_TTL_HOURS)
    _cache_entries[key] = {
        "engine": engine,
        "query": query,
        "max_results": self.max_results,
        "checked_at": iso_now(),
        "expires_at": (now + ttl).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "results": results,
    }
    _cache_dirty = True
    return results


webcam_audit.AuditCrawler.search = cached_search

_original_inspect = webcam_audit.AuditCrawler.inspect
_unassigned_candidates: list[dict[str, Any]] = []


def likely_portuguese(candidate: webcam_audit.Candidate) -> bool:
    host = urlparse(candidate.source_url or candidate.media_url).netloc.lower()
    evidence = " ".join(candidate.evidence).lower()
    return (
        host.endswith(".pt")
        or host in PORTUGAL_PROVIDER_DOMAINS
        or candidate.provider in {
            "MEO Beachcam", "SpotAzores", "NetMadeira", "MadeiraCams", "PortugalWebcams"
        }
        or "portugal" in evidence
        or "municipality name appears" in evidence
    )


def preserving_inspect(self, url: str, municipality: str, region: str):
    candidates = _original_inspect(self, url, municipality, region)
    for candidate in candidates:
        municipality_confirmed = any("Municipality name appears" in item for item in candidate.evidence)
        if likely_portuguese(candidate) and candidate.media_url and (
            not municipality_confirmed or candidate.confidence < 90 or candidate.status != "new"
        ):
            row = asdict(candidate)
            row.update({
                "inventory_status": "location_pending" if not municipality_confirmed else "review_pending",
                "discovered_during_municipality": municipality,
                "assigned_municipality": municipality if municipality_confirmed else None,
                "assigned_region": region if municipality_confirmed else None,
                "first_seen_at": candidate.discovered_at,
                "last_seen_at": iso_now(),
            })
            _unassigned_candidates.append(row)
    return candidates


webcam_audit.AuditCrawler.inspect = preserving_inspect


def persist_cache() -> None:
    global _cache_dirty
    # A schema migration must be written even if no new query completed.
    if int(_cache_doc.get("schema_version", 0) or 0) != CACHE_SCHEMA:
        _cache_dirty = True
    if not _cache_dirty and SEARCH_CACHE.exists():
        try:
            if int(json.loads(SEARCH_CACHE.read_text(encoding="utf-8")).get("schema_version", 0) or 0) == CACHE_SCHEMA:
                return
        except Exception:
            pass
    now = utc_now()
    valid = {
        key: value for key, value in _cache_entries.items()
        if isinstance(value, dict) and (parse_time(str(value.get("expires_at", ""))) or now) > now
    }
    if len(valid) > MAX_CACHE_ENTRIES:
        ordered = sorted(valid.items(), key=lambda item: str(item[1].get("checked_at", "")), reverse=True)
        valid = dict(ordered[:MAX_CACHE_ENTRIES])
    atomic_write_json(SEARCH_CACHE, {
        "schema_version": CACHE_SCHEMA,
        "updated_at": iso_now(),
        "entries": valid,
    })


def persist_unassigned() -> None:
    existing = read_json(UNASSIGNED, [])
    if not isinstance(existing, list):
        existing = []
    merged: dict[str, dict[str, Any]] = {}
    for row in [*existing, *_unassigned_candidates]:
        if not isinstance(row, dict):
            continue
        raw_key = row.get("media_url") or row.get("source_url")
        if not raw_key:
            continue
        key = webcam_audit.normalize_url(str(raw_key))
        previous = merged.get(key)
        if previous:
            first_seen = min(str(previous.get("first_seen_at", iso_now())), str(row.get("first_seen_at", iso_now())))
            combined = {**previous, **row, "first_seen_at": first_seen, "last_seen_at": iso_now()}
            merged[key] = combined
        else:
            merged[key] = row
    rows = sorted(
        merged.values(),
        key=lambda row: (str(row.get("inventory_status", "")), -int(row.get("confidence", 0))),
    )
    atomic_write_json(UNASSIGNED, rows)


import run_audit_diagnostics


def main() -> int:
    try:
        return run_audit_diagnostics.main()
    finally:
        persist_cache()
        persist_unassigned()


if __name__ == "__main__":
    raise SystemExit(main())
