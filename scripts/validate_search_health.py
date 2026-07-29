#!/usr/bin/env python3
"""Reject audit evidence when the search layer returned no URLs at all.

A municipality can legitimately have no webcams, but hundreds of independent queries
across several engines returning zero result URLs is a transport/API failure. Such a
run must not advance national progress or poison the persistent cache with empty data.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audit"
EVIDENCE = AUDIT / "evidence"
LAST_RUN = AUDIT / "last-automated-run.json"
CACHE = AUDIT / "cache" / "search-cache.json"


def load(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def main() -> int:
    run = load(LAST_RUN, {})
    municipalities = run.get("municipalities", [])
    blocked = []
    healthy = []

    for item in municipalities:
        municipality_id = str(item.get("id", ""))
        if not municipality_id:
            continue
        path = EVIDENCE / f"{municipality_id}.json"
        record = load(path, {})
        checks = record.get("checks", []) if isinstance(record, dict) else []
        url_count = sum(
            len(check.get("urls_checked", []))
            for check in checks
            if isinstance(check, dict) and isinstance(check.get("urls_checked", []), list)
        )
        if checks and url_count == 0:
            record["status"] = "blocked"
            record["error"] = (
                "Search layer returned zero URLs across all queries. This is treated as an "
                "API/transport/search-engine failure, not as evidence that no webcams exist."
            )
            record["search_health"] = {
                "status": "blocked",
                "urls_returned": 0,
                "checks_examined": len(checks),
                "action": "Municipality remains pending and must be searched again after recovery.",
            }
            path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            blocked.append(municipality_id)
        else:
            healthy.append({"id": municipality_id, "urls_returned": url_count})

    if blocked:
        cache = load(CACHE, {"schema_version": 1, "entries": {}})
        entries = cache.get("entries", {}) if isinstance(cache, dict) else {}
        positive = {
            key: value for key, value in entries.items()
            if isinstance(value, dict) and isinstance(value.get("results"), list) and value["results"]
        }
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps({
            "schema_version": 1,
            "entries": positive,
            "health_reset_reason": "Removed empty results after a fully blocked search run.",
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report = {"blocked_municipalities": blocked, "healthy_municipalities": healthy}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
